"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { SAVE_THE_DATE_MIN_PAID, type SaveTheDateIneligibleReason, type SaveTheDateVariant } from "@/lib/saveTheDateEligibility";
import {
  isChannelDone,
  planSaveTheDate,
  smsFallbackPossible,
  type SaveTheDateChannel,
  type SaveTheDateChannelMode,
  type SaveTheDateChannelState,
} from "@/lib/saveTheDateChannels";
import { formatTzs } from "@/services/pledgeMessageService";
import {
  previewSaveTheDate,
  renderSaveTheDateCardPreview,
  sendSaveTheDate,
  setSaveTheDateVariant,
  type SaveTheDatePreview,
  type SaveTheDateRow,
  type SaveTheDateSendResult,
} from "@/services/saveTheDateClientService";

const RULE_LABEL: Record<SaveTheDateIneligibleReason, string> = {
  cancelled: "Ahadi imefutwa",
  not_completed: "Ahadi haijakamilika",
  below_minimum: "Chini ya kiwango",
  single_below_70k: `Single chini ya ${formatTzs(SAVE_THE_DATE_MIN_PAID.single)}`,
  double_below_100k: `Double chini ya ${formatTzs(SAVE_THE_DATE_MIN_PAID.double)}`,
};

const MODES: Array<{ value: SaveTheDateChannelMode; label: string }> = [
  { value: "whatsapp", label: "WhatsApp pekee" },
  { value: "sms", label: "SMS pekee" },
  { value: "both", label: "Zote mbili (WhatsApp + SMS)" },
];

const MODE_NOUN: Record<SaveTheDateChannelMode, string> = { whatsapp: "WhatsApp", sms: "SMS", both: "WhatsApp wala SMS" };

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function ChannelBadge({ channel, state }: { channel: SaveTheDateChannel; state: SaveTheDateChannelState }) {
  const name = channel === "whatsapp" ? "WhatsApp" : "SMS";
  if (!state.valid) return <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-slate-500">{name}: namba si sahihi</span>;
  if (isChannelDone(state)) {
    // delivered/read are WhatsApp receipts from the webhook; SMS stays at "Imetumwa".
    const label = state.status === "read" ? "Imesomwa" : state.status === "delivered" ? "Imefika" : "Imetumwa";
    return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{name}: {label}</span>;
  }
  if (state.status === "failed") return <span title={state.error ?? undefined} className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">{name}: Imeshindikana</span>;
  if (state.status === "processing") return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{name}: Inatumwa…</span>;
  return <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">{name}: Haijatumwa</span>;
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
  const [mode, setMode] = useState<SaveTheDateChannelMode>("whatsapp");
  const [smsFallback, setSmsFallback] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save the Date haikuweza kupakiwa.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  // Debounced search: the list is already in the browser, this only narrows the view.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
  const plans = useMemo(() => new Map(rows.map((row) => [row.pledgeId, planSaveTheDate(row, mode)])), [rows, mode]);
  const planOf = (row: SaveTheDateRow) => plans.get(row.pledgeId) ?? { channels: [], reason: "not_qualified" as const };
  const qualifying = rows.filter((row) => row.qualifies);
  const query = normalizeName(search);
  const visible = (showAll ? rows : qualifying).filter((row) => !query || normalizeName(row.name).includes(query));
  const visibleSendable = visible.filter((row) => planOf(row).channels.length > 0);
  // What "Tuma" will actually send: selected rows that still have something to send in this mode.
  const toSend = rows.filter((row) => selected.has(row.pledgeId) && planOf(row).channels.length > 0);
  const hiddenSelected = toSend.filter((row) => !visible.includes(row)).length;

  const counts = {
    qualifying: qualifying.length,
    sent: qualifying.filter((row) => planOf(row).reason === "already_sent").length,
    waiting: qualifying.filter((row) => planOf(row).channels.length > 0).length,
    noPhone: qualifying.filter((row) => planOf(row).reason === "missing_phone").length,
  };
  const estimate = {
    whatsapp: toSend.filter((row) => planOf(row).channels.includes("whatsapp")).length,
    sms: toSend.filter((row) => planOf(row).channels.includes("sms")).length,
    smsParts: toSend.filter((row) => planOf(row).channels.includes("sms")).reduce((sum, row) => sum + row.smsSegments, 0),
    fallbackSms: mode === "whatsapp" && smsFallback ? toSend.filter((row) => planOf(row).channels.includes("whatsapp") && smsFallbackPossible(row)).length : 0,
  };
  const modeAvailable = (value: SaveTheDateChannelMode) =>
    value === "whatsapp" ? Boolean(preview?.whatsappConfigured) : value === "sms" ? Boolean(preview?.smsConfigured) : Boolean(preview?.whatsappConfigured && preview?.smsConfigured);
  const canSend = modeAvailable(mode);

  function estimateText() {
    const parts: string[] = [];
    if (estimate.whatsapp) parts.push(`WhatsApp ${estimate.whatsapp}`);
    if (estimate.sms) parts.push(`SMS ${estimate.sms} (≈ sehemu ${estimate.smsParts} za Beem)`);
    const base = parts.length ? `Jumbe zitakazotumwa: ${parts.join(" + ")}` : "Hakuna ujumbe utakaotumwa";
    return estimate.fallbackSms ? `${base}; + hadi SMS ${estimate.fallbackSms} ikiwa WhatsApp itashindwa` : base;
  }

  function toggle(id: number) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function send() {
    setSending(true);
    try {
      const sent = await sendSaveTheDate(eventId, toSend.map((row) => row.pledgeId), mode, mode === "whatsapp" && smsFallback);
      // Close the dialog before clearing the selection (it would otherwise flash "0"), and only show
      // the result once the table reflects it.
      setConfirming(false);
      setSelected(new Set());
      await load();
      setResult(sent);
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
          <div>
            <p className="sep-label">Njia ya kutuma</p>
            <div className="mt-2 flex flex-wrap gap-1 rounded-2xl border border-[#e7e1d7] bg-white p-1.5 shadow-sm" role="radiogroup" aria-label="Njia ya kutuma">
              {MODES.map((option) => (
                <button key={option.value} type="button" role="radio" aria-checked={mode === option.value} disabled={!modeAvailable(option.value)} title={modeAvailable(option.value) ? undefined : "Haijasetiwa"} onClick={() => setMode(option.value)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 ${mode === option.value ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-stone-100"}`}>
                  {option.label}
                </button>
              ))}
            </div>
            {mode === "whatsapp" && (
              <label className={`mt-3 flex items-start gap-2 text-sm ${preview?.smsConfigured ? "text-slate-700" : "text-slate-400"}`}>
                <input type="checkbox" className="mt-0.5" checked={smsFallback} disabled={!preview?.smsConfigured} onChange={(event) => setSmsFallback(event.target.checked)} />
                <span><b>Tuma SMS ikiwa WhatsApp itashindwa</b> — ikiachwa, WhatsApp ikishindwa itabaki &quot;Imeshindikana&quot; mpaka uitume tena mwenyewe.</span>
              </label>
            )}
            {mode === "both" && <p className="mt-2 text-sm text-slate-600">Kila mpokeaji anapata WhatsApp <b>na</b> SMS (jumbe mbili). Mwenye namba sahihi kwa njia moja tu anapata hiyo moja.</p>}
            {!canSend && <p className="mt-2 text-sm font-semibold text-red-700">Njia hii haijasetiwa (WhatsApp template au BEEM SMS).</p>}
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Wanaostahili", counts.qualifying], ["Wametumiwa", counts.sent], ["Wanasubiri", counts.waiting], [`Hawana namba sahihi ya ${MODE_NOUN[mode]}`, counts.noPhone]].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#e7e1d7] bg-stone-50 p-3">
                <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
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
          <p className="font-bold">
            Imetumwa: {result.sentWhatsapp} WhatsApp, {result.sentSms} SMS{result.smsFallbacks ? ` (${result.smsFallbacks} kama fallback)` : ""} · Imeshindikana: {result.failed} · Imerukwa: {result.skipped}
          </p>
          {result.errors.length > 0 && <ul className="mt-2 list-disc pl-5">{result.errors.slice(0, 10).map((line) => <li key={line}>{line}</li>)}</ul>}
        </div>
      )}

      <section className="sep-card overflow-hidden">
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tafuta kwa jina la mchangiaji…"
              aria-label="Tafuta mchangiaji kwa jina"
              className="sep-control min-w-0 flex-1 sm:max-w-sm"
            />
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
              Onyesha wachangiaji wote ({rows.length})
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">{estimateText()}{hiddenSelected ? ` · ${hiddenSelected} kati ya waliochaguliwa hawaonekani kwa utafutaji huu` : ""}</p>
            <div className="flex flex-wrap gap-2">
              {/* Replaces the selection with exactly the rows this search shows (nobody hidden stays selected). */}
              <Button variant="secondary" size="sm" disabled={!visibleSendable.length} onClick={() => setSelected(new Set(visibleSendable.map((row) => row.pledgeId)))}>Chagua wote wanaosubiri ({visibleSendable.length})</Button>
              <Button variant="secondary" size="sm" disabled={!selected.size} onClick={() => setSelected(new Set())}>Ondoa chaguo</Button>
              <Button size="sm" disabled={!toSend.length || sending || !canSend} onClick={() => setConfirming(true)}>Tuma Save the Date ({toSend.length})</Button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="w-10 p-3"><span className="sr-only">Chagua</span></th><th className="p-3">Mchangiaji</th><th className="p-3">Aina</th><th className="p-3">Amelipa</th><th className="p-3">Save the Date</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {visible.map((row) => {
                const plan = planOf(row);
                return (
                  <tr key={row.pledgeId}>
                    <td className="p-3"><input type="checkbox" aria-label={`Chagua ${row.name}`} disabled={!plan.channels.length} checked={selected.has(row.pledgeId) && plan.channels.length > 0} onChange={() => toggle(row.pledgeId)} /></td>
                    <td className="p-3"><p className="font-bold text-slate-950">{row.name}</p><p className="mt-0.5 text-xs text-slate-500">{row.phone || "Hakuna namba ya simu"}</p></td>
                    <td className="p-3 capitalize">{row.cardType === "below_minimum" ? "Chini ya kiwango" : row.cardType}</td>
                    <td className="p-3 tabular-nums">{formatTzs(row.totalPaid)}</td>
                    <td className="p-3">
                      {row.qualifies ? (
                        <div className="flex flex-wrap gap-1.5"><ChannelBadge channel="whatsapp" state={row.whatsapp} /><ChannelBadge channel="sms" state={row.sms} /></div>
                      ) : (
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-slate-600">{row.ruleReason ? RULE_LABEL[row.ruleReason] : "-"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!visible.length && <tr><td colSpan={5} className="p-6 text-center text-slate-500">{query ? `Hakuna mchangiaji anayelingana na "${searchInput.trim()}".` : "Hakuna mchangiaji anayestahili Save the Date kwa sasa."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {confirming && (
        <Dialog titleId="confirm-save-the-date-title" onClose={() => !sending && setConfirming(false)} className="sm:max-w-md">
          <h2 id="confirm-save-the-date-title" className="sep-card-title">Tuma Save the Date?</h2>
          <p className="mt-3 text-slate-700">
            Kadi ya Save the Date ({variant === "navy" ? "Navy" : "Cream"}) kwa wachangiaji <b>{toSend.length}</b> kupitia <b>{MODES.find((option) => option.value === mode)?.label}</b>{mode === "whatsapp" && smsFallback ? ", na SMS ikiwa WhatsApp itashindwa" : ""}.
          </p>
          <p className="mt-2 text-sm text-slate-600">{estimateText()}</p>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">Ujumbe utaenda kwa wageni halisi. Ustahiki na hali ya kila njia vinakaguliwa upya wakati wa kutuma.</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={sending} onClick={() => setConfirming(false)}>Ghairi</Button>
            <Button loading={sending} onClick={() => void send()}>Thibitisha na Tuma</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
