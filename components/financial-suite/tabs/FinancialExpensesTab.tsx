"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  correctExpense, getExpenseReceiptUrl, getExpenses, recordExpense, voidExpense,
  type EventExpense, type ExpenseCorrectionInput, type ExpenseInput,
} from "@/services/expenseService";
import { formatAppTzs } from "@/lib/i18n/formatters";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import RecordExpenseDialog from "../RecordExpenseDialog";
import EditExpenseDialog from "../EditExpenseDialog";
import VoidExpenseDialog from "../VoidExpenseDialog";

export default function FinancialExpensesTab({ eventId, expenseBudget }: { eventId: number; expenseBudget: string | number | null }) {
  const { language } = useAppLanguage();
  const formatTzs = (value: string | number) => formatAppTzs(Number(value), language);
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"add" | "edit" | "void" | null>(null);
  const [selected, setSelected] = useState<EventExpense | null>(null);
  const [receiptBusy, setReceiptBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { setError(""); setExpenses(await getExpenses(eventId)); }
    catch (err) { setError(err instanceof Error ? err.message : "Expenses could not be loaded."); }
    finally { setLoading(false); }
  }, [eventId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const valid = useMemo(() => expenses.filter((item) => !item.voided_at), [expenses]);
  const voided = useMemo(() => expenses.filter((item) => item.voided_at), [expenses]);
  const totalSpent = useMemo(() => valid.reduce((sum, item) => sum + Number(item.amount), 0), [valid]);
  const budget = expenseBudget === null ? null : Number(expenseBudget);
  const remaining = budget === null ? null : budget - totalSpent;
  const categorySuggestions = useMemo(() => [...new Set(expenses.map((item) => item.category))], [expenses]);
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    valid.forEach((item) => map.set(item.category, (map.get(item.category) ?? 0) + Number(item.amount)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [valid]);

  async function addExpense(values: ExpenseInput) {
    await recordExpense(eventId, values);
    setMode(null); setNotice("Expense recorded."); await load();
  }
  async function saveCorrection(values: ExpenseCorrectionInput) {
    if (!selected) return;
    await correctExpense(selected.id, values);
    setMode(null); setSelected(null); setNotice("Expense corrected."); await load();
  }
  async function saveVoid(reason: string) {
    if (!selected) return;
    await voidExpense(selected.id, reason);
    setMode(null); setSelected(null); setNotice("Expense voided."); await load();
  }
  async function viewReceipt(item: EventExpense) {
    if (!item.receipt_path) return;
    try { setReceiptBusy(item.id); window.open(await getExpenseReceiptUrl(item.receipt_path), "_blank"); }
    catch (err) { setError(err instanceof Error ? err.message : "Receipt could not be opened."); }
    finally { setReceiptBusy(null); }
  }

  return <div className="space-y-6">
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

    <section className="sep-card p-5">
      <h2 className="text-xl font-bold">Budget vs Actual</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Expense budget</span><br /><b className="text-lg">{budget === null ? "Not set" : formatTzs(budget)}</b></div>
        <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Total spent</span><br /><b className="text-lg">{formatTzs(totalSpent)}</b></div>
        <div className={`rounded-xl p-3 text-sm ${remaining !== null && remaining < 0 ? "bg-red-50" : "bg-slate-50"}`}>
          <span className="text-slate-500">{remaining !== null && remaining < 0 ? "Over budget by" : "Remaining"}</span><br />
          <b className={`text-lg ${remaining !== null && remaining < 0 ? "text-red-700" : ""}`}>{remaining === null ? "—" : formatTzs(Math.abs(remaining))}</b>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Set the expense budget in the Settings tab.</p>
    </section>

    <div className="flex justify-end"><button type="button" onClick={() => setMode("add")} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">+ Add Expense</button></div>

    <section className="sep-card overflow-hidden">
      <div className="border-b border-[#ece7df] p-5"><h2 className="text-xl font-bold">Expenses</h2></div>
      {loading ? <p className="p-8 text-center text-slate-500">Loading…</p> : !valid.length ? <p className="p-8 text-center text-slate-500">No expenses recorded yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-[#faf8f4] text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Payee</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y">
              {valid.map((item) => <tr key={item.id} className="hover:bg-[#fcfbf8]">
                <td className="whitespace-nowrap px-4 py-3">{item.expense_date}</td>
                <td className="px-4 py-3 font-semibold">{item.category}</td>
                <td className="px-4 py-3 text-slate-600">{item.description ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{item.payee ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatTzs(item.amount)}</td>
                <td className="px-4 py-3">{item.receipt_path ? <button disabled={receiptBusy === item.id} onClick={() => void viewReceipt(item)} className="text-sm font-semibold text-blue-700">{receiptBusy === item.id ? "Preparing…" : "View"}</button> : <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-3"><button onClick={() => { setSelected(item); setMode("edit"); }} className="text-sm font-semibold text-amber-700">Edit</button><button onClick={() => { setSelected(item); setMode("void"); }} className="text-sm font-semibold text-red-700">Void</button></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </section>

    {voided.length > 0 && <section className="sep-card overflow-hidden">
      <div className="border-b border-[#ece7df] p-5"><h2 className="text-xl font-bold">Voided Expenses</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-[#faf8f4] text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Void Reason</th></tr></thead>
          <tbody className="divide-y">{voided.map((item) => <tr key={item.id} className="bg-red-50/40"><td className="whitespace-nowrap px-4 py-3">{item.expense_date}</td><td className="px-4 py-3">{item.category}</td><td className="whitespace-nowrap px-4 py-3">{formatTzs(item.amount)}</td><td className="px-4 py-3">{item.void_reason ?? "—"}</td></tr>)}</tbody>
        </table>
      </div>
    </section>}

    <section className="sep-card p-5">
      <h2 className="text-xl font-bold">By Category</h2>
      <div className="mt-4 space-y-2">
        {categoryBreakdown.length ? categoryBreakdown.map(([category, amount]) => <div key={category} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"><span>{category}</span><b>{formatTzs(amount)}</b></div>) : <p className="text-sm text-slate-500">No expense data yet.</p>}
      </div>
    </section>

    {mode === "add" && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"><RecordExpenseDialog eventId={eventId} categorySuggestions={categorySuggestions} onSave={addExpense} onClose={() => setMode(null)} /></div></div>}
    {mode === "edit" && selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"><EditExpenseDialog expense={selected} eventId={eventId} categorySuggestions={categorySuggestions} onSave={saveCorrection} onClose={() => { setMode(null); setSelected(null); }} /></div></div>}
    {mode === "void" && selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"><VoidExpenseDialog expense={selected} onVoid={saveVoid} onClose={() => { setMode(null); setSelected(null); }} /></div></div>}
  </div>;
}
