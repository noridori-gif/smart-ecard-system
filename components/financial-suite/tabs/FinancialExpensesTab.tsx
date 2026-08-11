"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  correctExpense, deleteCategoryBudget, getCategoryBudgets, getExpenseReceiptUrl, getExpenses, recordExpense,
  saveCategoryBudget, voidExpense,
  type EventExpense, type EventExpenseCategoryBudget, type ExpenseCorrectionInput, type ExpenseInput,
} from "@/services/expenseService";
import { formatAppTzs } from "@/lib/i18n/formatters";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import RecordExpenseDialog from "../RecordExpenseDialog";
import EditExpenseDialog from "../EditExpenseDialog";
import VoidExpenseDialog from "../VoidExpenseDialog";

export default function FinancialExpensesTab({ eventId }: { eventId: number }) {
  const { language } = useAppLanguage();
  const formatTzs = (value: string | number) => formatAppTzs(Number(value), language);
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<EventExpenseCategoryBudget[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"add" | "edit" | "void" | null>(null);
  const [selected, setSelected] = useState<EventExpense | null>(null);
  const [receiptBusy, setReceiptBusy] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", amount: "" });
  const [budgetBusy, setBudgetBusy] = useState(false);
  const [budgetError, setBudgetError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [expenseRows, budgetRows] = await Promise.all([getExpenses(eventId), getCategoryBudgets(eventId)]);
      setExpenses(expenseRows); setCategoryBudgets(budgetRows);
    } catch (err) { setError(err instanceof Error ? err.message : "Expenses could not be loaded."); }
    finally { setLoading(false); }
  }, [eventId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const valid = useMemo(() => expenses.filter((item) => !item.voided_at), [expenses]);
  const voided = useMemo(() => expenses.filter((item) => item.voided_at), [expenses]);
  const totalSpent = useMemo(() => valid.reduce((sum, item) => sum + Number(item.amount), 0), [valid]);
  const totalBudget = useMemo(() => categoryBudgets.length ? categoryBudgets.reduce((sum, item) => sum + Number(item.budgeted_amount), 0) : null, [categoryBudgets]);
  const remaining = totalBudget === null ? null : totalBudget - totalSpent;
  const categorySuggestions = useMemo(() => [...new Set([...expenses.map((item) => item.category), ...categoryBudgets.map((item) => item.category)])], [expenses, categoryBudgets]);

  const categoryBreakdown = useMemo(() => {
    const spentMap = new Map<string, number>();
    valid.forEach((item) => spentMap.set(item.category, (spentMap.get(item.category) ?? 0) + Number(item.amount)));
    const budgetMap = new Map(categoryBudgets.map((item) => [item.category, Number(item.budgeted_amount)]));
    const categories = new Set([...spentMap.keys(), ...budgetMap.keys()]);
    return [...categories].map((category) => ({
      category, spent: spentMap.get(category) ?? 0, budget: budgetMap.get(category) ?? null,
    })).sort((a, b) => (b.budget ?? b.spent) - (a.budget ?? a.spent));
  }, [valid, categoryBudgets]);

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
  function startEditBudget(category: string, current: number | null) {
    setEditingCategory(category); setEditValue(current === null ? "" : String(current)); setBudgetError("");
  }
  async function saveBudget(category: string) {
    try {
      setBudgetBusy(true); setBudgetError("");
      await saveCategoryBudget(eventId, category, editValue.replace(/,/g, ""));
      setEditingCategory(null); await load();
    } catch (err) { setBudgetError(err instanceof Error ? err.message : "Budget could not be saved."); }
    finally { setBudgetBusy(false); }
  }
  async function removeBudget(category: string) {
    try { setBudgetBusy(true); await deleteCategoryBudget(eventId, category); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Budget could not be removed."); }
    finally { setBudgetBusy(false); }
  }
  async function addCategoryBudget() {
    try {
      setBudgetBusy(true); setBudgetError("");
      await saveCategoryBudget(eventId, newCategory.name, newCategory.amount.replace(/,/g, ""));
      setAddingCategory(false); setNewCategory({ name: "", amount: "" }); await load();
    } catch (err) { setBudgetError(err instanceof Error ? err.message : "Budget could not be saved."); }
    finally { setBudgetBusy(false); }
  }

  return <div className="space-y-6">
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

    <section className="sep-card p-5">
      <h2 className="text-xl font-bold">Budget vs Actual</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Expense budget</span><br /><b className="text-lg">{totalBudget === null ? "Not set" : formatTzs(totalBudget)}</b></div>
        <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-500">Total spent</span><br /><b className="text-lg">{formatTzs(totalSpent)}</b></div>
        <div className={`rounded-xl p-3 text-sm ${remaining !== null && remaining < 0 ? "bg-red-50" : "bg-slate-50"}`}>
          <span className="text-slate-500">{remaining !== null && remaining < 0 ? "Over budget by" : "Remaining"}</span><br />
          <b className={`text-lg ${remaining !== null && remaining < 0 ? "text-red-700" : ""}`}>{remaining === null ? "—" : formatTzs(Math.abs(remaining))}</b>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Expense budget is the sum of each category&apos;s budget below — set or edit them in &quot;By Category&quot;.</p>
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
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">By Category</h2>
        {!addingCategory && <button type="button" onClick={() => { setAddingCategory(true); setBudgetError(""); }} className="text-sm font-semibold text-emerald-700">+ Add category budget</button>}
      </div>
      <div className="mt-4 space-y-2">
        {categoryBreakdown.length ? categoryBreakdown.map(({ category, spent, budget }) => {
          const categoryRemaining = budget === null ? null : budget - spent;
          const editing = editingCategory === category;
          return <div key={category} className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{category}</span>
              {editing ? (
                <div className="flex items-center gap-2">
                  <input autoFocus inputMode="decimal" value={editValue} onChange={(e) => setEditValue(e.target.value.replace(/,/g, ""))} placeholder="Budget" className="w-32 rounded-lg border px-2 py-1" />
                  <button disabled={budgetBusy} onClick={() => void saveBudget(category)} className="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white">Save</button>
                  <button disabled={budgetBusy} onClick={() => setEditingCategory(null)} className="rounded-lg border px-2 py-1 text-xs font-semibold">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-xs">
                  <span>Budget <b>{budget === null ? "—" : formatTzs(budget)}</b></span>
                  <span>Spent <b>{formatTzs(spent)}</b></span>
                  {budget !== null && <span className={categoryRemaining !== null && categoryRemaining < 0 ? "text-red-700" : ""}>Remaining <b>{formatTzs(Math.abs(categoryRemaining ?? 0))}{categoryRemaining !== null && categoryRemaining < 0 ? " over" : ""}</b></span>}
                  <button onClick={() => startEditBudget(category, budget)} className="font-semibold text-blue-700">{budget === null ? "Set budget" : "Edit"}</button>
                  {budget !== null && <button disabled={budgetBusy} onClick={() => void removeBudget(category)} className="font-semibold text-red-700">Remove</button>}
                </div>
              )}
            </div>
            {editing && budgetError && <p role="alert" className="mt-2 text-xs text-red-700">{budgetError}</p>}
          </div>;
        }) : <p className="text-sm text-slate-500">No expense data yet.</p>}
        {addingCategory && <div className="rounded-lg border border-dashed border-slate-300 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <input list="expense-category-budget-suggestions" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="Category name" className="rounded-lg border px-2 py-1 text-sm" />
            <datalist id="expense-category-budget-suggestions">{categorySuggestions.map((option) => <option key={option} value={option} />)}</datalist>
            <input inputMode="decimal" value={newCategory.amount} onChange={(e) => setNewCategory({ ...newCategory, amount: e.target.value.replace(/,/g, "") })} placeholder="Budget amount" className="w-36 rounded-lg border px-2 py-1 text-sm" />
            <button disabled={budgetBusy || !newCategory.name.trim() || !newCategory.amount} onClick={() => void addCategoryBudget()} className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">Save</button>
            <button disabled={budgetBusy} onClick={() => { setAddingCategory(false); setNewCategory({ name: "", amount: "" }); }} className="rounded-lg border px-3 py-1 text-xs font-semibold">Cancel</button>
          </div>
          {budgetError && <p role="alert" className="mt-2 text-xs text-red-700">{budgetError}</p>}
        </div>}
      </div>
    </section>

    {mode === "add" && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"><RecordExpenseDialog eventId={eventId} categorySuggestions={categorySuggestions} onSave={addExpense} onClose={() => setMode(null)} /></div></div>}
    {mode === "edit" && selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"><EditExpenseDialog expense={selected} eventId={eventId} categorySuggestions={categorySuggestions} onSave={saveCorrection} onClose={() => { setMode(null); setSelected(null); }} /></div></div>}
    {mode === "void" && selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"><VoidExpenseDialog expense={selected} onVoid={saveVoid} onClose={() => { setMode(null); setSelected(null); }} /></div></div>}
  </div>;
}
