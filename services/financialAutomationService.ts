import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import type { FinancialPledge, PledgePayment } from "@/services/financialSuiteService";
import { normalizeTanzanianPhone } from "@/services/pledgeMessageService";

export type AutomationSettings = {
  event_id:number; reminders_enabled:boolean; reminder_channel:"sms"|"whatsapp"|"both";
  reminder_frequency:"manual"|"weekly"|"custom"; custom_interval_days:number|null;
  stop_after_completion:boolean; stop_after_event_date:boolean; allow_after_event_date:boolean;
  next_reminder_at:string|null; reminder_cooldown_hours:number; owner_summary_phone:string|null;
  daily_summary_enabled:boolean; daily_summary_channel:"sms"|"whatsapp"|"both"; daily_summary_time:string;
  allow_after_deadline:boolean;
};
export type TrendPoint={date:string;amount:number;transactions:number};
export type FinanceTargetReport={budget:number|null;deadline:string|null;remaining:number|null;progress:number|null;daysRemaining:number|null;deadlineStatus:string};
export type DailySummary={date:string;amount:number;transactions:number;contributors:number;totalContributors:number;totalPledged:number;totalCollected:number;outstanding:number;percentage:number;target:FinanceTargetReport};
export type ReminderChannel="sms"|"whatsapp";
export type ReminderPreviewRow={pledgeId:number;contributor:string;phone:string|null;pledgedAmount:string;totalPaid:string;balance:string;channel:ReminderChannel;message:string;eligible:boolean;skippedReason:string|null;lastReminderAt:string|null;cooldownUntil:string|null};
export type ReminderPreview={rows:ReminderPreviewRow[];eligible:number;skipped:number;skippedReasons:Record<string,number>;estimatedMessages:number;provider:Record<ReminderChannel,{configured:boolean;message:string}>};
export type ThankYouPreview={event:{id:number;title:string;language:"sw"|"en"};rows:Array<{pledgeId:number;contributor:string;phone:string|null;pledgedAmount:string;totalPaid:string;balance:string;channel:ReminderChannel;message:string;eligible:boolean;skippedReason:string|null;deliveryStatus:string|null;completionFingerprint:string;idempotencyKey:string;latestFailure:{httpStatus:number|null;metaCode:number|null;errorSubcode:number|null;providerMessage:string;fbtraceId:string|null;retryable:boolean}|null}>;completed:number;eligible:number;alreadyThanked:number;missingPhone:number;invalidPhone:number;skipped:number;provider:Record<ReminderChannel,{configured:boolean;message:string}>};
export type ReminderHistoryRow={id:number;pledge_id:number;channel:ReminderChannel;reminder_type:string;created_at:string;sent_at:string|null;delivery_status:string;retry_count:number;next_retry_at:string|null;error_message:string|null;event_pledges:{full_name:string}|Array<{full_name:string}>|null};
export type AuthoritativeDailySummary={event:{id:number;title:string;language:"sw"|"en"};summary:{date:string;dailyCollected:string;transactionCount:number;contributorsCount:number;totalPledged:string;totalCollected:string;outstandingBalance:string;collectionPercentage:string;outstandingContributors:number;completedPledges:number;topContributor:{name:string;amount:string}|null};message:string;provider:Record<ReminderChannel,{configured:boolean;message:string}>};
export type ClosingReport={
  event:{id:number;title:string;event_type:string;event_date:string;venue:string};
  guestStats:{totalGuests:number;totalInvitations:number;viewed:number;accepted:number;maybe:number;declined:number;checkedIn:number};
  financial:{activePledges:number;totalContributors:number;totalPledged:number;totalCollected:number;outstanding:number;percentage:number;completed:number;partial:number;pending:number;cancelled:number;validTransactions:number;voidedTransactions:number;target:FinanceTargetReport};
  pledges:FinancialPledge[];payments:PledgePayment[];trend:TrendPoint[];paymentMethods:{method:string;amount:number}[];
};
const defaults=(eventId:number):AutomationSettings=>({event_id:eventId,reminders_enabled:false,reminder_channel:"sms",reminder_frequency:"manual",custom_interval_days:null,stop_after_completion:true,stop_after_event_date:true,allow_after_event_date:false,next_reminder_at:null,reminder_cooldown_hours:24,owner_summary_phone:null,daily_summary_enabled:false,daily_summary_channel:"sms",daily_summary_time:"18:00",allow_after_deadline:false});

export async function getAutomationSettings(eventId:number){
  const {data,error}=await supabase.from("event_finance_automation_settings").select("*").eq("event_id",eventId).maybeSingle();
  if(error)throw new Error(error.message);return (data as AutomationSettings|null)??defaults(eventId);
}
export async function saveAutomationSettings(settings:AutomationSettings){
  const normalizedSettings={...settings,owner_summary_phone:settings.owner_summary_phone?.trim()?normalizeTanzanianPhone(settings.owner_summary_phone):null};
  const {error}=await supabase.from("event_finance_automation_settings").upsert(normalizedSettings,{onConflict:"event_id"});
  if(error)throw new Error(error.message);
}
export function getReminderEligibility(pledges:FinancialPledge[],eventDate:string,settings:AutomationSettings,deadline?:string|null){
  const eventPassed=new Date(`${eventDate}T23:59:59`).getTime()<Date.now();
  const deadlinePassed=deadline?new Date(`${deadline}T23:59:59`).getTime()<Date.now():false;
  return pledges.map((pledge)=>{
    let reason="";if(!settings.reminders_enabled)reason="Reminders disabled";else if(pledge.calculated_status==="cancelled")reason="Cancelled";else if(Number(pledge.balance)<=0)reason="Completed";else if(!/^255[67]\d{8}$/.test(pledge.normalized_phone ?? ""))reason="Invalid phone";else if(deadlinePassed&&!settings.allow_after_deadline)reason="Contribution deadline has passed";else if(eventPassed&&settings.stop_after_event_date&&!settings.allow_after_event_date)reason="Event has passed";
    return {pledge,eligible:!reason,reason};
  });
}
export async function getClosingReport(eventId:number):Promise<ClosingReport>{
  const [eventResult,pledgeResult,paymentResult,guestResult,invitationResult,targetResult]=await Promise.all([
    supabase.from("events").select("id,title,event_type,event_date,venue").eq("id",eventId).single(),
    supabase.from("event_pledge_financial_summary").select("*").eq("event_id",eventId),
    supabase.from("pledge_payments").select("id,pledge_id,receipt_number,amount,currency_code,payment_date,payment_method,payment_reference,provider,notes,created_at,voided_at,void_reason,event_pledges!inner(event_id)").eq("event_pledges.event_id",eventId),
    supabase.from("guests").select("id,checked_in_at").eq("event_id",eventId),
    supabase.from("invitations").select("id,viewed_at,rsvp_status").eq("event_id",eventId),
    supabase.from("event_finance_targets").select("budget_amount,contribution_deadline").eq("event_id",eventId).maybeSingle(),
  ]);
  const error=eventResult.error||pledgeResult.error||paymentResult.error||guestResult.error||invitationResult.error||targetResult.error;if(error)throw new Error(error.message);
  const pledges=(pledgeResult.data??[]) as FinancialPledge[];const payments=(paymentResult.data??[]) as unknown as PledgePayment[];
  const active=pledges.filter(p=>p.calculated_status!=="cancelled");const valid=payments.filter(p=>!p.voided_at);
  const totalPledged=active.reduce((sum,p)=>sum+Number(p.pledged_amount),0);const totalCollected=active.reduce((sum,p)=>sum+Number(p.total_paid),0);
  const trendMap=new Map<string,{amount:number;transactions:number}>();valid.forEach(p=>{const old=trendMap.get(p.payment_date)??{amount:0,transactions:0};old.amount+=Number(p.amount);old.transactions++;trendMap.set(p.payment_date,old);});
  const methodMap=new Map<string,number>();valid.forEach(p=>methodMap.set(p.payment_method,(methodMap.get(p.payment_method)??0)+Number(p.amount)));
  const guests=guestResult.data??[];const invitations=invitationResult.data??[];
  const budget=targetResult.data?.budget_amount?Number(targetResult.data.budget_amount):null;const deadline=targetResult.data?.contribution_deadline??null;const dayMs=86400000;const today=new Date();today.setHours(0,0,0,0);const daysRemaining=deadline?Math.round((new Date(`${deadline}T00:00:00`).getTime()-today.getTime())/dayMs):null;
  const target:FinanceTargetReport={budget,deadline,remaining:budget===null?null:Math.max(budget-totalCollected,0),progress:budget===null?null:totalCollected/budget*100,daysRemaining,deadlineStatus:budget!==null&&totalCollected>=budget?"Budget achieved":deadline===null?"No deadline":daysRemaining!==null&&daysRemaining<0?"Deadline passed":daysRemaining===0?"Due today":"Upcoming"};
  return {event:eventResult.data,guestStats:{totalGuests:guests.length,totalInvitations:invitations.length,viewed:invitations.filter(i=>i.viewed_at).length,accepted:invitations.filter(i=>i.rsvp_status==="accepted").length,maybe:invitations.filter(i=>i.rsvp_status==="maybe").length,declined:invitations.filter(i=>i.rsvp_status==="declined").length,checkedIn:guests.filter(g=>g.checked_in_at).length},financial:{activePledges:active.length,totalContributors:active.length,totalPledged,totalCollected,outstanding:Math.max(totalPledged-totalCollected,0),percentage:totalPledged?totalCollected/totalPledged*100:0,completed:pledges.filter(p=>p.calculated_status==="completed").length,partial:pledges.filter(p=>p.calculated_status==="partial").length,pending:pledges.filter(p=>p.calculated_status==="pledged").length,cancelled:pledges.filter(p=>p.calculated_status==="cancelled").length,validTransactions:valid.length,voidedTransactions:payments.length-valid.length,target},pledges,payments,trend:[...trendMap].sort().map(([date,v])=>({date,...v})),paymentMethods:[...methodMap].map(([method,amount])=>({method,amount}))};
}
export function dailySummary(report:ClosingReport,date:string):DailySummary{
  const payments=report.payments.filter(p=>p.payment_date===date&&!p.voided_at);
  return {date,amount:payments.reduce((s,p)=>s+Number(p.amount),0),transactions:payments.length,contributors:new Set(payments.map(p=>p.pledge_id)).size,totalContributors:report.financial.totalContributors,totalPledged:report.financial.totalPledged,totalCollected:report.financial.totalCollected,outstanding:report.financial.outstanding,percentage:report.financial.percentage,target:report.financial.target};
}
export function exportClosingWorkbook(report:ClosingReport){
  const book=XLSX.utils.book_new();const add=(name:string,rows:Record<string,unknown>[])=>XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(rows),name);
  add("Summary",[{Metric:"Event",Value:report.event.title},{Metric:"Event Type",Value:report.event.event_type},{Metric:"Event Date",Value:report.event.event_date},{Metric:"Venue",Value:report.event.venue},{Metric:"Total Guests",Value:report.guestStats.totalGuests},{Metric:"Total Contributors",Value:report.financial.totalContributors},{Metric:"Total Invitations",Value:report.guestStats.totalInvitations},{Metric:"Viewed Invitations",Value:report.guestStats.viewed},{Metric:"Accepted RSVP",Value:report.guestStats.accepted},{Metric:"Maybe RSVP",Value:report.guestStats.maybe},{Metric:"Declined RSVP",Value:report.guestStats.declined},{Metric:"Checked In",Value:report.guestStats.checkedIn},{Metric:"Event Budget",Value:report.financial.target.budget??"Not set"},{Metric:"Total Pledged",Value:report.financial.totalPledged},{Metric:"Total Collected",Value:report.financial.totalCollected},{Metric:"Remaining to Budget",Value:report.financial.target.remaining??"Not set"},{Metric:"Budget Progress Percentage",Value:report.financial.target.progress??"Not set"},{Metric:"Contribution Deadline",Value:report.financial.target.deadline??"No deadline"},{Metric:"Deadline Status",Value:report.financial.target.deadlineStatus},{Metric:"Outstanding",Value:report.financial.outstanding},{Metric:"Collection Percentage",Value:report.financial.percentage},{Metric:"Generated",Value:new Date().toISOString()}]);
  const pledgeRows=report.pledges.map(p=>({Contributor:p.full_name,Phone:p.phone,Pledged:p.pledged_amount,Paid:p.total_paid,Balance:p.balance,Status:p.calculated_status,Notes:p.notes??""}));
  add("Pledges",pledgeRows);add("Payments",report.payments.map(p=>({"Receipt Number":p.receipt_number,Amount:p.amount,Currency:p.currency_code??"TZS","Payment Date":p.payment_date,Method:p.payment_method,Reference:p.payment_reference??"",Provider:p.provider??"",Status:p.voided_at?"Voided":"Valid","Void Reason":p.void_reason??""})));
  add("Outstanding",pledgeRows.filter(r=>Number(r.Balance)>0&&r.Status!=="cancelled"));add("Completed",pledgeRows.filter(r=>r.Status==="completed"));
  add("Guest and RSVP Statistics",Object.entries(report.guestStats).map(([Metric,Value])=>({Metric,Value})));
  XLSX.writeFile(book,`${report.event.title.replace(/\W+/g,"_")}_Financial_Closing.xlsx`);
}

async function safeJson(response:Response):Promise<Record<string,unknown>>{
  const text=await response.text();
  if(!text)return {};
  try{return JSON.parse(text) as Record<string,unknown>;}
  catch{throw new Error(`The reminder service returned an invalid response (${response.status}).`);}
}
async function notificationRequest(eventId:number,body:Record<string,unknown>){
  const {data}=await supabase.auth.getSession();if(!data.session?.access_token)throw new Error("Your session has expired.");
  const response=await fetch(`/api/contributions/reminders/${eventId}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify(body)});
  const payload=await safeJson(response);if(!response.ok)throw new Error(typeof payload.error==="string"?payload.error:"Financial notification request failed.");return payload;
}
export function previewReminders(eventId:number,channels:ReminderChannel[],pledgeId?:number){return notificationRequest(eventId,{action:"preview",channels,pledgeId}) as Promise<ReminderPreview>;}
export function sendReminders(eventId:number,channels:ReminderChannel[],pledgeId?:number){return notificationRequest(eventId,{action:"send",channels,pledgeId,confirmed:true}) as Promise<{queued:number;sent:number;failed:number;skipped:number;errors:string[]}>;}
export function previewPledgeThankYous(eventId:number,channels:ReminderChannel[],pledgeId?:number){return notificationRequest(eventId,{action:"thank_you_preview",channels,pledgeId}) as Promise<ThankYouPreview>;}
export function sendPledgeThankYous(eventId:number,channels:ReminderChannel[],pledgeId?:number){return notificationRequest(eventId,{action:"thank_you_send",channels,pledgeId,confirmed:true}) as Promise<{queued:number;sent:number;failed:number;skipped:number;errors:string[]}>;}
export async function getReminderHistory(eventId:number){const result=await notificationRequest(eventId,{action:"history"});return (result.reminders??[]) as ReminderHistoryRow[];}
export function previewDailySummary(eventId:number,date:string){return notificationRequest(eventId,{action:"daily_preview",date}) as Promise<AuthoritativeDailySummary>;}
export function sendDailySummaryNow(eventId:number,date:string,channels:ReminderChannel[]){return notificationRequest(eventId,{action:"daily_send",date,channels,confirmed:true}) as Promise<{queued:number;sent:number;failed:number;skipped:number;errors:string[]}>;}
