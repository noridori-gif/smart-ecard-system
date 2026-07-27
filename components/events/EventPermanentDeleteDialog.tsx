"use client";

import { useEffect, useState } from "react";
import {
  deleteEventPermanently,
  previewPermanentEventDeletion,
  type Event,
  type EventDeletionPreview,
} from "@/services/eventService";

export default function EventPermanentDeleteDialog({ event, onClose, onDeleted }: {
  event: Event; onClose: () => void; onDeleted: () => void;
}) {
  const [preview, setPreview] = useState<EventDeletionPreview | null>(null);
  const [typedTitle, setTypedTitle] = useState("");
  const [secondConfirmation, setSecondConfirmation] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void previewPermanentEventDeletion(event.id)
      .then(setPreview)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Preview could not be loaded."))
      .finally(() => setBusy(false));
  }, [event.id]);

  async function remove() {
    try {
      setBusy(true); setError("");
      await deleteEventPermanently(event.id, typedTitle);
      onDeleted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The event could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="permanent-delete-title">
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
      <div className="flex justify-between gap-4"><div><h2 id="permanent-delete-title" className="text-xl font-bold text-red-700">Delete event permanently</h2><p className="mt-1 text-sm text-slate-600">This removes the event and all event-scoped records in one database transaction.</p></div><button onClick={onClose} aria-label="Close" className="text-2xl">×</button></div>
      {busy && !preview && <p className="mt-6">Loading deletion impact…</p>}
      {preview && <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[
          ["Guests",preview.guests],["Invitations",preview.invitations],["Pledges",preview.pledges],
          ["Valid payments",preview.validPayments],["Voided payments",preview.voidedPayments],
          ["Receipts",preview.receipts],["Committee links",preview.committeeLinks],
          ["Reminder history",preview.reminderHistory],["Automation logs",preview.automationDeliveries],
          ["Wishes",preview.wishes],["Import history",preview.guestImportHistory],
          ["Finance targets",preview.financeTargets],["WhatsApp logs",preview.whatsappMessageLogs],
          ["Finance audit logs",preview.financeAuditLogs],["Automation settings",preview.financeAutomationSettings],
        ].map(([label,value])=><div key={String(label)} className="rounded-lg border p-3"><span className="block text-xs text-slate-500">{label}</span><b>{value}</b></div>)}
      </div>}
      <div className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">Type the exact event title: <span className="text-red-700">{event.title}</span><input value={typedTitle} onChange={(e)=>setTypedTitle(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={secondConfirmation} onChange={(e)=>setSecondConfirmation(e.target.checked)} /><span>I understand that guests, invitations, financial history, receipts, messages, wishes, and reports for this event will be permanently removed.</span></label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={busy || !preview || typedTitle !== event.title || !secondConfirmation} onClick={() => void remove()} className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-40">{busy ? "Deleting…" : "Delete permanently"}</button></div>
    </div>
  </div>;
}
