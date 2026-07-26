import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sendBeemSms } from "@/services/beemSmsService";
import { buildPledgeMessage, formatTzs } from "@/services/pledgeMessageService";

export const runtime="nodejs";export const dynamic="force-dynamic";
function authorized(request:Request){
  const expected=process.env.FINANCIAL_AUTOMATION_CRON_SECRET??"";const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/,"")??"";
  if(!expected||!supplied)return false;const a=createHash("sha256").update(expected).digest();const b=createHash("sha256").update(supplied).digest();return timingSafeEqual(a,b);
}
export async function GET(request:Request){
  if(!authorized(request))return Response.json({error:"Not authorized."},{status:401,headers:{"Cache-Control":"no-store"}});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return Response.json({error:"Financial automation is not configured."},{status:503,headers:{"Cache-Control":"no-store"}});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:settings,error}=await db.from("event_finance_automation_settings").select("*,events(id,title,event_date,language),event_finance_targets(contribution_deadline)");
  if(error)return Response.json({error:"Automation settings could not be loaded."},{status:500,headers:{"Cache-Control":"no-store"}});
  const summary={events:0,eligible:0,sent:0,failed:0,skipped:0,dailySent:0};
  for(const setting of settings??[]){
    summary.events++;const event=Array.isArray(setting.events)?setting.events[0]:setting.events;if(!event)continue;
    try{
      if(setting.reminders_enabled&&setting.reminder_frequency!=="manual"&&(!setting.next_reminder_at||new Date(setting.next_reminder_at)<=new Date())){
        const eventPassed=new Date(`${event.event_date}T23:59:59`)<new Date();
        const target=Array.isArray(setting.event_finance_targets)?setting.event_finance_targets[0]:setting.event_finance_targets;
        const deadlinePassed=target?.contribution_deadline&&new Date(`${target.contribution_deadline}T23:59:59`)<new Date();
        if(!(deadlinePassed&&!setting.allow_after_deadline)&&!(eventPassed&&setting.stop_after_event_date&&!setting.allow_after_event_date)){
          const {data:pledges}=await db.from("event_pledge_financial_summary").select("*").eq("event_id",event.id).neq("calculated_status","cancelled").gt("balance",0);
          for(const pledge of pledges??[]){
            if(!/^255[67]\d{8}$/.test(pledge.normalized_phone)){summary.skipped++;continue;}
            const channels=setting.reminder_channel==="both"?["sms","whatsapp"]:[setting.reminder_channel];
            for(const channel of channels){summary.eligible++;const keyValue=`reminder:${pledge.id}:${channel}:${new Date().toISOString().slice(0,10)}`;
              const cooldownStart=new Date(Date.now()-Number(setting.reminder_cooldown_hours??24)*3600000).toISOString();
              const {data:recent}=await db.from("pledge_reminders").select("id").eq("pledge_id",pledge.id).eq("channel",channel).gte("created_at",cooldownStart).limit(1);
              if(recent?.length){summary.skipped++;continue;}
              const message=buildPledgeMessage("pledge_reminder",event.language==="en"?"en":"sw",{guestName:pledge.full_name,eventTitle:event.title,pledgedAmount:pledge.pledged_amount,totalPaid:pledge.total_paid,balance:pledge.balance});
              const {data:inserted,error:insertError}=await db.from("pledge_reminders").insert({pledge_id:pledge.id,event_id:event.id,reminder_type:"pledge_reminder",channel,recipient_phone:pledge.normalized_phone,message_body:message,delivery_status:"queued",idempotency_key:keyValue,requested_by:null}).select("id").maybeSingle();
              if(insertError||!inserted){summary.skipped++;continue;}
              await db.from("finance_audit_logs").insert({event_id:event.id,pledge_id:pledge.id,actor_type:"system",action:"reminder_requested",metadata:{channel,reminder_id:inserted.id}});
              if(channel==="sms"){const result=await sendBeemSms({phoneNumber:pledge.normalized_phone,message});await db.from("pledge_reminders").update({delivery_status:result.success?"sent":"failed",provider_message_id:result.providerMessageId??null,error_message:result.success?null:result.message,sent_at:result.success?new Date().toISOString():null}).eq("id",inserted.id);await db.from("finance_audit_logs").insert({event_id:event.id,pledge_id:pledge.id,actor_type:"system",action:result.success?"reminder_sent":"reminder_failed",metadata:{channel,reminder_id:inserted.id}});if(result.success)summary.sent++;else summary.failed++;}
              else{await db.from("pledge_reminders").update({delivery_status:"failed",error_message:"An approved WhatsApp financial template is not configured."}).eq("id",inserted.id);await db.from("finance_audit_logs").insert({event_id:event.id,pledge_id:pledge.id,actor_type:"system",action:"reminder_failed",metadata:{channel,reminder_id:inserted.id,reason:"template_unavailable"}});summary.failed++;}
            }
          }
          const days=setting.reminder_frequency==="weekly"?7:(setting.custom_interval_days??7);await db.from("event_finance_automation_settings").update({next_reminder_at:new Date(Date.now()+days*86400000).toISOString()}).eq("event_id",event.id);
        }
      }
      if(setting.daily_summary_enabled&&setting.owner_summary_phone){
        const today=new Date().toISOString().slice(0,10);const idempotency=`daily:${event.id}:${setting.daily_summary_channel}:${today}`;
        const {data:payments}=await db.from("pledge_payments").select("amount,voided_at,event_pledges!inner(event_id)").eq("event_pledges.event_id",event.id).eq("payment_date",today).is("voided_at",null);
        const collected=(payments??[]).reduce((sum,p)=>sum+Number(p.amount),0);const message=`${event.title} - Today's Collection\nCollected: ${formatTzs(collected)}\nTransactions: ${payments?.length??0}\nSmart Event Pass`;
        const channel=setting.daily_summary_channel==="whatsapp"?"whatsapp":"sms";
        const {data:log}=await db.from("finance_automation_delivery_logs").insert({event_id:event.id,delivery_type:"daily_summary",channel,recipient_phone:setting.owner_summary_phone,message_body:message,delivery_status:"queued",idempotency_key:idempotency}).select("id").maybeSingle();
        if(log&&channel==="sms"){const result=await sendBeemSms({phoneNumber:setting.owner_summary_phone,message});await db.from("finance_automation_delivery_logs").update({delivery_status:result.success?"sent":"failed",provider_message_id:result.providerMessageId??null,error_message:result.success?null:result.message,sent_at:result.success?new Date().toISOString():null}).eq("id",log.id);if(result.success)summary.dailySent++;}
        else if(log)await db.from("finance_automation_delivery_logs").update({delivery_status:"failed",error_message:"An approved WhatsApp financial template is not configured."}).eq("id",log.id);
      }
    }catch{summary.failed++;continue;}
  }
  return Response.json(summary,{headers:{"Cache-Control":"private, no-store, max-age=0"}});
}
