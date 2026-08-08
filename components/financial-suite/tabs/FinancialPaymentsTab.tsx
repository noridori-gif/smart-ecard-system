"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getClosingReport,
  previewDailySummary,
  type AuthoritativeDailySummary,
  type ClosingReport,
} from "@/services/financialAutomationService";
import type {
  FinancialPledge,
  PledgePayment,
} from "@/services/financialSuiteService";
import type { FinanceReceipt } from "@/services/receiptMessageService";
import { formatAppTzs } from "@/lib/i18n/formatters";
import {
  FinancialActionIconButton,
  financialDesktop,
} from "../desktop/FinancialDesktopUI";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";

type IssuedReceipt = {
  receipt: FinanceReceipt;
  verificationUrl: string;
};

export default function FinancialPaymentsTab({
  eventId,
  pledges,
  issueReceipt,
  onViewReceipt,
  onEdit,
  onVoid,
}: {
  eventId: number;
  pledges: FinancialPledge[];
  issueReceipt: (receiptNumber: string) => Promise<IssuedReceipt>;
  onViewReceipt: (issued: IssuedReceipt) => void;
  onEdit: (pledge: FinancialPledge, payment: PledgePayment) => void;
  onVoid: (pledge: FinancialPledge, payment: PledgePayment) => void;
}) {
  const { language, t } = useAppLanguage();
  const formatTzs = (value: string | number) => formatAppTzs(Number(value), language);
  const [report, setReport] = useState<ClosingReport | null>(null);
  const [filter, setFilter] = useState<"all" | "valid" | "voided">("all");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [daily, setDaily] = useState<AuthoritativeDailySummary | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      setReport(await getClosingReport(eventId));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Payments could not be loaded."
      );
    }
  }, [eventId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const contributors = useMemo(
    () => new Map(pledges.map((item) => [item.id, item])),
    [pledges]
  );
  const payments = useMemo(
    () =>
      (report?.payments ?? [])
        .filter(
          (payment) =>
            filter === "all" ||
            (filter === "voided"
              ? Boolean(payment.voided_at)
              : !payment.voided_at)
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [filter, report]
  );

  async function receiptAction(
    payment: PledgePayment,
    action: "view" | "copy"
  ) {
    try {
      setBusy(`${action}-${payment.id}`);
      const issued = await issueReceipt(payment.receipt_number);
      if (action === "view") onViewReceipt(issued);
      else {
        await navigator.clipboard.writeText(issued.verificationUrl);
        setNotice("Verification link copied.");
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Receipt could not be prepared."
      );
    } finally {
      setBusy("");
    }
  }

  async function preview() {
    try {
      setBusy("daily");
      setDaily(await previewDailySummary(eventId, selectedDate));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Daily summary preview failed."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
          {notice}
        </p>
      )}

      <section className="sep-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece7df] p-5">
          <div>
            <h2 className="text-xl font-bold">{t("payments.history")}</h2>
            <p className="text-sm text-slate-500">
              Valid and voided transactions are shown distinctly.
            </p>
          </div>
          <div className="flex rounded-xl bg-stone-100 p-1">
            {(["all", "valid", "voided"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`min-h-10 rounded-lg px-4 text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 ${
                  filter === value
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {!report ? (
          <p className="p-10 text-center text-slate-500">{t("common.loading")}</p>
        ) : !payments.length ? (
          <p className="p-10 text-center text-slate-500">
            No payments match this filter.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1080px] text-left text-[15px]">
                <thead className="border-b border-[#e8e2d9] bg-[#faf8f4] text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    {[
                      t("eligibility.contributor"), t("payments.amount"), t("payments.receipt"), t("payments.date"), t("payments.method"), t("common.status"), t("common.actions"),
                    ].map((label) => (
                      <th key={label} className="px-5 py-4">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9e1]">
                  {payments.map((payment) => {
                    const pledge = contributors.get(payment.pledge_id);
                    return (
                      <tr
                        key={payment.id}
                        className={
                          payment.voided_at
                            ? "bg-red-50/50"
                            : "hover:bg-[#fcfbf8]"
                        }
                      >
                        <td className="px-5 py-4 font-semibold">
                          {pledge?.full_name ?? "Contributor"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums">
                          {formatTzs(payment.amount)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-mono text-sm">
                          {payment.receipt_number}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {payment.payment_date}
                        </td>
                        <td className="px-5 py-4 capitalize">
                          {payment.payment_method.replaceAll("_", " ")}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${
                              payment.voided_at
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {payment.voided_at ? "Voided" : "Valid"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <FinancialActionIconButton
                              icon="receipt"
                              label="View / PDF"
                              tone="blue"
                              disabled={busy === `view-${payment.id}`}
                              onClick={() => void receiptAction(payment, "view")}
                            />
                            <FinancialActionIconButton
                              icon="copy"
                              label="Copy verification link"
                              tone="slate"
                              onClick={() => void receiptAction(payment, "copy")}
                            />
                            {pledge && !payment.voided_at && (
                              <>
                                <FinancialActionIconButton
                                  icon="edit"
                                  label="Edit"
                                  tone="amber"
                                  onClick={() => onEdit(pledge, payment)}
                                />
                                <FinancialActionIconButton
                                  icon="void"
                                  label="Void"
                                  tone="red"
                                  onClick={() => onVoid(pledge, payment)}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {payments.map((payment) => {
                const pledge = contributors.get(payment.pledge_id);
                return (
                  <article
                    key={payment.id}
                    className={`rounded-xl border p-4 ${
                      payment.voided_at
                        ? "border-red-200 bg-red-50/50"
                        : "border-[#e7e1d7]"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <h3 className="font-bold">
                          {pledge?.full_name ?? "Contributor"}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {payment.receipt_number} · {payment.payment_date}
                        </p>
                      </div>
                      <b className="tabular-nums">{formatTzs(payment.amount)}</b>
                    </div>
                    <p
                      className={`mt-2 text-sm font-semibold ${
                        payment.voided_at
                          ? "text-red-700"
                          : "text-emerald-700"
                      }`}
                    >
                      {payment.voided_at ? "Voided" : "Valid"} ·{" "}
                      {payment.payment_method.replaceAll("_", " ")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <FinancialActionIconButton
                        icon="receipt"
                        label="View / PDF"
                        tone="blue"
                        onClick={() => void receiptAction(payment, "view")}
                      />
                      <FinancialActionIconButton
                        icon="copy"
                        label="Copy link"
                        tone="slate"
                        onClick={() => void receiptAction(payment, "copy")}
                      />
                      {pledge && !payment.voided_at && (
                        <>
                          <FinancialActionIconButton
                            icon="edit"
                            label="Edit"
                            tone="amber"
                            onClick={() => onEdit(pledge, payment)}
                          />
                          <FinancialActionIconButton
                            icon="void"
                            label="Void"
                            tone="red"
                            onClick={() => onVoid(pledge, payment)}
                          />
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="sep-card p-5">
          <h2 className="text-xl font-bold">Daily Collection Summary</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setDaily(null);
              }}
              className={financialDesktop.input}
            />
            <button
              type="button"
              disabled={busy === "daily"}
              onClick={() => void preview()}
              className={financialDesktop.primary}
            >
              Generate preview
            </button>
          </div>
          {daily && (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Collected", formatTzs(daily.summary.dailyCollected)],
                  ["Transactions", daily.summary.transactionCount],
                  ["Contributors who paid", daily.summary.contributorsCount],
                  ["Outstanding", formatTzs(daily.summary.outstandingBalance)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#faf8f4] p-3">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-1 font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
              <pre className="mt-4 max-h-52 overflow-auto whitespace-pre-wrap rounded-xl bg-[#faf8f4] p-3 text-sm leading-6">
                {daily.message}
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["Copy summary", () => navigator.clipboard.writeText(daily.message)],
                  ["WhatsApp preview", () => setNotice(`WhatsApp preview:\n${daily.message}`)],
                  ["SMS preview", () => setNotice(`SMS preview:\n${daily.message}`)],
                ].map(([label, action]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => void (action as () => void | Promise<void>)()}
                    className={financialDesktop.secondary}
                  >
                    {String(label)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sep-card p-5">
          <h2 className="text-xl font-bold">Payment Methods</h2>
          <p className="text-sm text-slate-500">Valid transactions only.</p>
          <div className="mt-4 space-y-3">
            {report?.paymentMethods.length ? (
              report.paymentMethods
                .sort((a, b) => b.amount - a.amount)
                .map((item) => (
                  <div
                    key={item.method}
                    className="flex items-center justify-between rounded-xl bg-[#faf8f4] p-3"
                  >
                    <span className="capitalize">
                      {item.method.replaceAll("_", " ")}
                    </span>
                    <b className="tabular-nums">{formatTzs(item.amount)}</b>
                  </div>
                ))
            ) : (
              <p className="text-sm text-slate-500">
                No payment-method data yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
