import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { buildPledgeMessage } from "@/services/pledgeMessageService";

export const runtime="nodejs";export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store, max-age=0"};
function authorized(request:Request){const expected=process.env.WORKFLOW_CRON_SECRET||process.env.FINANCIAL_AUTOMATION_CRON_SECRET||"",supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/,"")||"";if(!expected||!supplied)return false;return timingSafeEqual(createHash("sha256").update(expected).digest(),createHash("sha256").update(supplied).digest())}
export async function GET(request:Request){
 if(!authorized(request))return Response.json({error:"Not authorized."},{status:401,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return Response.json({error:"Workflow processor is not configured."},{status:503,headers});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const {data:events,error}=await db.rpc("claim_workflow_events",{batch_size:25});if(error)return Response.json({error:"Workflow events could not be claimed."},{status:500,headers});
 const totals={claimed:events?.length??0,processed:0,failed:0,acknowledgementsQueued:0};
 for(const event of events??[]){try{
   if(event.event_type==="message.acknowledgement.requested"){
     const pledgeId=Number(event.payload?.pledge_id);const [{data:pledge},{data:eventRow},{data:settings}]=await Promise.all([db.from("event_pledge_financial_summary").select("id,full_name,normalized_phone,pledged_amount,total_paid,balance").eq("id",pledgeId).eq("event_id",event.event_id).maybeSingle(),db.from("events").select("id,title,language").eq("id",event.event_id).maybeSingle(),db.from("event_finance_automation_settings").select("reminders_enabled,reminder_channel").eq("event_id",event.event_id).maybeSingle()]);
     if(pledge?.normalized_phone&&eventRow&&settings?.reminders_enabled){const preferred=settings.reminder_channel==="sms"?"sms":"whatsapp";const providerReady=preferred==="whatsapp"?Boolean(process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID):Boolean(process.env.BEEM_API_KEY&&process.env.BEEM_SECRET_KEY);if(providerReady){const message=buildPledgeMessage("pledge_thank_you",event.payload?.language==="en"?"en":"sw",{guestName:pledge.full_name,eventTitle:eventRow.title,pledgedAmount:pledge.pledged_amount,totalPaid:pledge.total_paid,balance:pledge.balance});const inserted=await db.from("pledge_reminders").upsert({pledge_id:pledge.id,event_id:event.event_id,reminder_type:"pledge_thank_you",channel:preferred,recipient_phone:pledge.normalized_phone,message_body:message,delivery_status:"queued",idempotency_key:`workflow-ack:${event.id}`,requested_by:null},{onConflict:"idempotency_key",ignoreDuplicates:true});if(inserted.error)throw inserted.error;totals.acknowledgementsQueued+=1;}}
   }
   const finished=await db.rpc("finish_workflow_event",{target_id:event.id,succeeded:true,error_text:null});if(finished.error)throw finished.error;totals.processed+=1;
 }catch(cause){totals.failed+=1;await db.rpc("finish_workflow_event",{target_id:event.id,succeeded:false,error_text:cause instanceof Error?cause.message:"Workflow action failed"});}}
 return Response.json(totals,{headers});
}
