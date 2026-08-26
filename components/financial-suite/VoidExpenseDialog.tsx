"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import type { EventExpense } from "@/services/expenseService";
import { formatTzs } from "@/services/pledgeMessageService";

export default function VoidExpenseDialog({ expense, onVoid, onClose }: {
  expense: EventExpense;
  onVoid: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const valid = reason.trim().length >= 3;

  async function submit() {
    try {
      setBusy(true);
      setError("");
      await onVoid(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expense could not be voided.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-4">
    <div>
      <h3 className="text-xl font-bold text-red-700">Void expense</h3>
      <p className="text-sm text-slate-500">{expense.category}</p>
    </div>
    <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      This expense will remain in the audit history but will no longer count toward total spending.
    </p>
    <dl className="grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm">
      <div><dt className="text-slate-500">Category</dt><dd className="font-bold">{expense.category}</dd></div>
      <div><dt className="text-slate-500">Amount</dt><dd className="font-bold">{formatTzs(expense.amount)}</dd></div>
      <div><dt className="text-slate-500">Date</dt><dd className="font-bold">{expense.expense_date}</dd></div>
      <div><dt className="text-slate-500">Payee</dt><dd className="font-bold">{expense.payee ?? "—"}</dd></div>
    </dl>
    <label className="block text-sm font-semibold">
      Void reason <span className="text-red-600">*</span>
      <textarea required minLength={3} value={reason} onChange={(event) => setReason(event.target.value)}
        className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
        placeholder="Explain why this expense was recorded incorrectly." />
    </label>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2">
      <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
      <Button variant="destructive" loading={busy} disabled={busy || !valid} onClick={() => void submit()}>
        {busy ? "Saving…" : "Confirm void"}
      </Button>
    </div>
  </div>;
}
