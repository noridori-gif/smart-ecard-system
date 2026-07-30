"use client";

import type { FinancialPledge } from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";
import {
  FinancialActionIconButton,
  FinancialStatusBadge,
  FinancialToolbarButton,
  financialDesktop,
} from "./FinancialDesktopUI";

const statusLabels = {
  pledged: "Ameahidi",
  partial: "Amepunguza",
  completed: "Amekamilisha",
  cancelled: "Imefutwa",
};

export function FinancialContributorsWorkspace({
  eventTitle,
  pledges,
  visible,
  query,
  status,
  page,
  pages,
  total,
  actionPledgeId,
  onQuery,
  onStatus,
  onPage,
  onCreate,
  onImport,
  onBulk,
  onExport,
  onTemplate,
  onPay,
  onRemind,
  onHistory,
  onEdit,
  onCancel,
  onRestore,
  onDelete,
}: {
  eventTitle: string;
  pledges: FinancialPledge[];
  visible: FinancialPledge[];
  query: string;
  status: string;
  page: number;
  pages: number;
  total: number;
  actionPledgeId: number | null;
  onQuery: (value: string) => void;
  onStatus: (value: string) => void;
  onPage: (value: number) => void;
  onCreate: () => void;
  onImport: () => void;
  onBulk: () => void;
  onExport: (eventTitle: string, pledges: FinancialPledge[]) => void;
  onTemplate: () => void;
  onPay: (pledge: FinancialPledge) => void;
  onRemind: (pledge: FinancialPledge) => void;
  onHistory: (pledge: FinancialPledge) => void;
  onEdit: (pledge: FinancialPledge) => void;
  onCancel: (pledge: FinancialPledge) => void;
  onRestore: (pledge: FinancialPledge) => void;
  onDelete: (pledge: FinancialPledge) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <FinancialToolbarButton icon="plus" tone="primary" onClick={onCreate}>
          Create pledge
        </FinancialToolbarButton>
        <FinancialToolbarButton icon="upload" onClick={onImport}>
          Import Excel
        </FinancialToolbarButton>
        <FinancialToolbarButton icon="layers" tone="attention" onClick={onBulk}>
          Bulk Actions
        </FinancialToolbarButton>
        <FinancialToolbarButton
          icon="download"
          onClick={() => onExport(eventTitle, pledges)}
        >
          Export contributors
        </FinancialToolbarButton>
        <FinancialToolbarButton icon="download" onClick={onTemplate}>
          Import template
        </FinancialToolbarButton>
      </div>

      <section className={`overflow-hidden ${financialDesktop.card}`}>
        <div className="flex flex-col gap-3 border-b border-[#ece7df] p-4 md:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search contributors</span>
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              id="pledge-search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search by name or phone..."
              className={`w-full pl-12 ${financialDesktop.input}`}
            />
          </label>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => onStatus(event.target.value)}
            className={`md:min-w-52 ${financialDesktop.input}`}
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {!visible.length ? (
          <div className="p-12 text-center text-[15px] text-slate-500">
            No pledges match this view.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1240px] text-left text-[15px]">
                <thead className="border-b border-[#e8e2d9] bg-[#faf8f4] text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="min-w-56 px-5 py-4">Contributor</th>
                    <th className="min-w-40 px-5 py-4">Phone</th>
                    {["Pledged", "Paid", "Balance"].map((heading) => (
                      <th key={heading} className="min-w-40 px-5 py-4 text-right">
                        {heading}
                      </th>
                    ))}
                    <th className="min-w-36 px-5 py-4">Status</th>
                    <th className="min-w-36 px-5 py-4">Last Payment</th>
                    <th className="min-w-72 px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9e1]">
                  {visible.map((pledge) => (
                    <tr key={pledge.id} className="transition-colors hover:bg-[#fcfbf8]">
                      <td className="px-5 py-4 font-semibold text-slate-950">
                        {pledge.full_name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums text-slate-600">
                        {pledge.phone}
                      </td>
                      <Amount value={pledge.pledged_amount} />
                      <Amount value={pledge.total_paid} accent />
                      <Amount value={pledge.balance} />
                      <td className="px-5 py-4">
                        <FinancialStatusBadge
                          status={pledge.calculated_status}
                          label={statusLabels[pledge.calculated_status]}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {pledge.last_payment_at
                          ? new Date(pledge.last_payment_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <DesktopActions
                          pledge={pledge}
                          busy={actionPledgeId === pledge.id}
                          onPay={onPay}
                          onRemind={onRemind}
                          onHistory={onHistory}
                          onEdit={onEdit}
                          onCancel={onCancel}
                          onRestore={onRestore}
                          onDelete={onDelete}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 md:hidden">
              {visible.map((pledge) => (
                <article key={pledge.id} className="rounded-xl border border-[#e7e1d7] p-4">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words font-bold">{pledge.full_name}</h2>
                      <p className="mt-1 whitespace-nowrap text-sm tabular-nums text-slate-500">
                        {pledge.phone}
                      </p>
                    </div>
                    <FinancialStatusBadge
                      status={pledge.calculated_status}
                      label={statusLabels[pledge.calculated_status]}
                    />
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-[13px]">
                    {[
                      ["Pledged", pledge.pledged_amount],
                      ["Paid", pledge.total_paid],
                      ["Balance", pledge.balance],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="mt-1 break-words font-bold tabular-nums">
                          {formatTzs(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4">
                    <DesktopActions
                      pledge={pledge}
                      busy={actionPledgeId === pledge.id}
                      onPay={onPay}
                      onRemind={onRemind}
                      onHistory={onHistory}
                      onEdit={onEdit}
                      onCancel={onCancel}
                      onRestore={onRestore}
                      onDelete={onDelete}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-[#ece7df] p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>{total} contributor(s)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => onPage(page - 1)}
              className="min-h-10 rounded-lg border px-3 font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 py-1 tabular-nums">
              {page}/{pages}
            </span>
            <button
              type="button"
              disabled={page === pages}
              onClick={() => onPage(page + 1)}
              className="min-h-10 rounded-lg border px-3 font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Amount({ value, accent = false }: { value: string; accent?: boolean }) {
  return (
    <td
      className={`whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums ${
        accent ? "text-emerald-700" : "text-slate-800"
      }`}
    >
      {formatTzs(value)}
    </td>
  );
}

function DesktopActions({
  pledge,
  busy,
  onPay,
  onRemind,
  onHistory,
  onEdit,
  onCancel,
  onRestore,
  onDelete,
}: {
  pledge: FinancialPledge;
  busy: boolean;
  onPay: (pledge: FinancialPledge) => void;
  onRemind: (pledge: FinancialPledge) => void;
  onHistory: (pledge: FinancialPledge) => void;
  onEdit: (pledge: FinancialPledge) => void;
  onCancel: (pledge: FinancialPledge) => void;
  onRestore: (pledge: FinancialPledge) => void;
  onDelete: (pledge: FinancialPledge) => void;
}) {
  const protectedHistory =
    pledge.payment_row_count > 0 || pledge.has_protected_financial_history;
  return (
    <div className="flex flex-wrap gap-2">
      {pledge.calculated_status === "cancelled" ? (
        <>
          <FinancialActionIconButton
            icon="restore"
            label="Restore"
            tone="green"
            disabled={busy}
            onClick={() => onRestore(pledge)}
          />
          <FinancialActionIconButton
            icon="history"
            label="Payment History"
            tone="slate"
            onClick={() => onHistory(pledge)}
          />
          <FinancialActionIconButton
            icon="edit"
            label="Edit details"
            tone="blue"
            onClick={() => onEdit(pledge)}
          />
          <FinancialActionIconButton
            icon="trash"
            label={
              protectedHistory
                ? "Delete Permanently unavailable because payment history exists"
                : "Delete Permanently"
            }
            tone="red"
            disabled={busy || protectedHistory}
            onClick={() => onDelete(pledge)}
          />
        </>
      ) : (
        <>
          <FinancialActionIconButton
            icon="plus"
            label="Pay"
            tone="green"
            disabled={pledge.calculated_status === "completed"}
            onClick={() => onPay(pledge)}
          />
          <FinancialActionIconButton
            icon="bell"
            label="Remind"
            tone="amber"
            disabled={pledge.calculated_status === "completed"}
            onClick={() => onRemind(pledge)}
          />
          <FinancialActionIconButton
            icon="history"
            label="History"
            tone="slate"
            onClick={() => onHistory(pledge)}
          />
          <FinancialActionIconButton
            icon="edit"
            label="Edit"
            tone="blue"
            onClick={() => onEdit(pledge)}
          />
          <FinancialActionIconButton
            icon="cancel"
            label="Cancel"
            tone="red"
            onClick={() => onCancel(pledge)}
          />
        </>
      )}
    </div>
  );
}
