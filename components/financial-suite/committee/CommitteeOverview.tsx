import type { FinanceSummary } from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";
import { CommitteeSectionProgress } from "./CommitteeFinancialCard";

function compactTzs(value: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return formatTzs(String(value));
  const compact = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(amount);
  return `TZS ${compact}`;
}

export function CommitteeOverview({
  summary,
  labels,
}: {
  summary: FinanceSummary;
  labels: {
    contributors: string;
    percentage: string;
    pledged: string;
    collected: string;
    outstanding: string;
    completed: string;
    pledgeProgress: string;
    budgetProgress: string;
    deadline: string;
    days: string;
    deadlineStatus: string;
    budget: string;
    remainingBudget: string;
  };
}) {
  const collection = Math.max(
    0,
    Math.min(100, Number(summary.completion_percentage || 0))
  );
  const budget =
    summary.budget_amount === null
      ? null
      : Math.max(
          0,
          Math.min(100, Number(summary.budget_progress_percentage || 0))
        );
  const cards = [
    [labels.contributors, String(summary.total_contributors), String(summary.total_contributors)],
    [labels.percentage, `${summary.completion_percentage}%`, `${summary.completion_percentage}%`],
    [labels.pledged, compactTzs(summary.total_pledged), formatTzs(summary.total_pledged)],
    [labels.collected, compactTzs(summary.total_collected), formatTzs(summary.total_collected)],
    [labels.outstanding, compactTzs(summary.remaining_balance), formatTzs(summary.remaining_balance)],
    [labels.completed, String(summary.completed_count), String(summary.completed_count)],
  ];
  const deadlineItems = [
    [labels.deadline, summary.contribution_deadline ?? "—"],
    [labels.days, summary.days_remaining ?? "—"],
    [labels.deadlineStatus, summary.deadline_status],
    ...(summary.budget_amount
      ? [[labels.budget, formatTzs(String(summary.budget_amount))]]
      : []),
    ...(summary.remaining_to_budget
      ? [[labels.remainingBudget, formatTzs(summary.remaining_to_budget)]]
      : []),
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {cards.map(([label, value, fullValue]) => (
          <section
            key={label}
            className="sep-card min-w-0 p-3.5"
          >
            <p className="text-[13px] leading-snug text-slate-500">{label}</p>
            <p
              className="mt-1 break-words text-[18px] font-bold leading-tight text-slate-950"
              title={fullValue}
              aria-label={`${label}: ${fullValue}`}
            >
              {value}
            </p>
          </section>
        ))}
      </div>

      <section className="sep-card space-y-4 p-4">
        <CommitteeSectionProgress
          label={labels.pledgeProgress}
          value={collection}
        />
        {budget !== null && (
          <CommitteeSectionProgress
            label={labels.budgetProgress}
            value={budget}
          />
        )}
      </section>

      <section
        className="sep-card grid grid-cols-2 gap-x-3 gap-y-4 p-4 min-[410px]:grid-cols-3"
      >
        {deadlineItems.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <p className="text-[13px] leading-snug text-slate-500">{label}</p>
            <p className="mt-1 break-words text-[15px] font-semibold text-slate-900">
              {value}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
