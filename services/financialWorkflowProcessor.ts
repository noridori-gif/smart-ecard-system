import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import {buildCompactFinancialSmsMessage,buildPledgeMessage} from "@/services/pledgeMessageService";
import {financialProviderStatus,processAutomaticPaymentAcknowledgements,processQueuedPledgeAcknowledgements} from "@/services/financialNotificationEngine";
import {processMakeDeliveries,queueMakeDeliveries} from "@/lib/makeConnectorServer";
import {automaticMessagingEnabled,holdWorkflowEvent} from "@/services/automationMasterServer";

export type FinancialWorkflowEvent={id:number;event_id:number;event_type:string;entity_type:string;entity_id:string|null;source:string;payload?:Record<string,unknown>;created_at:string};
export type ImmediateProcessingResult={status:"sent"|"queued"|"failed"|"skipped"|"held"|"already_processing";message:string;workflowEventId:number|null};

export function safeWorkflowError(cause:unknown){
 const record=typeof cause==="object"&&cause!==null?cause as Record<string,unknown>:null,raw=cause instanceof Error?cause.message:typeof record?.message==="string"?record.message:"Workflow action failed";
 return raw.replace(/[\u0000-\u001f\u007f]+/g," ").replace(/\b(?:postgres(?:ql)?|https?):\/\/\S+/gi,"[redacted]").replace(/\b(?:Bearer|Basic)\s+\S+/gi,"[redacted]").replace(/\b(authorization|api[-_ ]?key|token|secret|password|credential)\s*[:=]\s*[^\s,;]+/gi,"$1=[redacted]").replace(/\s+/g," ").trim().slice(0,700)||"Workflow action failed";
}

async function reminderId(db:SupabaseClient,key:string){const {data}=await db.from("pledge_reminders").select("id").eq("idempotency_key",key).maybeSingle();return data?.id as number|undefined}

export async function processClaimedFinancialWorkflow(db:SupabaseClient,event:FinancialWorkflowEvent,origin:string):Promise<ImmediateProcessingResult>{
 if(!(await automaticMessagingEnabled(db,event.event_id))){await holdWorkflowEvent(db,event.id);return {status:"held",message:"Financial record saved. Automatic messaging is paused.",workflowEventId:event.id}}
 let deliveryId:number|undefined;
 try{
  await queueMakeDeliveries(db,event);
  if(event.event_type==="payment.recorded"){
   const paymentId=Number(event.payload?.payment_id),pledgeId=Number(event.payload?.pledge_id),paymentAmount=Number(event.payload?.payment_amount),totalPaid=Number(event.payload?.total_paid),balance=Number(event.payload?.balance);
   const [{data:pledge},{data:eventRow},{data:settings},{data:payment}]=await Promise.all([db.from("event_pledge_financial_summary").select("id,full_name,normalized_phone,pledged_amount").eq("id",pledgeId).eq("event_id",event.event_id).maybeSingle(),db.from("events").select("id,title,language").eq("id",event.event_id).maybeSingle(),db.from("event_finance_automation_settings").select("pledge_acknowledgement_mode,reminder_channel").eq("event_id",event.event_id).maybeSingle(),db.from("pledge_payments").select("id,pledge_id,amount,voided_at").eq("id",paymentId).eq("pledge_id",pledgeId).maybeSingle()]);
   const smsEnabled=settings?.reminder_channel==="sms"||settings?.reminder_channel==="both",validPhone=pledge?.normalized_phone&&/^255[67]\d{8}$/.test(pledge.normalized_phone),provider=financialProviderStatus("sms",eventRow?.language==="en"?"en":"sw");
   if(settings?.pledge_acknowledgement_mode==="automatic"&&smsEnabled&&validPhone&&!provider.configured)throw new Error(provider.message);
   if(settings?.pledge_acknowledgement_mode==="automatic"&&smsEnabled&&validPhone&&provider.configured&&eventRow&&payment&&!payment.voided_at&&paymentAmount>0&&Number(payment.amount)===paymentAmount&&Number.isFinite(totalPaid)&&Number.isFinite(balance)){
    const completed=event.payload?.calculated_status==="completed"&&balance<=0,type=completed?"pledge_thank_you":"payment_received",sms=buildCompactFinancialSmsMessage(type,{guestName:pledge.full_name,eventTitle:eventRow.title,pledgedAmount:pledge.pledged_amount,totalPaid:String(totalPaid),balance:String(balance),paymentAmount:String(paymentAmount)}),key=`payment-acknowledgement:${payment.id}:${type}:sms`;
    const inserted=await db.from("pledge_reminders").upsert({pledge_id:pledge.id,event_id:event.event_id,reminder_type:type,channel:"sms",recipient_phone:pledge.normalized_phone,message_body:sms.message,delivery_status:"queued",idempotency_key:key,originating_payment_id:payment.id,originating_source:event.source,requested_by:null},{onConflict:"idempotency_key",ignoreDuplicates:true}).select("id").maybeSingle();if(inserted.error)throw inserted.error;deliveryId=inserted.data?.id??await reminderId(db,key);
    if(inserted.data)await db.from("finance_audit_logs").insert({event_id:event.event_id,pledge_id:pledge.id,payment_id:payment.id,actor_type:"system",action:"reminder_requested",metadata:{event_id:event.event_id,pledge_id:pledge.id,payment_id:payment.id,message_type:type,selected_channel:"sms",actor_source:event.source,delivery_id:inserted.data.id,sms_encoding:sms.encoding,sms_units:sms.units,sms_segments:sms.segments,multi_segment:sms.segments>1,sms_warning:sms.warning}});
   }
  }else if(event.event_type==="message.acknowledgement.requested"){
   const pledgeId=Number(event.payload?.pledge_id),[{data:pledge},{data:eventRow},{data:settings}]=await Promise.all([db.from("event_pledge_financial_summary").select("id,full_name,normalized_phone,pledged_amount,total_paid,balance,expected_completion_date").eq("id",pledgeId).eq("event_id",event.event_id).maybeSingle(),db.from("events").select("id,title,language").eq("id",event.event_id).maybeSingle(),db.from("event_finance_automation_settings").select("pledge_acknowledgement_mode,reminder_channel").eq("event_id",event.event_id).maybeSingle()]);
   if(settings?.pledge_acknowledgement_mode!=="automatic")throw new Error("Pledge acknowledgement is not automatic.");
   if(!pledge?.normalized_phone||!/^255[67]\d{8}$/.test(pledge.normalized_phone))throw new Error("Pledge acknowledgement has no valid recipient phone.");
   if(eventRow&&Number(pledge.total_paid)<=0){const channel=settings.reminder_channel==="sms"?"sms":"whatsapp",type="pledge_acknowledgement",values={guestName:pledge.full_name,eventTitle:eventRow.title,pledgedAmount:pledge.pledged_amount,totalPaid:pledge.total_paid,balance:pledge.balance,completionDate:pledge.expected_completion_date},message=channel==="sms"?buildCompactFinancialSmsMessage(type,values).message:buildPledgeMessage(type,event.payload?.language==="en"?"en":"sw",values),key=`pledge-acknowledgement:${pledge.id}:${channel}`;const inserted=await db.from("pledge_reminders").upsert({pledge_id:pledge.id,event_id:event.event_id,reminder_type:type,channel,recipient_phone:pledge.normalized_phone,message_body:message,delivery_status:"queued",idempotency_key:key,requested_by:null},{onConflict:"idempotency_key",ignoreDuplicates:true}).select("id").maybeSingle();if(inserted.error)throw inserted.error;deliveryId=inserted.data?.id??await reminderId(db,key);}
  }else throw new Error("Immediate processing does not support this workflow type.");
  const finished=await db.rpc("finish_workflow_event",{target_id:event.id,succeeded:true,error_text:null});if(finished.error)throw finished.error;
 }catch(cause){const error=safeWorkflowError(cause);await db.rpc("finish_workflow_event",{target_id:event.id,succeeded:false,error_text:error});return {status:"failed",message:"Financial record saved. Acknowledgement queued for retry.",workflowEventId:event.id}}
 const delivery=event.event_type==="payment.recorded"?await processAutomaticPaymentAcknowledgements(db,event.event_id,deliveryId):await processQueuedPledgeAcknowledgements(db,event.event_id,deliveryId);
 await processMakeDeliveries(db,origin,event.id).catch(()=>({accepted:0,failed:1}));
 if(delivery.sent>0)return {status:"sent",message:event.event_type==="payment.recorded"?"Payment saved. Acknowledgement sent.":"Pledge saved. Acknowledgement sent.",workflowEventId:event.id};
 if(delivery.failed>0)return {status:"failed",message:"Financial record saved. Acknowledgement queued for retry.",workflowEventId:event.id};
 return {status:deliveryId?"queued":"skipped",message:deliveryId?"Financial record saved. Acknowledgement queued for delivery.":"Financial record saved.",workflowEventId:event.id};
}

export async function processWorkflowByIdempotencyKey(db:SupabaseClient,key:string,origin:string):Promise<ImmediateProcessingResult>{
 const {data:row}=await db.from("workflow_events").select("id").eq("idempotency_key",key).maybeSingle();
 if(!row)return {status:"skipped",message:"Financial record saved.",workflowEventId:null};
 const {data,error}=await db.rpc("claim_workflow_event",{target_id:row.id});
 if(error)return {status:"failed",message:"Financial record saved. Acknowledgement queued for delivery.",workflowEventId:row.id};
 const event=(data??[])[0] as FinancialWorkflowEvent|undefined;
 if(!event)return {status:"already_processing",message:"Financial record saved. Acknowledgement is already processing.",workflowEventId:row.id};
 return processClaimedFinancialWorkflow(db,event,origin);
}
