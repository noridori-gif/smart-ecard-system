import { formatTzs } from "@/services/pledgeMessageService";
import type { FinanceSummary } from "@/services/financialSuiteService";

export default function FinancialSummaryCards({ summary }: { summary: FinanceSummary }) {
  const contributorCards = [
    ["Jumla ya Waliopledge", String(summary.total_contributors ?? summary.active_pledge_count), "text-blue-700"],
    ["Waliokamilisha", String(summary.completed_count), "text-emerald-700"],
    ["Waliopunguza", String(summary.partial_count), "text-amber-700"],
    ["Bado Hawajaanza", String(summary.pledged_count), "text-slate-700"],
  ];
  const financeCards = [
    ["Jumla ya Ahadi", formatTzs(summary.total_pledged), "text-slate-900"],
    ["Jumla Iliyopokelewa", formatTzs(summary.total_collected), "text-emerald-700"],
    ["Salio", formatTzs(summary.remaining_balance), "text-amber-700"],
    ["Pledge Collection", `${summary.completion_percentage}%`, "text-blue-700"],
    ["Event Budget", summary.budget_amount ? formatTzs(summary.budget_amount) : "Budget not set", "text-slate-900"],
    ["Remaining to Budget", summary.remaining_to_budget!==null&&summary.remaining_to_budget!==undefined ? formatTzs(summary.remaining_to_budget) : "—", "text-amber-700"],
    ["Budget Progress", summary.budget_progress_percentage!==null&&summary.budget_progress_percentage!==undefined ? `${summary.budget_progress_percentage}%` : "—", "text-blue-700"],
    ["Contribution Deadline", summary.contribution_deadline ? new Date(`${summary.contribution_deadline}T00:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "No deadline", "text-slate-900"],
    ["Days Remaining", summary.days_remaining===null||summary.days_remaining===undefined ? "—" : `${summary.days_remaining} day${Math.abs(summary.days_remaining)===1?"":"s"}`, "text-slate-700"],
    ["Deadline Status", summary.deadline_status??"No deadline", "text-slate-700"],
  ];
  const render=(cards:string[][])=>cards.map(([label,value,color])=><article key={label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className={`mt-2 break-words text-2xl font-bold ${color}`}>{value}</p></article>);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{render(contributorCards)}</div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{render(financeCards)}</div>
      <div><div className="mb-1 flex justify-between text-xs font-semibold text-slate-600"><span>Pledge Collection</span><span>{summary.completion_percentage}%</span></div><div className="rounded-full bg-slate-200" aria-label={`${summary.completion_percentage}% pledge collection`}><div className="h-3 rounded-full bg-emerald-500 transition-all" style={{width:`${Math.min(100,Number(summary.completion_percentage))}%`}}/></div></div>
      <div><div className="mb-1 flex flex-wrap justify-between gap-2 text-xs font-semibold text-slate-600"><span>Budget Progress · Collected: {formatTzs(summary.total_collected)} · Budget: {summary.budget_amount?formatTzs(summary.budget_amount):"not set"}</span><span>{summary.budget_progress_percentage??"—"}%</span></div><div className="rounded-full bg-slate-200" aria-label={`${summary.budget_progress_percentage??0}% budget progress`}><div className="h-3 rounded-full bg-blue-500 transition-all" style={{width:`${Math.min(100,Number(summary.budget_progress_percentage??0))}%`}}/></div></div>
    </div>
  );
}
