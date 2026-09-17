"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import {
  previewGuestThankYou,
  sendGuestThankYou,
  type GuestThankYouPreview,
  type GuestThankYouSendResult,
} from "@/services/guestThankYouClientService";

const skipLabels: Record<string, string> = {
  missing_phone: "Hana Namba",
  already_sent: "Tayari Ametumiwa",
  in_progress: "Inatumwa",
};

function statusBadgeClass(eligible: boolean, reason: string | null) {
  if (eligible) return "bg-emerald-50 text-emerald-700";
  if (reason === "already_sent") return "bg-stone-100 text-slate-600";
  return "bg-amber-50 text-amber-800";
}

export default function ThankYouMessageDialog({
  eventId,
  eventTitle,
  onClose,
  onSent,
}: {
  eventId: number;
  eventTitle: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<GuestThankYouPreview | null>(null);
  const [excludedGuestIds, setExcludedGuestIds] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GuestThankYouSendResult | null>(null);

  const loadPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await previewGuestThankYou(eventId);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview ya wageni haikuweza kupakuliwa.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    const timer = setTimeout(() => void loadPreview(), 0);
    return () => clearTimeout(timer);
  }, [loadPreview]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const eligibleRows = useMemo(() => preview?.rows.filter((row) => row.eligible) ?? [], [preview]);
  const selectedGuestIds = useMemo(
    () => eligibleRows.filter((row) => !excludedGuestIds.has(row.guestId)).map((row) => row.guestId),
    [eligibleRows, excludedGuestIds]
  );
  const alreadySentCount = useMemo(
    () => preview?.rows.filter((row) => row.skippedReason === "already_sent").length ?? 0,
    [preview]
  );
  const missingPhoneCount = useMemo(
    () => preview?.rows.filter((row) => row.skippedReason === "missing_phone").length ?? 0,
    [preview]
  );

  function toggleGuest(guestId: number) {
    setExcludedGuestIds((current) => {
      const next = new Set(current);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
    setConfirmed(false);
  }

  function selectAllEligible() {
    setExcludedGuestIds(new Set());
    setConfirmed(false);
  }

  function clearSelection() {
    setExcludedGuestIds(new Set(eligibleRows.map((row) => row.guestId)));
    setConfirmed(false);
  }

  async function send() {
    if (!selectedGuestIds.length) return;
    try {
      setBusy(true);
      setError("");
      const sendResult = await sendGuestThankYou(eventId, selectedGuestIds);
      setResult(sendResult);
      setConfirmed(false);
      await loadPreview();
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ujumbe wa shukrani haukuweza kutumwa.");
    } finally {
      setBusy(false);
    }
  }

  const sampleMessage = preview?.rows[0]?.message ?? "";

  return (
    <Dialog titleId="thank-you-dialog-title" onClose={onClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="thank-you-dialog-title" className="text-xl font-bold text-slate-950">
            Tuma Shukrani kwa Wageni
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {eventTitle ? `Kwa event: ${eventTitle}. ` : ""}
            WhatsApp itatumwa kwanza (template iliyoidhinishwa); SMS itatumwa kama fallback endapo WhatsApp itashindikana.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Funga dirisha">
          Funga
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p role="status" className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-slate-600">
          Inapakua wageni...
        </p>
      ) : !preview ? null : result ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <b>Utumaji umekamilika.</b>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["WhatsApp", result.sentWhatsapp],
                ["SMS (fallback)", result.sentSms],
                ["Wameshindikana", result.failed],
                ["Wameruka", result.skipped],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg bg-white/70 p-3 text-slate-900">
                  <p className="text-xs text-slate-600">{label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3">
              {result.errors.map((message, index) => (
                <p key={`${index}-${message}`} className="text-xs text-amber-900">
                  {message}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="dark" onClick={onClose}>
              Sawa, Funga
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Wageni wote", preview.rows.length],
              ["Watapokea sasa", selectedGuestIds.length],
              ["Tayari wametumiwa", alreadySentCount],
              ["Hawana namba", missingPhoneCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border bg-stone-50 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <p className={`rounded-xl p-3 text-sm ${preview.providerReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            {preview.providerMessage}
          </p>

          {sampleMessage && (
            <div className="rounded-lg border border-[#e7e1d7] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mfano wa Ujumbe</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{sampleMessage}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-600">
              {selectedGuestIds.length} kati ya {eligibleRows.length} wageni wanaostahili watachaguliwa
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={selectAllEligible} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold">
                Chagua wote
              </button>
              <button type="button" onClick={clearSelection} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold">
                Ondoa wote
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-auto rounded-lg border border-stone-200 bg-white">
            {preview.rows.map((row) => (
              <label
                key={row.guestId}
                className={`flex items-center gap-3 border-t border-stone-100 px-3 py-2 text-sm first:border-t-0 ${row.eligible ? "" : "opacity-70"}`}
              >
                <input
                  type="checkbox"
                  checked={row.eligible && !excludedGuestIds.has(row.guestId)}
                  disabled={!row.eligible}
                  onChange={() => toggleGuest(row.guestId)}
                />
                <span className="flex-1">{row.name}</span>
                <span className="text-xs text-slate-500">{row.phone || "Hana namba"}</span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(row.eligible, row.skippedReason)}`}>
                  {row.eligible ? "Tayari" : skipLabels[row.skippedReason ?? ""] ?? "Haistahili"}
                </span>
              </label>
            ))}
            {!preview.rows.length && <p className="p-6 text-center text-sm text-slate-500">Hakuna mgeni kwenye event hii.</p>}
          </div>

          <label className="flex min-h-11 items-start gap-3 rounded-xl border border-stone-200 p-3 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={!selectedGuestIds.length}
              className="mt-0.5 h-5 w-5"
            />
            Nathibitisha kutuma ujumbe wa shukrani kwa wageni {selectedGuestIds.length}. Kitendo hiki hakiwezi kurudishwa nyuma (ujumbe ukishatumwa hauwezi kufutwa).
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Ghairi
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={busy}
              disabled={busy || !confirmed || !selectedGuestIds.length || !preview.providerReady}
              onClick={() => void send()}
            >
              Thibitisha na Tuma
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
