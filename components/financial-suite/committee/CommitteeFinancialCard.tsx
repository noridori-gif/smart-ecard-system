"use client";

import type { ReactNode } from "react";
import type { FinancialPledge } from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";
import { committeeTheme, progressColour } from "./theme";

type DisplayStatus = "completed" | "partial" | "pledged" | "cancelled";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function CommitteeStatusBadge({
  status,
  label,
}: {
  status: DisplayStatus;
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
    <span className={`inline-flex rounded-full px-3 py-1.5 text-[13px] font-bold ${style}`}>
      {label}
    </span>
  );
}

export function CommitteeProgressBar({
  paid,
  pledged,
  status,
  label,
}: {
  paid: number;
  pledged: number;
  status: DisplayStatus;
  label: string;
}) {
  const value =
    pledged > 0 ? Math.max(0, Math.min(100, (paid / pledged) * 100)) : 0;
  const colour =
    status === "completed"
      ? "bg-emerald-600"
      : status === "partial"
        ? "bg-amber-500"
        : "bg-slate-300";
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-slate-200"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${colour}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function CommitteeFinancialCard({
  item,
  status,
  statusLabel,
  paidLabel,
  pledgedLabel,
  balanceLabel,
  progressLabel,
  expanded,
  expandLabel,
  collapseLabel,
  onToggle,
  meta,
  children,
}: {
  item: FinancialPledge;
  status: DisplayStatus;
  statusLabel: string;
  paidLabel: string;
  pledgedLabel: string;
  balanceLabel: string;
  progressLabel: string;
  expanded: boolean;
  expandLabel: string;
  collapseLabel: string;
  onToggle: () => void;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  const panelId = `committee-card-${item.id}`;
  return (
    <article className={`min-w-0 overflow-hidden rounded-2xl border ${committeeTheme.card}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${expanded ? collapseLabel : expandLabel}: ${item.full_name}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-[17px] font-bold leading-snug text-slate-950">
              {item.full_name}
            </h3>
            <p className="mt-1 break-all text-[14px] text-slate-500">
              {item.phone}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[17px] font-bold leading-tight text-slate-950">
              {formatTzs(item.total_paid)}
            </p>
            <p className="mt-0.5 text-[13px] text-slate-500">
              / {formatTzs(item.pledged_amount)}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <CommitteeProgressBar
            paid={Number(item.total_paid)}
            pledged={Number(item.pledged_amount)}
            status={status}
            label={progressLabel}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <CommitteeStatusBadge status={status} label={statusLabel} />
          <span className="grid h-11 w-11 place-items-center rounded-full text-slate-500">
            <Chevron open={expanded} />
          </span>
        </div>
        {meta}
      </button>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#ece7de] p-4">
            <dl className="grid grid-cols-3 gap-2 rounded-xl bg-[#faf8f3] p-3">
              {[
                [pledgedLabel, formatTzs(item.pledged_amount)],
                [paidLabel, formatTzs(item.total_paid)],
                [balanceLabel, formatTzs(item.balance)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[13px] text-slate-500">{label}</dt>
                  <dd
                    className="mt-1 break-words text-[15px] font-semibold text-slate-900"
                    title={value}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

export function CommitteeSectionProgress({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
        <span>{label}</span>
        <span>{safe.toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${progressColour(safe)}`}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}
