import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { buildPledgeMessage } from "@/services/pledgeMessageService";
import { previewFinancialReminders, processQueuedPledgeAcknowledgements, sendDailyFinancialSummary, sendFinancialReminders, type FinancialChannel } from "@/services/financialNotificationEngine";
import { processMakeDeliveries, queueMakeDeliveries } from "@/lib/makeConnectorServer";

export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store, max-age=0"};
const workflowErrorFallback="Workflow action failed";
function workflowErrorText(cause:unknown){
 const record=typeof cause==="object"&&cause!==null?cause as Record<string,unknown>:null;
 const rawMessage=cause instanceof Error?cause.message:typeof record?.message==="string"?record.message:"";
 const rawCode=typeof record?.code==="string"||typeof record?.code==="number"?String(record.code):"";
 const code=/^[a-z0-9_.-]{1,64}$/i.test(rawCode)?rawCode:"";
 let message=rawMessage
  .replace(/[\u0000-\u001f\u007f]+/g," ")
  .replace(/\b(?:postgres(?:ql)?|https?):\/\/\S+/gi,"[REDACTED_URL]")
  .replace(/\bBearer\s+\S+/gi,"Bearer [REDACTED]")
  .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,"[REDACTED_TOKEN]")
  .replace(/\b(authorization|api[-_ ]?key|token|secret|password|credential)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,"$1=[REDACTED]")
  .replace(/\s+/g," ")
  .trim();
 if(/\b(?:connection (?:to|refused)|database (?:connection|host)|host\s*=|port\s*=|user\s*=|dbname\s*=)/i.test(message))message="Database connection failed.";
 if(/\b(?:request payload|request body|response payload|response body|provider response)\b/i.test(message))message="External service operation failed.";
 message=message.slice(0,700);
 return `${code?`[${code}] `:""}${message||workflowErrorFallback}`;
}
function authorized(request:Request){const expected=process.env.CRON_SECRET||process.env.WORKFLOW_CRON_SECRET||process.env.FINANCIAL_AUTOMATION_CRON_SECRET||"",supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/,"")||"";if(!expected||!supplied)return false;return timingSafeEqual(createHash("sha256").update(expected).digest(),createHash("sha256").update(supplied).digest())}
export async function GET(request:Request){
 const invokedAt=new Date().toISOString(),isAuthorized=authorized(request);console.info("workflow_processor_invoked",{invokedAt,authorized:isAuthorized});
 if(!isAuthorized)return Response.json({error:"Not authorized."},{status:401,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return Response.json({error:"Workflow processor is not configured."},{status:503,headers});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const eligibleResult=await db.from("workflow_events").select("id",{count:"exact",head:true}).in("status",["pending","failed"]).lte("available_at",invokedAt).lt("attempt_count",5);const {data:events,error}=await db.rpc("claim_workflow_events",{batch_size:25});console.info("workflow_processor_claim",{invokedAt,eligible:eligibleResult.count??null,claimed:events?.length??0,claimSucceeded:!error});if(error)return Response.json({error:"Workflow events could not be claimed."},{status:500,headers});
 const totals={claimed:events?.length??0,processed:0,failed:0,acknowledgementsQueued:0,acknowledgementsSent:0,acknowledgementsFailed:0,acknowledgementsSkipped:0};
 for(const event of events??[]){
  try { await queueMakeDeliveries(db,event); } catch { /* External orchestration must never fail the core workflow. */ }
  try{
   if(event.event_type==="pledge.reminder.schedule_requested"){
     const pledgeId=Number(event.payload?.pledge_id);
     if(Number.isInteger(pledgeId)&&pledgeId>0){const recalculated=await db.rpc("recalculate_pledge_reminder_schedules",{target_pledge_id:pledgeId,recalculation_source:event.payload?.source||"policy"});if(recalculated.error)throw recalculated.error;}
     else if(event.entity_type==="event"){const {data:pledges}=await db.from("event_pledges").select("id").eq("event_id",event.event_id);for(const pledge of pledges??[]){const recalculated=await db.rpc("recalculate_pledge_reminder_schedules",{target_pledge_id:pledge.id,recalculation_source:"manager"});if(recalculated.error)throw recalculated.error;}}
   } else if(event.event_type==="owner.summary.daily_requested"){
     const {data:setting,error:settingError}=await db.from("event_finance_automation_settings").select("daily_summary_channel,daily_summary_enabled,owner_summary_phone").eq("event_id",event.event_id).single();
     if(settingError)throw settingError;
     if(!setting.daily_summary_enabled||!setting.owner_summary_phone)throw new Error("Daily summary is no longer enabled or has no owner phone.");
     const requestedChannels:FinancialChannel[]=setting.daily_summary_channel==="both"?["sms","whatsapp"]:[setting.daily_summary_channel];
     const summaryDate=typeof event.payload?.summary_date==="string"?event.payload.summary_date:new Date().toISOString().slice(0,10);
     const summary=await sendDailyFinancialSummary(db,{eventId:event.event_id,date:summaryDate,requestedChannels,requireEnabled:true});
     if(summary.failed>0||summary.sent===0)throw new Error(summary.errors.join("; ")||"Daily summary was not delivered.");
     const next=await db.rpc("schedule_owner_daily_summary",{target_event_id:event.event_id});if(next.error)throw next.error;
   } else if(event.event_type==="pledge.reminder.cancel_requested"){
     const pledgeId=Number(event.payload?.pledge_id);if(pledgeId>0)await db.from("pledge_reminder_schedules").update({status:"cancelled",cancelled_at:new Date().toISOString(),cancel_reason:event.payload?.reason||"manager_paused"}).eq("pledge_id",pledgeId).in("status",["scheduled","recommended","queued"]);
   } else if(event.event_type==="message.acknowledgement.requested"){
     const pledgeId=Number(event.payload?.pledge_id);const [{data:pledge},{data:eventRow},{data:settings}]=await Promise.all([db.from("event_pledge_financial_summary").select("id,full_name,normalized_phone,pledged_amount,total_paid,balance,calculated_status,expected_completion_date").eq("id",pledgeId).eq("event_id",event.event_id).maybeSingle(),db.from("events").select("id,title,language").eq("id",event.event_id).maybeSingle(),db.from("event_finance_automation_settings").select("pledge_acknowledgement_mode,reminder_channel").eq("event_id",event.event_id).maybeSingle()]);
     if(settings?.pledge_acknowledgement_mode!=="automatic")throw new Error("Pledge acknowledgement is not automatic.");
     if(!pledge?.normalized_phone||!/^255[67]\d{8}$/.test(pledge.normalized_phone))throw new Error("Pledge acknowledgement has no valid recipient phone.");
     if(eventRow){const preferred=settings.reminder_channel==="sms"?"sms":"whatsapp",completed=pledge.calculated_status==="completed"&&Number(pledge.balance)<=0,reminderType=completed?"pledge_thank_you":"pledge_acknowledgement";const message=buildPledgeMessage(reminderType,event.payload?.language==="en"?"en":"sw",{guestName:pledge.full_name,eventTitle:eventRow.title,pledgedAmount:pledge.pledged_amount,totalPaid:pledge.total_paid,balance:pledge.balance,completionDate:pledge.expected_completion_date});const inserted=await db.from("pledge_reminders").upsert({pledge_id:pledge.id,event_id:event.event_id,reminder_type:reminderType,channel:preferred,recipient_phone:pledge.normalized_phone,message_body:message,delivery_status:"queued",idempotency_key:`pledge-acknowledgement:${pledge.id}:${preferred}`,requested_by:null},{onConflict:"idempotency_key",ignoreDuplicates:true});if(inserted.error)throw inserted.error;totals.acknowledgementsQueued+=1;}
   }
   const finished=await db.rpc("finish_workflow_event",{target_id:event.id,succeeded:true,error_text:null});if(finished.error)throw finished.error;totals.processed+=1;console.info("workflow_processor_event",{workflowEventId:event.id,eventType:event.event_type,result:"processed"});
 }catch(cause){totals.failed+=1;await db.rpc("finish_workflow_event",{target_id:event.id,succeeded:false,error_text:workflowErrorText(cause)});console.info("workflow_processor_event",{workflowEventId:event.id,eventType:event.event_type,result:"failed"});}}
 try{const acknowledgements=await processQueuedPledgeAcknowledgements(db);totals.acknowledgementsSent=acknowledgements.sent;totals.acknowledgementsFailed=acknowledgements.failed;totals.acknowledgementsSkipped=acknowledgements.skipped;}catch(cause){totals.acknowledgementsFailed+=1;console.info("workflow_processor_acknowledgements",{result:"failed",error:workflowErrorText(cause)});}
 const {data:due}=await db.from("pledge_reminder_schedules").select("id,event_id,pledge_id,schedule_type,status,event_pledge_reminder_settings!inner(reminder_mode,is_enabled),event_pledges!inner(normalized_phone,reminder_paused_at,cancelled_at)").in("status",["scheduled","queued"]).lte("scheduled_for",new Date().toISOString()).limit(50);
 for(const schedule of due??[]){const policy=Array.isArray(schedule.event_pledge_reminder_settings)?schedule.event_pledge_reminder_settings[0]:schedule.event_pledge_reminder_settings;const pledge=Array.isArray(schedule.event_pledges)?schedule.event_pledges[0]:schedule.event_pledges;if(!policy?.is_enabled||pledge?.reminder_paused_at||pledge?.cancelled_at){await db.from("pledge_reminder_schedules").update({status:"cancelled",cancelled_at:new Date().toISOString(),cancel_reason:"ineligible"}).eq("id",schedule.id);continue}if(policy.reminder_mode==="hybrid"){await db.from("pledge_reminder_schedules").update({status:"recommended"}).eq("id",schedule.id);continue}if(policy.reminder_mode!=="automatic")continue;if(!pledge?.normalized_phone){await db.from("pledge_reminder_schedules").update({status:"skipped",cancel_reason:"missing_phone"}).eq("id",schedule.id);continue}try{const {data:deliverySetting}=await db.from("event_finance_automation_settings").select("reminder_channel").eq("event_id",schedule.event_id).maybeSingle();const channels:FinancialChannel[]=deliverySetting?.reminder_channel==="both"?["sms","whatsapp"]:[deliverySetting?.reminder_channel==="whatsapp"?"whatsapp":"sms"];const preview=await previewFinancialReminders(db,{eventId:schedule.event_id,pledgeId:schedule.pledge_id,requestedChannels:channels});const result=await sendFinancialReminders(db,preview,{type:"system"});const {data:delivery}=await db.from("pledge_reminders").select("id,delivery_status,error_message").eq("pledge_id",schedule.pledge_id).eq("reminder_type","pledge_reminder").order("created_at",{ascending:false}).limit(1).maybeSingle();await db.from("pledge_reminder_schedules").update({status:result.sent>0?"sent":result.failed>0?"failed":"skipped",delivery_id:delivery?.id??null,last_error:delivery?.error_message??result.errors[0]??null,cancel_reason:result.skipped>0&&!result.sent&&!result.failed?"delivery_ineligible":null}).eq("id",schedule.id);}catch(cause){await db.from("pledge_reminder_schedules").update({status:"failed",last_error:cause instanceof Error?cause.message:"Delivery failed"}).eq("id",schedule.id)}}
 const make=await processMakeDeliveries(db,new URL(request.url).origin).catch(()=>({accepted:0,failed:0}));
 return Response.json({...totals,make},{headers});
}
