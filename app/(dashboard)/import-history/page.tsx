"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getImportHistory,
  type ImportHistoryWithEvent,
} from "@/services/importHistoryService";

const ROWS_PER_PAGE = 10;

function formatDateTime(dateValue: string) {
  if (!dateValue) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function getSuccessRate(
  importedRows: number,
  totalRows: number
) {
  if (totalRows <= 0) {
    return 0;
  }

  return Math.round(
    (importedRows / totalRows) * 100
  );
}

export default function ImportHistoryPage() {
  const [history, setHistory] = useState<
    ImportHistoryWithEvent[]
  >([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    loadImportHistory();
  }, []);

  async function loadImportHistory() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await getImportHistory();

      setHistory(data);
    } catch (error) {
      console.error(
        "Import history loading error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Import history haikuweza kupatikana."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const filteredHistory = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return history;
    }

    return history.filter((historyItem) => {
      return (
        historyItem.file_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        (historyItem.event?.title ?? "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (historyItem.imported_by ?? "")
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [history, searchTerm]);

  const totalImported = filteredHistory.reduce(
    (total, historyItem) =>
      total + historyItem.imported_rows,
    0
  );

  const totalFailed = filteredHistory.reduce(
    (total, historyItem) =>
      total + historyItem.failed_rows,
    0
  );

  const totalRows = filteredHistory.reduce(
    (total, historyItem) =>
      total + historyItem.total_rows,
    0
  );

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredHistory.length / ROWS_PER_PAGE
    )
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedHistory = filteredHistory.slice(
    (safeCurrentPage - 1) * ROWS_PER_PAGE,
    safeCurrentPage * ROWS_PER_PAGE
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="sep-page-title">
            Guest Import History
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Angalia kumbukumbu za Excel imports zote
            zilizofanyika.
          </p>
        </div>

        <button
          type="button"
          onClick={loadImportHistory}
          disabled={isLoading}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading
            ? "Refreshing..."
            : "Refresh History"}
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Imports
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {filteredHistory.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Rows
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {totalRows}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm text-emerald-700">
            Imported Guests
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {totalImported}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-700">
            Failed Rows
          </p>

          <p className="mt-2 text-3xl font-bold text-red-700">
            {totalFailed}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e7e1d7] bg-white p-4 shadow-sm">
        <label
          htmlFor="history-search"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Search Import History
        </label>

        <input
          id="history-search"
          type="search"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setCurrentPage(1);
          }}
          placeholder="Tafuta event, file au imported by..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      {isLoading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-[#e7e1d7] bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />

            <p className="mt-4 text-sm text-slate-600">
              Inapakua import history...
            </p>
          </div>
        </div>
      ) : paginatedHistory.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Hakuna import history iliyopatikana
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Fanya guest import mpya au badilisha search.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[#e7e1d7] bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Event
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      File
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                      Total
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                      Imported
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                      Failed
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                      Success
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Imported By
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedHistory.map(
                    (historyItem) => {
                      const successRate =
                        getSuccessRate(
                          historyItem.imported_rows,
                          historyItem.total_rows
                        );

                      return (
                        <tr
                          key={historyItem.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDateTime(
                              historyItem.imported_at
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {historyItem.event
                                ?.title ??
                                "Unknown event"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {historyItem.file_name}
                          </td>

                          <td className="px-5 py-4 text-center font-semibold text-slate-800">
                            {historyItem.total_rows}
                          </td>

                          <td className="px-5 py-4 text-center font-bold text-emerald-700">
                            {
                              historyItem.imported_rows
                            }
                          </td>

                          <td className="px-5 py-4 text-center font-bold text-red-600">
                            {historyItem.failed_rows}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                successRate === 100
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {successRate}%
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {historyItem.imported_by ??
                              "-"}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {paginatedHistory.map(
              (historyItem) => {
                const successRate =
                  getSuccessRate(
                    historyItem.imported_rows,
                    historyItem.total_rows
                  );

                return (
                  <article
                    key={historyItem.id}
                    className="rounded-2xl border border-[#e7e1d7] bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-slate-900">
                          {historyItem.event?.title ??
                            "Unknown event"}
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(
                            historyItem.imported_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          successRate === 100
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {successRate}%
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase text-slate-400">
                        File
                      </p>

                      <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                        {historyItem.file_name}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-slate-500">
                          Total
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {historyItem.total_rows}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-emerald-700">
                          Imported
                        </p>

                        <p className="mt-1 font-bold text-emerald-700">
                          {
                            historyItem.imported_rows
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-red-600">
                          Failed
                        </p>

                        <p className="mt-1 font-bold text-red-600">
                          {historyItem.failed_rows}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                      Imported by:{" "}
                      <span className="font-semibold text-slate-700">
                        {historyItem.imported_by ??
                          "-"}
                      </span>
                    </p>
                  </article>
                );
              }
            )}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#e7e1d7] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(39,34,25,0.05)] sm:flex-row">
            <p className="text-sm text-slate-600">
              Showing{" "}
              {(safeCurrentPage - 1) *
                ROWS_PER_PAGE +
                1}{" "}
              to{" "}
              {Math.min(
                safeCurrentPage * ROWS_PER_PAGE,
                filteredHistory.length
              )}{" "}
              of {filteredHistory.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(1, page - 1)
                  )
                }
                className="min-h-11 rounded-xl border border-[#ddd7cc] px-4 text-sm font-semibold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="px-2 text-sm font-medium tabular-nums text-slate-700">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={
                  safeCurrentPage === totalPages
                }
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(
                      totalPages,
                      page + 1
                    )
                  )
                }
                className="min-h-11 rounded-xl border border-[#ddd7cc] px-4 text-sm font-semibold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
