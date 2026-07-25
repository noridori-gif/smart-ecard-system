import { formatTzs } from "@/services/pledgeMessageService";
import type { FinanceSummary } from "@/services/financialSuiteService";

export default function FinancialSummaryCards({ summary }: { summary: FinanceSummary }) {
  const cards = [
    ["Jumla ya Ahadi", formatTzs(summary.total_pledged), "text-slate-900"],
    ["Jumla Iliyopokelewa", formatTzs(summary.total_collected), "text-emerald-700"],
    ["Salio", formatTzs(summary.remaining_balance), "text-amber-700"],
    ["Asilimia Iliyokusanywa", `${summary.completion_percentage}%`, "text-blue-700"],
    ["Waliokamilisha", String(summary.completed_count), "text-emerald-700"],
    ["Waliopunguza", String(summary.partial_count), "text-amber-700"],
    ["Bado Hawajaanza", String(summary.pledged_count), "text-slate-700"],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, color]) => (
        <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
        </article>
      ))}
      <div className="sm:col-span-2 xl:col-span-4 rounded-full bg-slate-200" aria-label={`${summary.completion_percentage}% collected`}>
        <div className="h-3 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, Number(summary.completion_percentage))}%` }} />
      </div>
    </div>
  );
}
