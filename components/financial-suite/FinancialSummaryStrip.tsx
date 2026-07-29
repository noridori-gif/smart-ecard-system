import { formatTzs } from "@/services/pledgeMessageService";
import type { FinanceSummary } from "@/services/financialSuiteService";

export default function FinancialSummaryStrip({summary}:{summary:FinanceSummary}) {
  const items = [
    ["Contributors", String(summary.total_contributors ?? summary.active_pledge_count)],
    ["Pledged", formatTzs(summary.total_pledged)],
    ["Collected", formatTzs(summary.total_collected)],
    ["Outstanding", formatTzs(summary.remaining_balance)],
    ["Collection", `${summary.completion_percentage}%`],
  ];
  return <section aria-label="Financial summary" className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3 lg:grid-cols-5">
    {items.map(([label,value],index)=><div key={label} className={`min-w-0 p-3 sm:p-4 ${index?"border-l border-slate-100":""} ${index===4?"col-span-2 sm:col-span-1":""}`}><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 truncate text-base font-bold text-slate-900 sm:text-lg" title={value}>{value}</p></div>)}
  </section>;
}
