import { formatTzs } from "@/services/pledgeMessageService";
import type { FinanceSummary } from "@/services/financialSuiteService";
import { financialDesktop } from "./desktop/FinancialDesktopUI";

export default function FinancialSummaryStrip({summary}:{summary:FinanceSummary}) {
  const items = [
    ["Contributors", String(summary.total_contributors ?? summary.active_pledge_count)],
    ["Pledged", formatTzs(summary.total_pledged)],
    ["Collected", formatTzs(summary.total_collected)],
    ["Outstanding", formatTzs(summary.remaining_balance)],
    ["Collection", `${summary.completion_percentage}%`],
  ];
  return <section aria-label="Financial summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
    {items.map(([label,value])=><article key={label} className={`min-w-0 p-4 ${financialDesktop.card}`}><p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 truncate text-[22px] font-bold tabular-nums text-slate-950" title={value}>{value}</p></article>)}
  </section>;
}
