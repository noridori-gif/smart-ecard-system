"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FinancialPledge } from "@/services/financialSuiteService";
import {
  previewPledgeThankYous,
  previewReminders,
  sendPledgeThankYous,
  sendReminders,
  type ReminderChannel,
} from "@/services/financialAutomationService";
import { formatTzs } from "@/services/pledgeMessageService";

type MessageKind = "reminder" | "thank-you";
type ChannelChoice = ReminderChannel | "both";

export default function FinancialCommunicationDialog({ eventId, pledge, kind, initialChannel = "sms", onClose, onSent }: {
  eventId: number; pledge: FinancialPledge; kind: MessageKind; initialChannel?: ChannelChoice;
  onClose: () => void; onSent: () => Promise<void> | void;
}) {
  const [channel, setChannel] = useState<ChannelChoice>(initialChannel);
  const [message, setMessage] = useState("");
  const [providerReady, setProviderReady] = useState(false);
  const [providerMessage, setProviderMessage] = useState("");
  const [previewed, setPreviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firstControl = useRef<HTMLSelectElement>(null);
  const channels = useMemo<ReminderChannel[]>(() => channel === "both" ? ["sms", "whatsapp"] : [channel], [channel]);

  const preview = useCallback(async () => {
    try {
      setBusy(true); setError("");
      if (kind === "reminder") {
        const result = await previewReminders(eventId, channels, pledge.id);
        const rows = result.rows.filter((row) => row.pledgeId === pledge.id);
        setMessage(rows[0]?.message ?? "No eligible reminder preview is available.");
        setProviderReady(rows.some((row) => row.eligible) && channels.every((value) => result.provider[value].configured));
        setProviderMessage(channels.map((value) => `${value === "sms" ? "SMS" : "WhatsApp"}: ${result.provider[value].message}`).join(" · "));
      } else {
        const result = await previewPledgeThankYous(eventId, channels, pledge.id);
        const row = result.rows.find((item) => item.pledgeId === pledge.id);
        setMessage(row?.message ?? "No eligible thank-you preview is available.");
        setProviderReady(Boolean(row?.eligible) && channels.every((value) => result.provider[value].configured));
        setProviderMessage(channels.map((value) => `${value === "sms" ? "SMS" : "WhatsApp"}: ${result.provider[value].message}`).join(" · "));
      }
      setPreviewed(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Message preview failed."); }
    finally { setBusy(false); }
  }, [channels, eventId, kind, pledge.id]);

  useEffect(() => { firstControl.current?.focus(); }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  async function send() {
    try {
      setBusy(true); setError("");
      const result = kind === "reminder"
        ? await sendReminders(eventId, channels, pledge.id)
        : await sendPledgeThankYous(eventId, channels, pledge.id);
      if (result.failed || !result.sent) throw new Error(result.errors[0] ?? "The provider did not accept the message.");
      await onSent(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Message send failed."); }
    finally { setBusy(false); }
  }

  const title = kind === "reminder" ? "Send Reminder" : "Send Thank You";
  return <section aria-labelledby="communication-dialog-title" className="space-y-5">
    <div className="flex items-start justify-between gap-4"><div><h2 id="communication-dialog-title" className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-600">{kind === "reminder" ? "Send a payment reminder to this contributor?" : "Thank this contributor for completing their contribution."}</p></div><button type="button" onClick={onClose} aria-label="Close communication dialog" className="min-h-11 rounded-xl px-3 font-semibold hover:bg-stone-100">Close</button></div>
    <dl className="grid grid-cols-2 gap-3 rounded-xl bg-stone-50 p-4 text-sm"><div><dt className="text-slate-500">Name</dt><dd className="font-bold">{pledge.full_name}</dd></div><div><dt className="text-slate-500">Phone</dt><dd className="font-bold">{pledge.normalized_phone || pledge.phone || "Missing"}</dd></div><div className="col-span-2"><dt className="text-slate-500">{kind === "reminder" ? "Outstanding Balance" : "Completed Contribution"}</dt><dd className="font-bold">{formatTzs(kind === "reminder" ? pledge.balance : pledge.total_paid)}</dd></div></dl>
    <label className="block text-sm font-semibold">Preferred Channel<select ref={firstControl} value={channel} onChange={(event) => { setChannel(event.target.value as ChannelChoice); setPreviewed(false); }} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3"><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option><option value="both">Both</option></select></label>
    {previewed && <><pre className="whitespace-pre-wrap rounded-xl border border-stone-200 bg-stone-50 p-4 font-sans text-sm leading-6">{message}</pre><p className={`rounded-xl p-3 text-sm ${providerReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{providerMessage}</p></>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border px-4 font-semibold">Cancel</button><button type="button" disabled={busy} onClick={() => void preview()} className="min-h-11 rounded-xl border border-emerald-600 px-4 font-bold text-emerald-700">{busy ? "Loading…" : "Preview"}</button><button type="button" disabled={busy || !previewed || !providerReady} onClick={() => void send()} className="min-h-11 rounded-xl bg-emerald-600 px-5 font-bold text-white disabled:opacity-40">Send</button></div>
  </section>;
}
