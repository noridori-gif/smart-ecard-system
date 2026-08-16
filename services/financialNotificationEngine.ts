import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendBeemSms, type BeemSmsErrorDetails } from "@/services/beemSmsService";
import { buildPledgeMessage, formatTzs, renderCustomSmsTemplate, resolveFinancialSmsMessage } from "@/services/pledgeMessageService";
import { sendFinancialWhatsAppTemplate } from "@/services/whatsappCloudService";
import { getFinancialWhatsAppTemplate, type FinancialWhatsAppTemplateOverride } from "@/lib/financialWhatsAppConfig";
import { automaticMessagingEnabled } from "@/services/automationMasterServer";

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
  custom_reminder_message: string | null;
  whatsapp_reminder_template_sw: string | null; whatsapp_reminder_template_en: string | null;
  whatsapp_reminder_template_language_sw: string | null; whatsapp_reminder_template_language_en: string | null;
};

type WhatsAppReminderTemplateFields = Pick<SettingRow,
  "whatsapp_reminder_template_sw" | "whatsapp_reminder_template_en" |
  "whatsapp_reminder_template_language_sw" | "whatsapp_reminder_template_language_en">;
function whatsappReminderOverride(setting: WhatsAppReminderTemplateFields, language: "sw" | "en"): FinancialWhatsAppTemplateOverride {
  return language === "en"
    ? { templateName: setting.whatsapp_reminder_template_en, languageCode: setting.whatsapp_reminder_template_language_en }
    : { templateName: setting.whatsapp_reminder_template_sw, languageCode: setting.whatsapp_reminder_template_language_sw };
}

// Approved WhatsApp templates don't all treat the {{2}} (event title) slot the same way.
// The "reminder" template bakes "harusi ya" (wedding of) into its own fixed body text, so
// {{2}} there is just the bare title. pledge_acknowledgement_sw does NOT -- confirmed via
// its Meta-registered variable sample ("harusi ya Samweli Mutasingwa"), which means the
// full descriptive phrase is expected to arrive as part of the variable itself. Only add a
// kind here once you've confirmed its actual sample in Meta Business Manager the same way
// -- pledge_thank_you hasn't been checked yet, so it stays on the bare-title default.
const EVENT_TITLE_NEEDS_PREFIX = new Set<"reminder" | "pledge_acknowledgement" | "pledge_thank_you">(["pledge_acknowledgement"]);

function eventTitleForSlot(templateKind: "reminder" | "pledge_acknowledgement" | "pledge_thank_you", language: "sw" | "en", title: string) {
  if (!EVENT_TITLE_NEEDS_PREFIX.has(templateKind)) return title;
  return language === "en" ? `wedding of ${title}` : `harusi ya ${title}`;
}

// Single source of truth for the positional variables sent into an approved WhatsApp
// financial template ({{1}}..{{5}}: contributor name, event title, total pledge, total
// received, balance -- see docs/financial-automation.md). Used by BOTH the actual send
// (deliverReminder) and the admin-facing preview (previewFinancialReminders,
// previewPledgeThankYous). Keep call sites pointed at this function rather than inlining
// a parameter array again -- that's exactly how Bug 1 (wrong value in slot 2) and Bug 2
// (preview showing different content than what's actually sent) diverged last time.
function buildWhatsAppTemplateParameters(
  templateKind: "reminder" | "pledge_acknowledgement" | "pledge_thank_you",
  language: "sw" | "en",
  pledge: Pick<PledgeRow, "full_name" | "pledged_amount" | "total_paid" | "balance">,
  event: Pick<EventRow, "title">
): string[] {
  return [pledge.full_name, eventTitleForSlot(templateKind, language, event.title), formatTzs(pledge.pledged_amount), formatTzs(pledge.total_paid), formatTzs(pledge.balance)];
}

// Meta's approved WhatsApp template body text lives only in Meta Business Manager, not in
// this codebase -- env vars here only carry the template NAME + language code (see
// lib/financialWhatsAppConfig.ts, docs/financial-automation.md), so the literal approved
// wording can't be reconstructed for a preview. Instead this shows exactly which
// parameters the template will receive, in order -- guaranteed accurate because it's built
// from the same buildWhatsAppTemplateParameters() call used for the real send.
function describeWhatsAppPreview(
  templateKind: "reminder" | "pledge_thank_you",
  language: "sw" | "en",
  override: FinancialWhatsAppTemplateOverride | undefined,
  parameters: string[]
): string {
  const template = getFinancialWhatsAppTemplate(templateKind, language, override);
  const labels = language === "en"
    ? ["Contributor", "Event", "Total pledged", "Total received", "Balance"]
    : ["Mchangiaji", "Tukio", "Jumla ya ahadi", "Jumla iliyopokelewa", "Salio"];
  const lines = parameters.map((param, index) => `${index + 1}. ${labels[index] ?? `Var ${index + 1}`}: ${param}`).join("\n");
  if (!template.configured) {
    return language === "en"
      ? `WhatsApp template is not configured yet. Once approved, it will be sent with:\n${lines}`
      : `Kiolezo cha WhatsApp bado hakijawekwa. Kikiidhinishwa, kitatumwa na thamani hizi:\n${lines}`;
  }
  return language === "en"
    ? `WhatsApp will send the approved template "${template.templateName}" (${template.languageCode}) with:\n${lines}`
    : `WhatsApp itatuma kiolezo kilichoidhinishwa "${template.templateName}" (${template.languageCode}) na thamani hizi:\n${lines}`;
}
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
export function financialProviderStatus(channel: FinancialChannel, language: "sw" | "en", templateKind: "reminder" | "daily_summary" | "pledge_acknowledgement" | "pledge_thank_you" | "meeting_invitation" = "reminder", templateOverride?: FinancialWhatsAppTemplateOverride) {
  if (channel === "sms") {
    const configured = Boolean(process.env.BEEM_API_KEY && process.env.BEEM_SECRET_KEY && process.env.BEEM_SENDER_NAME);
    return { configured, message: configured ? "Configured" : "BEEM SMS configuration is incomplete." };
  }
  const template = getFinancialWhatsAppTemplate(templateKind, language, templateOverride);
  if(templateKind==="meeting_invitation"&&!template.configured)return {configured:false,message:language==="en"?"English template unavailable.":"Template not configured."};
  const configured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && template.configured);
  const label = templateKind === "reminder" ? "financial reminder" : templateKind === "pledge_acknowledgement" ? "pledge acknowledgement" : templateKind === "pledge_thank_you" ? "pledge thank-you" : templateKind === "meeting_invitation" ? "meeting invitation" : "daily summary";
  const languageLabel = language === "sw" ? "Swahili" : "English";
  return { configured, message: configured ? (templateKind==="meeting_invitation"?`${languageLabel} WhatsApp meeting template configured; verify Meta approval status before sending.`:`Approved ${languageLabel} WhatsApp ${label} template configured.`) : templateKind==="meeting_invitation"?`${languageLabel} WhatsApp meeting template or credentials are not configured.`:`The approved ${languageLabel} WhatsApp ${label} template is not configured.` };
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
    daily_summary_channel: "sms", daily_summary_time: "18:00", custom_reminder_message: null,
    whatsapp_reminder_template_sw: null, whatsapp_reminder_template_en: null,
    whatsapp_reminder_template_language_sw: null, whatsapp_reminder_template_language_en: null,
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
        // WhatsApp preview must reflect what deliverReminder() actually sends -- built from
        // the same buildWhatsAppTemplateParameters() used there, not the SMS
        // custom_reminder_message or the generic buildPledgeMessage() fallback (that
        // mismatch was Bug 2).
        message: channel === "whatsapp"
          ? describeWhatsAppPreview("reminder", language, whatsappReminderOverride(effectiveSetting, language), buildWhatsAppTemplateParameters("reminder", language, pledge, effectiveEvent))
          : effectiveSetting.custom_reminder_message?.trim()
            ? renderCustomSmsTemplate(effectiveSetting.custom_reminder_message, {
                guestName: pledge.full_name, eventTitle: event.title, pledgedAmount: pledge.pledged_amount,
                totalPaid: pledge.total_paid, balance: pledge.balance,
              })
            : buildPledgeMessage("pledge_reminder", language, {
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
    provider: { sms: financialProviderStatus("sms", language), whatsapp: financialProviderStatus("whatsapp", language, "reminder", whatsappReminderOverride(effectiveSetting, language)) },
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
  const [{data:event,error:eventError},{data:setting}]=await Promise.all([
    db.from("events").select("id,title,event_date,language,archived_at").eq("id",input.eventId).single(),
    db.from("event_finance_automation_settings").select("custom_thank_you_message").eq("event_id",input.eventId).maybeSingle(),
  ]);
  if(eventError||!event)throw new Error("Event could not be loaded.");
  const customThankYouMessage=(setting as {custom_thank_you_message:string|null}|null)?.custom_thank_you_message??null;
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
      const thankYouValues={guestName:pledge.full_name,eventTitle:event.title,pledgedAmount:pledge.pledged_amount,totalPaid:pledge.total_paid,balance:pledge.balance};
      // Keep in sync with deliverReminder()'s WhatsApp branch via
      // buildWhatsAppTemplateParameters() -- see the comment on that function. This was the
      // same Bug 2 preview/actual-send mismatch as the reminder preview above.
      const message=channel==="whatsapp"
        ?describeWhatsAppPreview("pledge_thank_you",language,undefined,buildWhatsAppTemplateParameters("pledge_thank_you",language,pledge,event as EventRow))
        :channel==="sms"&&customThankYouMessage?.trim()
          ?renderCustomSmsTemplate(customThankYouMessage,thankYouValues)
          :buildPledgeMessage("pledge_thank_you",language,thankYouValues);
      rows.push({pledgeId:pledge.id,contributor:pledge.full_name,phone:pledge.normalized_phone,pledgedAmount:pledge.pledged_amount,totalPaid:pledge.total_paid,balance:pledge.balance,channel,message,eligible:!reason,skippedReason:reason,deliveryStatus:existing?.delivery_status??null,completionFingerprint:fingerprint,idempotencyKey:key,latestFailure:existing&&!successful?safeThankYouFailure(existing):null});
    }
  }
  return {event:{...event,language} as EventRow,rows,completed:new Set(rows.filter(row=>row.skippedReason!=="not_completed"&&row.skippedReason!=="cancelled").map(row=>row.pledgeId)).size,eligible:rows.filter(row=>row.eligible).length,alreadyThanked:rows.filter(row=>row.skippedReason==="already_thanked").length,missingPhone:rows.filter(row=>row.skippedReason==="missing_phone").length,invalidPhone:rows.filter(row=>row.skippedReason==="invalid_phone").length,skipped:rows.filter(row=>!row.eligible).length,provider:{sms:financialProviderStatus("sms",language,"pledge_thank_you"),whatsapp:financialProviderStatus("whatsapp",language,"pledge_thank_you")}};
}

function failure(error: unknown): { type: BeemSmsErrorDetails["type"]; message: string; retry: boolean } {
  const record=typeof error==="object"&&error!==null?error as Record<string,unknown>:null;
  let message = (error instanceof Error ? error.message : typeof record?.message==="string"?record.message:"Provider request failed.")
    .replace(/[\u0000-\u001f\u007f]+/g," ")
    .replace(/\b(?:postgres(?:ql)?|https?):\/\/\S+/gi,"[redacted URL]")
    .replace(/Bearer\s+[^\s,)]+/gi, "Bearer [redacted]")
    .replace(/\b(?:Basic)\s+\S+/gi,"Basic [redacted]")
    .replace(/(access[_ -]?token|authorization|api[_ -]?key|secret|password|credential)\s*[:=]\s*[^\s,)]+/gi, "$1=[redacted]")
    .replace(/\s+/g," ").trim();
  if(/\b(?:request payload|request body|response payload|response body|provider response)\b/i.test(message))message="Provider request failed.";
  message=message.slice(0,500);
  const explicitType = typeof record?.providerType === "string" ? record.providerType as BeemSmsErrorDetails["type"] : null;
  const configuration = explicitType ? explicitType === "configuration" : /environment|configured|configuration|template/i.test(message);
  const validation = explicitType ? explicitType === "validation" : /phone|invalid/i.test(message);
  return { type: explicitType ?? (configuration ? "configuration" : validation ? "validation" : "provider"), message: message.slice(0, 500), retry: !configuration && !validation };
}

async function deliverReminder(db: SupabaseClient, reminder: {
  id: number; pledge_id: number; event_id: number; channel: FinancialChannel; recipient_phone: string;
  message_body: string; retry_count: number; reminder_type?: string; originating_payment_id?:number|null; source?:string|null;
}, event: EventRow, pledge: PledgeRow, actor: { type: "system" | "authenticated_user" | "organiser_link"; userId?: string | null; linkId?: string | null }, alreadyClaimed = false) {
  if(actor.type==="system"&&!(await automaticMessagingEnabled(db,reminder.event_id))){await db.from("pledge_reminders").update({delivery_status:"held",error_message:"automation_paused",next_retry_at:null}).eq("id",reminder.id);return {status:"skipped" as const,error:undefined}}
  const attempt = reminder.retry_count + 1;
  const attemptUpdate={ delivery_status: "processing", retry_count: attempt, last_attempt_at: new Date().toISOString(), next_retry_at: null };
  if(alreadyClaimed){
    const prepared=await db.from("pledge_reminders").update(attemptUpdate).eq("id",reminder.id).eq("delivery_status","processing").select("id").maybeSingle();
    if(prepared.error||!prepared.data)return {status:"failed" as const,error:"Delivery attempt could not be prepared."};
  }else await db.from("pledge_reminders").update(attemptUpdate).eq("id",reminder.id);
  try {
    let providerMessageId: string | undefined;
    if (reminder.channel === "sms") {
      const result = await sendBeemSms({ phoneNumber: reminder.recipient_phone, message: reminder.message_body, maxAttempts: 1 });
      if (!result.success) {
        const error = new Error(result.errorDetails?.message || result.message);
        Object.assign(error, { providerType: result.errorDetails?.type });
        throw error;
      }
      providerMessageId = result.providerMessageId;
    } else {
      if(reminder.reminder_type==="payment_received")throw new Error("WhatsApp payment acknowledgements are not configured.");
      const language = event.language === "en" ? "en" : "sw";
      const isPledgeReminder = reminder.reminder_type !== "pledge_acknowledgement" && reminder.reminder_type !== "pledge_thank_you";
      const templateKind = reminder.reminder_type === "pledge_acknowledgement" ? "pledge_acknowledgement" : reminder.reminder_type === "pledge_thank_you" ? "pledge_thank_you" : "reminder";
      let templateOverride: ReturnType<typeof whatsappReminderOverride> | undefined;
      if (isPledgeReminder) {
        const { data: setting } = await db.from("event_finance_automation_settings")
          .select("whatsapp_reminder_template_sw,whatsapp_reminder_template_en,whatsapp_reminder_template_language_sw,whatsapp_reminder_template_language_en")
          .eq("event_id", reminder.event_id).maybeSingle();
        if (setting) templateOverride = whatsappReminderOverride(setting, language);
      }
      // Parameter order/values must match previewFinancialReminders()/previewPledgeThankYous()
      // via buildWhatsAppTemplateParameters() -- inlining a separate array here again is
      // exactly how the "Siku N" (day count) leaked into slot 2 instead of the event title
      // (Bug 1) while the preview showed something else entirely (Bug 2).
      const result = await sendFinancialWhatsAppTemplate({
        phoneNumber: reminder.recipient_phone, language,
        templateKind,
        parameters: buildWhatsAppTemplateParameters(templateKind, language, pledge, event),
        templateOverride,
      });
      providerMessageId = result.messageId;
    }
    await db.from("pledge_reminders").update({ delivery_status: "sent", provider_message_id: providerMessageId ?? null, error_message: null, failure_type: null, sent_at: new Date().toISOString() }).eq("id", reminder.id);
    await db.from("finance_audit_logs").insert({ event_id: reminder.event_id, pledge_id: reminder.pledge_id, payment_id:reminder.originating_payment_id??null, actor_type: actor.type, actor_user_id: actor.userId ?? null, organiser_access_link_id: actor.linkId ?? null, action: "reminder_sent", metadata: { event_id:reminder.event_id,pledge_id:reminder.pledge_id,payment_id:reminder.originating_payment_id??null,message_type:reminder.reminder_type??"pledge_reminder",selected_channel:reminder.channel,actor_source:reminder.source??actor.type,delivery_id:reminder.id } });
    return { status: "sent" as const };
  } catch (error) {
    const failed = failure(error);
    const nextRetry = failed.retry && attempt < 3 ? new Date(Date.now() + 15 * 60_000 * 2 ** (attempt - 1)).toISOString() : null;
    await db.from("pledge_reminders").update({ delivery_status: "failed", error_message: failed.message, failure_type: failed.type, next_retry_at: nextRetry }).eq("id", reminder.id);
    await db.from("finance_audit_logs").insert({ event_id: reminder.event_id, pledge_id: reminder.pledge_id, payment_id:reminder.originating_payment_id??null, actor_type: actor.type, actor_user_id: actor.userId ?? null, organiser_access_link_id: actor.linkId ?? null, action: "reminder_failed", metadata: { event_id:reminder.event_id,pledge_id:reminder.pledge_id,payment_id:reminder.originating_payment_id??null,message_type:reminder.reminder_type??"pledge_reminder",selected_channel:reminder.channel,actor_source:reminder.source??actor.type,delivery_id:reminder.id,failure_type: failed.type, safe_provider_error: failed.message } });
    return { status: "failed" as const, error: failed.message };
  }
}

export async function processQueuedPledgeAcknowledgements(db:SupabaseClient,eventId?:number,reminderId?:number):Promise<SendAggregate>{
  let query=db.from("pledge_reminders")
    .select("id,pledge_id,event_id,channel,recipient_phone,message_body,retry_count,reminder_type")
    .eq("delivery_status","queued")
    .like("idempotency_key","pledge-acknowledgement:%")
    .in("reminder_type",["pledge_acknowledgement","pledge_thank_you"])
    .order("id",{ascending:true})
    .limit(100);
  if(eventId)query=query.eq("event_id",eventId);
  if(reminderId)query=query.eq("id",reminderId);
  const {data,error}=await query;
  if(error)throw new Error("Queued pledge acknowledgements could not be loaded.");
  const aggregate:SendAggregate={queued:0,sent:0,failed:0,skipped:0,errors:[]};
  for(const candidate of data??[]){
    const claimed=await db.from("pledge_reminders")
      .update({delivery_status:"processing"})
      .eq("id",candidate.id)
      .eq("delivery_status","queued")
      .select("id,pledge_id,event_id,channel,recipient_phone,message_body,retry_count,reminder_type")
      .maybeSingle();
    if(claimed.error){aggregate.failed+=1;aggregate.errors.push("A queued pledge acknowledgement could not be claimed.");continue}
    if(!claimed.data){aggregate.skipped+=1;continue}
    aggregate.queued+=1;
    const reminder=claimed.data;
    const [eventResult,pledgeResult,settingResult]=await Promise.all([
      db.from("events").select("id,title,event_date,language,archived_at").eq("id",reminder.event_id).maybeSingle(),
      db.from("event_pledge_financial_summary").select("id,event_id,full_name,normalized_phone,pledged_amount,total_paid,balance,calculated_status").eq("id",reminder.pledge_id).eq("event_id",reminder.event_id).maybeSingle(),
      db.from("event_finance_automation_settings").select("pledge_acknowledgement_mode,reminder_channel,automatic_messaging_enabled,custom_pledge_acknowledgement_message,custom_thank_you_message").eq("event_id",reminder.event_id).maybeSingle(),
    ]);
    if(eventResult.error||pledgeResult.error||settingResult.error){
      await db.from("pledge_reminders").update({delivery_status:"queued"}).eq("id",reminder.id).eq("delivery_status","processing");
      aggregate.failed+=1;aggregate.errors.push("A queued pledge acknowledgement could not be validated.");continue;
    }
    const event=eventResult.data,pledge=pledgeResult.data,setting=settingResult.data;
    const channel=reminder.channel as FinancialChannel;
    const validStatus=pledge&&["pledged","partial","completed"].includes(pledge.calculated_status);
    const validPhone=pledge?.normalized_phone&&/^255[67]\d{8}$/.test(pledge.normalized_phone)&&/^255[67]\d{8}$/.test(reminder.recipient_phone);
    const validChannel=(channel==="sms"||channel==="whatsapp")&&setting&&channels(setting.reminder_channel).includes(channel);
    if(setting?.automatic_messaging_enabled===false){await db.from("pledge_reminders").update({delivery_status:"held",error_message:"automation_paused",next_retry_at:null}).eq("id",reminder.id);aggregate.skipped+=1;continue}
    if(!event||!pledge||!setting||setting.pledge_acknowledgement_mode!=="automatic"||!validStatus||!validPhone||!validChannel){
      const message="Automatic pledge acknowledgement is no longer eligible for delivery.";
      await db.from("pledge_reminders").update({delivery_status:"cancelled",error_message:"ineligible_after_revalidation",failure_type:"validation",next_retry_at:null}).eq("id",reminder.id).eq("delivery_status","processing");
      aggregate.skipped+=1;aggregate.errors.push(message);continue;
    }
    const completed=pledge.calculated_status==="completed"&&Number(pledge.balance)<=0;
    const reminderType=completed?"pledge_thank_you":"pledge_acknowledgement";
    const values={guestName:pledge.full_name,eventTitle:event.title,pledgedAmount:pledge.pledged_amount,totalPaid:pledge.total_paid,balance:pledge.balance};
    const message=channel==="sms"?resolveFinancialSmsMessage(reminderType,values,reminderType==="pledge_thank_you"?setting.custom_thank_you_message:setting.custom_pledge_acknowledgement_message).message:buildPledgeMessage(reminderType,event.language==="en"?"en":"sw",values);
    const provider=financialProviderStatus(channel,event.language==="en"?"en":"sw",reminderType==="pledge_thank_you"?"pledge_thank_you":"pledge_acknowledgement");
    if(!provider.configured){await db.from("pledge_reminders").update({delivery_status:"held",error_message:"provider_not_ready",next_retry_at:null}).eq("id",reminder.id);aggregate.skipped+=1;continue}
    const repaired=await db.from("pledge_reminders").update({reminder_type:reminderType,message_body:message,recipient_phone:pledge.normalized_phone}).eq("id",reminder.id).eq("delivery_status","processing").select("id").maybeSingle();
    if(repaired.error||!repaired.data){aggregate.failed+=1;aggregate.errors.push("A queued pledge acknowledgement could not be prepared.");continue}
    const currentReminder={...reminder,reminder_type:reminderType,message_body:message,channel,recipient_phone:pledge.normalized_phone};
    const delivery=await deliverReminder(db,currentReminder,event as EventRow,pledge as PledgeRow,{type:"system"},true);
    aggregate[delivery.status]+=1;
    if(delivery.error)aggregate.errors.push(delivery.error);
  }
  return aggregate;
}

export async function processAutomaticPaymentAcknowledgements(db:SupabaseClient,eventId?:number,reminderId?:number|number[]):Promise<SendAggregate>{
  const now=new Date().toISOString();
  const reminderIds=reminderId===undefined?undefined:Array.isArray(reminderId)?reminderId:[reminderId];
  const fields="id,pledge_id,event_id,channel,recipient_phone,message_body,retry_count,reminder_type,originating_payment_id,originating_source,delivery_status,next_retry_at";
  let queuedQuery=db.from("pledge_reminders")
    .select(fields)
    .like("idempotency_key","payment-acknowledgement:%")
    .in("reminder_type",["payment_received","pledge_thank_you"])
    .eq("delivery_status","queued")
    .lt("retry_count",3)
    .order("id",{ascending:true})
    .limit(100);
  if(eventId)queuedQuery=queuedQuery.eq("event_id",eventId);
  if(reminderIds?.length)queuedQuery=queuedQuery.in("id",reminderIds);
  const queuedResult=await queuedQuery;
  if(queuedResult.error)throw new Error("Automatic payment acknowledgements could not be loaded.");
  const queued=queuedResult.data??[];
  let failed:typeof queued=[];
  if(queued.length<100){
    let failedQuery=db.from("pledge_reminders").select(fields).like("idempotency_key","payment-acknowledgement:%").in("reminder_type",["payment_received","pledge_thank_you"]).eq("delivery_status","failed").lt("retry_count",3).not("next_retry_at","is",null).lte("next_retry_at",now).order("next_retry_at",{ascending:true}).limit(100-queued.length);
    if(eventId)failedQuery=failedQuery.eq("event_id",eventId);
    if(reminderIds?.length)failedQuery=failedQuery.in("id",reminderIds);
    const failedResult=await failedQuery;
    if(failedResult.error)throw new Error("Due payment acknowledgement retries could not be loaded.");
    failed=failedResult.data??[];
  }
  const data=[...queued,...failed];
  const aggregate:SendAggregate={queued:0,sent:0,failed:0,skipped:0,errors:[]};
  for(const candidate of data){
    const claimed=await db.from("pledge_reminders").update({delivery_status:"processing"})
      .eq("id",candidate.id).eq("delivery_status",candidate.delivery_status)
      .select("id,pledge_id,event_id,channel,recipient_phone,message_body,retry_count,reminder_type,originating_payment_id,originating_source").maybeSingle();
    if(claimed.error){aggregate.failed+=1;aggregate.errors.push("A payment acknowledgement could not be claimed.");continue}
    if(!claimed.data){aggregate.skipped+=1;continue}
    aggregate.queued+=1;
    const reminder=claimed.data;
    const [eventResult,pledgeResult,paymentResult,settingResult]=await Promise.all([
      db.from("events").select("id,title,event_date,language,archived_at").eq("id",reminder.event_id).maybeSingle(),
      db.from("event_pledge_financial_summary").select("id,event_id,full_name,normalized_phone,pledged_amount,total_paid,balance,calculated_status").eq("id",reminder.pledge_id).eq("event_id",reminder.event_id).maybeSingle(),
      db.from("pledge_payments").select("id,pledge_id,amount,voided_at,recorded_by").eq("id",reminder.originating_payment_id).eq("pledge_id",reminder.pledge_id).maybeSingle(),
      db.from("event_finance_automation_settings").select("pledge_acknowledgement_mode,reminder_channel,automatic_messaging_enabled").eq("event_id",reminder.event_id).maybeSingle(),
    ]);
    if(eventResult.error||pledgeResult.error||paymentResult.error||settingResult.error){
      await db.from("pledge_reminders").update({delivery_status:candidate.delivery_status}).eq("id",reminder.id).eq("delivery_status","processing");
      aggregate.failed+=1;aggregate.errors.push("A payment acknowledgement could not be validated.");continue;
    }
    const event=eventResult.data,pledge=pledgeResult.data,payment=paymentResult.data,setting=settingResult.data;
    const validPhone=pledge?.normalized_phone&&/^255[67]\d{8}$/.test(pledge.normalized_phone);
    const channel=reminder.channel as FinancialChannel;
    const channelEnabled=setting&&(channel==="sms"||channel==="whatsapp")&&channels(setting.reminder_channel).includes(channel);
    if(setting?.automatic_messaging_enabled===false){await db.from("pledge_reminders").update({delivery_status:"held",error_message:"automation_paused",next_retry_at:null}).eq("id",reminder.id);aggregate.skipped+=1;continue}
    if(!event||!pledge||!payment||payment.voided_at||Number(payment.amount)<=0||!setting||setting.pledge_acknowledgement_mode!=="automatic"||!validPhone||!channelEnabled){
      const message="Automatic payment acknowledgement is no longer eligible for delivery.";
      await db.from("pledge_reminders").update({delivery_status:"cancelled",error_message:"ineligible_after_revalidation",failure_type:"validation",next_retry_at:null}).eq("id",reminder.id).eq("delivery_status","processing");
      aggregate.skipped+=1;aggregate.errors.push(message);continue;
    }
    const templateKind=channel==="whatsapp"&&reminder.reminder_type==="pledge_thank_you"?"pledge_thank_you":"reminder";
    if(!financialProviderStatus(channel,event.language==="en"?"en":"sw",templateKind).configured){await db.from("pledge_reminders").update({delivery_status:"held",error_message:"provider_not_ready",next_retry_at:null}).eq("id",reminder.id);aggregate.skipped+=1;continue}
    const prepared=await db.from("pledge_reminders").update({recipient_phone:pledge.normalized_phone}).eq("id",reminder.id).eq("delivery_status","processing").select("id").maybeSingle();
    if(prepared.error||!prepared.data){aggregate.failed+=1;aggregate.errors.push("A payment acknowledgement could not be prepared.");continue}
    const currentReminder={...reminder,channel,recipient_phone:pledge.normalized_phone,source:reminder.originating_source??(payment.recorded_by?"authenticated_user":"organiser_link")};
    const delivery=await deliverReminder(db,currentReminder,event as EventRow,pledge as PledgeRow,{type:"system"},true);
    aggregate[delivery.status]+=1;
    if(delivery.error)aggregate.errors.push(delivery.error);
  }
  return aggregate;
}

export async function sendFinancialReminders(db: SupabaseClient, preview: ReminderPreview, actor: {
  type: "system" | "authenticated_user" | "organiser_link"; userId?: string | null; linkId?: string | null;
}): Promise<SendAggregate> {
  const aggregate: SendAggregate = { queued: 0, sent: 0, failed: 0, skipped: preview.skipped, errors: [] };
  if(actor.type==="system"){const {data:master}=await db.from("event_finance_automation_settings").select("automatic_messaging_enabled").eq("event_id",preview.event.id).maybeSingle();if(master?.automatic_messaging_enabled===false){aggregate.skipped+=preview.eligible;aggregate.errors.push("automation_paused");return aggregate}}
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
      db.from("event_finance_automation_settings").select("reminders_enabled,reminder_channel,stop_after_event_date,allow_after_event_date,automatic_messaging_enabled").eq("event_id", reminder.event_id).maybeSingle(),
    ]);
    const eventPassed = event ? new Date(`${event.event_date}T23:59:59Z`) < new Date() : true;
    if(setting?.automatic_messaging_enabled===false){await db.from("pledge_reminders").update({delivery_status:"held",error_message:"automation_paused",next_retry_at:null}).eq("id",reminder.id);aggregate.skipped+=1;continue}
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
  if(input.requireEnabled&&setting?.automatic_messaging_enabled===false){aggregate.skipped=input.requestedChannels.length;aggregate.errors.push("automation_paused");return aggregate}
  if (!setting?.owner_summary_phone || (input.requireEnabled && !setting.daily_summary_enabled) || built.event.archived_at) {
    aggregate.skipped = input.requestedChannels.length;
    aggregate.errors.push(!setting?.owner_summary_phone ? "Daily Summary has no valid owner phone." : built.event.archived_at ? "Daily Summary is unavailable for an archived event." : "Daily Summary is not enabled.");
    return aggregate;
  }
  for (const channel of input.requestedChannels) {
    const channelLabel=channel==="sms"?"SMS":"WhatsApp";
    if (!channels(setting.daily_summary_channel).includes(channel)) { aggregate.skipped += 1; aggregate.errors.push(`Daily Summary ${channelLabel} is not enabled.`); continue; }
    const provider = built.provider[channel];
    if (!provider.configured) { aggregate.skipped += 1; aggregate.errors.push(provider.message); continue; }
    const idempotencyKey = `daily-summary:${input.eventId}:${input.date}:${channel}`;
    const existingResult=await db.from("finance_automation_delivery_logs").select("id,delivery_status,retry_count").eq("idempotency_key",idempotencyKey).maybeSingle();
    if(existingResult.error){aggregate.failed+=1;aggregate.errors.push(`Daily Summary ${channelLabel} delivery history could not be checked.`);continue}
    const existing=existingResult.data;
    if(existing&&["sent","delivered","read"].includes(existing.delivery_status)){aggregate.skipped+=1;aggregate.errors.push(`Daily Summary was already sent through ${channelLabel} for this date.`);continue}
    if(existing&&["queued","processing"].includes(existing.delivery_status)){aggregate.skipped+=1;aggregate.errors.push(`Daily Summary ${channelLabel} delivery is already in progress.`);continue}
    let log:{id:number}|null=null;
    if(existing?.delivery_status==="failed"){
      const retried=await db.from("finance_automation_delivery_logs").update({delivery_status:"processing",retry_count:Number(existing.retry_count??0)+1,last_attempt_at:new Date().toISOString(),error_message:null,failure_type:null,next_retry_at:null,recipient_phone:setting.owner_summary_phone,message_body:built.message}).eq("id",existing.id).eq("delivery_status","failed").select("id").maybeSingle();
      if(retried.error||!retried.data){aggregate.failed+=1;aggregate.errors.push(`Daily Summary ${channelLabel} retry could not be prepared.`);continue}
      log=retried.data;
    }else if(existing){aggregate.skipped+=1;aggregate.errors.push(`Daily Summary ${channelLabel} cannot be retried while its delivery is ${existing.delivery_status}.`);continue}
    else{
      const inserted=await db.from("finance_automation_delivery_logs").insert({event_id:input.eventId,delivery_type:"daily_summary",channel,recipient_phone:setting.owner_summary_phone,message_body:built.message,delivery_status:"processing",idempotency_key:idempotencyKey,retry_count:1,last_attempt_at:new Date().toISOString()}).select("id").maybeSingle();
      if(inserted.error||!inserted.data){aggregate.failed+=1;aggregate.errors.push(`Daily Summary ${channelLabel} delivery could not be recorded.`);continue}
      log=inserted.data;
    }
    aggregate.queued += 1;
    if(input.requireEnabled&&!(await automaticMessagingEnabled(db,input.eventId))){await db.from("finance_automation_delivery_logs").update({delivery_status:"held",error_message:"automation_paused",next_retry_at:null}).eq("id",log.id);aggregate.queued-=1;aggregate.skipped+=1;continue}
    try {
      let providerMessageId: string | undefined;
      if (channel === "sms") {
        const smsResult = await sendBeemSms({ phoneNumber: setting.owner_summary_phone, message: built.message, maxAttempts: 1 });
        if (!smsResult.success) {
          const error = new Error(smsResult.errorDetails?.message || smsResult.message);
          Object.assign(error, { providerType: smsResult.errorDetails?.type });
          throw error;
        }
        providerMessageId = smsResult.providerMessageId;
      } else {
        providerMessageId = (await sendFinancialWhatsAppTemplate({
          phoneNumber: setting.owner_summary_phone, language: built.event.language === "en" ? "en" : "sw",
          templateKind: "daily_summary",
          parameters: [built.event.title, formatTzs(built.summary.dailyCollected), String(built.summary.transactionCount), String(built.summary.contributorsCount), formatTzs(built.summary.totalPledged), formatTzs(built.summary.totalCollected), formatTzs(built.summary.outstandingBalance), String(built.summary.collectionPercentage), String(built.summary.outstandingContributors), String(built.summary.completedPledges), built.summary.topContributor ? `${built.summary.topContributor.name} (${formatTzs(built.summary.topContributor.amount)})` : "—"],
        })).messageId;
      }
      const recorded=await db.from("finance_automation_delivery_logs").update({ delivery_status: "sent", provider_message_id: providerMessageId ?? null, sent_at: new Date().toISOString(), error_message: null }).eq("id", log.id);
      if(recorded.error){aggregate.failed+=1;aggregate.errors.push(`Daily Summary ${channelLabel} was accepted, but its delivery result could not be recorded.`);continue}
      aggregate.sent += 1;
    } catch (errorValue) {
      const failed = failure(errorValue);
      const recorded=await db.from("finance_automation_delivery_logs").update({ delivery_status: "failed", failure_type: failed.type, error_message: failed.message, next_retry_at: null }).eq("id", log.id);
      aggregate.failed += 1;
      aggregate.errors.push(failed.message);
      if(recorded.error)aggregate.errors.push(`Daily Summary ${channelLabel} failure could not be recorded.`);
    }
  }
  return aggregate;
}
