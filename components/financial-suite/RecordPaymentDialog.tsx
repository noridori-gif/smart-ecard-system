"use client";
import { useState } from "react";
import type { FinancialPledge } from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";

export default function RecordPaymentDialog({ pledge, onSave, onClose }: {
  pledge: FinancialPledge; onSave: (values: { amount: string; date: string; method: string; reference: string; provider: string; notes: string }) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), method: "cash", reference: "", provider: "", notes: "" });
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const expected = form.amount && /^\d+$/.test(form.amount) ? BigInt(String(pledge.balance).split(".")[0]) - BigInt(form.amount) : null;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount) || Number(form.amount) <= 0 || expected === null || expected < BigInt(0)) { setError("Payment must be positive and cannot exceed the balance."); return; }
    try { setSaving(true); await onSave(form); } catch (err) { setError(err instanceof Error ? err.message : "Payment failed."); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-sm"><div>Pledged<br /><b>{formatTzs(pledge.pledged_amount)}</b></div><div>Paid<br /><b>{formatTzs(pledge.total_paid)}</b></div><div>Balance<br /><b>{formatTzs(pledge.balance)}</b></div></div>
    <label className="block text-sm font-semibold">New payment (TZS)<input required inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/,/g, "") })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
    {expected !== null && <p className="text-sm">Expected balance: <b>{formatTzs(expected.toString())}</b></p>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Payment date<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label><label className="text-sm font-semibold">Method<select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2">{["cash","mobile_money","bank","card","other"].map((m) => <option key={m}>{m}</option>)}</select></label></div>
    <label className="block text-sm font-semibold">Reference (optional)<input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
    <label className="block text-sm font-semibold">Provider / notes (optional)<input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Cancel</button><button disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Recording..." : "Record payment"}</button></div>
  </form>;
}
