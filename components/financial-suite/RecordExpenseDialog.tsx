"use client";
import { useState } from "react";
import { EXPENSE_CATEGORY_PRESETS, uploadExpenseReceipt, type ExpenseInput } from "@/services/expenseService";

export default function RecordExpenseDialog({ eventId, categorySuggestions, onSave, onClose }: {
  eventId: number; categorySuggestions: string[];
  onSave: (values: ExpenseInput) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState({ category: "", description: "", amount: "", expenseDate: new Date().toISOString().slice(0, 10), payee: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const field = "mt-1 w-full rounded-xl border px-3 py-2";
  const suggestions = [...new Set([...EXPENSE_CATEGORY_PRESETS, ...categorySuggestions])];
  const valid = form.category.trim().length > 0 && /^\d+(\.\d{1,2})?$/.test(form.amount) && Number(form.amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(form.expenseDate);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!valid) { setError("Enter a category, a valid amount, and a date."); return; }
    try {
      setSaving(true);
      const receiptPath = file ? await uploadExpenseReceipt(eventId, file) : null;
      await onSave({ category: form.category.trim(), description: form.description, amount: form.amount, expenseDate: form.expenseDate, payee: form.payee, notes: form.notes, receiptPath });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Expense could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <h3 className="text-lg font-bold">Add Expense</h3>
    <label className="block text-sm font-semibold">Category
      <input required list="expense-category-suggestions" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Venue, Transport, Photographer" className={field} />
      <datalist id="expense-category-suggestions">{suggestions.map((option) => <option key={option} value={option} />)}</datalist>
    </label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Amount (TZS)<input required inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/,/g, "") })} className={field} /></label>
      <label className="text-sm font-semibold">Date<input required type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className={field} /></label>
    </div>
    <label className="block text-sm font-semibold">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={field} /></label>
    <label className="block text-sm font-semibold">Payee / Vendor<input value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} placeholder="Who was paid" className={field} /></label>
    <label className="block text-sm font-semibold">Receipt / proof (optional)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={`${field} cursor-pointer`} /></label>
    <label className="block text-sm font-semibold">Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={field} /></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Cancel</button>
      <button disabled={saving} className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? "Saving…" : "Save expense"}</button>
    </div>
  </form>;
}
