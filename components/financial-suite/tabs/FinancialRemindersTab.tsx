"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CompletedThankYouPanel from "./CompletedThankYouPanel";
import MeetingInvitationsPanel from "./MeetingInvitationsPanel";
import MessagePreviewDialog from "../reminders/MessagePreviewDialog";
import ReminderSectionNavigation, { isReminderSection, type ReminderSection } from "../reminders/ReminderSectionNavigation";
import {
  getApprovedWhatsAppTemplates, getAutomationSettings, getPledgeReminderPolicy, getPledgeReminderSchedules, getReminderEligibility, getReminderHistory,
  previewDailySummary, previewPledgeThankYous, previewReminders, saveAutomationSettings, sendDailySummaryNow, sendReminders,
  savePledgeReminderPolicy, type ApprovedWhatsAppTemplate, type AutomationSettings, type PledgeReminderPolicy, type PledgeReminderSchedule, type ReminderChannel, type ReminderHistoryRow,
  type AuthoritativeDailySummary, type ReminderPreview, type ReminderPreviewRow, type ThankYouPreview,
} from "@/services/financialAutomationService";
import type { FinancialPledge } from "@/services/financialSuiteService";
import {
  formatTzs, normalizeTanzanianPhone, analyzeSms, buildPledgeMessage, renderCustomSmsTemplate,
  CUSTOM_SMS_TEMPLATE_PLACEHOLDERS, type PledgeMessageValues,
} from "@/services/pledgeMessageService";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import { formatAppDate } from "@/lib/i18n/formatters";

const statuses = ["queued", "processing", "sent", "delivered", "read", "failed"];
type ReminderDeliveryMode = "whatsapp" | "sms" | "both";
const typeLabels: Record<string, string> = {
  pledge_reminder: "Pledge Reminder",
  pledge_thank_you: "Thank You",
  daily_summary: "Daily Summary",
  receipt_message: "Receipt Message",
};

type SettingsIconName = "automation" | "templates" | "summary";
function SettingsIcon({ name, className = "h-6 w-6" }: { name: SettingsIconName; className?: string }) {
  const paths: Record<SettingsIconName, ReactNode> = {
    automation: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    templates: <><path d="M4 5h16v11H9l-4 3.5V16H4z" /><path d="M8 9h8M8 12h5" /></>,
    summary: <><path d="M4 5h16v14H4z" /><path d="m4 6 8 6 8-6" /></>,
  };
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#e7e1d7] bg-stone-50/70 px-3.5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/40">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-emerald-700" />
    {label}
  </label>;
}
function StatusBadge({ value }: { value: string }) {
  const style = value === "failed" ? "bg-red-50 text-red-700" : value === "read" || value === "delivered" ? "bg-emerald-50 text-emerald-700" : value === "processing" || value === "queued" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${style}`}>{value.replaceAll("_", " ")}</span>;
}
function deliveryKey(pledgeId: number, channel: ReminderChannel) { return `${pledgeId}:${channel}`; }
function friendlySkip(reason: string | null) { return ({cooldown_active:"Cooldown",duplicate_window:"Already Sent",missing_phone:"Missing Phone",invalid_phone:"Invalid Phone",channel_disabled:"Channel Disabled",event_passed:"Event Passed",reminders_disabled:"Reminders Disabled",not_due:"Not Due"} as Record<string,string>)[reason??""]??"Not Sent"; }

export default function FinancialRemindersTab({ eventId, eventDate, deadline, pledges }: { eventId: number; eventDate: string; deadline: string | null; pledges: FinancialPledge[] }) {
  const { language, t } = useAppLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const section: ReminderSection = isReminderSection(requestedSection) ? requestedSection : "send";
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [policy,setPolicy]=useState<PledgeReminderPolicy|null>(null);
  const [schedules,setSchedules]=useState<PledgeReminderSchedule[]>([]);
  const [history, setHistory] = useState<ReminderHistoryRow[]>([]);
  const [thankYou, setThankYou] = useState<ThankYouPreview | null>(null);
  const [preview, setPreview] = useState<ReminderPreview | null>(null);
  const [selected, setSelected] = useState<ReminderPreviewRow | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<ReminderDeliveryMode>("whatsapp");
  const [confirmed, setConfirmed] = useState(false);
  const [bulkConfirmed, setBulkConfirmed] = useState(false);
  const [query, setQuery] = useState("");
  const [financialStatus, setFinancialStatus] = useState("all");
  const [deliveryStatus, setDeliveryStatus] = useState("all");
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(25);
  const [operationQuery, setOperationQuery] = useState("");
  const [operationType, setOperationType] = useState("all");
  const [operationChannel, setOperationChannel] = useState("all");
  const [operationStatus, setOperationStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning,setWarning]=useState("");
  const [busy, setBusy] = useState(false);
  const [dailyPreview,setDailyPreview]=useState<AuthoritativeDailySummary|null>(null);
  const [dailyConfirmed,setDailyConfirmed]=useState(false);
  const [waTemplates,setWaTemplates]=useState<{templates:ApprovedWhatsAppTemplate[];error:string|null}|null>(null);
  const waTemplatesFetchedRef=useRef(false);
  const selectedChannels = useMemo<ReminderChannel[]>(() => deliveryMode === "both" ? ["whatsapp", "sms"] : [deliveryMode], [deliveryMode]);
  const dailyChannels = useMemo<ReminderChannel[]>(() => settings?.daily_summary_channel === "both" ? ["whatsapp", "sms"] : settings ? [settings.daily_summary_channel] : [], [settings]);
  const normalizedOwnerPhone=(()=>{try{return settings?.owner_summary_phone?normalizeTanzanianPhone(settings.owner_summary_phone):""}catch{return ""}})();
  const sampleMessageValues = useMemo<PledgeMessageValues>(() => pledges[0]
    ? { guestName: pledges[0].full_name, eventTitle: "Your Event", pledgedAmount: pledges[0].pledged_amount, totalPaid: pledges[0].total_paid, balance: pledges[0].balance }
    : { guestName: "Jane Doe", eventTitle: "Your Event", pledgedAmount: "100000", totalPaid: "40000", balance: "60000" }, [pledges]);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const [settingsResult, historyResult, thankYouResult,policyResult,scheduleResult] = await Promise.allSettled([
        getAutomationSettings(eventId), getReminderHistory(eventId), previewPledgeThankYous(eventId, ["whatsapp"]),getPledgeReminderPolicy(eventId),getPledgeReminderSchedules(eventId),
      ]);
      const errors: string[] = [];
      if (settingsResult.status === "fulfilled") setSettings(settingsResult.value); else errors.push("Reminder settings could not be loaded.");
      if (historyResult.status === "fulfilled") setHistory(historyResult.value); else errors.push("Reminder operations could not be loaded.");
      if (thankYouResult.status === "fulfilled") setThankYou(thankYouResult.value);
      if(policyResult.status==="fulfilled")setPolicy(policyResult.value);else errors.push("Pledge reminder policy could not be loaded.");
      if(scheduleResult.status==="fulfilled")setSchedules(scheduleResult.value);else errors.push("Reminder schedules could not be loaded.");
      setError(errors.join(" "));
    } finally { setLoading(false); }
  }, [eventId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (section !== "settings" || waTemplatesFetchedRef.current) return;
    waTemplatesFetchedRef.current = true;
    let cancelled = false;
    void getApprovedWhatsAppTemplates()
      .then((result) => { if (!cancelled) setWaTemplates(result); })
      .catch((err) => { if (!cancelled) setWaTemplates({ templates: [], error: err instanceof Error ? err.message : "Approved WhatsApp templates could not be loaded." }); });
    return () => { cancelled = true; };
  }, [section]);

  const eligibility = settings ? getReminderEligibility(pledges, eventDate, settings, deadline) : [];
  const eligibleCount = eligibility.filter((item) => item.eligible).length;
  const latestByChannel = useMemo(() => {
    const map = new Map<string, ReminderHistoryRow>();
    history.forEach((item) => { const key=deliveryKey(item.pledge_id,item.channel);if (!map.has(key)) map.set(key, item); });
    return map;
  }, [history]);
  const outstandingPreviewRows = useMemo(() => (preview?.rows ?? []).filter((row) => {
    const pledge = pledges.find((item) => item.id === row.pledgeId);
    return Boolean(pledge) && ["pledged", "partial"].includes(pledge!.calculated_status) && Number(pledge!.balance) > 0;
  }), [preview, pledges]);
  const safeEligibleRows=useMemo(()=>outstandingPreviewRows.filter(row=>row.eligible),[outstandingPreviewRows]);
  const reminderRows = useMemo(() => {
    const unique = new Map<number, ReminderPreviewRow>();
    outstandingPreviewRows.forEach((row) => { if (!unique.has(row.pledgeId)) unique.set(row.pledgeId, row); });
    return [...unique.values()].filter((row) => {
    const pledge = pledges.find((item) => item.id === row.pledgeId);
    const channelRows=selectedChannels.map(channel=>outstandingPreviewRows.find(item=>item.pledgeId===row.pledgeId&&item.channel===channel)).filter(Boolean) as ReminderPreviewRow[];
    const channelHistory=selectedChannels.map(channel=>latestByChannel.get(deliveryKey(row.pledgeId,channel))).filter(Boolean) as ReminderHistoryRow[];
    const states=[...channelHistory.map(item=>item.delivery_status),...channelRows.map(item=>item.eligible?"ready":friendlySkip(item.skippedReason))].map(value=>value.toLowerCase().replace(" ","_"));
    const deliveryMatches=deliveryStatus==="all"||(deliveryStatus==="not_sent"?channelHistory.length===0:deliveryStatus==="sent"?states.some(value=>["sent","delivered","read"].includes(value)):deliveryStatus==="cooldown"?states.some(value=>["cooldown","already_sent"].includes(value)):states.includes(deliveryStatus));
    return `${row.contributor} ${row.phone ?? ""}`.toLowerCase().includes(query.toLowerCase())
      && (financialStatus === "all" || pledge?.calculated_status === financialStatus)
      && deliveryMatches;
    });
  }, [outstandingPreviewRows, pledges, latestByChannel, query, financialStatus, deliveryStatus,selectedChannels]);
  const pageCount=Math.max(1,Math.ceil(reminderRows.length/pageSize)),safePage=Math.min(page,pageCount),pageRows=reminderRows.slice((safePage-1)*pageSize,safePage*pageSize);
  const recipientCount = new Set(safeEligibleRows.map((row) => row.pledgeId)).size;
  const messageCount = safeEligibleRows.length;
  const alreadySentOrCooldownCount = useMemo(() => new Set(outstandingPreviewRows.filter((row) => {
    if (["cooldown_active", "duplicate_window"].includes(row.skippedReason ?? "")) return true;
    return selectedChannels.some((channel) => {
      const status = latestByChannel.get(deliveryKey(row.pledgeId, channel))?.delivery_status;
      return Boolean(status && ["sent", "delivered", "read", "processing", "queued"].includes(status));
    });
  }).map((row) => row.pledgeId)).size, [outstandingPreviewRows, selectedChannels, latestByChannel]);
  const providerReady = Boolean(preview) && selectedChannels.every((value) => preview!.provider[value].configured);
  const dailyProvidersReady=Boolean(dailyPreview)&&dailyChannels.every(channel=>dailyPreview!.provider[channel].configured);
  const dailyTestReady=Boolean(settings?.daily_summary_enabled&&normalizedOwnerPhone&&dailyPreview&&dailyProvidersReady&&dailyConfirmed);
  const operationRows = useMemo(() => history.filter((item) => {
    const relation = Array.isArray(item.event_pledges) ? item.event_pledges[0] : item.event_pledges;
    return (relation?.full_name ?? "").toLowerCase().includes(operationQuery.toLowerCase())
      && (operationType === "all" || item.reminder_type === operationType)
      && (operationChannel === "all" || item.channel === operationChannel)
      && (operationStatus === "all" || item.delivery_status === operationStatus);
  }), [history, operationQuery, operationType, operationChannel, operationStatus]);

  function navigate(next: ReminderSection) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "reminders"); params.set("section", next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }
  async function save() { if (!settings||!policy) return; const customInterval=settings.custom_interval_days;if(settings.reminder_frequency==="custom"&&(!Number.isInteger(customInterval)||Number(customInterval)<1)){setError("Custom interval requires a whole number of at least 1 day.");return}const normalizedSettings:AutomationSettings={...settings,reminders_enabled:policy.is_enabled,custom_interval_days:settings.reminder_frequency==="custom"?customInterval:null,daily_summary_time:settings.daily_summary_enabled?"06:00":settings.daily_summary_time};try { setBusy(true);setError(""); await Promise.all([saveAutomationSettings(normalizedSettings),savePledgeReminderPolicy(policy)]);const persisted=await getAutomationSettings(eventId);setSettings(persisted);setDailyPreview(null);setDailyConfirmed(false);const frequencyMessage=persisted.reminder_frequency==="custom"?`Custom interval every ${persisted.custom_interval_days} day${persisted.custom_interval_days===1?"":"s"}.`:persisted.reminder_frequency==="weekly"?"Weekly reminders.":"Manual reminders.";const dailyMessage=persisted.daily_summary_enabled&&persisted.owner_summary_phone?" Daily Summary scheduled for the next 09:00 Tanzania automation run.":persisted.daily_summary_enabled?" Daily Summary is not scheduled until a valid owner phone is saved.":" Daily Summary is disabled.";setNotice(`Settings saved: ${frequencyMessage}${dailyMessage}`);await load(); } catch (err) { setError(err instanceof Error ? err.message : "Settings could not be saved."); } finally { setBusy(false); } }
  async function buildDailyPreview(){try{setBusy(true);setError("");setDailyConfirmed(false);setDailyPreview(await previewDailySummary(eventId,new Date().toISOString().slice(0,10)))}catch(err){setError(err instanceof Error?err.message:"Daily Summary preview failed.")}finally{setBusy(false)}}
  async function sendDailyTest(){if(!dailyPreview||!settings)return;const channelLabel=dailyChannels.map(channel=>channel==="sms"?"SMS":"WhatsApp").join(" + ");try{setBusy(true);setError("");setNotice("");setWarning("");const result=await sendDailySummaryNow(eventId,dailyPreview.summary.date,dailyChannels);const reasons=result.errors.join(" ");if(result.failed>0)setError(`Daily Summary ${channelLabel} result: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.${reasons?` ${reasons}`:""}`);else if(result.sent>0){setNotice(result.sent===1&&result.skipped===0?`Daily Summary ${channelLabel} sent successfully.`:`Daily Summary test: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`);if(result.skipped>0)setWarning(`Daily Summary ${channelLabel} partially sent: ${reasons||`${result.skipped} delivery was skipped.`}`)}else if(result.skipped>0)setWarning(`Daily Summary ${channelLabel} not sent: ${reasons||"The delivery was skipped."}`);setDailyConfirmed(false);await load()}catch(err){setError(err instanceof Error?err.message:"Daily Summary test failed.");setDailyConfirmed(false)}finally{setBusy(false)}}
  async function buildPreview() { try { setBusy(true); setError(""); setPreview(await previewReminders(eventId, selectedChannels)); setBulkConfirmed(false); } catch (err) { setError(err instanceof Error ? err.message : "Reminder preview failed."); } finally { setBusy(false); } }
  async function send() { try { setBusy(true); const result = await sendReminders(eventId, selectedChannels); setNotice(`Reminder run: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`); setSelected(null); setConfirmed(false); setBulkConfirmed(false); await load(); await buildPreview(); } catch (err) { setError(err instanceof Error ? err.message : "Reminder run failed."); } finally { setBusy(false); } }

  const sendStats = [
    ["Eligible reminders", eligibleCount],
    ["Eligible thank-you", thankYou?.eligible ?? "—"],
    [t("reminders.sent"), history.filter((item) => item.delivery_status === "sent").length],
    [t("reminders.failed"), history.filter((item) => item.delivery_status === "failed").length],
    [t("reminders.ready"), settings?.next_reminder_at ? formatAppDate(settings.next_reminder_at, language, { dateStyle: "medium", timeStyle: "short" }) : t("common.notSet")],
  ];

  return <div className="space-y-5">
    <ReminderSectionNavigation active={section} onChange={navigate} />
    {loading && <p role="status" className="rounded-xl bg-stone-50 p-3 text-sm text-slate-600">{t("common.loading")}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{notice}</p>}
    {warning&&<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">{warning}</p>}

    {section === "send" && <section className="rounded-2xl border border-[#e7e1d7] bg-white p-4 shadow-sm sm:p-6">
      <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{t("financial.reminders")}</p><h2 className="mt-1 text-xl font-bold">Send Pledge Reminders</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">Only contributors who have not started paying or still have an outstanding balance are included. Completed contributors are available under Thank You.</p></div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        {sendStats.map(([label, value]) => <div key={label} className="min-h-20 rounded-xl border border-stone-200 bg-stone-50 p-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 break-words text-lg font-bold capitalize tabular-nums text-slate-950">{value}</p></div>)}
      </div>
      <div className="mt-4"><p className="text-sm font-bold">Audience</p><div className="mt-2 inline-flex rounded-xl bg-stone-100 p-1"><button type="button" aria-pressed className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold shadow-sm">Outstanding Reminders</button><button type="button" onClick={()=>navigate("thank-you")} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-600">Completed — Thank You</button></div></div><div aria-label="Reminder channel" className="mt-4 inline-flex w-fit rounded-xl bg-stone-100 p-1">{(["whatsapp", "sms", "both"] as ReminderDeliveryMode[]).map((value) => <button key={value} type="button" aria-pressed={deliveryMode === value} onClick={() => { setDeliveryMode(value); setPreview(null); setBulkConfirmed(false); setPage(1); }} className={`min-h-11 rounded-lg px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${deliveryMode === value ? "bg-white shadow-sm" : "text-slate-600"}`}>{value === "both" ? "Both" : value === "whatsapp" ? "WhatsApp" : "SMS"}</button>)}</div>
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void buildPreview()} className="min-h-11 rounded-xl border border-stone-300 px-4 font-semibold">Load Recipients</button>{preview && <><label className="flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 px-3 text-sm"><input type="checkbox" checked={bulkConfirmed} onChange={(event) => setBulkConfirmed(event.target.checked)} />Confirm sending to {recipientCount} contributors ({messageCount} messages{deliveryMode === "both" ? ": WhatsApp + SMS" : ""})</label><button type="button" disabled={busy || !bulkConfirmed || recipientCount === 0 || !providerReady} onClick={() => void send()} className="min-h-11 rounded-xl bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800 disabled:opacity-40">Send Reminders</button></>}</div>
      {preview && <><div className="mt-4 grid gap-2 sm:grid-cols-2">{selectedChannels.map((value) => <p key={value} className={`rounded-xl p-3 text-sm ${preview.provider[value].configured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><b>{value === "whatsapp" ? "WhatsApp" : "SMS"}:</b> {preview.provider[value].message}</p>)}</div><div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-5">{[["Total Outstanding",new Set(outstandingPreviewRows.map(row=>row.pledgeId)).size],["Ready Contributors",recipientCount],["Eligible Messages",messageCount],["Already Sent/Cooldown",alreadySentOrCooldownCount],["Missing/Invalid Phone",new Set(outstandingPreviewRows.filter(row=>["missing_phone","invalid_phone"].includes(row.skippedReason??"")).map(row=>row.pledgeId)).size]].map(([label, value]) => <article key={label} className="rounded-xl border bg-stone-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></article>)}</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]"><label className="text-sm font-semibold">Search contributors<input aria-label="Search reminder contributors by name or phone" value={query} onChange={(event) => {setQuery(event.target.value);setPage(1)}} placeholder="Search name or phone" className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal" /></label>
          <label className="text-sm font-semibold">Contributor Status<select value={financialStatus} onChange={(event) => {setFinancialStatus(event.target.value);setPage(1)}} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal"><option value="all">All Outstanding</option><option value="pledged">Not Started</option><option value="partial">Partially Paid</option></select></label>
          <label className="text-sm font-semibold">Delivery Status<select value={deliveryStatus} onChange={(event) => {setDeliveryStatus(event.target.value);setPage(1)}} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal"><option value="all">Any Status</option><option value="ready">Ready</option><option value="not_sent">Not Sent</option><option value="sent">Sent</option><option value="delivered">Delivered</option><option value="read">Read</option><option value="failed">Failed</option><option value="cooldown">Cooldown</option></select></label>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border"><div className="hidden grid-cols-[1.3fr_1fr_.8fr_repeat(3,.75fr)_1fr_1fr_auto] gap-2 bg-stone-100 p-3 text-xs font-bold lg:grid">{["Contributor","Phone","Payment Status","Pledged","Paid","Balance","WhatsApp","SMS","Action"].map(label=><span key={label}>{label}</span>)}</div>{pageRows.map((row) => { const pledge = pledges.find((item) => item.id === row.pledgeId); const channelBadge=(channel:ReminderChannel)=>{const previewRow=outstandingPreviewRows.find(item=>item.pledgeId===row.pledgeId&&item.channel===channel),latest=latestByChannel.get(deliveryKey(row.pledgeId,channel));return latest?.delivery_status??(previewRow?.eligible?"Ready":friendlySkip(previewRow?.skippedReason??null))};const moneyCell=(label:string,amount:string|number)=><span className="flex flex-col gap-0.5"><span className="text-xs text-slate-500">{label}</span><b className="whitespace-nowrap tabular-nums">{formatTzs(amount)}</b></span>;return <article key={row.pledgeId} className="border-t p-3 first:border-t-0 lg:grid lg:grid-cols-[1.3fr_1fr_.8fr_repeat(3,.75fr)_1fr_1fr_auto] lg:items-center lg:gap-2"><div className="flex justify-between gap-2"><div><h3 className="font-bold">{row.contributor}</h3><p className="text-xs text-slate-500 lg:hidden">{row.phone??"No phone"}</p></div><span className="lg:hidden"><StatusBadge value={pledge?.calculated_status==="partial"?"Partially Paid":"Not Started"}/></span></div><span className="hidden text-sm lg:block">{row.phone??"No phone"}</span><span className="hidden text-sm lg:block">{pledge?.calculated_status==="partial"?"Partially Paid":"Not Started"}</span><div className="mt-2 grid grid-cols-3 gap-2 text-xs lg:contents">{moneyCell("Pledged",row.pledgedAmount)}{moneyCell("Paid",row.totalPaid)}{moneyCell("Balance",row.balance)}</div><div className="mt-2 flex gap-2 lg:contents"><StatusBadge value={`WhatsApp ${channelBadge("whatsapp")}`}/><StatusBadge value={`SMS ${channelBadge("sms")}`}/></div><button type="button" onClick={() => { setSelected(outstandingPreviewRows.find(item=>item.pledgeId===row.pledgeId&&item.eligible)??row); setConfirmed(false); }} className="mt-2 min-h-9 rounded-lg border px-3 text-sm font-bold lg:mt-0">Preview</button></article>})}{!pageRows.length&&<p className="p-8 text-center text-sm text-slate-500">No contributors match these filters.</p>}</div><div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"><p>Showing {reminderRows.length?((safePage-1)*pageSize)+1:0}–{Math.min(safePage*pageSize,reminderRows.length)} of {reminderRows.length} contributors</p><div className="flex items-center gap-2"><label>Rows <select value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1)}} className="rounded-lg border px-2 py-1">{[25,50,100].map(value=><option key={value}>{value}</option>)}</select></label><button disabled={safePage<=1} onClick={()=>setPage(value=>Math.max(1,value-1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={safePage>=pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div></div>
      </>}
      {!preview && <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-slate-600">Choose Load Recipients to load the server-validated audience and provider readiness.</div>}
    </section>}

    {section === "thank-you" && <CompletedThankYouPanel eventId={eventId} onShowReminders={()=>navigate("send")} />}

    {section === "meetings"&&<MeetingInvitationsPanel eventId={eventId} pledges={pledges}/>}

    {section === "schedule"&&<section className="rounded-2xl border border-[#e7e1d7] bg-white p-4 shadow-sm sm:p-6"><h2 className="text-xl font-bold">Reminder Schedule</h2><p className="mt-1 text-sm text-slate-600">Scheduled, recommended, paused, stopped, and completed reminder activity remains visible here.</p><div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">{[["Due today",schedules.filter(item=>item.status==="scheduled"&&item.scheduled_for.slice(0,10)===new Date().toISOString().slice(0,10)).length],["Upcoming",schedules.filter(item=>item.status==="scheduled"&&new Date(item.scheduled_for)>new Date()).length],["Recommended",schedules.filter(item=>item.status==="recommended").length],["Failed",schedules.filter(item=>item.status==="failed").length],["No date",pledges.filter(item=>!item.expected_completion_date).length],["Paused",schedules.filter(item=>item.cancel_reason==="paused").length],["Completed / Stopped",schedules.filter(item=>["cancelled","skipped","sent","delivered"].includes(item.status)).length]].map(([label,value])=><article key={label} className="rounded-xl border bg-stone-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></article>)}</div><div className="mt-5 grid gap-3">{schedules.map(item=>{const relation=Array.isArray(item.event_pledges)?item.event_pledges[0]:item.event_pledges;return <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><h3 className="font-bold">{relation?.full_name??"Contributor"}</h3><p className="mt-1 text-sm text-slate-500">{item.schedule_type.replaceAll("_"," ")} · {new Date(item.scheduled_for).toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">{relation?.expected_completion_date?`Expected completion: ${relation.expected_completion_date}`:"Manual reminder · No completion date"}</p>{!relation?.normalized_phone&&<p className="mt-2 text-sm font-semibold text-amber-800">{language==="sw"?"Hakuna namba ya simu ya kutuma ujumbe.":"No phone number is available for messaging."}</p>}</div><StatusBadge value={item.status}/></div></article>})}{!schedules.length&&<p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No reminder schedules yet. Manual reminders remain available.</p>}</div></section>}

    {section === "activity" && <section className="rounded-2xl border border-[#e7e1d7] bg-white p-4 shadow-sm sm:p-6"><h2 className="text-xl font-bold">Activity</h2><p className="mt-1 text-sm text-slate-600">Monitor reminder and thank-you delivery and retry state without exposing provider payloads.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{statuses.map((value) => <div key={value} className="rounded-xl border border-stone-200 bg-stone-50 p-3"><p className="text-xs capitalize text-slate-500">{value}</p><p className="mt-1 text-xl font-bold tabular-nums">{history.filter((item) => item.delivery_status === value).length}</p></div>)}<div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><p className="text-xs text-slate-500">Retries pending</p><p className="mt-1 text-xl font-bold tabular-nums">{history.filter((item) => item.delivery_status === "failed" && item.next_retry_at && item.retry_count < 3).length}</p></div></div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4"><label className="text-sm font-semibold">Search contributor<input value={operationQuery} onChange={(event) => setOperationQuery(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal" /></label><label className="text-sm font-semibold">Message type<select value={operationType} onChange={(event) => setOperationType(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal"><option value="all">All</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold">Channel<select value={operationChannel} onChange={(event) => setOperationChannel(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal"><option value="all">All</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option></select></label><label className="text-sm font-semibold">Status<select value={operationStatus} onChange={(event) => setOperationStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal"><option value="all">All</option>{statuses.map((value) => <option key={value} value={value} className="capitalize">{value}</option>)}</select></label></div>
      <div className="mt-4 max-h-[560px] overflow-auto rounded-xl border border-stone-200"><table className="w-full min-w-[900px] text-left text-sm"><thead className="sticky top-0 z-10 bg-stone-100 text-xs uppercase tracking-wide text-slate-600"><tr>{["Contributor", "Channel", "Type", "Requested", "Sent", "Status", "Retries", "Error"].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{operationRows.map((item) => { const relation = Array.isArray(item.event_pledges) ? item.event_pledges[0] : item.event_pledges; return <tr key={item.id} className="border-t border-stone-200"><td className="p-3 font-semibold">{relation?.full_name ?? "Contributor"}</td><td className="p-3 capitalize">{item.channel}</td><td className="p-3">{typeLabels[item.reminder_type] ?? item.reminder_type.replaceAll("_", " ")}</td><td className="p-3">{new Date(item.created_at).toLocaleString()}</td><td className="p-3">{item.sent_at ? new Date(item.sent_at).toLocaleString() : "—"}</td><td className="p-3"><StatusBadge value={item.delivery_status} /></td><td className="p-3 tabular-nums">{item.retry_count}/3</td><td className="max-w-60 p-3">{item.error_message ? <details><summary className="max-w-48 cursor-pointer truncate text-red-700">{item.error_message}</summary><p className="mt-2 break-words text-xs text-red-700">{item.error_message}</p></details> : "—"}</td></tr>; })}</tbody></table>{!operationRows.length && <p className="py-10 text-center text-sm text-slate-500">No deliveries match these filters.</p>}</div>
    </section>}

    {section === "settings" && <div className="space-y-5">
      <div><h2 className="sep-section-title">Reminder Settings</h2><p className="sep-secondary mt-1">Configure reminder delivery, owner summaries, and scheduling.</p></div>
      {settings && <>
      <SettingsCard icon="automation" title="Automation Rules" description="When reminders fire, on which channel, and how often.">
        {policy&&<fieldset>
          <legend className="text-xs font-bold uppercase tracking-wide text-slate-500">Pledge reminder policy</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <CheckboxField label="Enable reminder automation" checked={policy.is_enabled} onChange={value=>setPolicy({...policy,is_enabled:value})}/>
            <SettingSelect label="Reminder mode" value={policy.reminder_mode} hint="Manual: you trigger every send. Automatic: sent on the schedule below. Hybrid: automatic sends, plus manual anytime." onChange={value=>setPolicy({...policy,reminder_mode:value as PledgeReminderPolicy["reminder_mode"],no_date_behavior:value!=="automatic"&&policy.no_date_behavior==="automatic_after_days"?"manual_only":policy.no_date_behavior})} options={[["manual","Manual"],["automatic","Automatic"],["hybrid","Hybrid"]]}/>
            <SettingInput label="Before due date (days)" type="number" value={policy.before_due_days} onChange={value=>setPolicy({...policy,before_due_days:Number(value)})}/>
            <CheckboxField label="On due date" checked={policy.on_due_date_enabled} onChange={value=>setPolicy({...policy,on_due_date_enabled:value})}/>
            <SettingInput label="After due date (days)" type="number" value={policy.after_due_days} onChange={value=>setPolicy({...policy,after_due_days:Number(value)})}/>
            <SettingInput label="Repeat interval (minimum 3 days)" type="number" value={policy.repeat_after_due_days??""} onChange={value=>setPolicy({...policy,repeat_after_due_days:value?Number(value):null})}/>
            <SettingInput label="Maximum reminders" type="number" value={policy.maximum_automatic_reminders} onChange={value=>setPolicy({...policy,maximum_automatic_reminders:Number(value)})}/>
            <SettingSelect label="No completion date" value={policy.no_date_behavior} hint="Applies when a contributor has no expected completion date: send manually only, recommend a reminder after a delay, or (Automatic mode) send one automatically." onChange={value=>setPolicy({...policy,no_date_behavior:value as PledgeReminderPolicy["no_date_behavior"]})} options={[["manual_only","Manual reminder"],["recommend_after_days","Recommend after delay"],...(policy.reminder_mode==="automatic"?[["automatic_after_days","Send automatically after delay"]]:[])]}/>
            <SettingInput label="No-date delay (days)" type="number" value={policy.no_date_delay_days} onChange={value=>setPolicy({...policy,no_date_delay_days:Number(value)})}/>
            <CheckboxField label="Stop after event date" checked={policy.stop_after_event} onChange={value=>setPolicy({...policy,stop_after_event:value})}/>
          </div>
          <div className="mt-4 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <SettingsIcon name="automation" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div className="text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Example timeline</p>
              <p className="mt-1 font-semibold text-emerald-900">Expected date: 30 September 2026</p>
              <p className="mt-1 text-emerald-800">{30-policy.before_due_days} Sep — Before due reminder · 30 Sep — Due-date reminder · {policy.after_due_days<=31?`${String(policy.after_due_days).padStart(2,"0")} Oct`:"Configured interval"} — Overdue reminder</p>
            </div>
          </div>
          {(policy.repeat_after_due_days??99)<3&&<p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Repeat intervals shorter than 3 days are not allowed.</p>}
        </fieldset>}
        <fieldset className="border-t border-[#e7e1d7] pt-6">
          <legend className="text-xs font-bold uppercase tracking-wide text-slate-500">Reminder delivery</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <CheckboxField label="Reminders enabled" checked={settings.reminders_enabled} onChange={(value) => setSettings({...settings, reminders_enabled: value})} />
            <CheckboxField label="Allow after deadline" checked={settings.allow_after_deadline} onChange={(value) => setSettings({...settings, allow_after_deadline: value})} />
            <SettingSelect label="Channel" value={settings.reminder_channel} onChange={(value) => setSettings({...settings, reminder_channel: value as AutomationSettings["reminder_channel"]})} options={[["sms","SMS"],["whatsapp","WhatsApp"],["both","Both"]]} />
            <SettingSelect label="Frequency" value={settings.reminder_frequency} onChange={(value) => setSettings({...settings, reminder_frequency: value as AutomationSettings["reminder_frequency"]})} options={[["manual","Manual only"],["weekly","Weekly"],["custom","Custom interval"]]} />
            {settings.reminder_frequency === "custom" && <SettingInput label="Interval days" type="number" value={settings.custom_interval_days ?? 7} onChange={(value) => setSettings({...settings, custom_interval_days: Number(value)})} />}
            <SettingInput label="Cooldown hours" type="number" value={settings.reminder_cooldown_hours} hint="Minimum wait before the same contributor can get another reminder on the same channel." onChange={(value) => setSettings({...settings, reminder_cooldown_hours: Number(value)})} />
          </div>
          <p className="sep-caption mt-3">&quot;Allow after deadline&quot; and &quot;Stop after event date&quot; above are independent — the deadline is the contribution cutoff you set, the event date is the day of the event itself.</p>
        </fieldset>
        <fieldset className="border-t border-[#e7e1d7] pt-6">
          <legend className="text-xs font-bold uppercase tracking-wide text-slate-500">Scheduling</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-[#e7e1d7] bg-stone-50 p-3.5"><p className="sep-label">Next reminder</p><p className="mt-1 text-sm text-slate-700">{settings.next_reminder_at ? new Date(settings.next_reminder_at).toLocaleString() : "Not scheduled"}</p></div>
            <div className="rounded-xl border border-[#e7e1d7] bg-stone-50 p-3.5"><p className="sep-label">Readiness</p><p className="mt-1 text-sm text-slate-700">{settings.reminders_enabled ? "Enabled; provider readiness is checked during preview." : "Enable reminders to schedule or send."}</p></div>
          </div>
        </fieldset>
      </SettingsCard>
      <SettingsCard icon="templates" title="Message Templates" description="What gets sent, per channel.">
        <fieldset className="rounded-xl border border-[#e7e1d7] bg-stone-50/70 p-4 sm:p-5">
          <legend className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />SMS</legend>
          <p className="sep-secondary mt-1">Customize the SMS wording sent for reminders and thank-you messages.</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <MessageTemplateEditor
              label="Reminder SMS"
              value={settings.custom_reminder_message ?? ""}
              onChange={(value) => setSettings({...settings, custom_reminder_message: value || null})}
              sampleValues={sampleMessageValues}
              buildDefault={() => buildPledgeMessage("pledge_reminder", language === "en" ? "en" : "sw", sampleMessageValues)}
            />
            <MessageTemplateEditor
              label="Thank You SMS"
              value={settings.custom_thank_you_message ?? ""}
              onChange={(value) => setSettings({...settings, custom_thank_you_message: value || null})}
              sampleValues={sampleMessageValues}
              buildDefault={() => buildPledgeMessage("pledge_thank_you", language === "en" ? "en" : "sw", sampleMessageValues)}
            />
          </div>
        </fieldset>
        <fieldset className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-4 sm:p-5">
          <legend className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />WhatsApp</legend>
          <p className="sep-secondary mt-1">By default, reminders use the shared Meta-approved WhatsApp template. Pick your own approved template below (e.g. with your committee name written into the approved text) to use it instead — leave on &quot;Use the shared default&quot; otherwise.</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <WhatsAppTemplatePicker
              label="Reminder template (Swahili)"
              name={settings.whatsapp_reminder_template_sw}
              languageCode={settings.whatsapp_reminder_template_language_sw}
              defaultLanguageCode="sw"
              languagePrefix="sw"
              templatesState={waTemplates}
              onChange={(name, languageCode) => setSettings({...settings, whatsapp_reminder_template_sw: name, whatsapp_reminder_template_language_sw: languageCode})}
            />
            <WhatsAppTemplatePicker
              label="Reminder template (English)"
              name={settings.whatsapp_reminder_template_en}
              languageCode={settings.whatsapp_reminder_template_language_en}
              defaultLanguageCode="en_US"
              languagePrefix="en"
              templatesState={waTemplates}
              onChange={(name, languageCode) => setSettings({...settings, whatsapp_reminder_template_en: name, whatsapp_reminder_template_language_en: languageCode})}
            />
          </div>
        </fieldset>
      </SettingsCard>
      <SettingsCard icon="summary" title="Owner Summary" description="Your own daily collection digest.">
        <fieldset>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <CheckboxField label="Daily summary enabled" checked={settings.daily_summary_enabled} onChange={(value) => {setSettings({...settings,daily_summary_enabled:value,daily_summary_time:value?"06:00":settings.daily_summary_time});setDailyPreview(null);setDailyConfirmed(false)}} />
            <SettingInput label="Owner summary phone" value={settings.owner_summary_phone ?? ""} onChange={(value) => {setSettings({...settings,owner_summary_phone:value||null});setDailyPreview(null);setDailyConfirmed(false)}} />
            <SettingSelect label="Daily summary channel" value={settings.daily_summary_channel} onChange={(value) => {setSettings({...settings,daily_summary_channel:value as AutomationSettings["daily_summary_channel"]});setDailyPreview(null);setDailyConfirmed(false)}} options={[["sms","SMS"],["whatsapp","WhatsApp"],["both","Both"]]} />
            <div className="rounded-xl border border-[#e7e1d7] bg-stone-50 p-3.5"><p className="sep-label">Automatic daily summary time</p><p className="mt-1 text-sm font-bold text-slate-900">09:00 Tanzania time (06:00 UTC)</p></div>
          </div>
          <p className="sep-caption mt-3">The current Vercel Hobby plan processes scheduled automation once per day. Use Make automation later if an exact custom delivery time is required.</p>
          {settings.daily_summary_enabled&&settings.daily_summary_time.slice(0,5)!=="06:00"&&<p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">The previously saved time will be normalized to 06:00 UTC when you save these settings.</p>}
          <div className="mt-5 rounded-xl border border-[#e7e1d7] bg-stone-50 p-4 sm:p-5">
            <h3 className="sep-card-title text-base">Daily Summary Test</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" disabled={busy||!settings.daily_summary_enabled||!normalizedOwnerPhone} onClick={()=>void buildDailyPreview()} className="min-h-10 rounded-lg border border-[#e7e1d7] bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-40">Preview Today&apos;s Summary</button>{dailyChannels.map(channel=><span key={channel} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${dailyPreview?.provider[channel].configured?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-800"}`}><span className={`h-1.5 w-1.5 rounded-full ${dailyPreview?.provider[channel].configured?"bg-emerald-500":"bg-amber-500"}`} aria-hidden="true" />{channel==="sms"?"SMS":"WhatsApp"}: {dailyPreview?dailyPreview.provider[channel].configured?"Ready":dailyPreview.provider[channel].message:"Preview required"}</span>)}</div>
            {dailyPreview&&<><pre className="mt-3 whitespace-pre-wrap rounded-lg border border-[#e7e1d7] bg-white p-3 font-sans text-sm text-slate-700">{dailyPreview.message}</pre><label className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={dailyConfirmed} onChange={event=>setDailyConfirmed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700"/>I confirm sending this test summary to {normalizedOwnerPhone}.</label><button type="button" disabled={!dailyTestReady||busy} onClick={()=>void sendDailyTest()} className="mt-3 min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-40">Send Test Summary Now</button></>}
          </div>
        </fieldset>
      </SettingsCard>
      </>}
      <div className="sticky bottom-0 flex justify-end rounded-2xl border border-[#e7e1d7] bg-white/95 p-4 shadow-sm backdrop-blur sm:px-6"><button type="button" disabled={busy || !settings} onClick={() => void save()} className="min-h-11 rounded-xl bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800 disabled:opacity-40">Save Settings</button></div>
    </div>}
    <MessagePreviewDialog open={Boolean(selected)} title={selected ? `Preview for ${selected.contributor}` : "Reminder preview"} channel={selected?.channel === "sms" ? "SMS" : "WhatsApp"} message={selected?.message ?? ""} providerMessage={selected ? preview?.provider[selected.channel].message ?? "" : ""} providerReady={Boolean(selected && preview?.provider[selected.channel].configured)} confirmed={confirmed} busy={busy} canSend={Boolean(selected?.eligible && recipientCount)} confirmationLabel={`Confirm sending to ${recipientCount} contributors (${messageCount} messages${deliveryMode === "both" ? ": WhatsApp + SMS" : ""})`} sendLabel="Send Reminders" onConfirmedChange={setConfirmed} onClose={() => setSelected(null)} onSend={() => void send()} />
  </div>;
}

function SettingsCard({ icon, title, description, children }: { icon: SettingsIconName; title: string; description?: string; children: ReactNode }) {
  return <section className="sep-card p-4 sm:p-6">
    <div className="flex items-start gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><SettingsIcon name={icon} /></span>
      <div><h3 className="sep-card-title">{title}</h3>{description && <p className="sep-secondary mt-1">{description}</p>}</div>
    </div>
    <div className="mt-5 space-y-6">{children}</div>
  </section>;
}
function SettingInput({ label, value, type = "text", hint, onChange }: { label: string; value: string | number; type?: string; hint?: string; onChange: (value: string) => void }) {
  return <label className="sep-label block">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="sep-control mt-1.5" />{hint && <span className="sep-caption mt-1.5 block font-normal">{hint}</span>}</label>;
}
function SettingSelect({ label, value, options, hint, onChange }: { label: string; value: string; options: string[][]; hint?: string; onChange: (value: string) => void }) {
  return <label className="sep-label block">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="sep-control mt-1.5">{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select>{hint && <span className="sep-caption mt-1.5 block font-normal">{hint}</span>}</label>;
}
function WhatsAppTemplatePicker({ label, name, languageCode, defaultLanguageCode, languagePrefix, templatesState, onChange }: {
  label: string; name: string | null; languageCode: string | null; defaultLanguageCode: string; languagePrefix: string;
  templatesState: { templates: ApprovedWhatsAppTemplate[]; error: string | null } | null;
  onChange: (name: string | null, languageCode: string | null) => void;
}) {
  const [manual, setManual] = useState(false);
  if (!templatesState) {
    return <label className="sep-label block">{label}<select disabled className="sep-control mt-1.5 bg-stone-50 text-slate-400"><option>Loading approved templates…</option></select></label>;
  }
  const matching = templatesState.templates.filter((item) => item.language.toLowerCase().startsWith(languagePrefix));
  const showManual = manual || Boolean(templatesState.error) || matching.length === 0;
  if (!showManual) {
    const selectValue = name && matching.some((item) => item.name === name) ? name : "";
    return <label className="sep-label block">{label}
      <select value={selectValue} onChange={(event) => {
        if (event.target.value === "__manual__") { setManual(true); return; }
        if (event.target.value === "") { onChange(null, null); return; }
        const template = matching.find((item) => item.name === event.target.value);
        onChange(template?.name ?? null, template?.language ?? null);
      }} className="sep-control mt-1.5">
        <option value="">Use the shared default</option>
        {matching.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        <option value="__manual__">Other — enter manually</option>
      </select>
    </label>;
  }
  return <div className="grid gap-2">
    <SettingInput label={`${label} — template name`} value={name ?? ""} onChange={(value) => onChange(value || null, languageCode ?? defaultLanguageCode)} />
    <SettingInput label={`${label} — language code`} value={languageCode ?? defaultLanguageCode} onChange={(value) => onChange(name, value || null)} />
    <p className="sep-caption">{templatesState.error
      ? `Couldn't load your approved templates automatically (${templatesState.error}) — enter the exact template name manually.`
      : "No approved templates found for this language — enter the exact template name manually."}</p>
  </div>;
}
function MessageTemplateEditor({ label, value, onChange, sampleValues, buildDefault }: {
  label: string; value: string; onChange: (value: string) => void; sampleValues: PledgeMessageValues; buildDefault: () => string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  function insertPlaceholder(token: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}{${token}}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length + 2, start + token.length + 2); });
  }
  const previewText = value.trim() ? renderCustomSmsTemplate(value, sampleValues) : buildDefault();
  const analysis = analyzeSms(previewText);
  return <div className="rounded-xl border border-[#e7e1d7] bg-white p-3 shadow-sm sm:p-4">
    <div className="flex items-center justify-between gap-2"><p className="sep-label">{label}</p>{value.trim() && <button type="button" onClick={() => onChange("")} className="text-xs font-bold text-emerald-700 underline underline-offset-2">Reset to default</button>}</div>
    <textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Leave blank to use the default message" rows={5} className="sep-control mt-2 py-2 font-normal" />
    <div className="mt-2 flex flex-wrap gap-1.5">{CUSTOM_SMS_TEMPLATE_PLACEHOLDERS.map((token) => <button key={token} type="button" onClick={() => insertPlaceholder(token)} className="rounded-full border border-[#e7e1d7] bg-stone-50 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">{`{${token}}`}</button>)}</div>
    <p className={`mt-2 text-xs font-semibold ${analysis.segments > 1 ? "text-amber-700" : "text-slate-500"}`}>{analysis.units}/{analysis.singleLimit} characters · {analysis.segments} SMS segment{analysis.segments === 1 ? "" : "s"} ({analysis.encoding})</p>
    <div className="mt-3 rounded-lg border border-[#e7e1d7] bg-stone-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preview{!value.trim() && " (default)"}</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{previewText}</p></div>
  </div>;
}
