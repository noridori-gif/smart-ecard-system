"use client";
import { useState } from "react";
import { formatTzs } from "@/services/pledgeMessageService";
import { EXPENSE_CATEGORY_PRESETS, uploadExpenseReceipt, type EventExpense, type ExpenseCorrectionInput } from "@/services/expenseService";

export default function EditExpenseDialog({ expense, eventId, categorySuggestions, onSave, onClose }: {
  expense: EventExpense; eventId: number; categorySuggestions: string[];
  onSave: (values: ExpenseCorrectionInput) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState({
    category: expense.category, description: expense.description ?? "", amount: expense.amount,
    expenseDate: expense.expense_date, payee: expense.payee ?? "", notes: expense.notes ?? "", reason: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const field = "mt-1 w-full rounded-xl border px-3 py-2";
  const suggestions = [...new Set([...EXPENSE_CATEGORY_PRESETS, ...categorySuggestions])];
  const valid = form.category.trim().length > 0 && /^\d+(\.\d{1,2})?$/.test(form.amount) && Number(form.amount) > 0
    && /^\d{4}-\d{2}-\d{2}$/.test(form.expenseDate) && form.reason.trim().length >= 3;

  async function submit() {
    try {
      setBusy(true); setError("");
      const receiptPath = file ? await uploadExpenseReceipt(eventId, file) : expense.receipt_path;
      await onSave({ category: form.category.trim(), description: form.description, amount: form.amount, expenseDate: form.expenseDate, payee: form.payee, notes: form.notes, receiptPath, reason: form.reason.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expense correction failed.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (confirming) return <div className="space-y-4">
    <h3 className="text-lg font-bold">Confirm expense correction</h3>
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Editing this expense will update expense totals and reports. The original values remain in the audit history.</p>
    <dl className="grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm">
      <div><dt className="text-slate-500">Current amount</dt><dd className="font-bold">{formatTzs(expense.amount)}</dd></div>
      <div><dt className="text-slate-500">New amount</dt><dd className="font-bold">{formatTzs(form.amount)}</dd></div>
      <div><dt className="text-slate-500">Current category</dt><dd className="font-bold">{expense.category}</dd></div>
      <div><dt className="text-slate-500">New category</dt><dd className="font-bold">{form.category}</dd></div>
    </dl>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2">
      <button disabled={busy} onClick={() => setConfirming(false)} className="rounded-xl border px-4 py-2">Back</button>
      <button disabled={busy} onClick={() => void submit()} className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Confirm correction"}</button>
    </div>
  </div>;

  return <form onSubmit={(event) => { event.preventDefault(); if (valid) setConfirming(true); }} className="space-y-4">
    <h3 className="text-lg font-bold">Edit Expense</h3>
    <label className="block text-sm font-semibold">Category
      <input required list="expense-category-suggestions-edit" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field} />
      <datalist id="expense-category-suggestions-edit">{suggestions.map((option) => <option key={option} value={option} />)}</datalist>
    </label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Amount<input required inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/,/g, "") })} className={field} /></label>
      <label className="text-sm font-semibold">Date<input required type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className={field} /></label>
    </div>
    <label className="block text-sm font-semibold">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={field} /></label>
    <label className="block text-sm font-semibold">Payee / Vendor<input value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} className={field} /></label>
    <label className="block text-sm font-semibold">{expense.receipt_path ? "Replace receipt / proof (optional)" : "Add receipt / proof (optional)"}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={`${field} cursor-pointer`} /></label>
    <label className="block text-sm font-semibold">Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={field} /></label>
    <label className="block text-sm font-semibold">Correction reason <span className="text-red-600">*</span><textarea required minLength={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={`${field} min-h-24`} /></label>
    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Cancel</button><button type="submit" disabled={!valid} className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-40">Review correction</button></div>
  </form>;
}
