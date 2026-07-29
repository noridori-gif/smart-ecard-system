"use client";

import { useMemo, useState } from "react";
import type { FinancialPledge, PaymentCorrectionInput, PledgePayment } from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";

const methods = [
  ["cash", "Cash"], ["mobile_money", "Mobile money"], ["bank", "Bank"],
  ["card", "Card"], ["other", "Other"],
] as const;

export default function EditPaymentDialog({ payment, pledge, onSave, onClose }: {
  payment: PledgePayment;
  pledge: FinancialPledge;
  onSave: (values: PaymentCorrectionInput) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<PaymentCorrectionInput>({
    amount: payment.amount,
    date: payment.payment_date,
    method: payment.payment_method,
    reference: payment.payment_reference ?? "",
    provider: payment.provider ?? "",
    notes: payment.notes ?? "",
    reason: "",
  });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const amounts = useMemo(() => {
    const current = Number(payment.amount);
    const corrected = Number(form.amount);
    const difference = Number.isFinite(corrected) ? corrected - current : 0;
    const newBalance = Number(pledge.balance) - difference;
    return { current, corrected, difference, newBalance };
  }, [form.amount, payment.amount, pledge.balance]);
  const valid = /^\d+(\.\d{1,2})?$/.test(form.amount)
    && amounts.corrected > 0 && amounts.newBalance >= 0
    && /^\d{4}-\d{2}-\d{2}$/.test(form.date)
    && methods.some(([value]) => value === form.method)
    && form.reason.trim().length >= 3;

  async function submit() {
    try {
      setBusy(true);
      setError("");
      await onSave({ ...form, reason: form.reason.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment correction failed.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (confirming) return <div className="space-y-4">
    <h3 className="text-lg font-bold">Confirm payment correction</h3>
    <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
      Editing this payment will update financial totals and reports. The original values will remain in the audit history.
    </p>
    <dl className="grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm">
      <div><dt className="text-slate-500">Current payment</dt><dd className="font-bold">{formatTzs(payment.amount)}</dd></div>
      <div><dt className="text-slate-500">New payment</dt><dd className="font-bold">{formatTzs(form.amount)}</dd></div>
      <div><dt className="text-slate-500">Difference</dt><dd className="font-bold">{amounts.difference > 0 ? "+" : ""}{formatTzs(String(amounts.difference))}</dd></div>
      <div><dt className="text-slate-500">Current pledge balance</dt><dd className="font-bold">{formatTzs(pledge.balance)}</dd></div>
      <div className="col-span-2"><dt className="text-slate-500">New pledge balance</dt><dd className="font-bold">{formatTzs(String(amounts.newBalance))}</dd></div>
    </dl>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2">
      <button disabled={busy} onClick={() => setConfirming(false)} className="rounded-xl border px-4 py-2">Back</button>
      <button disabled={busy} onClick={() => void submit()} className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Confirm correction"}</button>
    </div>
  </div>;

  return <form onSubmit={(event) => { event.preventDefault(); if (valid) setConfirming(true); }} className="space-y-4">
    <div><h3 className="text-lg font-bold">Edit Payment</h3><p className="text-sm text-slate-500">{payment.receipt_number}</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Amount<input required inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
      <label className="text-sm font-semibold">Payment date<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
      <label className="text-sm font-semibold">Payment method<select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2">{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm font-semibold">Payment reference<input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
      <label className="text-sm font-semibold">Provider<input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
      <label className="text-sm font-semibold">Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
    </div>
    <label className="block text-sm font-semibold">Correction reason <span className="text-red-600">*</span><textarea required minLength={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2" /></label>
    {amounts.newBalance < 0 && <p role="alert" className="text-sm text-red-700">This amount would exceed the pledged amount.</p>}
    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Cancel</button><button type="submit" disabled={!valid} className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-40">Review correction</button></div>
  </form>;
}
