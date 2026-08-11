"use client";
import type { ReactElement } from "react";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import { formatAppDate, formatAppNumber, formatAppTzs } from "@/lib/i18n/formatters";
import type { FinanceSummary } from "@/services/financialSuiteService";
export default function FinancialSummaryCards({ summary }: { summary: FinanceSummary }) {
  const { language, t } = useAppLanguage();
  const pct = (value: string | number) => formatAppNumber(Number(value) / 100, language, { style: "percent", maximumFractionDigits: 1 });
  const totalCard = [t("eligibility.total"), formatAppNumber(summary.total_contributors ?? summary.active_pledge_count, language), "text-blue-700"];
  const statusCards: { label: string; value: string; tone: "emerald" | "amber" | "slate"; icon: ReactElement }[] = [
    {
      label: t("overview.completed"), value: formatAppNumber(summary.completed_count, language), tone: "emerald",
      icon: <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="10" cy="10" r="9" className="fill-emerald-600" /><path d="M6 10.2l2.4 2.4L14 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    },
    {
      label: t("overview.partial"), value: formatAppNumber(summary.partial_count, language), tone: "amber",
      icon: <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="10" cy="10" r="9" className="fill-amber-100 stroke-amber-500" strokeWidth="1.6" /><path d="M10 1a9 9 0 010 18z" className="fill-amber-500" /></svg>,
    },
    {
      label: t("overview.notStarted"), value: formatAppNumber(summary.pledged_count, language), tone: "slate",
      icon: <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5"><circle cx="10" cy="10" r="8.2" className="fill-none stroke-slate-400" strokeWidth="1.6" strokeDasharray="3 3" /></svg>,
    },
  ];
  const financeCards = [[t("overview.totalPledged"), formatAppTzs(Number(summary.total_pledged), language), "text-slate-900"], [t("overview.totalCollected"), formatAppTzs(Number(summary.total_collected), language), "text-emerald-700"], [t("overview.balance"), formatAppTzs(Number(summary.remaining_balance), language), "text-amber-700"], [t("overview.contributionProgress"), pct(summary.completion_percentage), "text-blue-700"], [t("overview.eventBudget"), summary.budget_amount ? formatAppTzs(Number(summary.budget_amount), language) : t("overview.budgetNotSet"), "text-slate-900"], [t("overview.remainingBudget"), summary.remaining_to_budget == null ? "—" : formatAppTzs(Number(summary.remaining_to_budget), language), "text-amber-700"], [t("overview.budgetProgress"), summary.budget_progress_percentage == null ? "—" : pct(summary.budget_progress_percentage), "text-blue-700"], [t("overview.deadline"), summary.contribution_deadline ? formatAppDate(`${summary.contribution_deadline}T00:00:00`, language, { day:"numeric", month:"short", year:"numeric" }) : t("overview.noDeadline"), "text-slate-900"], [t("overview.daysRemaining"), summary.days_remaining == null ? "—" : formatAppNumber(summary.days_remaining, language), "text-slate-700"]];
  const render=(cards:string[][])=>cards.map(([label,value,color])=><article key={label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className={`mt-2 break-words text-2xl font-bold ${color}`}>{value}</p></article>);
  const statusTone = {
    emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
    amber: "border-amber-200 bg-gradient-to-br from-amber-50 to-white",
    slate: "border-slate-200 bg-gradient-to-br from-slate-50 to-white",
  } as const;
  const statusValueTone = { emerald: "text-emerald-700", amber: "text-amber-700", slate: "text-slate-600" } as const;
  const statusBadgeTone = { emerald: "bg-emerald-100", amber: "bg-amber-100", slate: "bg-slate-100" } as const;
  const renderStatus = () => statusCards.map(({ label, value, tone, icon }) => (
    <article key={label} className={`min-w-0 rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${statusTone[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${statusBadgeTone[tone]}`}>{icon}</span>
      </div>
      <p className={`mt-2 break-words text-2xl font-bold ${statusValueTone[tone]}`}>{value}</p>
    </article>
  ));
  return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{render([totalCard])}{renderStatus()}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{render(financeCards)}</div><div><div className="mb-1 flex justify-between text-xs font-semibold text-slate-600"><span>{t("overview.contributionProgress")}</span><span>{pct(summary.completion_percentage)}</span></div><div className="rounded-full bg-slate-200" aria-label={`${pct(summary.completion_percentage)} ${t("overview.contributionProgress")}`}><div className="h-3 rounded-full bg-emerald-500 transition-all" style={{width:`${Math.min(100,Number(summary.completion_percentage))}%`}}/></div></div><div><div className="mb-1 flex flex-wrap justify-between gap-2 text-xs font-semibold text-slate-600"><span>{t("overview.budgetProgress")} · {t("overview.collected")}: {formatAppTzs(Number(summary.total_collected), language)} · {t("overview.eventBudget")}: {summary.budget_amount?formatAppTzs(Number(summary.budget_amount),language):t("common.notSet")}</span><span>{summary.budget_progress_percentage == null ? "—" : pct(summary.budget_progress_percentage)}</span></div><div className="rounded-full bg-slate-200" aria-label={t("overview.budgetProgress")}><div className="h-3 rounded-full bg-blue-500 transition-all" style={{width:`${Math.min(100,Number(summary.budget_progress_percentage??0))}%`}}/></div></div></div>;
}
