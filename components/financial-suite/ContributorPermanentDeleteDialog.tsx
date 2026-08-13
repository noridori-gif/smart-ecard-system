"use client";

import { useEffect, useState } from "react";
import {
  permanentlyDeletePledge,
  previewPledgePermanentDeletion,
  type FinancialPledge,
  type PledgeDeletionPreview,
} from "@/services/financialSuiteService";
import { getCurrentUserProfile } from "@/services/profileService";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import { formatAppTzs } from "@/lib/i18n/formatters";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import FeedbackBanner from "@/components/ui/FeedbackBanner";
import IconButton from "@/components/ui/IconButton";

const FORCE_DELETE_PHRASE = "DELETE PAYMENTS";

export default function ContributorPermanentDeleteDialog({ pledge, onClose, onDeleted }: {
  pledge: FinancialPledge; onClose: () => void; onDeleted: () => void;
}) {
  const { language } = useAppLanguage();
  const [preview, setPreview] = useState<PledgeDeletionPreview | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [secondConfirmation, setSecondConfirmation] = useState(false);
  const [forcePhrase, setForcePhrase] = useState("");
  const [forceDelete, setForceDelete] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([previewPledgePermanentDeletion(pledge.id), getCurrentUserProfile()])
      .then(([previewResult, profile]) => { setPreview(previewResult); setIsAdmin(profile?.role === "admin"); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Preview could not be loaded."))
      .finally(() => setBusy(false));
  }, [pledge.id]);

  async function remove(withForce: boolean) {
    try {
      setBusy(true); setError("");
      await permanentlyDeletePledge(pledge.id, typedName, withForce);
      onDeleted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The contributor could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  const blocked = Boolean(preview?.hasProtectedFinancialHistory);
  const canForceOverride = blocked && isAdmin;

  return <Dialog titleId="permanent-pledge-delete-title" onClose={onClose} className="max-w-xl">
      <div className="flex justify-between gap-4"><div><h2 id="permanent-pledge-delete-title" className="text-xl font-bold text-red-700">Delete contributor permanently</h2><p className="mt-1 text-sm text-slate-600">This removes {pledge.full_name}&apos;s cancelled pledge and its operational history in one database transaction.</p></div><IconButton label="Close" onClick={onClose}><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></IconButton></div>
      {busy && !preview && <p className="mt-6">Loading deletion impact…</p>}
      {preview && <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
        {[
          ["Reminder history",preview.reminderHistory],["Meeting invitations",preview.meetingInvitations],
          ["Audit log entries",preview.auditLogs],["Payment records",preview.paymentRows],
        ].map(([label,value])=><div key={String(label)} className="rounded-lg border p-3"><span className="block text-xs text-slate-500">{label}</span><b>{value}</b></div>)}
      </div>}
      {preview && blocked && !isAdmin && <FeedbackBanner tone="error" className="mt-4">This contributor has protected financial history (payments or receipts) and cannot be permanently deleted. Keep the pledge cancelled instead.</FeedbackBanner>}
      {preview && !blocked && <div className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">Type the contributor&apos;s exact full name: <span className="text-red-700">{pledge.full_name}</span><input value={typedName} onChange={(e)=>setTypedName(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 font-normal" /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={secondConfirmation} onChange={(e)=>setSecondConfirmation(e.target.checked)} /><span>I understand that this contributor&apos;s pledge, reminder history, and meeting invitations will be permanently removed. The linked guest will be preserved.</span></label>
      </div>}
      {preview && canForceOverride && <div className="mt-4 space-y-4">
        <FeedbackBanner tone="error">Admin override: this contributor has {pledge.payment_row_count} payment record{pledge.payment_row_count===1?"":"s"} totaling {formatAppTzs(Number(pledge.total_paid),language)}. Forcing deletion permanently removes the pledge, its payment history, and any linked receipt verifications together. This cannot be undone.</FeedbackBanner>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={forceDelete} onChange={(e)=>setForceDelete(e.target.checked)} /><span>I am an admin and I want to force-delete this contributor together with its payment history.</span></label>
        {forceDelete && <>
          <label className="block text-sm font-semibold">Type the contributor&apos;s exact full name: <span className="text-red-700">{pledge.full_name}</span><input value={typedName} onChange={(e)=>setTypedName(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 font-normal" /></label>
          <label className="block text-sm font-semibold">Type <span className="text-red-700">{FORCE_DELETE_PHRASE}</span> to confirm<input value={forcePhrase} onChange={(e)=>setForcePhrase(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 font-normal" /></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={secondConfirmation} onChange={(e)=>setSecondConfirmation(e.target.checked)} /><span>I understand the payment history removed here cannot be recovered.</span></label>
        </>}
      </div>}
      {error && <FeedbackBanner tone="error" className="mt-4">{error}</FeedbackBanner>}
      <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-[#e7e1d7] bg-white pt-4">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        {!blocked && <Button variant="danger" loading={busy && Boolean(preview)} disabled={!preview || typedName !== pledge.full_name || !secondConfirmation} onClick={() => void remove(false)}>{busy ? "Deleting…" : "Delete permanently"}</Button>}
        {canForceOverride && <Button variant="danger" loading={busy && Boolean(preview)} disabled={!preview || !forceDelete || typedName !== pledge.full_name || forcePhrase !== FORCE_DELETE_PHRASE || !secondConfirmation} onClick={() => void remove(true)}>{busy ? "Deleting…" : "Force delete with payments"}</Button>}
      </div>
  </Dialog>;
}
