"use client";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import { formatAppNumber, formatAppTzs } from "@/lib/i18n/formatters";
import type { FinanceSummary } from "@/services/financialSuiteService";
import { financialDesktop } from "./desktop/FinancialDesktopUI";
export default function FinancialSummaryStrip({summary}:{summary:FinanceSummary}) {
  const { language, t } = useAppLanguage();
  const items = [[t("overview.contributors"), formatAppNumber(summary.total_contributors ?? summary.active_pledge_count, language)], [t("settings.pledged"), formatAppTzs(Number(summary.total_pledged), language)], [t("overview.collected"), formatAppTzs(Number(summary.total_collected), language)], [t("overview.outstanding"), formatAppTzs(Number(summary.remaining_balance), language)], [t("overview.collection"), formatAppNumber(Number(summary.completion_percentage) / 100, language, { style: "percent", maximumFractionDigits: 1 })]];
  return <section aria-label={t("financial.overview")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{items.map(([label,value])=><article key={label} className={`min-w-0 p-4 ${financialDesktop.card}`}><p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 truncate text-[22px] font-bold tabular-nums text-slate-950" title={value}>{value}</p></article>)}</section>;
}
