"use client";

import { useMemo, useState } from "react";
import MessagePreviewDialog from "../reminders/MessagePreviewDialog";
import {
  previewPledgeThankYous,
  sendPledgeThankYous,
  type ReminderChannel,
  type ThankYouPreview,
} from "@/services/financialAutomationService";
import { formatTzs } from "@/services/pledgeMessageService";

type ThankYouRow = ThankYouPreview["rows"][number];
const statuses = ["all", "not_sent", "sent", "delivered", "read", "failed"];

export default function CompletedThankYouPanel({ eventId }: { eventId: number }) {
  const [channel, setChannel] = useState<ReminderChannel>("whatsapp");
  const [preview, setPreview] = useState<ThankYouPreview | null>(null);
  const [selected, setSelected] = useState<ThankYouRow | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [confirmed, setConfirmed] = useState(false);
  const [bulkConfirmed, setBulkConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function build(pledgeId?: number) {
    try {
      setBusy(true);
      setError("");
      const result = await previewPledgeThankYous(eventId, [channel], pledgeId);
      if (pledgeId) setSelected(result.rows[0] ?? null);
      else setPreview(result);
      setConfirmed(false);
      setBulkConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thank-you preview failed.");
    } finally {
      setBusy(false);
    }
  }

  async function send(pledgeId?: number) {
    try {
      setBusy(true);
      const result = await sendPledgeThankYous(eventId, [channel], pledgeId);
      setNotice(`${result.sent} sent · ${result.failed} failed · ${result.skipped} skipped.`);
      setSelected(null);
      setConfirmed(false);
      setBulkConfirmed(false);
      await build();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thank-you send failed.");
    } finally {
      setBusy(false);
    }
  }

  const rows = useMemo(() => (preview?.rows ?? []).filter((row) =>
    `${row.contributor} ${row.phone ?? ""}`.toLowerCase().includes(query.toLowerCase())
  ).filter((row) => status === "all" || (status === "not_sent" ? row.eligible : row.deliveryStatus === status)), [preview, query, status]);
  const provider = preview?.provider[channel];

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Completed Thank You</h2>
          <p className="mt-1 text-sm text-slate-600">Review completed contributors and explicitly confirm every send.</p>
        </div>
        <div aria-label="Thank-you channel" className="inline-flex w-fit rounded-xl bg-stone-100 p-1">
          {(["whatsapp", "sms"] as ReminderChannel[]).map((value) => (
            <button key={value} type="button" aria-pressed={channel === value} onClick={() => { setChannel(value); setPreview(null); }} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${channel === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}>
              {value === "whatsapp" ? "WhatsApp" : "SMS"}
            </button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">{notice}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void build()} className="min-h-11 rounded-xl border border-stone-300 px-4 font-semibold hover:bg-stone-50">Bulk Preview</button>
        {preview && <>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 px-3 text-sm"><input type="checkbox" checked={bulkConfirmed} onChange={(event) => setBulkConfirmed(event.target.checked)} />Confirm {preview.eligible} recipient(s)</label>
          <button type="button" disabled={!bulkConfirmed || !provider?.configured || !preview.eligible || busy} onClick={() => void send()} className="min-h-11 rounded-xl bg-emerald-600 px-4 font-bold text-white disabled:opacity-40">Bulk Send</button>
        </>}
      </div>
      {preview && <>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Completed", preview.completed], ["Eligible", preview.eligible],
            ["Thanked", preview.alreadyThanked], ["Missing phone", preview.missingPhone],
            ["Invalid phone", preview.invalidPhone],
            ["Failed", preview.rows.filter((row) => row.deliveryStatus === "failed").length],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-stone-200 bg-stone-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p></div>)}
        </div>
        <p className={`mt-4 rounded-xl p-3 text-sm ${provider?.configured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{provider?.message}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="text-sm font-semibold">Search contributors<input aria-label="Search thank-you contributors by name or phone" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or phone" className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal" /></label>
          <div aria-label="Thank-you delivery status" className="flex max-w-full gap-1 overflow-x-auto pt-6">
            {statuses.map((value) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`min-h-11 whitespace-nowrap rounded-xl px-3 text-sm font-semibold capitalize ${status === value ? "bg-slate-900 text-white" : "border border-stone-300 bg-white text-slate-600"}`}>{value.replace("_", " ")}</button>)}
          </div>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {rows.map((row) => <article key={row.idempotencyKey} className="rounded-xl border border-stone-200 p-4">
            <div className="flex justify-between gap-3"><div><h3 className="font-bold">{row.contributor}</h3><p className="text-sm text-slate-500">{row.phone ?? "No phone"}</p></div><b className="tabular-nums">{formatTzs(row.totalPaid)}</b></div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-stone-100 px-2.5 py-1 font-semibold">{row.deliveryStatus ?? row.skippedReason ?? "Not sent"}</span>{row.latestFailure?.retryable && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">Retryable</span>}</div>
            <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{row.message}</p>
            <button type="button" onClick={() => { setSelected(row); setConfirmed(false); }} className="mt-3 min-h-11 rounded-xl border border-stone-300 px-4 text-sm font-bold">Preview Thank You</button>
          </article>)}
        </div>
        {!rows.length && <p className="py-10 text-center text-sm text-slate-500">No contributors match these filters.</p>}
      </>}
      {!preview && <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-slate-600">Choose Bulk Preview to load eligible completed contributors and provider readiness.</div>}
      <MessagePreviewDialog open={Boolean(selected)} title={selected ? `Thank ${selected.contributor}` : "Thank-you preview"} channel={channel === "sms" ? "SMS" : "WhatsApp"} message={selected?.message ?? ""} providerMessage={provider?.message ?? "Run Bulk Preview to check provider readiness."} providerReady={Boolean(provider?.configured)} confirmed={confirmed} busy={busy} canSend={Boolean(selected?.eligible)} confirmationLabel="I confirm this thank-you recipient and message." sendLabel="Send Thank You" onConfirmedChange={setConfirmed} onClose={() => setSelected(null)} onSend={() => selected && void send(selected.pledgeId)} />
    </section>
  );
}
