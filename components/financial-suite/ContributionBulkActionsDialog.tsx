"use client";

import { useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/services/profileService";
import {
  previewContributionCleanup,
  runContributionCleanup,
  type ContributionCleanupPreview,
} from "@/services/financialSuiteService";

type Action = "cancel_all" | "delete_contributions" | "delete_contributions_and_guests";

export default function ContributionBulkActionsDialog({ eventId, onClose, onCompleted }: {
  eventId: number; onClose: () => void; onCompleted: () => Promise<void>;
}) {
  const [action, setAction] = useState<Action>("cancel_all");
  const [preview, setPreview] = useState<ContributionCleanupPreview | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [removeGuests, setRemoveGuests] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ deletedPledges: number; cancelledPledges: number; deletedGuests: number } | null>(null);

  async function loadPreview(remove = removeGuests) {
    try { setBusy(true); setError(""); setPreview(await previewContributionCleanup(eventId, remove)); }
    catch (reasonValue) { setError(reasonValue instanceof Error ? reasonValue.message : "Preview could not be loaded."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    void Promise.all([getCurrentUserProfile(), previewContributionCleanup(eventId, false)])
      .then(([profile, summary]) => { setIsAdmin(profile?.role === "admin"); setPreview(summary); })
      .catch((reasonValue) => setError(reasonValue instanceof Error ? reasonValue.message : "Preview could not be loaded."))
      .finally(() => setBusy(false));
  }, [eventId]);

  async function execute() {
    try {
      setBusy(true); setError("");
      const completed = await runContributionCleanup(eventId, {
        action, reason,
        confirmation: action === "cancel_all" ? undefined : confirmation,
        removeLinkedGuests: action === "delete_contributions_and_guests" && removeGuests,
      });
      setResult(completed); await onCompleted();
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : "The bulk action could not be completed.");
    } finally { setBusy(false); }
  }

  const destructive = action !== "cancel_all";
  return <div className="space-y-5">
    <div className="flex justify-between gap-4"><div><h2 className="text-xl font-bold text-red-700">Financial Suite Bulk Actions</h2><p className="text-sm text-slate-600">Preview and apply event-scoped contribution cleanup.</p></div><button onClick={onClose} aria-label="Close" className="text-2xl">×</button></div>
    {!result && <><label className="block text-sm font-semibold">Action<select value={action} onChange={(e)=>{setAction(e.target.value as Action);setConfirmation("");}} className="mt-2 w-full rounded-lg border px-3 py-2 font-normal">
      <option value="cancel_all">Cancel All Pledges</option>
      <option value="delete_contributions" disabled={!isAdmin}>Delete All Contributions {!isAdmin ? "(Admin only)" : ""}</option>
      <option value="delete_contributions_and_guests" disabled={!isAdmin}>Delete Contributions and Linked Guests {!isAdmin ? "(Admin only)" : ""}</option>
    </select></label>
    {preview && <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">{[
      ["Total contributors",preview.totalContributors],["With payments",preview.contributorsWithPayments],
      ["Without payments",preview.contributorsWithoutPayments],["Guests removable",preview.guestsCanBeRemoved],
      ["Guests preserved",preview.guestsMustBePreserved],["Receipts remain valid",preview.receiptsRemainValid],
    ].map(([label,value])=><div key={String(label)} className="rounded-lg border p-3"><span className="block text-xs text-slate-500">{label}</span><b>{value}</b></div>)}</div>}
    <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
      {action==="cancel_all" && "All active pledges will be cancelled. Payments, receipts, verification URLs, and audit history remain intact."}
      {action==="delete_contributions" && "Unpaid pledges will be deleted. Pledges with any valid or voided payment history will only be cancelled, preserving receipts and financial history."}
      {action==="delete_contributions_and_guests" && "The same financial rules apply. Guests are removed only from this event when they have no check-in, wish, active RSVP/view history, message history, or remaining pledge link."}
    </div>
    <label className="block text-sm font-semibold">Cancellation reason<input value={reason} onChange={(e)=>setReason(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 font-normal" placeholder="Required for cancelled pledges" /></label>
    {action==="delete_contributions_and_guests" && <label className="flex gap-2 text-sm"><input type="checkbox" checked={removeGuests} onChange={(e)=>{setRemoveGuests(e.target.checked);void loadPreview(e.target.checked);}} /><span>Permanently remove eligible linked guests and their unused invitations. Unmarked existing guests require this explicit confirmation.</span></label>}
    {destructive && <label className="block text-sm font-semibold">Type DELETE CONTRIBUTIONS<input value={confirmation} onChange={(e)=>setConfirmation(e.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 font-normal" /></label>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy || reason.trim().length < 3 || (destructive && confirmation !== "DELETE CONTRIBUTIONS")} onClick={() => void execute()} className="w-full rounded-lg bg-red-700 px-4 py-3 font-semibold text-white disabled:opacity-40">{busy ? "Working…" : action==="cancel_all" ? "Cancel all active pledges" : "Execute permanent cleanup"}</button></>}
    {result && <div className="space-y-4"><div className="rounded-xl bg-emerald-50 p-4 text-emerald-800"><b>Bulk action completed.</b><p className="mt-1 text-sm">{result.deletedPledges} pledges deleted, {result.cancelledPledges} pledges cancelled, {result.deletedGuests} guests deleted.</p></div><button onClick={onClose} className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white">Done</button></div>}
  </div>;
}
