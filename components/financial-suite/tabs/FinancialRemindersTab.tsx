"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CompletedThankYouPanel from "./CompletedThankYouPanel";
import MessagePreviewDialog from "../reminders/MessagePreviewDialog";
import ReminderSectionNavigation, { isReminderSection, type ReminderSection } from "../reminders/ReminderSectionNavigation";
import {
  getAutomationSettings, getPledgeReminderPolicy, getPledgeReminderSchedules, getReminderEligibility, getReminderHistory,
  previewPledgeThankYous, previewReminders, saveAutomationSettings, sendReminders,
  savePledgeReminderPolicy, type AutomationSettings, type PledgeReminderPolicy, type PledgeReminderSchedule, type ReminderChannel, type ReminderHistoryRow,
  type ReminderPreview, type ReminderPreviewRow, type ThankYouPreview,
} from "@/services/financialAutomationService";
import type { FinancialPledge } from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";
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

function StatusBadge({ value }: { value: string }) {
  const style = value === "failed" ? "bg-red-50 text-red-700" : value === "read" || value === "delivered" ? "bg-emerald-50 text-emerald-700" : value === "processing" || value === "queued" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${style}`}>{value.replaceAll("_", " ")}</span>;
}

export default function FinancialRemindersTab({ eventId, eventDate, deadline, pledges }: { eventId: number; eventDate: string; deadline: string | null; pledges: FinancialPledge[] }) {
  const { language, t } = useAppLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSection = searchParams.get("section");
  const section: ReminderSection = isReminderSection(requestedSection) ? requestedSection : "overview";
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
  const [operationQuery, setOperationQuery] = useState("");
  const [operationType, setOperationType] = useState("all");
  const [operationChannel, setOperationChannel] = useState("all");
  const [operationStatus, setOperationStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedChannels: ReminderChannel[] = deliveryMode === "both" ? ["whatsapp", "sms"] : [deliveryMode];

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

  const eligibility = settings ? getReminderEligibility(pledges, eventDate, settings, deadline) : [];
  const eligibleCount = eligibility.filter((item) => item.eligible).length;
  const latestByPledge = useMemo(() => {
    const map = new Map<number, ReminderHistoryRow>();
    history.forEach((item) => { if (!map.has(item.pledge_id)) map.set(item.pledge_id, item); });
    return map;
  }, [history]);
  const safeEligibleRows = useMemo(() => (preview?.rows ?? []).filter((row) => {
    const pledge = pledges.find((item) => item.id === row.pledgeId);
    return row.eligible === true && Boolean(pledge) && ["pledged", "partial"].includes(pledge!.calculated_status) && Number(pledge!.balance) > 0;
  }), [preview, pledges]);
  const reminderRows = useMemo(() => {
    const unique = new Map<number, ReminderPreviewRow>();
    safeEligibleRows.forEach((row) => { if (!unique.has(row.pledgeId)) unique.set(row.pledgeId, row); });
    return [...unique.values()].filter((row) => {
    const pledge = pledges.find((item) => item.id === row.pledgeId);
    const latest = latestByPledge.get(row.pledgeId);
    return `${row.contributor} ${row.phone ?? ""}`.toLowerCase().includes(query.toLowerCase())
      && (financialStatus === "all" || pledge?.calculated_status === financialStatus)
      && (deliveryStatus === "all" || (deliveryStatus === "not_sent" ? !latest : latest?.delivery_status === deliveryStatus));
    });
  }, [safeEligibleRows, pledges, latestByPledge, query, financialStatus, deliveryStatus]);
  const recipientCount = new Set(safeEligibleRows.map((row) => row.pledgeId)).size;
  const messageCount = safeEligibleRows.length;
  const providerReady = Boolean(preview) && selectedChannels.every((value) => preview!.provider[value].configured);
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
  async function save() { if (!settings||!policy) return; try { setBusy(true); await Promise.all([saveAutomationSettings({...settings,reminders_enabled:policy.is_enabled,reminder_frequency:"manual",custom_interval_days:null}),savePledgeReminderPolicy(policy)]); setNotice("Reminder settings saved. Scheduled delivery requires configured automation."); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Settings could not be saved."); } finally { setBusy(false); } }
  async function buildPreview() { try { setBusy(true); setError(""); setPreview(await previewReminders(eventId, selectedChannels)); setBulkConfirmed(false); } catch (err) { setError(err instanceof Error ? err.message : "Reminder preview failed."); } finally { setBusy(false); } }
  async function send() { try { setBusy(true); const result = await sendReminders(eventId, selectedChannels); setNotice(`Reminder run: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`); setSelected(null); setConfirmed(false); setBulkConfirmed(false); await load(); await buildPreview(); } catch (err) { setError(err instanceof Error ? err.message : "Reminder run failed."); } finally { setBusy(false); } }

  const summary = [
    ["Reminder status", settings?.reminders_enabled ? "Enabled" : "Disabled"],
    ["Default channel", settings?.reminder_channel ?? "—"],
    ["Eligible reminders", eligibleCount],
    ["Eligible thank-you", thankYou?.eligible ?? "—"],
    [t("reminders.sent"), history.filter((item) => item.delivery_status === "sent").length],
    ["Read", history.filter((item) => item.delivery_status === "read").length],
    [t("reminders.failed"), history.filter((item) => item.delivery_status === "failed").length],
    [t("reminders.ready"), settings?.next_reminder_at ? formatAppDate(settings.next_reminder_at, language, { dateStyle: "medium", timeStyle: "short" }) : t("common.notSet")],
    ["Recommended",schedules.filter(item=>item.status==="recommended").length],
    ["Scheduled",schedules.filter(item=>item.status==="scheduled").length],
    ["No date",pledges.filter(item=>!item.expected_completion_date&&item.calculated_status!=="cancelled").length],
  ];

  return <div className="space-y-5">
    <ReminderSectionNavigation active={section} onChange={navigate} />
    {loading && <p role="status" className="rounded-xl bg-stone-50 p-3 text-sm text-slate-600">{t("common.loading")}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-700">{notice}</p>}

    {section === "overview" && <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{t("financial.reminders")}</p><h2 className="mt-1 text-2xl font-bold">{t("reminders.overview")}</h2></div>
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {summary.map(([label, value]) => <div key={label} className="min-h-24 rounded-xl border border-stone-200 bg-stone-50 p-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 break-words text-lg font-bold capitalize tabular-nums text-slate-950">{value}</p></div>)}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => navigate("send")} className="min-h-11 rounded-xl bg-emerald-600 px-4 font-bold text-white">{t("reminders.send")}</button>
        {[["Send Thank You", "thank-you"], ["View Activity", "activity"], ["Open Settings", "settings"]].map(([label, value]) => <button key={value} type="button" onClick={() => navigate(value as ReminderSection)} className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 font-semibold text-slate-700 hover:bg-stone-50">{label}</button>)}
      </div>
    </section>}

    {section === "send" && <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      <div><h2 className="text-xl font-bold">Send Pledge Reminders</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">Only contributors who have not started paying or still have an outstanding balance are included. Completed contributors are available under Thank You.</p></div><div aria-label="Reminder channel" className="mt-4 inline-flex w-fit rounded-xl bg-stone-100 p-1">{(["whatsapp", "sms", "both"] as ReminderDeliveryMode[]).map((value) => <button key={value} type="button" aria-pressed={deliveryMode === value} onClick={() => { setDeliveryMode(value); setPreview(null); setBulkConfirmed(false); }} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${deliveryMode === value ? "bg-white shadow-sm" : "text-slate-600"}`}>{value === "both" ? "Both" : value === "whatsapp" ? "WhatsApp" : "SMS"}</button>)}</div>
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void buildPreview()} className="min-h-11 rounded-xl border border-stone-300 px-4 font-semibold">Load Recipients</button>{preview && <><label className="flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 px-3 text-sm"><input type="checkbox" checked={bulkConfirmed} onChange={(event) => setBulkConfirmed(event.target.checked)} />Confirm sending to {recipientCount} contributors ({messageCount} messages{deliveryMode === "both" ? ": WhatsApp + SMS" : ""})</label><button type="button" disabled={busy || !bulkConfirmed || recipientCount === 0 || !providerReady} onClick={() => void send()} className="min-h-11 rounded-xl bg-emerald-600 px-4 font-bold text-white disabled:opacity-40">Send Reminders</button></>}</div>
      {preview && <><div className="mt-4 grid gap-2 sm:grid-cols-2">{selectedChannels.map((value) => <p key={value} className={`rounded-xl p-3 text-sm ${preview.provider[value].configured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><b>{value === "whatsapp" ? "WhatsApp" : "SMS"}:</b> {preview.provider[value].message}</p>)}</div><div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">{[["Ready to Send", recipientCount], ["Pending", new Set(safeEligibleRows.filter((row) => pledges.find((item) => item.id === row.pledgeId)?.calculated_status === "pledged").map((row) => row.pledgeId)).size], ["Partial", new Set(safeEligibleRows.filter((row) => pledges.find((item) => item.id === row.pledgeId)?.calculated_status === "partial").map((row) => row.pledgeId)).size], ["Missing/Invalid Phone", new Set(preview.rows.filter((row) => ["missing_phone", "invalid_phone"].includes(row.skippedReason ?? "")).map((row) => row.pledgeId)).size]].map(([label, value]) => <article key={label} className="rounded-xl border bg-stone-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></article>)}</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]"><label className="text-sm font-semibold">Search contributors<input aria-label="Search reminder contributors by name or phone" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or phone" className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal" /></label>
          <label className="text-sm font-semibold">Contributor Status<select value={financialStatus} onChange={(event) => setFinancialStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal"><option value="all">All Outstanding</option><option value="pledged">Not Started</option><option value="partial">Partially Paid</option></select></label>
          <label className="text-sm font-semibold">Delivery Status<select value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal"><option value="all">Any Delivery Status</option><option value="not_sent">Not Sent</option><option value="sent">Sent</option><option value="failed">Failed</option></select></label>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">{reminderRows.map((row) => { const pledge = pledges.find((item) => item.id === row.pledgeId); const latest = latestByPledge.get(row.pledgeId); return <article key={row.pledgeId} className="rounded-xl border border-stone-200 p-4"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{row.contributor}</h3><p className="text-sm text-slate-500">{row.phone ?? "No phone"}</p></div><StatusBadge value={pledge?.calculated_status === "partial" ? "Partially Paid" : "Not Started"} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><span>Pledged<br/><b>{formatTzs(row.pledgedAmount)}</b></span><span>Paid<br/><b>{formatTzs(row.totalPaid)}</b></span><span>Balance<br/><b>{formatTzs(row.balance)}</b></span></div><div className="mt-3 flex items-center gap-2">{latest ? <StatusBadge value={latest.delivery_status} /> : <StatusBadge value="not_sent" />}<span className="text-xs text-slate-500">{latest ? new Date(latest.created_at).toLocaleString() : deliveryMode === "both" ? "WhatsApp + SMS" : deliveryMode}</span></div><button type="button" onClick={() => { setSelected(row); setConfirmed(false); }} className="mt-3 min-h-11 rounded-xl border border-stone-300 px-4 text-sm font-bold">Preview</button></article>; })}</div>
      </>}
      {!preview && <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-slate-600">Choose Load Recipients to load the server-validated audience and provider readiness.</div>}
    </section>}

    {section === "thank-you" && <CompletedThankYouPanel eventId={eventId} />}

    {section === "schedule"&&<section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"><h2 className="text-xl font-bold">Reminder Schedule</h2><p className="mt-1 text-sm text-slate-600">Scheduled, recommended, paused, stopped, and completed reminder activity remains visible here.</p><div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">{[["Due today",schedules.filter(item=>item.status==="scheduled"&&item.scheduled_for.slice(0,10)===new Date().toISOString().slice(0,10)).length],["Upcoming",schedules.filter(item=>item.status==="scheduled"&&new Date(item.scheduled_for)>new Date()).length],["Recommended",schedules.filter(item=>item.status==="recommended").length],["Failed",schedules.filter(item=>item.status==="failed").length],["No date",pledges.filter(item=>!item.expected_completion_date).length],["Paused",schedules.filter(item=>item.cancel_reason==="paused").length],["Completed / Stopped",schedules.filter(item=>["cancelled","skipped","sent","delivered"].includes(item.status)).length]].map(([label,value])=><article key={label} className="rounded-xl border bg-stone-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></article>)}</div><div className="mt-5 grid gap-3">{schedules.map(item=>{const relation=Array.isArray(item.event_pledges)?item.event_pledges[0]:item.event_pledges;return <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><h3 className="font-bold">{relation?.full_name??"Contributor"}</h3><p className="mt-1 text-sm text-slate-500">{item.schedule_type.replaceAll("_"," ")} · {new Date(item.scheduled_for).toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">{relation?.expected_completion_date?`Expected completion: ${relation.expected_completion_date}`:"Manual reminder · No completion date"}</p>{!relation?.normalized_phone&&<p className="mt-2 text-sm font-semibold text-amber-800">{language==="sw"?"Hakuna namba ya simu ya kutuma ujumbe.":"No phone number is available for messaging."}</p>}</div><StatusBadge value={item.status}/></div></article>})}{!schedules.length&&<p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No reminder schedules yet. Manual reminders remain available.</p>}</div></section>}

    {section === "activity" && <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6"><h2 className="text-xl font-bold">Activity</h2><p className="mt-1 text-sm text-slate-600">Monitor reminder and thank-you delivery and retry state without exposing provider payloads.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{statuses.map((value) => <div key={value} className="rounded-xl border border-stone-200 bg-stone-50 p-3"><p className="text-xs capitalize text-slate-500">{value}</p><p className="mt-1 text-xl font-bold tabular-nums">{history.filter((item) => item.delivery_status === value).length}</p></div>)}<div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><p className="text-xs text-slate-500">Retries pending</p><p className="mt-1 text-xl font-bold tabular-nums">{history.filter((item) => item.delivery_status === "failed" && item.next_retry_at && item.retry_count < 3).length}</p></div></div>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4"><label className="text-sm font-semibold">Search contributor<input value={operationQuery} onChange={(event) => setOperationQuery(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal" /></label><label className="text-sm font-semibold">Message type<select value={operationType} onChange={(event) => setOperationType(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal"><option value="all">All</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold">Channel<select value={operationChannel} onChange={(event) => setOperationChannel(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal"><option value="all">All</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option></select></label><label className="text-sm font-semibold">Status<select value={operationStatus} onChange={(event) => setOperationStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal"><option value="all">All</option>{statuses.map((value) => <option key={value} value={value} className="capitalize">{value}</option>)}</select></label></div>
      <div className="mt-4 max-h-[560px] overflow-auto rounded-xl border border-stone-200"><table className="w-full min-w-[900px] text-left text-sm"><thead className="sticky top-0 z-10 bg-stone-100 text-xs uppercase tracking-wide text-slate-600"><tr>{["Contributor", "Channel", "Type", "Requested", "Sent", "Status", "Retries", "Error"].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{operationRows.map((item) => { const relation = Array.isArray(item.event_pledges) ? item.event_pledges[0] : item.event_pledges; return <tr key={item.id} className="border-t border-stone-200"><td className="p-3 font-semibold">{relation?.full_name ?? "Contributor"}</td><td className="p-3 capitalize">{item.channel}</td><td className="p-3">{typeLabels[item.reminder_type] ?? item.reminder_type.replaceAll("_", " ")}</td><td className="p-3">{new Date(item.created_at).toLocaleString()}</td><td className="p-3">{item.sent_at ? new Date(item.sent_at).toLocaleString() : "—"}</td><td className="p-3"><StatusBadge value={item.delivery_status} /></td><td className="p-3 tabular-nums">{item.retry_count}/3</td><td className="max-w-60 p-3">{item.error_message ? <details><summary className="max-w-48 cursor-pointer truncate text-red-700">{item.error_message}</summary><p className="mt-2 break-words text-xs text-red-700">{item.error_message}</p></details> : "—"}</td></tr>; })}</tbody></table>{!operationRows.length && <p className="py-10 text-center text-sm text-slate-500">No deliveries match these filters.</p>}</div>
    </section>}

    {section === "settings" && <section className="rounded-2xl border border-stone-200 bg-white shadow-sm"><div className="p-4 sm:p-6"><h2 className="text-xl font-bold">Reminder Settings</h2><p className="mt-1 text-sm text-slate-600">Configure reminder delivery, owner summaries, and scheduling.</p>{settings && <div className="mt-6 space-y-6">
      {policy&&<fieldset><legend className="font-bold">Pledge reminder policy</legend><div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={policy.is_enabled} onChange={event=>setPolicy({...policy,is_enabled:event.target.checked})}/>Enable reminder automation</label><SettingSelect label="Reminder mode" value={policy.reminder_mode} onChange={value=>setPolicy({...policy,reminder_mode:value as PledgeReminderPolicy["reminder_mode"],no_date_behavior:value!=="automatic"&&policy.no_date_behavior==="automatic_after_days"?"manual_only":policy.no_date_behavior})} options={[["manual","Manual"],["automatic","Automatic"],["hybrid","Hybrid"]]}/><SettingInput label="Before due date (days)" type="number" value={policy.before_due_days} onChange={value=>setPolicy({...policy,before_due_days:Number(value)})}/><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={policy.on_due_date_enabled} onChange={event=>setPolicy({...policy,on_due_date_enabled:event.target.checked})}/>On due date</label><SettingInput label="After due date (days)" type="number" value={policy.after_due_days} onChange={value=>setPolicy({...policy,after_due_days:Number(value)})}/><SettingInput label="Repeat interval (minimum 3 days)" type="number" value={policy.repeat_after_due_days??""} onChange={value=>setPolicy({...policy,repeat_after_due_days:value?Number(value):null})}/><SettingInput label="Maximum reminders" type="number" value={policy.maximum_automatic_reminders} onChange={value=>setPolicy({...policy,maximum_automatic_reminders:Number(value)})}/><SettingSelect label="No completion date" value={policy.no_date_behavior} onChange={value=>setPolicy({...policy,no_date_behavior:value as PledgeReminderPolicy["no_date_behavior"]})} options={[["manual_only","Manual reminder"],["recommend_after_days","Recommend after delay"],...(policy.reminder_mode==="automatic"?[["automatic_after_days","Send automatically after delay"]]:[])]}/><SettingInput label="No-date delay (days)" type="number" value={policy.no_date_delay_days} onChange={value=>setPolicy({...policy,no_date_delay_days:Number(value)})}/><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={policy.stop_after_event} onChange={event=>setPolicy({...policy,stop_after_event:event.target.checked})}/>Stop after event date</label></div><div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm"><p className="font-bold">Example timeline · Expected date: 30 September 2026</p><p className="mt-2">{30-policy.before_due_days} Sep — Before due reminder · 30 Sep — Due-date reminder · {policy.after_due_days<=31?`${String(policy.after_due_days).padStart(2,"0")} Oct`:"Configured interval"} — Overdue reminder</p></div>{(policy.repeat_after_due_days??99)<3&&<p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Repeat intervals shorter than 3 days are not allowed.</p>}</fieldset>}
      <fieldset><legend className="font-bold">Reminder delivery</legend><div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={settings.reminders_enabled} onChange={(event) => setSettings({...settings, reminders_enabled: event.target.checked})} />Reminders enabled</label><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={settings.allow_after_deadline} onChange={(event) => setSettings({...settings, allow_after_deadline: event.target.checked})} />Allow after deadline</label><SettingSelect label="Channel" value={settings.reminder_channel} onChange={(value) => setSettings({...settings, reminder_channel: value as AutomationSettings["reminder_channel"]})} options={[["sms","SMS"],["whatsapp","WhatsApp"],["both","Both"]]} /><SettingSelect label="Frequency" value={settings.reminder_frequency} onChange={(value) => setSettings({...settings, reminder_frequency: value as AutomationSettings["reminder_frequency"]})} options={[["manual","Manual only"],["weekly","Weekly"],["custom","Custom interval"]]} />{settings.reminder_frequency === "custom" && <SettingInput label="Interval days" type="number" value={settings.custom_interval_days ?? 7} onChange={(value) => setSettings({...settings, custom_interval_days: Number(value)})} />}<SettingInput label="Cooldown hours" type="number" value={settings.reminder_cooldown_hours} onChange={(value) => setSettings({...settings, reminder_cooldown_hours: Number(value)})} /></div></fieldset>
      <fieldset><legend className="font-bold">Owner summary</legend><div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={settings.daily_summary_enabled} onChange={(event) => setSettings({...settings, daily_summary_enabled: event.target.checked})} />Daily summary enabled</label><SettingInput label="Owner summary phone" value={settings.owner_summary_phone ?? ""} onChange={(value) => setSettings({...settings, owner_summary_phone: value || null})} /><SettingSelect label="Daily summary channel" value={settings.daily_summary_channel} onChange={(value) => setSettings({...settings, daily_summary_channel: value as AutomationSettings["daily_summary_channel"]})} options={[["sms","SMS"],["whatsapp","WhatsApp"],["both","Both"]]} /><SettingInput label="Daily summary time (UTC)" type="time" value={settings.daily_summary_time.slice(0,5)} onChange={(value) => setSettings({...settings, daily_summary_time: value})} /></div></fieldset>
      <fieldset><legend className="font-bold">Scheduling</legend><div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm"><p className="font-semibold">Next reminder</p><p className="mt-1">{settings.next_reminder_at ? new Date(settings.next_reminder_at).toLocaleString() : "Not scheduled"}</p></div><div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm"><p className="font-semibold">Readiness</p><p className="mt-1">{settings.reminders_enabled ? "Enabled; provider readiness is checked during preview." : "Enable reminders to schedule or send."}</p></div></div></fieldset>
    </div>}</div><div className="sticky bottom-0 flex justify-end border-t border-stone-200 bg-white/95 p-4 backdrop-blur sm:px-6"><button type="button" disabled={busy || !settings} onClick={() => void save()} className="min-h-11 rounded-xl bg-emerald-600 px-5 font-bold text-white disabled:opacity-40">Save Settings</button></div></section>}
    <MessagePreviewDialog open={Boolean(selected)} title={selected ? `Preview for ${selected.contributor}` : "Reminder preview"} channel={selected?.channel === "sms" ? "SMS" : "WhatsApp"} message={selected?.message ?? ""} providerMessage={selected ? preview?.provider[selected.channel].message ?? "" : ""} providerReady={Boolean(selected && preview?.provider[selected.channel].configured)} confirmed={confirmed} busy={busy} canSend={Boolean(selected?.eligible && recipientCount)} confirmationLabel={`Confirm sending to ${recipientCount} contributors (${messageCount} messages${deliveryMode === "both" ? ": WhatsApp + SMS" : ""})`} sendLabel="Send Reminders" onConfirmedChange={setConfirmed} onClose={() => setSelected(null)} onSend={() => void send()} />
  </div>;
}

function SettingInput({ label, value, type = "text", onChange }: { label: string; value: string | number; type?: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal" /></label>;
}
function SettingSelect({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal">{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>;
}
