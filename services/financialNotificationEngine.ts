import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendBeemSms, type BeemSmsErrorDetails } from "@/services/beemSmsService";
import { buildPledgeMessage, formatTzs } from "@/services/pledgeMessageService";
import { sendFinancialWhatsAppTemplate } from "@/services/whatsappCloudService";
import { getFinancialWhatsAppTemplate } from "@/lib/financialWhatsAppConfig";

export type FinancialChannel = "sms" | "whatsapp";
export type ReminderSkipReason =
  | "completed" | "cancelled" | "no_balance" | "missing_phone" | "invalid_phone"
  | "reminders_disabled" | "channel_disabled" | "event_passed" | "cooldown_active"
  | "duplicate_window" | "not_due" | "archived";

type EventRow = { id: number; title: string; event_date: string; language: "sw" | "en"; archived_at: string | null };
type SettingRow = {
  event_id: number; reminders_enabled: boolean; reminder_channel: "sms" | "whatsapp" | "both";
  reminder_frequency: "manual" | "weekly" | "custom"; custom_interval_days: number | null;
  stop_after_completion: boolean; stop_after_event_date: boolean; allow_after_event_date: boolean;
  next_reminder_at: string | null; reminder_cooldown_hours: number; owner_summary_phone: string | null;
  daily_summary_enabled: boolean; daily_summary_channel: "sms" | "whatsapp" | "both"; daily_summary_time: string;
};
type PledgeRow = {
  id: number; event_id: number; full_name: string; normalized_phone: string | null;
  pledged_amount: string; total_paid: string; balance: string;
  calculated_status: "pledged" | "partial" | "completed" | "cancelled";
};

export type ReminderPreviewRow = {
  pledgeId: number; contributor: string; phone: string | null; pledgedAmount: string;
  totalPaid: string; balance: string; channel: FinancialChannel; message: string;
  eligible: boolean; skippedReason: ReminderSkipReason | null; lastReminderAt: string | null;
  cooldownUntil: string | null; idempotencyKey: string;
};
export type ReminderPreview = {
  event: EventRow; rows: ReminderPreviewRow[]; eligible: number; skipped: number;
  skippedReasons: Partial<Record<ReminderSkipReason, number>>; estimatedMessages: number;
  provider: { sms: { configured: boolean; message: string }; whatsapp: { configured: boolean; message: string } };
};
export type SendAggregate = { queued: number; sent: number; failed: number; skipped: number; errors: string[] };

function channels(value: "sms" | "whatsapp" | "both"): FinancialChannel[] {
  return value === "both" ? ["sms", "whatsapp"] : [value];
}
export function financialProviderStatus(channel: FinancialChannel, language: "sw" | "en", templateKind: "reminder" | "daily_summary" | "pledge_thank_you" = "reminder") {
  if (channel === "sms") {
    const configured = Boolean(process.env.BEEM_API_KEY && process.env.BEEM_SECRET_KEY && process.env.BEEM_SENDER_NAME);
    return { configured, message: configured ? "Configured" : "BEEM SMS configuration is incomplete." };
  }
  const template = getFinancialWhatsAppTemplate(templateKind, language);
  const configured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && template.configured);
  const label = templateKind === "reminder" ? "financial reminder" : templateKind === "pledge_thank_you" ? "pledge thank-you" : "daily summary";
  const languageLabel = language === "sw" ? "Swahili" : "English";
  return { configured, message: configured ? `Approved ${languageLabel} WhatsApp ${label} template configured.` : `The approved ${languageLabel} WhatsApp ${label} template is not configured.` };
}
function windowKey(pledgeId: number, channel: FinancialChannel, cooldownHours: number, now: Date) {
  const windowNumber = Math.floor(now.getTime() / (Math.max(1, cooldownHours) * 3_600_000));
  return `pledge-reminder:${pledgeId}:${channel}:${windowNumber}`;
}
function skipReason(input: {
  event: EventRow; setting: SettingRow; pledge: PledgeRow; channel: FinancialChannel;
  scheduled: boolean; recentAt: string | null; duplicate: boolean; now: Date;
}): ReminderSkipReason | null {
  const { event, setting, pledge, channel, scheduled, recentAt, duplicate, now } = input;
  if (event.archived_at) return "archived";
  if (!setting.reminders_enabled) return "reminders_disabled";
  if (!channels(setting.reminder_channel).includes(channel)) return "channel_disabled";
  if (pledge.calculated_status === "cancelled") return "cancelled";
  if (pledge.calculated_status === "completed") return "completed";
  if (Number(pledge.balance) <= 0) return "no_balance";
  if (!pledge.normalized_phone) return "missing_phone";
  if (!/^255[67]\d{8}$/.test(pledge.normalized_phone)) return "invalid_phone";
  if (setting.stop_after_event_date && !setting.allow_after_event_date && new Date(`${event.event_date}T23:59:59Z`) < now) return "event_passed";
  if (scheduled && (setting.reminder_frequency === "manual" || (setting.next_reminder_at && new Date(setting.next_reminder_at) > now))) return "not_due";
  if (duplicate) return "duplicate_window";
  if (recentAt && new Date(recentAt).getTime() > now.getTime() - setting.reminder_cooldown_hours * 3_600_000) return "cooldown_active";
  return null;
}

export async function previewFinancialReminders(db: SupabaseClient, input: {
  eventId: number; requestedChannels: FinancialChannel[]; pledgeId?: number; scheduled?: boolean; now?: Date; language?: "sw" | "en";
}): Promise<ReminderPreview> {
  const now = input.now ?? new Date();
  const [{ data: event, error: eventError }, { data: setting, error: settingError }] = await Promise.all([
    db.from("events").select("id,title,event_date,language,archived_at").eq("id", input.eventId).single(),
    db.from("event_finance_automation_settings").select("*").eq("event_id", input.eventId).maybeSingle(),
  ]);
  if (eventError || !event) throw new Error("Event could not be loaded.");
  if (settingError) throw new Error("Financial reminder settings could not be loaded.");
  const effectiveSetting = (setting ?? {
    event_id: input.eventId, reminders_enabled: false, reminder_channel: "sms",
    reminder_frequency: "manual", custom_interval_days: null, stop_after_completion: true,
    stop_after_event_date: true, allow_after_event_date: false, next_reminder_at: null,
    reminder_cooldown_hours: 24, owner_summary_phone: null, daily_summary_enabled: false,
    daily_summary_channel: "sms", daily_summary_time: "18:00",
  }) as SettingRow;
  let pledgeQuery = db.from("event_pledge_financial_summary").select("id,event_id,full_name,normalized_phone,pledged_amount,total_paid,balance,calculated_status").eq("event_id", input.eventId).in("calculated_status", ["pledged", "partial"]).gt("balance", 0);
  if (input.pledgeId) pledgeQuery = pledgeQuery.eq("id", input.pledgeId);
  const { data: pledgeData, error: pledgeError } = await pledgeQuery;
  if (pledgeError) throw new Error("Contributors could not be loaded.");
  const pledges = ((pledgeData ?? []) as PledgeRow[]).filter((pledge) => ["pledged", "partial"].includes(pledge.calculated_status) && Number(pledge.balance) > 0);
  const pledgeIds = pledges.map((pledge) => pledge.id);
  const { data: history } = pledgeIds.length
    ? await db.from("pledge_reminders").select("pledge_id,channel,created_at,idempotency_key").in("pledge_id", pledgeIds).order("created_at", { ascending: false })
    : { data: [] };
  const language = input.language ?? (event.language === "en" ? "en" : "sw");
  const effectiveEvent = { ...event, language } as EventRow;
  const rows: ReminderPreviewRow[] = [];
  for (const pledge of pledges) {
    for (const channel of input.requestedChannels) {
      const key = windowKey(pledge.id, channel, Number(effectiveSetting.reminder_cooldown_hours || 24), now);
      const matching = (history ?? []).filter((item) => item.pledge_id === pledge.id && item.channel === channel);
      const lastReminderAt = matching[0]?.created_at ?? null;
      const reason = skipReason({
        event: effectiveEvent, setting: effectiveSetting, pledge, channel,
        scheduled: input.scheduled === true, recentAt: lastReminderAt,
        duplicate: matching.some((item) => item.idempotency_key === key), now,
      });
      rows.push({
        pledgeId: pledge.id, contributor: pledge.full_name, phone: pledge.normalized_phone,
        pledgedAmount: pledge.pledged_amount, totalPaid: pledge.total_paid, balance: pledge.balance,
        channel, eligible: !reason, skippedReason: reason, lastReminderAt,
        cooldownUntil: lastReminderAt ? new Date(new Date(lastReminderAt).getTime() + Number(effectiveSetting.reminder_cooldown_hours) * 3_600_000).toISOString() : null,
        idempotencyKey: key,
        message: buildPledgeMessage("pledge_reminder", language, {
          guestName: pledge.full_name, eventTitle: event.title, pledgedAmount: pledge.pledged_amount,
          totalPaid: pledge.total_paid, balance: pledge.balance,
        }),
      });
    }
  }
  const skippedReasons: Partial<Record<ReminderSkipReason, number>> = {};
  rows.forEach((row) => { if (row.skippedReason) skippedReasons[row.skippedReason] = (skippedReasons[row.skippedReason] ?? 0) + 1; });
  return {
    event: effectiveEvent, rows, eligible: rows.filter((row) => row.eligible).length,
    skipped: rows.filter((row) => !row.eligible).length, skippedReasons,
    estimatedMessages: rows.filter((row) => row.eligible).length,
    provider: { sms: financialProviderStatus("sms", language), whatsapp: financialProviderStatus("whatsapp", language) },
  };
}

export type ThankYouSkipReason = "cancelled" | "not_completed" | "missing_phone" | "invalid_phone" | "already_thanked" | "archived";
export type ThankYouPreview = {
  event: EventRow;
  rows: Array<{
    pledgeId:number;contributor:string;phone:string|null;pledgedAmount:string;totalPaid:string;balance:string;
    channel:FinancialChannel;message:string;eligible:boolean;skippedReason:ThankYouSkipReason|null;
    deliveryStatus:string|null;completionFingerprint:string;idempotencyKey:string;
    latestFailure:{
      httpStatus:number|null;metaCode:number|null;errorSubcode:number|null;
      providerMessage:string;fbtraceId:string|null;retryable:boolean;
    }|null;
  }>;
  completed:number;eligible:number;alreadyThanked:number;missingPhone:number;invalidPhone:number;skipped:number;
  provider:{sms:{configured:boolean;message:string};whatsapp:{configured:boolean;message:string}};
};

function completionFingerprint(pledge:PledgeRow){
  return `${pledge.id}:${pledge.pledged_amount}:${pledge.total_paid}:${pledge.balance}`;
}

function safeThankYouFailure(log:{
  error_message?:string|null;retry_count?:number|null;next_retry_at?:string|null;
}){
  if(!log.error_message)return null;
  const redacted=log.error_message
    .replace(/Bearer\s+[^\s,)]+/gi,"Bearer [redacted]")
    .replace(/(access[_ -]?token|authorization)\s*[:=]\s*[^\s,)]+/gi,"$1=[redacted]")
    .slice(0,500);
  const httpStatus=Number(redacted.match(/HTTP\s+(\d{3})/i)?.[1]??0)||null;
  const metaCode=Number(redacted.match(/\bcode\s+(\d+)/i)?.[1]??0)||null;
  const errorSubcode=Number(redacted.match(/\bsubcode\s+(\d+)/i)?.[1]??0)||null;
  const fbtraceId=redacted.match(/\btrace\s+([A-Za-z0-9_-]+)/i)?.[1]?.slice(0,100)??null;
  const providerMessage=redacted
    .replace(/^WhatsApp Cloud API(?:\s+\(HTTP\s+\d{3}\))?:\s*/i,"")
    .replace(/\s*\((?:code|subcode|trace)\s+[^)]*\)\s*$/i,"")
    .trim()||"WhatsApp provider rejected the message.";
  return {
    httpStatus,metaCode,errorSubcode,providerMessage,fbtraceId,
    retryable:Number(log.retry_count??0)<3,
  };
}

export async function previewPledgeThankYous(db:SupabaseClient,input:{eventId:number;requestedChannels:FinancialChannel[];pledgeId?:number;language?:"sw"|"en"}):Promise<ThankYouPreview>{
  const {data:event,error:eventError}=await db.from("events").select("id,title,event_date,language,archived_at").eq("id",input.eventId).single();
  if(eventError||!event)throw new Error("Event could not be loaded.");
  let query=db.from("event_pledge_financial_summary").select("id,event_id,full_name,normalized_phone,pledged_amount,total_paid,balance,calculated_status").eq("event_id",input.eventId).eq("calculated_status","completed").eq("balance",0);
  if(input.pledgeId)query=query.eq("id",input.pledgeId);
  const {data,error}=await query;if(error)throw new Error("Completed contributors could not be loaded.");
  const pledges=(data??[]) as PledgeRow[];const ids=pledges.map(item=>item.id);
  const {data:logs}=ids.length?await db.from("pledge_reminders").select("pledge_id,channel,idempotency_key,delivery_status,error_message,retry_count,next_retry_at,last_attempt_at").eq("reminder_type","pledge_thank_you").in("pledge_id",ids).order("last_attempt_at",{ascending:false,nullsFirst:false}):{data:[]};
  const language=input.language??(event.language==="en"?"en":"sw");const rows:ThankYouPreview["rows"]=[];
  for(const pledge of pledges){
    const fingerprint=completionFingerprint(pledge);
    for(const channel of input.requestedChannels){
      const key=`pledge-thank-you:${fingerprint}:${channel}`;
      const existing=(logs??[]).find(item=>item.idempotency_key===key);
      const successful=existing&&["sent","delivered","read"].includes(existing.delivery_status);
      let reason:ThankYouSkipReason|null=null;
      if(event.archived_at)reason="archived";else if(pledge.calculated_status==="cancelled")reason="cancelled";else if(Number(pledge.balance)!==0||Number(pledge.total_paid)<Number(pledge.pledged_amount))reason="not_completed";else if(!pledge.normalized_phone)reason="missing_phone";else if(!/^255[67]\d{8}$/.test(pledge.normalized_phone))reason="invalid_phone";else if(successful)reason="already_thanked";
      rows.push({pledgeId:pledge.id,contributor:pledge.full_name,phone:pledge.normalized_phone,pledgedAmount:pledge.pledged_amount,totalPaid:pledge.total_paid,balance:pledge.balance,channel,message:buildPledgeMessage("pledge_thank_you",language,{guestName:pledge.full_name,eventTitle:event.title,pledgedAmount:pledge.pledged_amount,totalPaid:pledge.total_paid,balance:pledge.balance}),eligible:!reason,skippedReason:reason,deliveryStatus:existing?.delivery_status??null,completionFingerprint:fingerprint,idempotencyKey:key,latestFailure:existing&&!successful?safeThankYouFailure(existing):null});
    }
  }
  return {event:{...event,language} as EventRow,rows,completed:new Set(rows.filter(row=>row.skippedReason!=="not_completed"&&row.skippedReason!=="cancelled").map(row=>row.pledgeId)).size,eligible:rows.filter(row=>row.eligible).length,alreadyThanked:rows.filter(row=>row.skippedReason==="already_thanked").length,missingPhone:rows.filter(row=>row.skippedReason==="missing_phone").length,invalidPhone:rows.filter(row=>row.skippedReason==="invalid_phone").length,skipped:rows.filter(row=>!row.eligible).length,provider:{sms:financialProviderStatus("sms",language,"pledge_thank_you"),whatsapp:financialProviderStatus("whatsapp",language,"pledge_thank_you")}};
}

function failure(error: unknown): { type: BeemSmsErrorDetails["type"]; message: string; retry: boolean } {
  const message = (error instanceof Error ? error.message : "Provider request failed.")
    .replace(/Bearer\s+[^\s,)]+/gi, "Bearer [redacted]")
    .replace(/(access[_ -]?token|authorization)\s*[:=]\s*[^\s,)]+/gi, "$1=[redacted]")
    .slice(0, 500);
  const configuration = /environment|configured|configuration|template/i.test(message);
  const validation = /phone|invalid/i.test(message);
  return { type: configuration ? "configuration" : validation ? "validation" : "provider", message: message.slice(0, 500), retry: !configuration && !validation };
}

async function deliverReminder(db: SupabaseClient, reminder: {
  id: number; pledge_id: number; event_id: number; channel: FinancialChannel; recipient_phone: string;
  message_body: string; retry_count: number; reminder_type?: string;
}, event: EventRow, pledge: PledgeRow, actor: { type: "system" | "authenticated_user" | "organiser_link"; userId?: string | null; linkId?: string | null }) {
  const attempt = reminder.retry_count + 1;
  await db.from("pledge_reminders").update({ delivery_status: "processing", retry_count: attempt, last_attempt_at: new Date().toISOString(), next_retry_at: null }).eq("id", reminder.id);
  try {
    let providerMessageId: string | undefined;
    if (reminder.channel === "sms") {
      const result = await sendBeemSms({ phoneNumber: reminder.recipient_phone, message: reminder.message_body, maxAttempts: 1 });
      if (!result.success) {
        const error = new Error(result.message);
        Object.assign(error, { providerType: result.errorDetails?.type });
        throw error;
      }
      providerMessageId = result.providerMessageId;
    } else {
      const result = await sendFinancialWhatsAppTemplate({
        phoneNumber: reminder.recipient_phone, language: event.language === "en" ? "en" : "sw",
        templateKind: reminder.reminder_type === "pledge_thank_you" ? "pledge_thank_you" : "reminder",
        parameters: [pledge.full_name, event.title, formatTzs(pledge.pledged_amount), formatTzs(pledge.total_paid), formatTzs(pledge.balance)],
      });
      providerMessageId = result.messageId;
    }
    await db.from("pledge_reminders").update({ delivery_status: "sent", provider_message_id: providerMessageId ?? null, error_message: null, failure_type: null, sent_at: new Date().toISOString() }).eq("id", reminder.id);
    await db.from("finance_audit_logs").insert({ event_id: reminder.event_id, pledge_id: reminder.pledge_id, actor_type: actor.type, actor_user_id: actor.userId ?? null, organiser_access_link_id: actor.linkId ?? null, action: "reminder_sent", metadata: { channel: reminder.channel, reminder_id: reminder.id } });
    return { status: "sent" as const };
  } catch (error) {
    const failed = failure(error);
    const nextRetry = failed.retry && attempt < 3 ? new Date(Date.now() + 15 * 60_000 * 2 ** (attempt - 1)).toISOString() : null;
    await db.from("pledge_reminders").update({ delivery_status: "failed", error_message: failed.message, failure_type: failed.type, next_retry_at: nextRetry }).eq("id", reminder.id);
    await db.from("finance_audit_logs").insert({ event_id: reminder.event_id, pledge_id: reminder.pledge_id, actor_type: actor.type, actor_user_id: actor.userId ?? null, organiser_access_link_id: actor.linkId ?? null, action: "reminder_failed", metadata: { channel: reminder.channel, reminder_id: reminder.id, failure_type: failed.type, safe_provider_error: failed.message } });
    return { status: "failed" as const, error: failed.message };
  }
}

export async function sendFinancialReminders(db: SupabaseClient, preview: ReminderPreview, actor: {
  type: "system" | "authenticated_user" | "organiser_link"; userId?: string | null; linkId?: string | null;
}): Promise<SendAggregate> {
  const aggregate: SendAggregate = { queued: 0, sent: 0, failed: 0, skipped: preview.skipped, errors: [] };
  for (const row of preview.rows) {
    if (!row.eligible || !row.phone) continue;
    const provider = preview.provider[row.channel];
    if (!provider.configured) { aggregate.skipped += 1; aggregate.errors.push(provider.message); continue; }
    const { data: inserted, error } = await db.from("pledge_reminders").insert({
      pledge_id: row.pledgeId, event_id: preview.event.id, reminder_type: "pledge_reminder",
      channel: row.channel, recipient_phone: row.phone, message_body: row.message,
      delivery_status: "queued", idempotency_key: row.idempotencyKey,
      requested_by: actor.type === "authenticated_user" ? actor.userId ?? null : null,
    }).select("id,pledge_id,event_id,channel,recipient_phone,message_body,retry_count").maybeSingle();
    if (error || !inserted) { aggregate.skipped += 1; continue; }
    aggregate.queued += 1;
    await db.from("finance_audit_logs").insert({ event_id: preview.event.id, pledge_id: row.pledgeId, actor_type: actor.type, actor_user_id: actor.userId ?? null, organiser_access_link_id: actor.linkId ?? null, action: "reminder_requested", metadata: { channel: row.channel, reminder_id: inserted.id } });
    const pledge = { id: row.pledgeId, event_id: preview.event.id, full_name: row.contributor, normalized_phone: row.phone, pledged_amount: row.pledgedAmount, total_paid: row.totalPaid, balance: row.balance, calculated_status: "pledged" } as PledgeRow;
    const delivery = await deliverReminder(db, inserted as Parameters<typeof deliverReminder>[1], preview.event, pledge, actor);
    aggregate[delivery.status] += 1;
    if (delivery.error) aggregate.errors.push(delivery.error);
  }
  return aggregate;
}

export async function sendPledgeThankYous(db:SupabaseClient,preview:ThankYouPreview,actor:{type:"authenticated_user"|"organiser_link";userId?:string|null;linkId?:string|null}):Promise<SendAggregate>{
  const aggregate:SendAggregate={queued:0,sent:0,failed:0,skipped:preview.skipped,errors:[]};
  for(const row of preview.rows){
    if(!row.eligible||!row.phone)continue;
    const provider=preview.provider[row.channel];
    if(!provider.configured){aggregate.skipped+=1;aggregate.errors.push(provider.message);continue;}
    const existing=await db.from("pledge_reminders").select("id,pledge_id,event_id,channel,recipient_phone,message_body,retry_count,reminder_type").eq("idempotency_key",row.idempotencyKey).maybeSingle();
    let log=existing.data;
    if(log){
      const updated=await db.from("pledge_reminders").update({delivery_status:"queued",next_retry_at:null,message_body:row.message,recipient_phone:row.phone}).eq("id",log.id).select("id,pledge_id,event_id,channel,recipient_phone,message_body,retry_count,reminder_type").single();
      log=updated.data;
    }else{
      const inserted=await db.from("pledge_reminders").insert({pledge_id:row.pledgeId,event_id:preview.event.id,reminder_type:"pledge_thank_you",channel:row.channel,recipient_phone:row.phone,message_body:row.message,delivery_status:"queued",idempotency_key:row.idempotencyKey,requested_by:actor.userId}).select("id,pledge_id,event_id,channel,recipient_phone,message_body,retry_count,reminder_type").maybeSingle();
      log=inserted.data;
    }
    if(!log){aggregate.skipped+=1;continue;}
    aggregate.queued+=1;
    await db.from("finance_audit_logs").insert({event_id:preview.event.id,pledge_id:row.pledgeId,actor_type:actor.type,actor_user_id:actor.userId??null,organiser_access_link_id:actor.linkId??null,action:"pledge_thank_you_requested",metadata:{channel:row.channel,reminder_id:log.id,completion_fingerprint:row.completionFingerprint}});
    const pledge={id:row.pledgeId,event_id:preview.event.id,full_name:row.contributor,normalized_phone:row.phone,pledged_amount:row.pledgedAmount,total_paid:row.totalPaid,balance:row.balance,calculated_status:"completed"} as PledgeRow;
    const delivery=await deliverReminder(db,log as Parameters<typeof deliverReminder>[1],preview.event,pledge,actor);
    aggregate[delivery.status]+=1;if(delivery.error)aggregate.errors.push(delivery.error);
  }
  return aggregate;
}

export async function retryDueFinancialReminders(db: SupabaseClient, eventId?: number): Promise<SendAggregate> {
  let query = db.from("pledge_reminders").select("id,pledge_id,event_id,channel,recipient_phone,message_body,retry_count")
    .eq("delivery_status", "failed").lt("retry_count", 3).lte("next_retry_at", new Date().toISOString()).limit(100);
  if (eventId) query = query.eq("event_id", eventId);
  const { data } = await query;
  const aggregate: SendAggregate = { queued: 0, sent: 0, failed: 0, skipped: 0, errors: [] };
  for (const reminder of data ?? []) {
    const [{ data: event }, { data: pledge }, { data: setting }] = await Promise.all([
      db.from("events").select("id,title,event_date,language,archived_at").eq("id", reminder.event_id).maybeSingle(),
      db.from("event_pledge_financial_summary").select("id,event_id,full_name,normalized_phone,pledged_amount,total_paid,balance,calculated_status").eq("id", reminder.pledge_id).maybeSingle(),
      db.from("event_finance_automation_settings").select("reminders_enabled,reminder_channel,stop_after_event_date,allow_after_event_date").eq("event_id", reminder.event_id).maybeSingle(),
    ]);
    const eventPassed = event ? new Date(`${event.event_date}T23:59:59Z`) < new Date() : true;
    if (!event || !pledge || !setting || event.archived_at || !setting.reminders_enabled
      || !channels(setting.reminder_channel).includes(reminder.channel as FinancialChannel)
      || (eventPassed && setting.stop_after_event_date && !setting.allow_after_event_date)
      || pledge.calculated_status === "cancelled" || pledge.calculated_status === "completed"
      || Number(pledge.balance) <= 0 || !/^255[67]\d{8}$/.test(pledge.normalized_phone ?? "")) {
      await db.from("pledge_reminders").update({ next_retry_at: null }).eq("id", reminder.id);
      aggregate.skipped += 1; continue;
    }
    aggregate.queued += 1;
    const delivery = await deliverReminder(db, reminder as Parameters<typeof deliverReminder>[1], event as EventRow, pledge as PledgeRow, { type: "system" });
    aggregate[delivery.status] += 1;
    if (delivery.error) aggregate.errors.push(delivery.error);
  }
  return aggregate;
}

export type DailyFinancialSummary = {
  date: string; dailyCollected: string; transactionCount: number; contributorsCount: number;
  totalPledged: string; totalCollected: string; outstandingBalance: string; collectionPercentage: string;
  outstandingContributors: number; completedPledges: number; topContributor: { name: string; amount: string } | null;
};
export function buildDailySummaryMessage(eventTitle: string, language: "sw" | "en", summary: DailyFinancialSummary) {
  const topEnglish = summary.topContributor ? `\nTop contributor today: ${summary.topContributor.name} (${formatTzs(summary.topContributor.amount)})` : "";
  const topSwahili = summary.topContributor ? `\nMchangiaji mkuu leo: ${summary.topContributor.name} (${formatTzs(summary.topContributor.amount)})` : "";
  if (language === "en") return `Daily Collection Summary\n\nEvent: ${eventTitle}\nAmount collected today: ${formatTzs(summary.dailyCollected)}\nTransactions today: ${summary.transactionCount}\nContributors who paid today: ${summary.contributorsCount}${topEnglish}\n\nTotal pledged: ${formatTzs(summary.totalPledged)}\nTotal collected: ${formatTzs(summary.totalCollected)}\nOutstanding balance: ${formatTzs(summary.outstandingBalance)}\nCollection percentage: ${summary.collectionPercentage}%\n\nContributors with balances: ${summary.outstandingContributors}\nCompleted pledges: ${summary.completedPledges}\n\nSmart Event Pass`;
  return `Muhtasari wa Michango wa Leo\n\nEvent: ${eventTitle}\nKiasi kilichopokelewa leo: ${formatTzs(summary.dailyCollected)}\nMiamala ya leo: ${summary.transactionCount}\nWachangiaji waliolipa leo: ${summary.contributorsCount}${topSwahili}\n\nJumla ya ahadi: ${formatTzs(summary.totalPledged)}\nJumla iliyopokelewa: ${formatTzs(summary.totalCollected)}\nSalio: ${formatTzs(summary.outstandingBalance)}\nAsilimia ya makusanyo: ${summary.collectionPercentage}%\n\nWachangiaji wenye salio: ${summary.outstandingContributors}\nAhadi zilizokamilika: ${summary.completedPledges}\n\nSmart Event Pass`;
}

export async function getDailyFinancialSummary(db: SupabaseClient, eventId: number, date: string) {
  const [{ data: event, error: eventError }, { data: summary, error: summaryError }] = await Promise.all([
    db.from("events").select("id,title,language,archived_at").eq("id", eventId).single(),
    db.rpc("get_financial_daily_summary", { target_event_id: eventId, summary_date: date }),
  ]);
  if (eventError || !event || summaryError || !summary) throw new Error("Daily summary could not be generated.");
  const typed = summary as DailyFinancialSummary;
  const language = event.language === "en" ? "en" : "sw";
  return {
    event, summary: typed, message: buildDailySummaryMessage(event.title, language, typed),
    provider: {
      sms: financialProviderStatus("sms", language, "daily_summary"),
      whatsapp: financialProviderStatus("whatsapp", language, "daily_summary"),
    },
  };
}

export async function sendDailyFinancialSummary(db: SupabaseClient, input: {
  eventId: number; date: string; requestedChannels: FinancialChannel[]; requireEnabled: boolean;
}) {
  const [{ data: setting }, built] = await Promise.all([
    db.from("event_finance_automation_settings").select("*").eq("event_id", input.eventId).single(),
    getDailyFinancialSummary(db, input.eventId, input.date),
  ]);
  const aggregate: SendAggregate = { queued: 0, sent: 0, failed: 0, skipped: 0, errors: [] };
  if (!setting?.owner_summary_phone || (input.requireEnabled && !setting.daily_summary_enabled) || built.event.archived_at) {
    aggregate.skipped = input.requestedChannels.length; return aggregate;
  }
  for (const channel of input.requestedChannels) {
    if (!channels(setting.daily_summary_channel).includes(channel)) { aggregate.skipped += 1; continue; }
    const provider = built.provider[channel];
    if (!provider.configured) { aggregate.skipped += 1; aggregate.errors.push(provider.message); continue; }
    const idempotencyKey = `daily-summary:${input.eventId}:${input.date}:${channel}`;
    const { data: log, error } = await db.from("finance_automation_delivery_logs").insert({
      event_id: input.eventId, delivery_type: "daily_summary", channel,
      recipient_phone: setting.owner_summary_phone, message_body: built.message,
      delivery_status: "processing", idempotency_key: idempotencyKey, retry_count: 1, last_attempt_at: new Date().toISOString(),
    }).select("id").maybeSingle();
    if (error || !log) { aggregate.skipped += 1; continue; }
    aggregate.queued += 1;
    try {
      let providerMessageId: string | undefined;
      if (channel === "sms") {
        const smsResult = await sendBeemSms({ phoneNumber: setting.owner_summary_phone, message: built.message, maxAttempts: 1 });
        if (!smsResult.success) throw new Error(smsResult.message);
        providerMessageId = smsResult.providerMessageId;
      } else {
        providerMessageId = (await sendFinancialWhatsAppTemplate({
          phoneNumber: setting.owner_summary_phone, language: built.event.language === "en" ? "en" : "sw",
          templateKind: "daily_summary",
          parameters: [built.event.title, formatTzs(built.summary.dailyCollected), String(built.summary.transactionCount), String(built.summary.contributorsCount), formatTzs(built.summary.totalPledged), formatTzs(built.summary.totalCollected), formatTzs(built.summary.outstandingBalance), String(built.summary.collectionPercentage), String(built.summary.outstandingContributors), String(built.summary.completedPledges), built.summary.topContributor ? `${built.summary.topContributor.name} (${formatTzs(built.summary.topContributor.amount)})` : "—"],
        })).messageId;
      }
      await db.from("finance_automation_delivery_logs").update({ delivery_status: "sent", provider_message_id: providerMessageId ?? null, sent_at: new Date().toISOString(), error_message: null }).eq("id", log.id);
      aggregate.sent += 1;
    } catch (errorValue) {
      const failed = failure(errorValue);
      await db.from("finance_automation_delivery_logs").update({ delivery_status: "failed", failure_type: failed.type, error_message: failed.message, next_retry_at: null }).eq("id", log.id);
      aggregate.failed += 1;
      aggregate.errors.push(failed.message);
    }
  }
  return aggregate;
}
