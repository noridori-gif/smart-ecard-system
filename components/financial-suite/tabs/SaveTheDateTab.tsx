"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { SAVE_THE_DATE_MIN_PAID, type SaveTheDateVariant } from "@/lib/saveTheDateEligibility";
import { formatTzs } from "@/services/pledgeMessageService";
import {
  previewSaveTheDate,
  renderSaveTheDateCardPreview,
  sendSaveTheDate,
  setSaveTheDateVariant,
  type SaveTheDatePreview,
  type SaveTheDateRow,
  type SaveTheDateSendResult,
  type SaveTheDateSkipReason,
} from "@/services/saveTheDateClientService";

const REASON_LABEL: Record<SaveTheDateSkipReason, string> = {
  cancelled: "Ahadi imefutwa",
  not_completed: "Ahadi haijakamilika",
  below_minimum: "Chini ya kiwango",
  single_below_70k: `Single chini ya ${formatTzs(SAVE_THE_DATE_MIN_PAID.single)}`,
  double_below_100k: `Double chini ya ${formatTzs(SAVE_THE_DATE_MIN_PAID.double)}`,
  missing_phone: "Hana namba ya simu",
  already_sent: "Imetumwa",
  in_progress: "Inatumwa…",
};

function StatusBadge({ row }: { row: SaveTheDateRow }) {
  if (row.deliveryStatus === "sent" || row.deliveryStatus === "delivered" || row.deliveryStatus === "read") {
    // delivered/read are WhatsApp receipts from the webhook; SMS stays at "Imetumwa".
    const label = row.deliveryStatus === "read" ? "Imesomwa" : row.deliveryStatus === "delivered" ? "Imefika" : "Imetumwa";
    return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{label} · {row.deliveryChannel === "whatsapp" ? "WhatsApp" : "SMS"}</span>;
  }
  if (row.deliveryStatus === "failed" && row.sendable) {
    return <span title={row.deliveryError ?? undefined} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">Imeshindikana — jaribu tena</span>;
  }
  if (row.sendable) return <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">Haijatumwa</span>;
  return <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-slate-600">{row.reason ? REASON_LABEL[row.reason] : "-"}</span>;
}

export default function SaveTheDateTab({ eventId }: { eventId: number }) {
  const [preview, setPreview] = useState<SaveTheDatePreview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [variant, setVariant] = useState<SaveTheDateVariant>("navy");
  // The preview belongs to one variant; it's "loading" whenever it isn't the selected one yet.
  const [card, setCard] = useState<{ variant: SaveTheDateVariant; url: string | null } | null>(null);
  const cardLoading = card?.variant !== variant;
  const cardUrl = cardLoading ? null : card?.url ?? null;
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SaveTheDateSendResult | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await previewSaveTheDate(eventId);
      setError("");
      setPreview(data);
      setVariant(data.event.variant);
      setSelected((current) => new Set([...current].filter((id) => data.rows.some((row) => row.pledgeId === id && row.sendable))));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save the Date haikuweza kupakiwa.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let active = true;
    let url: string | null = null;
    renderSaveTheDateCardPreview(eventId, variant)
      .then((objectUrl) => { url = objectUrl; if (active) setCard({ variant, url: objectUrl }); else URL.revokeObjectURL(objectUrl); })
      .catch(() => { if (active) setCard({ variant, url: null }); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [eventId, variant]);

  async function chooseVariant(next: SaveTheDateVariant) {
    if (next === variant) return;
    const previous = variant;
    setVariant(next);
    try { await setSaveTheDateVariant(eventId, next); }
    catch (cause) { setVariant(previous); setError(cause instanceof Error ? cause.message : "Rangi haikuweza kuhifadhiwa."); }
  }

  const rows = useMemo(() => preview?.rows ?? [], [preview]);
  const qualifying = useMemo(() => rows.filter((row) => row.qualifies), [rows]);
  const visible = showAll ? rows : qualifying;
  const sendable = qualifying.filter((row) => row.sendable);
  const counts = {
    qualifying: qualifying.length,
    sent: qualifying.filter((row) => row.reason === "already_sent").length,
    noPhone: qualifying.filter((row) => row.reason === "missing_phone").length,
    waiting: sendable.length,
  };
  const canSend = Boolean(preview?.whatsappConfigured || preview?.smsConfigured);
  const channel = preview?.whatsappConfigured
    ? preview.smsConfigured ? "WhatsApp (SMS ikishindikana)" : "WhatsApp"
    : preview?.smsConfigured ? "SMS — template ya WhatsApp bado haijaidhinishwa" : "Hakuna — WhatsApp wala SMS (BEEM) haijasetiwa";

  function toggle(id: number) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function send() {
    setSending(true);
    try {
      setResult(await sendSaveTheDate(eventId, [...selected]));
      setSelected(new Set());
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save the Date haikuweza kutumwa.");
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  if (loading) return <div role="status" className="sep-card p-5 text-sm text-slate-600">Inapakia Save the Date…</div>;

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <section className="sep-card grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div>
            <h3 className="sep-card-title">Kadi ya Save the Date</h3>
            <p className="sep-secondary mt-1">
              Inatumwa kabla ya mwaliko rasmi — haina QR wala Pass ID. Wanaostahili: ahadi imekamilika, na Double amelipa angalau {formatTzs(SAVE_THE_DATE_MIN_PAID.double)} au Single angalau {formatTzs(SAVE_THE_DATE_MIN_PAID.single)}.
            </p>
          </div>
          <div>
            <p className="sep-label">Rangi ya kadi</p>
            <div className="mt-2 inline-flex gap-1 rounded-2xl border border-[#e7e1d7] bg-white p-1.5 shadow-sm" role="radiogroup" aria-label="Rangi ya kadi">
              {(["navy", "cream"] as const).map((option) => (
                <button key={option} type="button" role="radio" aria-checked={variant === option} onClick={() => void chooseVariant(option)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${variant === option ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-stone-100"}`}>
                  <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: option === "navy" ? "#0c1f3d" : "#f5eee2" }} aria-hidden="true" />
                  {option === "navy" ? "Navy" : "Cream"}
                </button>
              ))}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Wanaostahili", counts.qualifying], ["Wametumiwa", counts.sent], ["Wanasubiri", counts.waiting], ["Hawana simu", counts.noPhone]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#e7e1d7] bg-stone-50 p-3">
                <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className={`text-sm ${canSend ? "text-slate-600" : "font-semibold text-red-700"}`}>Njia ya kutuma: <b>{channel}</b></p>
        </div>
        <div className="flex aspect-[1080/1536] w-full items-center justify-center overflow-hidden rounded-xl border border-[#e7e1d7] bg-stone-50">
          {cardUrl && !cardLoading ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cardUrl} alt={`Hakiki ya Save the Date (${variant})`} className="h-full w-full object-contain" />
          ) : (
            <span className="text-sm text-slate-500">{cardLoading ? "Inatengeneza hakiki…" : "Hakiki haipatikani"}</span>
          )}
        </div>
      </section>

      {result && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-bold">Imetumwa: {result.sentWhatsapp} WhatsApp, {result.sentSms} SMS · Imeshindikana: {result.failed} · Imerukwa: {result.skipped}</p>
          {result.errors.length > 0 && <ul className="mt-2 list-disc pl-5">{result.errors.slice(0, 10).map((line) => <li key={line}>{line}</li>)}</ul>}
        </div>
      )}

      <section className="sep-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
            Onyesha wachangiaji wote ({rows.length})
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={!sendable.length} onClick={() => setSelected(new Set(sendable.map((row) => row.pledgeId)))}>Chagua wote wanaosubiri ({sendable.length})</Button>
            <Button variant="secondary" size="sm" disabled={!selected.size} onClick={() => setSelected(new Set())}>Ondoa chaguo</Button>
            <Button size="sm" disabled={!selected.size || sending || !canSend} onClick={() => setConfirming(true)}>Tuma Save the Date ({selected.size})</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="w-10 p-3"><span className="sr-only">Chagua</span></th><th className="p-3">Mchangiaji</th><th className="p-3">Aina</th><th className="p-3">Amelipa</th><th className="p-3">Save the Date</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {visible.map((row) => (
                <tr key={row.pledgeId}>
                  <td className="p-3"><input type="checkbox" aria-label={`Chagua ${row.name}`} disabled={!row.sendable} checked={selected.has(row.pledgeId)} onChange={() => toggle(row.pledgeId)} /></td>
                  <td className="p-3"><p className="font-bold text-slate-950">{row.name}</p><p className="mt-0.5 text-xs text-slate-500">{row.phone || "Hakuna namba ya simu"}</p></td>
                  <td className="p-3 capitalize">{row.cardType === "below_minimum" ? "Chini ya kiwango" : row.cardType}</td>
                  <td className="p-3 tabular-nums">{formatTzs(row.totalPaid)}</td>
                  <td className="p-3"><StatusBadge row={row} /></td>
                </tr>
              ))}
              {!visible.length && <tr><td colSpan={5} className="p-6 text-center text-slate-500">Hakuna mchangiaji anayestahili Save the Date kwa sasa.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {confirming && (
        <Dialog titleId="confirm-save-the-date-title" onClose={() => !sending && setConfirming(false)} className="sm:max-w-md">
          <h2 id="confirm-save-the-date-title" className="sep-card-title">Tuma Save the Date?</h2>
          <p className="mt-3 text-slate-700">Utatuma kadi ya Save the Date ({variant === "navy" ? "Navy" : "Cream"}) kwa wachangiaji <b>{selected.size}</b> kupitia {channel}.</p>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">Ujumbe utaenda kwa wageni halisi. Ustahiki unakaguliwa upya wakati wa kutuma.</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={sending} onClick={() => setConfirming(false)}>Ghairi</Button>
            <Button loading={sending} onClick={() => void send()}>Thibitisha na Tuma</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
