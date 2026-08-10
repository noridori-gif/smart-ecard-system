"use client";
import { useState } from "react";
import { normalizeNumericInput, saveFinanceTarget, type FinanceSummary } from "@/services/financialSuiteService";

export default function BudgetDeadlineEditor({eventId,summary,onSaved}:{eventId:number;summary:FinanceSummary;onSaved:()=>Promise<void>}) {
  const [budget,setBudget]=useState(normalizeNumericInput(summary.budget_amount));const [deadline,setDeadline]=useState(summary.contribution_deadline??"");
  const [expenseBudget,setExpenseBudget]=useState(normalizeNumericInput(summary.expense_budget_amount));
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div><h2 className="text-xl font-bold">Budget &amp; Deadline</h2><p className="text-sm text-slate-600">Set the collection target and the last contribution date for this event.</p></div>
    <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={async e=>{e.preventDefault();try{setBusy(true);setError("");await saveFinanceTarget(eventId,{budget_amount:budget||null,contribution_deadline:deadline||null,expense_budget_amount:expenseBudget||null});await onSaved();}catch(err){setError(err instanceof Error?err.message:"Settings could not be saved.");}finally{setBusy(false);}}}>
      <label className="text-sm font-semibold">Fundraising target (TZS)<input inputMode="decimal" placeholder="30000000" value={budget} onChange={e=>setBudget(e.target.value.replace(/,/g,""))} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
      <label className="text-sm font-semibold">Contribution deadline<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
      <label className="text-sm font-semibold">Expense budget (TZS)<input inputMode="decimal" placeholder="25000000" value={expenseBudget} onChange={e=>setExpenseBudget(e.target.value.replace(/,/g,""))} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>
      <p className="text-xs text-slate-500 md:col-span-3 md:-mt-2">Fundraising target is how much you plan to raise from contributors. Expense budget is a separate figure for how much you plan to spend — the two can differ intentionally.</p>
      <div className="flex items-end gap-2 md:col-span-3"><button type="button" onClick={()=>setDeadline("")} className="rounded-xl border px-4 py-2 font-semibold">Remove deadline</button><button disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{busy?"Saving...":"Save settings"}</button></div>
      {error&&<p role="alert" className="text-sm text-red-700 md:col-span-3">{error}</p>}
    </form>
  </section>;
}
