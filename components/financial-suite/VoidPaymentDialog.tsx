"use client";

import { useMemo, useState } from "react";
import type { FinancialPledge, PledgePayment } from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";

export default function VoidPaymentDialog({ payment, pledge, onVoid, onClose }: {
  payment: PledgePayment;
  pledge: FinancialPledge;
  onVoid: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useAppLanguage();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const totals = useMemo(() => {
    const currentPaid = Number(pledge.total_paid);
    const amount = Number(payment.amount);
    return {
      currentPaid,
      newPaid: Math.max(currentPaid - amount, 0),
      currentBalance: Number(pledge.balance),
      newBalance: Math.min(Number(pledge.pledged_amount), Number(pledge.balance) + amount),
    };
  }, [payment.amount, pledge]);
  const valid = reason.trim().length >= 3;

  async function submit() {
    try {
      setBusy(true);
      setError("");
      await onVoid(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not be voided.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-4">
    <div>
      <h3 className="text-xl font-bold text-red-700">{t("payments.void")}</h3>
      <p className="text-sm text-slate-500">{payment.receipt_number}</p>
    </div>
    <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      This payment will remain in the audit and receipt history but will no longer count toward collected totals.
    </p>
    <dl className="grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm">
      <div><dt className="text-slate-500">Receipt number</dt><dd className="font-bold">{payment.receipt_number}</dd></div>
      <div><dt className="text-slate-500">Contributor</dt><dd className="font-bold">{pledge.full_name}</dd></div>
      <div><dt className="text-slate-500">Payment amount</dt><dd className="font-bold">{formatTzs(payment.amount)}</dd></div>
      <div><dt className="text-slate-500">Payment date</dt><dd className="font-bold">{payment.payment_date}</dd></div>
      <div><dt className="text-slate-500">Current total paid</dt><dd className="font-bold">{formatTzs(String(totals.currentPaid))}</dd></div>
      <div><dt className="text-slate-500">New total paid after void</dt><dd className="font-bold text-red-700">{formatTzs(String(totals.newPaid))}</dd></div>
      <div><dt className="text-slate-500">Current balance</dt><dd className="font-bold">{formatTzs(String(totals.currentBalance))}</dd></div>
      <div><dt className="text-slate-500">New balance after void</dt><dd className="font-bold text-red-700">{formatTzs(String(totals.newBalance))}</dd></div>
    </dl>
    <label className="block text-sm font-semibold">
      Void reason <span className="text-red-600">*</span>
      <textarea required minLength={3} value={reason} onChange={(event) => setReason(event.target.value)}
        className="mt-1 min-h-24 w-full rounded-xl border px-3 py-2"
        placeholder="Explain why this payment was recorded incorrectly." />
    </label>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2">
      <button disabled={busy} onClick={onClose} className="rounded-xl border px-4 py-2">{t("common.cancel")}</button>
      <button disabled={busy || !valid} onClick={() => void submit()}
        className="rounded-xl bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-40">
        {busy ? t("common.saving") : t("payments.confirmVoid")}
      </button>
    </div>
  </div>;
}
