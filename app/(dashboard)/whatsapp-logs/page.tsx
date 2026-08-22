"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getWhatsAppMessageLogs,
  type WhatsAppMessageLog,
  type WhatsAppMessageStatus,
} from "@/services/whatsappLogService";

type StatusFilter =
  | "all"
  | WhatsAppMessageStatus;

function formatDateTime(
  dateValue: string | null
) {
  if (!dateValue) {
    return "-";
  }

  const parsedDate =
    new Date(dateValue);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(parsedDate);
}

function getStatusStyles(
  status: WhatsAppMessageStatus
) {
  switch (status) {
    case "read":
      return "bg-blue-100 text-blue-700";

    case "delivered":
      return "bg-emerald-100 text-emerald-700";

    case "sent":
      return "bg-blue-100 text-blue-700";

    case "failed":
      return "bg-red-100 text-red-700";

    default:
      return "bg-amber-100 text-amber-700";
  }
}

function getStatusLabel(
  status: WhatsAppMessageStatus
) {
  switch (status) {
    case "queued":
      return "Queued";

    case "sent":
      return "Sent";

    case "delivered":
      return "Delivered";

    case "read":
      return "Read";

    case "failed":
      return "Failed";

    default:
      return status;
  }
}

export default function WhatsAppLogsPage() {
  const [
    logs,
    setLogs,
  ] = useState<
    WhatsAppMessageLog[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>(
    "all"
  );

  async function loadLogs(
    showRefreshState = false
  ) {
    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const messageLogs =
        await getWhatsAppMessageLogs();

      setLogs(messageLogs);
    } catch (error) {
      console.error(
        "Load WhatsApp logs error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "WhatsApp history haikuweza kupatikana."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    getWhatsAppMessageLogs()
      .then((messageLogs) => {
        if (isMounted) {
          setLogs(messageLogs);
        }
      })
      .catch((error) => {
        console.error(
          "Load WhatsApp logs error:",
          error
        );

        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "WhatsApp history haikuweza kupatikana."
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats =
    useMemo(() => {
      return {
        total: logs.length,

        queued: logs.filter(
          (log) =>
            log.status ===
            "queued"
        ).length,

        sent: logs.filter(
          (log) =>
            log.status ===
            "sent"
        ).length,

        delivered: logs.filter(
          (log) =>
            log.status ===
            "delivered"
        ).length,

        read: logs.filter(
          (log) =>
            log.status ===
            "read"
        ).length,

        failed: logs.filter(
          (log) =>
            log.status ===
            "failed"
        ).length,
      };
    }, [logs]);

  const filteredLogs =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return logs.filter(
        (log) => {
          const matchesStatus =
            statusFilter ===
              "all" ||
            log.status ===
              statusFilter;

          const searchableText = [
            log.guest_name,
            log.event_title,
            log.recipient_phone,
            log.message_id ?? "",
          ]
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            searchableText.includes(
              normalizedSearch
            );

          return (
            matchesStatus &&
            matchesSearch
          );
        }
      );
    }, [
      logs,
      searchTerm,
      statusFilter,
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="sep-page-title">
            WhatsApp Message Logs
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Fuatilia WhatsApp invitations zilizotumwa,
            kufika na kusomwa.
          </p>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() =>
            loadLogs(true)
          }
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard
          label="Total"
          value={stats.total}
          className="bg-slate-900 text-white"
        />

        <StatCard
          label="Queued"
          value={stats.queued}
          className="bg-amber-50 text-amber-700"
        />

        <StatCard
          label="Sent"
          value={stats.sent}
          className="bg-blue-50 text-blue-700"
        />

        <StatCard
          label="Delivered"
          value={
            stats.delivered
          }
          className="bg-emerald-50 text-emerald-700"
        />

        <StatCard
          label="Read"
          value={stats.read}
          className="bg-blue-50 text-blue-700"
        />

        <StatCard
          label="Failed"
          value={stats.failed}
          className="bg-red-50 text-red-700"
        />
      </div>

      <div className="grid gap-4 rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-sm md:grid-cols-2">
        <div>
          <label
            htmlFor="whatsapp-search"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Search
          </label>

          <input
            id="whatsapp-search"
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Guest, event, phone au message ID..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label
            htmlFor="status-filter"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Status
          </label>

          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as StatusFilter
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">
              Status zote
            </option>

            <option value="queued">
              Queued
            </option>

            <option value="sent">
              Sent
            </option>

            <option value="delivered">
              Delivered
            </option>

            <option value="read">
              Read
            </option>

            <option value="failed">
              Failed
            </option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#e7e1d7] bg-white p-12 text-center shadow-sm">
          <p className="font-semibold text-slate-700">
            Inapakia WhatsApp logs...
          </p>
        </div>
      ) : filteredLogs.length ===
        0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-bold text-slate-800">
            {logs.length === 0
              ? "Hakuna WhatsApp logs"
              : "Hakuna logs zinazolingana"}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {logs.length === 0
              ? "History itaonekana mara tu Send via API inapoanza request."
              : "Badilisha search au status filter kuona records nyingine."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[#e7e1d7] bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <TableHeading>
                      Guest / Event
                    </TableHeading>

                    <TableHeading>
                      Recipient
                    </TableHeading>

                    <TableHeading>
                      Meta Message ID
                    </TableHeading>

                    <TableHeading>
                      Status
                    </TableHeading>

                    <TableHeading>
                      Timeline
                    </TableHeading>

                    <TableHeading>
                      Meta Failure
                    </TableHeading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map(
                    (log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {log.guest_name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {log.event_title}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {log.recipient_phone}
                        </td>

                        <td className="max-w-[15rem] px-5 py-4 font-mono text-xs text-slate-600">
                          <span className="break-all">
                            {log.message_id || "Awaiting Meta ID"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              log.status
                            }
                          />
                        </td>

                        <td className="min-w-56 px-5 py-4 text-xs text-slate-600">
                          <TimelineItem label="Queued" value={log.created_at} />
                          <TimelineItem label="Sent" value={log.sent_at} />
                          <TimelineItem label="Delivered" value={log.delivered_at} />
                          <TimelineItem label="Read" value={log.read_at} />
                          <TimelineItem label="Updated" value={log.updated_at} />
                        </td>

                        <td className="max-w-xs px-5 py-4 text-xs">
                          {log.error_message ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                              {log.error_code && (
                                <p className="font-bold">
                                  Code {log.error_code}
                                </p>
                              )}
                              <p className="mt-1 break-words">
                                {log.error_message}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredLogs.map(
              (log) => (
                <article
                  key={log.id}
                  className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900">
                        {log.guest_name}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {log.event_title}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        log.status
                      }
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <LogDetail
                      label="Phone"
                      value={
                        log.recipient_phone
                      }
                    />

                    <LogDetail
                      label="Meta Message ID"
                      value={
                        log.message_id ||
                        "Awaiting Meta ID"
                      }
                    />

                    <LogDetail
                      label="Queued"
                      value={formatDateTime(
                        log.created_at
                      )}
                    />

                    <LogDetail
                      label="Sent"
                      value={formatDateTime(
                        log.sent_at
                      )}
                    />

                    <LogDetail
                      label="Delivered"
                      value={formatDateTime(
                        log.delivered_at
                      )}
                    />

                    <LogDetail
                      label="Read"
                      value={formatDateTime(
                        log.read_at
                      )}
                    />

                    <LogDetail
                      label="Updated"
                      value={formatDateTime(
                        log.updated_at
                      )}
                    />
                  </div>

                  {log.error_message && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      {log.error_code && (
                        <p className="font-bold">
                          Meta error code {log.error_code}
                        </p>
                      )}
                      <p className="mt-1 font-medium">
                        {log.error_message}
                      </p>
                    </div>
                  )}
                </article>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 shadow-sm ${className}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: WhatsAppMessageStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusStyles(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function TableHeading({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function LogDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}

function TimelineItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <p className="mb-1 last:mb-0">
      <span className="font-semibold text-slate-500">
        {label}:
      </span>{" "}
      {formatDateTime(value)}
    </p>
  );
}
