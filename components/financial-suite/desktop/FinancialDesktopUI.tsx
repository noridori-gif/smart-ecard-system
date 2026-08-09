"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type {
  FinanceSummary,
  FinancialPledge,
} from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import { formatAppDate, formatAppNumber, formatAppTzs } from "@/lib/i18n/formatters";

export const financialDesktop = {
  card:
    "rounded-2xl border border-[#e7e1d7] bg-white shadow-[0_8px_24px_rgba(39,34,25,0.05)]",
  input:
    "min-h-11 rounded-xl border border-[#ddd7cc] bg-white px-3 text-[15px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700",
  primary:
    "min-h-11 rounded-xl bg-emerald-700 px-4 text-[15px] font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2",
  secondary:
    "min-h-11 rounded-xl border border-[#ddd7cc] bg-white px-4 text-[15px] font-semibold text-slate-700 hover:bg-[#faf8f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700",
} as const;

export type FinanceIconName =
  | "plus"
  | "upload"
  | "download"
  | "layers"
  | "report"
  | "users"
  | "bell"
  | "history"
  | "edit"
  | "cancel"
  | "restore"
  | "trash"
  | "receipt"
  | "copy"
  | "void";

export function FinanceIcon({
  name,
  className = "h-4 w-4",
}: {
  name: FinanceIconName;
  className?: string;
}) {
  const paths: Record<FinanceIconName, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    upload: <><path d="m12 16V4m0 0-4 4m4-4 4 4" /><path d="M5 15v4h14v-4" /></>,
    download: <><path d="M12 4v12m0 0 4-4m-4 4-4-4" /><path d="M5 20h14" /></>,
    layers: <><path d="m12 3-9 5 9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    report: <><path d="M5 3h10l4 4v14H5z" /><path d="M15 3v5h5M8 17v-4m4 4V9m4 8v-6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    edit: <><path d="M12 20h9" /><path d="m16.5 3.5 4 4L8 20H4v-4z" /></>,
    cancel: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
    restore: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6" /><path d="M10 11v5m4-5v5" /></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6m-6 4h6" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" /></>,
    void: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function FinancialToolbarButton({
  icon,
  tone = "secondary",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: FinanceIconName;
  tone?: "primary" | "secondary" | "attention";
}) {
  const style =
    tone === "primary"
      ? financialDesktop.primary
      : tone === "attention"
        ? "min-h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-[15px] font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        : financialDesktop.secondary;
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 ${style} ${props.className ?? ""}`}
    >
      <FinanceIcon name={icon} />
      {children}
    </button>
  );
}

export function FinancialActionIconButton({
  icon,
  label,
  tone,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: FinanceIconName;
  label: string;
  tone: "green" | "amber" | "slate" | "blue" | "red";
}) {
  const colours = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    slate: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
    blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    red: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...props}
      className={`group relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-35 ${colours[tone]} ${props.className ?? ""}`}
    >
      <FinanceIcon name={icon} className="h-[18px] w-[18px]" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block">
        {label}
      </span>
    </button>
  );
}

export function FinancialStatusBadge({
  status,
  label,
}: {
  status: FinancialPledge["calculated_status"];
  label: string;
}) {
  const style =
    status === "completed"
      ? "bg-emerald-100 text-emerald-800"
      : status === "partial"
        ? "bg-amber-100 text-amber-800"
        : status === "cancelled"
          ? "bg-slate-200 text-slate-700"
          : "bg-rose-100 text-rose-800";
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold ${style}`}>
      {label}
    </span>
  );
}

export function FinancialDesktopHeader({
  eventTitle,
  summary,
  back,
}: {
  eventTitle: string;
  summary: FinanceSummary;
  back: ReactNode;
}) {
  const percentage = Math.max(
    0,
    Math.min(100, Number(summary.completion_percentage || 0))
  );
  return (
    <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        {back}
        <h1 className="mt-3 font-serif text-[32px] font-bold leading-tight text-slate-950">
          Michango &amp; Ahadi
        </h1>
        <p className="mt-1 text-[15px] text-slate-600">
          <span className="font-semibold text-slate-800">{eventTitle}</span> ·
          Manage contributions, payments, reminders and reports.
        </p>
      </div>
      <section className="sep-card flex w-full items-center gap-4 p-4 lg:w-auto lg:min-w-[300px]">
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#047857 ${percentage * 3.6}deg,#e7e5e4 0deg)`,
          }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percentage)}
          aria-label="Collection percentage"
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-bold">
            {Math.round(percentage)}%
          </div>
        </div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
            Collected
          </p>
          <p className="mt-1 whitespace-nowrap text-xl font-bold tabular-nums text-emerald-800">
            {formatTzs(summary.total_collected)}
          </p>
        </div>
      </section>
    </header>
  );
}

export function FinancialOverviewContent({
  summary,
  actions,
}: {
  summary: FinanceSummary;
  actions: ReactNode;
}) {
  const { language, t } = useAppLanguage();
  const statusCards = [
    [t("overview.completed"), summary.completed_count, "bg-emerald-50 text-emerald-800"], [t("overview.partial"), summary.partial_count, "bg-amber-50 text-amber-800"], [t("overview.notStarted"), summary.pledged_count, "bg-rose-50 text-rose-800"],
  ];
  const collection = Number(summary.completion_percentage || 0);
  const budget = Number(summary.budget_progress_percentage || 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">{actions}</div>
      <section>
        <h2 className="text-xl font-bold text-slate-950">{t("overview.contributorStatus")}</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {statusCards.map(([label, value, style]) => (
            <article key={label} className={`rounded-2xl border border-transparent p-5 ${style}`}>
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold">{label}</p>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/70">
                  <FinanceIcon name="users" className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
            </article>
          ))}
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="sep-card space-y-6 p-5">
          <Progress label={t("overview.contributionProgress")} value={collection} colour="emerald" />
          <Progress label={t("overview.budgetProgress")} value={budget} colour="amber" />
        </section>
        <section className="sep-card p-5">
          <dl className="grid grid-cols-2 gap-5">
            {[
              [t("overview.eventBudget"), summary.budget_amount ? formatAppTzs(Number(summary.budget_amount), language) : t("overview.budgetNotSet")],
              [
                t("overview.remainingBudget"),
                summary.remaining_to_budget !== null &&
                summary.remaining_to_budget !== undefined
                  ? formatAppTzs(Number(summary.remaining_to_budget), language) : "—",
              ],
              [t("overview.deadline"), summary.contribution_deadline ? formatAppDate(`${summary.contribution_deadline}T00:00:00`, language, { day: "numeric", month: "short", year: "numeric" }) : t("overview.noDeadline")],
              [
                t("overview.daysRemaining"),
                summary.days_remaining === null ||
                summary.days_remaining === undefined
                  ? "—"
                  : formatAppNumber(summary.days_remaining, language),
              ],
              ["Deadline Status", summary.deadline_status ?? "No deadline"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-[16px] font-bold text-slate-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

function Progress({
  label,
  value,
  colour,
}: {
  label: string;
  value: number;
  colour: "emerald" | "amber";
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between gap-3 text-[15px] font-semibold">
        <span>{label}</span>
        <span>{safe.toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full ${colour === "emerald" ? "bg-emerald-700" : "bg-amber-500"}`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}
