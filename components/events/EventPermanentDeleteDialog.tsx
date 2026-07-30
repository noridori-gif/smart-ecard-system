"use client";

import { useEffect, useState } from "react";
import {
  deleteEventPermanently,
  previewPermanentEventDeletion,
  type Event,
  type EventDeletionPreview,
} from "@/services/eventService";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import FeedbackBanner from "@/components/ui/FeedbackBanner";
import IconButton from "@/components/ui/IconButton";

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

  return <Dialog titleId="permanent-delete-title" onClose={onClose} className="max-w-2xl">
      <div className="flex justify-between gap-4"><div><h2 id="permanent-delete-title" className="text-xl font-bold text-red-700">Delete event permanently</h2><p className="mt-1 text-sm text-slate-600">This removes the event and all event-scoped records in one database transaction.</p></div><IconButton label="Close" onClick={onClose}><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></IconButton></div>
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
      {error && <FeedbackBanner tone="error" className="mt-4">{error}</FeedbackBanner>}
      <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-[#e7e1d7] bg-white pt-4"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy && Boolean(preview)} disabled={!preview || typedTitle !== event.title || !secondConfirmation} onClick={() => void remove()}>{busy ? "Deleting…" : "Delete permanently"}</Button></div>
  </Dialog>;
}
