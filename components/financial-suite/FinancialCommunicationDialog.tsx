"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FinancialPledge } from "@/services/financialSuiteService";
import type { CommunicationAdapter, CommunicationKind, ReminderChannel } from "@/services/financialAutomationService";
import { formatTzs } from "@/services/pledgeMessageService";

type ChannelChoice = ReminderChannel | "both";

export default function FinancialCommunicationDialog({
  pledge, kind, initialChannel = "sms", language, adapter,
  allowBothChannel = true, requireExplicitConfirmation = false,
  onClose, onSent,
}: {
  pledge: FinancialPledge; kind: CommunicationKind; initialChannel?: ChannelChoice; language: "sw" | "en";
  adapter: CommunicationAdapter; allowBothChannel?: boolean; requireExplicitConfirmation?: boolean;
  onClose: () => void; onSent: () => Promise<void> | void;
}) {
  const [channel, setChannel] = useState<ChannelChoice>(initialChannel);
  const [message, setMessage] = useState("");
  const [providerReady, setProviderReady] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [providerMessage, setProviderMessage] = useState("");
  const [previewed, setPreviewed] = useState(false);
  const [approvedPreviewKey, setApprovedPreviewKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [sendError, setSendError] = useState("");
  const firstControl = useRef<HTMLSelectElement>(null);
  const channels = useMemo<ReminderChannel[]>(() => channel === "both" ? ["sms", "whatsapp"] : [channel], [channel]);
  const previewKey = JSON.stringify({ channel, recipient: pledge.id, phone: pledge.normalized_phone ?? "", language, template: kind, message });

  const preview = useCallback(async () => {
    try {
      setBusy(true); setPreviewError(""); setSendError(""); setApprovedPreviewKey("");
      const result = await adapter.preview(kind, channels, pledge.id);
      const rows = result.rows.filter((row) => row.pledgeId === pledge.id);
      const nextMessage = rows[0]?.message ?? (kind === "reminder" ? "No eligible reminder preview is available." : "No eligible thank-you preview is available.");
      const nextConfigured = channels.every((value) => result.provider[value].configured);
      const nextReady = rows.some((row) => row.eligible) && nextConfigured;
      const nextFailure = !rows.some((row) => row.eligible)
        ? previewFailure(rows[0]?.skippedReason ?? "unavailable", language)
        : !nextConfigured ? previewFailure("provider_unavailable", language) : "";
      const nextProviderMessage = channels.map((value) => `${value === "sms" ? "SMS" : "WhatsApp"}: ${result.provider[value].message}`).join(" · ");
      setMessage(nextMessage); setProviderConfigured(nextConfigured); setProviderReady(nextReady); setProviderMessage(nextProviderMessage); setPreviewed(true); setPreviewError(nextFailure);
      if (nextReady) setApprovedPreviewKey(JSON.stringify({ channel, recipient: pledge.id, phone: pledge.normalized_phone ?? "", language, template: kind, message: nextMessage }));
    } catch (err) {
      setPreviewed(false); setProviderReady(false); setProviderConfigured(false);
      setPreviewError(err instanceof Error ? err.message : language === "sw" ? "Hakiki ya ujumbe imeshindikana." : "Message preview failed.");
    } finally { setBusy(false); }
  }, [adapter, channel, channels, kind, language, pledge.id, pledge.normalized_phone]);

  useEffect(() => { firstControl.current?.focus(); }, []);
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === "Escape" && onClose(); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);

  function resetPreview(nextChannel: ChannelChoice) {
    setChannel(nextChannel); setPreviewed(false); setProviderReady(false); setProviderConfigured(false); setApprovedPreviewKey(""); setPreviewError(""); setSendError(""); setConfirmed(false);
  }
  async function send() {
    try {
      setBusy(true); setSendError("");
      const result = await adapter.send(kind, channels, pledge.id);
      if (result.failed || !result.sent) throw new Error(result.errors[0] ?? "The provider did not accept the message.");
      await onSent(); onClose();
    } catch (err) { setSendError(err instanceof Error ? err.message : language === "sw" ? "Utumaji wa ujumbe umeshindikana." : "Message send failed."); }
    finally { setBusy(false); }
  }

  const title = kind === "reminder" ? "Send Reminder" : "Send Thank You";
  const previewRequired = approvedPreviewKey !== previewKey;
  const confirmationRequired = requireExplicitConfirmation && !confirmed;
  return <section aria-labelledby="communication-dialog-title" className="space-y-5">
    <div className="flex items-start justify-between gap-4"><div><h2 id="communication-dialog-title" className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-600">{kind === "reminder" ? "Send a payment reminder to this contributor?" : "Thank this contributor for completing their contribution."}</p></div><button type="button" onClick={onClose} aria-label="Close communication dialog" className="min-h-11 rounded-xl px-3 font-semibold hover:bg-stone-100">Close</button></div>
    <dl className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-4 text-sm"><div><dt className="text-slate-500">Name</dt><dd className="font-bold">{pledge.full_name}</dd></div><div><dt className="text-slate-500">Phone</dt><dd className="font-bold">{pledge.normalized_phone || pledge.phone || "Missing"}</dd></div><div className="col-span-2"><dt className="text-slate-500">{kind === "reminder" ? "Outstanding Balance" : "Completed Contribution"}</dt><dd className="font-bold">{formatTzs(kind === "reminder" ? pledge.balance : pledge.total_paid)}</dd></div></dl>
    <label className="block text-sm font-semibold">Preferred Channel<select ref={firstControl} value={channel} onChange={(event) => resetPreview(event.target.value as ChannelChoice)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3"><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option>{allowBothChannel && <option value="both">Both</option>}</select></label>
    {previewed && <><pre className="whitespace-pre-wrap rounded-xl border border-stone-200 bg-stone-50 p-4 font-sans text-sm leading-6">{message}</pre><p className={`rounded-xl p-3 text-sm ${providerConfigured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{providerMessage}</p></>}
    {requireExplicitConfirmation && previewed && providerReady && <label className="flex min-h-11 items-start gap-3 rounded-xl border border-stone-200 p-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-5 w-5" />{language === "sw" ? "Nathibitisha kutuma ujumbe huu." : "I confirm sending this message."}</label>}
    {sendError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{sendError}</p>}
    <div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border px-4 font-semibold">Cancel</button><button type="button" disabled={busy} onClick={() => void preview()} className="min-h-11 rounded-xl border border-emerald-600 px-4 font-bold text-emerald-700">{busy ? "Loading…" : "Preview"}</button><button type="button" disabled={busy || !providerReady || previewRequired || confirmationRequired} onClick={() => void send()} className="min-h-11 rounded-xl bg-emerald-600 px-5 font-bold text-white disabled:opacity-40">Send</button></div>{previewError && <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{previewError}</p>}{!busy && previewRequired && !previewError && <p className="mt-2 text-sm text-slate-600">{language === "sw" ? "Bonyeza Preview kwanza kuthibitisha ujumbe kabla ya kutuma." : "Preview the message before sending."}</p>}</div>
  </section>;
}

function previewFailure(reason: string, language: "en" | "sw") {
  const messages: Record<string, { en: string; sw: string }> = {
    missing_phone: { en: "This contributor has no phone number available for messaging.", sw: "Mchangiaji huyu hana namba ya simu ya kutumiwa ujumbe." },
    invalid_phone: { en: "This contributor's phone number is not a valid Tanzanian mobile number.", sw: "Namba ya simu ya mchangiaji huyu si namba halali ya simu ya Tanzania." },
    reminders_disabled: { en: "Financial reminders are disabled for this event.", sw: "Vikumbusho vya fedha vimezimwa kwa tukio hili." },
    channel_disabled: { en: "The selected messaging channel is disabled for this event.", sw: "Njia ya ujumbe iliyochaguliwa imezimwa kwa tukio hili." },
    completed: { en: "This contribution is already completed.", sw: "Mchango huu tayari umekamilika." },
    no_balance: { en: "This contribution has no outstanding balance.", sw: "Mchango huu hauna salio linalodaiwa." },
    cooldown_active: { en: "A reminder was sent recently. Wait until the cooldown ends.", sw: "Kikumbusho kilitumwa hivi karibuni. Subiri muda wa kusubiri uishe." },
    duplicate_window: { en: "This reminder was already requested in the current delivery window.", sw: "Kikumbusho hiki tayari kiliombwa katika kipindi hiki cha utumaji." },
    event_passed: { en: "Reminder sending is stopped because the event date has passed.", sw: "Utumaji wa vikumbusho umesimamishwa kwa sababu tarehe ya tukio imepita." },
    cancelled: { en: "This contribution is cancelled.", sw: "Mchango huu umefutwa." },
    archived: { en: "This event is archived.", sw: "Tukio hili limehifadhiwa kwenye kumbukumbu." },
    already_thanked: { en: "A thank-you message has already been sent successfully.", sw: "Ujumbe wa shukrani tayari umetumwa kwa mafanikio." },
    not_completed: { en: "A thank-you message requires a completed contribution.", sw: "Ujumbe wa shukrani unahitaji mchango uliokamilika." },
    provider_unavailable: { en: "The selected messaging provider is not ready.", sw: "Mtoa huduma wa ujumbe aliyechaguliwa hayuko tayari." },
    unavailable: { en: "No eligible provider-backed preview is available for this contributor.", sw: "Hakuna hakiki halali ya mtoa huduma kwa mchangiaji huyu." },
  };
  return messages[reason]?.[language] ?? messages.unavailable[language];
}
