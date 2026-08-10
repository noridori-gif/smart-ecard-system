"use client";

import { useEffect, useState } from "react";
import {
  permanentlyDeletePledge,
  previewPledgePermanentDeletion,
  type FinancialPledge,
  type PledgeDeletionPreview,
} from "@/services/financialSuiteService";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import FeedbackBanner from "@/components/ui/FeedbackBanner";
import IconButton from "@/components/ui/IconButton";

export default function ContributorPermanentDeleteDialog({ pledge, onClose, onDeleted }: {
  pledge: FinancialPledge; onClose: () => void; onDeleted: () => void;
}) {
  const [preview, setPreview] = useState<PledgeDeletionPreview | null>(null);
  const [typedName, setTypedName] = useState("");
  const [secondConfirmation, setSecondConfirmation] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void previewPledgePermanentDeletion(pledge.id)
      .then(setPreview)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Preview could not be loaded."))
      .finally(() => setBusy(false));
  }, [pledge.id]);

  async function remove() {
    try {
      setBusy(true); setError("");
      await permanentlyDeletePledge(pledge.id, typedName);
      onDeleted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The contributor could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  const blocked = Boolean(preview?.hasProtectedFinancialHistory);

  return <Dialog titleId="permanent-pledge-delete-title" onClose={onClose} className="max-w-xl">
      <div className="flex justify-between gap-4"><div><h2 id="permanent-pledge-delete-title" className="text-xl font-bold text-red-700">Delete contributor permanently</h2><p className="mt-1 text-sm text-slate-600">This removes {pledge.full_name}&apos;s cancelled pledge and its operational history in one database transaction.</p></div><IconButton label="Close" onClick={onClose}><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></IconButton></div>
      {busy && !preview && <p className="mt-6">Loading deletion impact…</p>}
      {preview && <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
        {[
          ["Reminder history",preview.reminderHistory],["Meeting invitations",preview.meetingInvitations],
          ["Audit log entries",preview.auditLogs],["Payment records",preview.paymentRows],
        ].map(([label,value])=><div key={String(label)} className="rounded-lg border p-3"><span className="block text-xs text-slate-500">{label}</span><b>{value}</b></div>)}
      </div>}
      {preview && blocked && <FeedbackBanner tone="error" className="mt-4">This contributor has protected financial history (payments or receipts) and cannot be permanently deleted. Keep the pledge cancelled instead.</FeedbackBanner>}
      {preview && !blocked && <div className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">Type the contributor&apos;s exact full name: <span className="text-red-700">{pledge.full_name}</span><input value={typedName} onChange={(e)=>setTypedName(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={secondConfirmation} onChange={(e)=>setSecondConfirmation(e.target.checked)} /><span>I understand that this contributor&apos;s pledge, reminder history, and meeting invitations will be permanently removed. The linked guest will be preserved.</span></label>
      </div>}
      {error && <FeedbackBanner tone="error" className="mt-4">{error}</FeedbackBanner>}
      <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-[#e7e1d7] bg-white pt-4"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" loading={busy && Boolean(preview)} disabled={!preview || blocked || typedName !== pledge.full_name || !secondConfirmation} onClick={() => void remove()}>{busy ? "Deleting…" : "Delete permanently"}</Button></div>
  </Dialog>;
}
