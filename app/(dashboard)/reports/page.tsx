"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import PDFExportButton from "@/components/reports/PDFExportButton";

import {
  calculateEventReportSummary,
  getReportEvents,
  getReportGuests,
  getReportInvitations,
  getReportWishes,
  type EventReportSummary,
  type ReportEvent,
  type ReportGuest,
  type ReportInvitation,
  type ReportWish,
} from "@/services/reportService";

type ReportTab =
  | "attendance"
  | "guests"
  | "invitations"
  | "wishes";

type StatusFilter =
  | "all"
  | "checked_in"
  | "pending";

const ROWS_PER_PAGE = 10;

const initialSummary: EventReportSummary = {
  totalGuests: 0,
  checkedIn: 0,
  pending: 0,
  attendancePercentage: 0,
  totalInvitations: 0,
  viewed: 0,
  notViewed: 0,
  accepted: 0,
  maybe: 0,
  declined: 0,
  noResponse: 0,
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatExportDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatEventDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatStatusLabel(
  status: string | null | undefined
) {
  if (status === "checked_in") {
    return "Checked In";
  }

  if (status === "accepted") {
    return "Accepted";
  }

  if (status === "declined") {
    return "Declined";
  }

  if (status === "maybe") {
    return "Maybe";
  }

  if (status === "viewed") {
    return "Viewed";
  }

  if (status === "created") {
    return "Created";
  }

  return "Pending";
}

function getStatusClass(
  status: string | null | undefined
) {
  if (
    status === "checked_in" ||
    status === "accepted"
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "declined") {
    return "bg-red-100 text-red-700";
  }

  if (status === "maybe") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "viewed") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_");
}

function setWorksheetColumnWidths(
  worksheet: XLSX.WorkSheet,
  widths: number[]
) {
  worksheet["!cols"] = widths.map((width) => ({
    wch: width,
  }));
}

export default function ReportsPage() {
  const [events, setEvents] = useState<ReportEvent[]>(
    []
  );

  const [selectedEventId, setSelectedEventId] =
    useState("");

  const [guests, setGuests] = useState<ReportGuest[]>(
    []
  );

  const [invitations, setInvitations] = useState<
    ReportInvitation[]
  >([]);

  const [wishes, setWishes] = useState<ReportWish[]>(
    []
  );

  const [summary, setSummary] =
    useState<EventReportSummary>(initialSummary);

  const [activeTab, setActiveTab] =
    useState<ReportTab>("attendance");

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [loadingEvents, setLoadingEvents] =
    useState(true);

  const [loadingReport, setLoadingReport] =
    useState(false);

  const [exportingExcel, setExportingExcel] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        setLoadingEvents(true);
        setErrorMessage("");

        const eventData = await getReportEvents();

        setEvents(eventData);

        if (eventData.length > 0) {
          setSelectedEventId(
            String(eventData[0].id)
          );
        }
      } catch (error) {
        console.error(
          "Error loading report events:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Events hazikuweza kupatikana."
        );
      } finally {
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!selectedEventId) {
        setGuests([]);
        setInvitations([]);
        setWishes([]);
        setSummary(initialSummary);
        return;
      }
      try {
        setLoadingReport(true);
        setErrorMessage("");

        const eventId = Number(selectedEventId);

        const [guestData, invitationData, wishData] =
          await Promise.all([
            getReportGuests(eventId),
            getReportInvitations(eventId),
            getReportWishes(eventId),
          ]);

        setGuests(guestData);
        setInvitations(invitationData);
        setWishes(wishData);

        setSummary(
          calculateEventReportSummary(
            guestData,
            invitationData
          )
        );
      } catch (error) {
        console.error(
          "Error loading report:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Report haikuweza kupatikana."
        );
      } finally {
        setLoadingReport(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedEventId]);

  const selectedEvent = useMemo(() => {
    return (
      events.find(
        (eventItem) =>
          String(eventItem.id) === selectedEventId
      ) ?? null
    );
  }, [events, selectedEventId]);

  const filteredGuests = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return guests.filter((guest) => {
      const matchesSearch =
        !normalizedSearch ||
        guest.full_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        (guest.phone ?? "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (guest.email ?? "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (guest.event_pass_id ?? "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "checked_in"
          ? guest.status === "checked_in"
          : guest.status !== "checked_in");

      return matchesSearch && matchesStatus;
    });
  }, [guests, searchTerm, statusFilter]);

  const filteredInvitations = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return invitations.filter((invitation) => {
      const guestName =
        invitation.guests?.full_name.toLowerCase() ??
        "";

      const phone =
        invitation.guests?.phone?.toLowerCase() ??
        "";

      const eventPassId =
        invitation.guests?.event_pass_id?.toLowerCase() ??
        "";

      return (
        !normalizedSearch ||
        guestName.includes(normalizedSearch) ||
        phone.includes(normalizedSearch) ||
        eventPassId.includes(normalizedSearch)
      );
    });
  }, [invitations, searchTerm]);

  const filteredWishes = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return wishes.filter((wish) => {
      return (
        !normalizedSearch ||
        wish.guest_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        wish.message
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [wishes, searchTerm]);

  const currentRows =
    activeTab === "wishes"
      ? filteredWishes
      : activeTab === "invitations"
      ? filteredInvitations
      : filteredGuests;

  const totalPages = Math.max(
    1,
    Math.ceil(currentRows.length / ROWS_PER_PAGE)
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedGuests = filteredGuests.slice(
    (safeCurrentPage - 1) * ROWS_PER_PAGE,
    safeCurrentPage * ROWS_PER_PAGE
  );

  const paginatedInvitations =
    filteredInvitations.slice(
      (safeCurrentPage - 1) * ROWS_PER_PAGE,
      safeCurrentPage * ROWS_PER_PAGE
    );

  const paginatedWishes = filteredWishes.slice(
    (safeCurrentPage - 1) * ROWS_PER_PAGE,
    safeCurrentPage * ROWS_PER_PAGE
  );

  function handleExportExcel() {
    if (!selectedEvent) {
      setErrorMessage(
        "Chagua event kwanza kabla ya ku-export report."
      );

      return;
    }

    try {
      setExportingExcel(true);
      setErrorMessage("");

      const workbook = XLSX.utils.book_new();

      const summaryRows = [
        {
          "Report Item": "Event Name",
          Value: selectedEvent.title,
        },
        {
          "Report Item": "Event Type",
          Value: selectedEvent.event_type,
        },
        {
          "Report Item": "Event Date",
          Value: formatEventDate(
            selectedEvent.event_date
          ),
        },
        {
          "Report Item": "Event Time",
          Value: selectedEvent.event_time,
        },
        {
          "Report Item": "Venue",
          Value: selectedEvent.venue,
        },
        {
          "Report Item": "Total Guests",
          Value: summary.totalGuests,
        },
        {
          "Report Item": "Checked In",
          Value: summary.checkedIn,
        },
        {
          "Report Item": "Pending Check-In",
          Value: summary.pending,
        },
        {
          "Report Item": "Attendance Percentage",
          Value: `${summary.attendancePercentage}%`,
        },
        {
          "Report Item": "Total Invitations",
          Value: summary.totalInvitations,
        },
        {
          "Report Item": "Invitations Viewed",
          Value: summary.viewed,
        },
        {
          "Report Item": "Invitations Not Viewed",
          Value: summary.notViewed,
        },
        {
          "Report Item": "RSVP Accepted",
          Value: summary.accepted,
        },
        {
          "Report Item": "RSVP Maybe",
          Value: summary.maybe,
        },
        {
          "Report Item": "RSVP Declined",
          Value: summary.declined,
        },
        {
          "Report Item": "RSVP No Response",
          Value: summary.noResponse,
        },
        {
          "Report Item": "Generated At",
          Value: formatExportDateTime(
            new Date().toISOString()
          ),
        },
      ];

      const summaryWorksheet =
        XLSX.utils.json_to_sheet(summaryRows);

      setWorksheetColumnWidths(
        summaryWorksheet,
        [30, 45]
      );

      XLSX.utils.book_append_sheet(
        workbook,
        summaryWorksheet,
        "Event Summary"
      );

      const attendanceRows = guests.map(
        (guest, index) => ({
          No: index + 1,
          "Guest Name": guest.full_name,
          Phone: guest.phone ?? "",
          "Event Pass ID":
            guest.event_pass_id ?? "",
          Status:
            guest.status === "checked_in"
              ? "Checked In"
              : "Pending",
          "Checked In At": formatExportDateTime(
            guest.checked_in_at
          ),
        })
      );

      const attendanceWorksheet =
        XLSX.utils.json_to_sheet(attendanceRows);

      setWorksheetColumnWidths(
        attendanceWorksheet,
        [7, 28, 18, 20, 16, 24]
      );

      XLSX.utils.book_append_sheet(
        workbook,
        attendanceWorksheet,
        "Attendance"
      );

      const guestRows = guests.map(
        (guest, index) => ({
          No: index + 1,
          "Guest Name": guest.full_name,
          Phone: guest.phone ?? "",
          Email: guest.email ?? "",
          Category: guest.category ?? "",
          "Allowed Guests":
            guest.allowed_guests ?? 1,
          "Event Pass ID":
            guest.event_pass_id ?? "",
          Status:
            guest.status === "checked_in"
              ? "Checked In"
              : "Pending",
        })
      );

      const guestWorksheet =
        XLSX.utils.json_to_sheet(guestRows);

      setWorksheetColumnWidths(
        guestWorksheet,
        [7, 28, 18, 30, 18, 16, 20, 16]
      );

      XLSX.utils.book_append_sheet(
        workbook,
        guestWorksheet,
        "Guest List"
      );

      const invitationRows = invitations.map(
        (invitation, index) => ({
          No: index + 1,
          "Guest Name":
            invitation.guests?.full_name ?? "",
          Phone:
            invitation.guests?.phone ?? "",
          "Event Pass ID":
            invitation.guests?.event_pass_id ?? "",
          "Invitation Status":
            formatStatusLabel(
              invitation.invitation_status
            ),
          "RSVP Status":
            formatStatusLabel(
              invitation.rsvp_status
            ),
          "Viewed At": formatExportDateTime(
            invitation.viewed_at
          ),
        })
      );

      const invitationWorksheet =
        XLSX.utils.json_to_sheet(invitationRows);

      setWorksheetColumnWidths(
        invitationWorksheet,
        [7, 28, 18, 20, 20, 18, 24]
      );

      XLSX.utils.book_append_sheet(
        workbook,
        invitationWorksheet,
        "Invitations RSVP"
      );

      const wishRows = wishes.map(
        (wish, index) => ({
          No: index + 1,
          "Guest Name": wish.guest_name,
          Message: wish.message,
          "Submitted At": formatExportDateTime(
            wish.created_at
          ),
          "Updated At": formatExportDateTime(
            wish.updated_at
          ),
        })
      );

      const wishWorksheet =
        XLSX.utils.json_to_sheet(wishRows);

      setWorksheetColumnWidths(
        wishWorksheet,
        [7, 30, 70, 24, 24]
      );

      XLSX.utils.book_append_sheet(
        workbook,
        wishWorksheet,
        "Guest Wishes"
      );

      const eventName = sanitizeFileName(
        selectedEvent.title
      );

      const eventDate =
        selectedEvent.event_date || "report";

      const fileName =
        `${eventName}_${eventDate}_Report.xlsx`;

      XLSX.writeFile(workbook, fileName, {
        compression: true,
      });
    } catch (error) {
      console.error("Excel export error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Excel report haikuweza kutengenezwa."
      );
    } finally {
      setExportingExcel(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-4xl font-bold text-blue-700">
            Reports
          </h1>

          <p className="mt-2 text-slate-600">
            Angalia taarifa za attendance, guests na
            invitations.
          </p>
        </div>

        <div className="w-full space-y-3 lg:w-96">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label
              htmlFor="report-event"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Select Event
            </label>

            <select
              id="report-event"
              value={selectedEventId}
              disabled={loadingEvents}
              onChange={(event) =>
                setSelectedEventId(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            >
              {events.length === 0 && (
                <option value="">
                  No events available
                </option>
              )}

              {events.map((eventItem) => (
                <option
                  key={eventItem.id}
                  value={String(eventItem.id)}
                >
                  {eventItem.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={
              !selectedEvent ||
              loadingReport ||
              exportingExcel
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
            </svg>

            <span>
              {exportingExcel
                ? "Preparing Excel..."
                : "Export Complete Excel Report"}
            </span>
          </button>

          <PDFExportButton
            event={selectedEvent}
            summary={summary}
            guests={guests}
            invitations={invitations}
            wishes={wishes}
            disabled={loadingReport}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {selectedEvent && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Report For
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {selectedEvent.title}
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Type
              </p>

              <p className="mt-1 font-semibold capitalize text-slate-800">
                {selectedEvent.event_type}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Date
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {formatEventDate(
                  selectedEvent.event_date
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Time
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {selectedEvent.event_time}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Venue
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {selectedEvent.venue}
              </p>
            </div>
          </div>
        </div>
      )}

      {loadingReport ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-500">
            Loading report...
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Total Guests
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-700">
                {summary.totalGuests}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Checked In
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {summary.checkedIn}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Pending
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-600">
                {summary.pending}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Attendance
              </p>

              <p className="mt-2 text-3xl font-bold text-violet-600">
                {summary.attendancePercentage}%
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Invitations
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {summary.totalInvitations}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Viewed
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-600">
                {summary.viewed}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                RSVP Accepted
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {summary.accepted}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                No Response
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-600">
                {summary.noResponse}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("attendance");
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    activeTab === "attendance"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Attendance Report
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("guests");
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    activeTab === "guests"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Guest List
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("invitations");
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    activeTab === "invitations"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Invitation & RSVP
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("wishes");
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    activeTab === "wishes"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Guest Wishes
                </button>
              </div>
            </div>

            <div className="grid gap-4 border-b border-slate-200 p-4 md:grid-cols-2">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tafuta jina, simu au Event Pass ID..."
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              {activeTab !== "invitations" &&
                activeTab !== "wishes" && (
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">
                    Status zote
                  </option>

                  <option value="checked_in">
                    Checked In
                  </option>

                  <option value="pending">
                    Pending
                  </option>
                </select>
              )}
            </div>

            <div className="overflow-x-auto">
              {activeTab === "wishes" ? (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Guest
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Message
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Submitted At
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Last Updated
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedWishes.map((wish) => (
                      <tr key={wish.id}>
                        <td className="px-5 py-4 align-top">
                          <p className="font-semibold text-slate-900">
                            {wish.guest_name}
                          </p>
                        </td>

                        <td className="min-w-72 px-5 py-4 align-top">
                          <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                            {wish.message}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-top text-sm text-slate-600">
                          {formatDateTime(
                            wish.created_at
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 align-top text-sm text-slate-600">
                          {formatDateTime(
                            wish.updated_at
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : activeTab === "invitations" ? (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Guest
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Event Pass ID
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Invitation
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        RSVP
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Viewed At
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedInvitations.map(
                      (invitation) => (
                        <tr key={invitation.id}>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {invitation.guests
                                ?.full_name ?? "Guest"}
                            </p>

                            <p className="text-xs text-slate-500">
                              {invitation.guests
                                ?.phone ?? "-"}
                            </p>
                          </td>

                          <td className="px-5 py-4 font-mono text-sm font-semibold">
                            {invitation.guests
                              ?.event_pass_id ?? "-"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                invitation.invitation_status
                              )}`}
                            >
                              {formatStatusLabel(
                                invitation.invitation_status
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                invitation.rsvp_status
                              )}`}
                            >
                              {formatStatusLabel(
                                invitation.rsvp_status
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDateTime(
                              invitation.viewed_at
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Guest
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Event Pass ID
                      </th>

                      {activeTab === "guests" && (
                        <>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                            Category
                          </th>

                          <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">
                            Allowed
                          </th>
                        </>
                      )}

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        Status
                      </th>

                      {activeTab === "attendance" && (
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                          Checked In At
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedGuests.map((guest) => (
                      <tr key={guest.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {guest.full_name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {guest.phone ?? "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-mono text-sm font-semibold">
                          {guest.event_pass_id ?? "-"}
                        </td>

                        {activeTab === "guests" && (
                          <>
                            <td className="px-5 py-4 text-sm text-slate-700">
                              {guest.category ?? "-"}
                            </td>

                            <td className="px-5 py-4 text-center font-semibold">
                              {guest.allowed_guests}
                            </td>
                          </>
                        )}

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              guest.status
                            )}`}
                          >
                            {formatStatusLabel(
                              guest.status
                            )}
                          </span>
                        </td>

                        {activeTab ===
                          "attendance" && (
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDateTime(
                              guest.checked_in_at
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {currentRows.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <h3 className="font-semibold text-slate-900">
                    Hakuna taarifa iliyopatikana
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Badilisha search au filter.
                  </p>
                </div>
              )}
            </div>

            {currentRows.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row">
                <p className="text-sm text-slate-600">
                  Showing{" "}
                  {(safeCurrentPage - 1) *
                    ROWS_PER_PAGE +
                    1}{" "}
                  to{" "}
                  {Math.min(
                    safeCurrentPage *
                      ROWS_PER_PAGE,
                    currentRows.length
                  )}{" "}
                  of {currentRows.length}
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
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm font-medium">
                    Page {safeCurrentPage} of{" "}
                    {totalPages}
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
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
