"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import GuestImportPanel from "@/components/guest-import/GuestImportPanel";
import { supabase } from "@/lib/supabase";
import { formatPassIdForDisplay } from "@/lib/passId";
import { checkInGuest, checkInGuestByEventPassId } from "@/services/guestService";

type GuestStatus = "pending" | "partially_checked_in" | "checked_in";

type GuestEvent = {
  id: number;
  title: string;
};

type Guest = {
  id: number;
  event_id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  category: string | null;
  allowed_guests: number;
  qr_token: string;
  event_pass_id: string | null;
  status: GuestStatus | string;
  checked_in_at: string | null;
  checked_in_count: number;
  created_at: string;
  events: GuestEvent | GuestEvent[] | null;
};

type EventOption = {
  id: number;
  title: string;
};

type NotificationState = {
  type: "success" | "error";
  message: string;
} | null;

const GUESTS_PER_PAGE = 10;

function getSingleEvent(
  eventRelation: GuestEvent | GuestEvent[] | null
): GuestEvent | null {
  if (!eventRelation) {
    return null;
  }

  if (Array.isArray(eventRelation)) {
    return eventRelation[0] ?? null;
  }

  return eventRelation;
}

function statusBadge(guest: Guest): { label: string; className: string } {
  if (guest.status === "checked_in") {
    return { label: "Checked In", className: "bg-emerald-100 text-emerald-700" };
  }

  if (guest.status === "partially_checked_in") {
    return {
      label: `Partial ${guest.checked_in_count}/${guest.allowed_guests}`,
      className: "bg-sky-100 text-sky-700",
    };
  }

  return { label: "Pending", className: "bg-amber-100 text-amber-700" };
}

function checkInButtonLabel(guest: Guest, isProcessing: boolean, doneLabel: string): string {
  if (isProcessing) {
    return "Please wait...";
  }

  if (guest.status === "checked_in") {
    return doneLabel;
  }

  if (guest.status === "partially_checked_in") {
    return `Check-In (${guest.checked_in_count}/${guest.allowed_guests})`;
  }

  return "Check-In";
}

function formatDate(dateValue: string | null) {
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

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);

  const [loading, setLoading] = useState(true);

  const [processingGuestId, setProcessingGuestId] =
    useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedEventId, setSelectedEventId] =
    useState("all");

  const [selectedStatus, setSelectedStatus] =
    useState("all");

  const [currentPage, setCurrentPage] = useState(1);

  const [notification, setNotification] =
    useState<NotificationState>(null);

  const loadPageData = useCallback(async () => {
    try {
      setLoading(true);

      const [guestsResult, eventsResult] =
        await Promise.all([
          supabase
            .from("guests")
            .select(`
              id,
              event_id,
              full_name,
              phone,
              email,
              category,
              allowed_guests,
              qr_token,
              event_pass_id,
              status,
              checked_in_at,
              checked_in_count,
              created_at,
              events (
                id,
                title
              )
            `)
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("events")
            .select("id, title")
            .is("archived_at", null)
            .order("event_date", {
              ascending: false,
            }),
        ]);

      if (guestsResult.error) {
        throw new Error(
          guestsResult.error.message
        );
      }

      if (eventsResult.error) {
        throw new Error(
          eventsResult.error.message
        );
      }

      setGuests(
        (guestsResult.data ?? []) as unknown as Guest[]
      );

      setEvents(
        (eventsResult.data ?? []) as EventOption[]
      );
    } catch (error) {
      console.error(
        "Error loading guests:",
        error
      );

      showNotification(
        error instanceof Error
          ? error.message
          : "Imeshindikana kupakua guests.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPageData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPageData]);

  function showNotification(
    message: string,
    type: "success" | "error"
  ) {
    setNotification({
      message,
      type,
    });

    window.setTimeout(() => {
      setNotification(null);
    }, 3500);
  }

  async function handleImportCompleted() {
    await loadPageData();

    showNotification(
      "Guest list imesasishwa baada ya Excel import.",
      "success"
    );

    setSelectedEventId("all");
    setSelectedStatus("all");
    setSearchTerm("");
    setCurrentPage(1);
  }

  async function handleCheckIn(guest: Guest) {
    if (guest.status === "checked_in") {
      showNotification(
        `${guest.full_name} tayari amekamilisha check-in (${guest.allowed_guests} ya ${guest.allowed_guests}).`,
        "error"
      );

      return;
    }

    const progressHint =
      guest.allowed_guests > 1
        ? ` (${guest.checked_in_count} ya ${guest.allowed_guests} tayari wamefanyiwa check-in)`
        : "";

    const confirmed = window.confirm(
      `Unataka kumfanyia check-in ${guest.full_name}?${progressHint}`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingGuestId(guest.id);

      // Route through the same secure_guest_check_in RPC the scanner and
      // manual-entry flows use, so this is the only code path that ever
      // mutates check-in state — it's what keeps checked_in_count honest.
      const verification = guest.event_pass_id
        ? await checkInGuestByEventPassId(guest.event_pass_id)
        : await checkInGuest(guest.qr_token);

      if (verification.status === "invalid" || !verification.guest) {
        showNotification(
          verification.message || "Check-in imeshindikana.",
          "error"
        );

        return;
      }

      const updatedGuest = verification.guest;

      setGuests((currentGuests) =>
        currentGuests.map((currentGuest) =>
          currentGuest.id === guest.id
            ? { ...currentGuest, ...updatedGuest }
            : currentGuest
        )
      );

      if (verification.status === "checked_in") {
        showNotification(
          `${guest.full_name} amefanyiwa check-in kikamilifu${
            updatedGuest.allowed_guests > 1
              ? ` (${updatedGuest.checked_in_count} ya ${updatedGuest.allowed_guests})`
              : ""
          }.`,
          "success"
        );
      } else if (verification.status === "partially_checked_in") {
        showNotification(
          `${guest.full_name}: ${updatedGuest.checked_in_count} ya ${updatedGuest.allowed_guests} wamefanyiwa check-in.`,
          "success"
        );
      } else {
        showNotification(
          `${guest.full_name} tayari amekamilisha check-in (${updatedGuest.allowed_guests} ya ${updatedGuest.allowed_guests}).`,
          "error"
        );
      }
    } catch (error) {
      console.error(
        "Check-in error:",
        error
      );

      showNotification(
        error instanceof Error
          ? error.message
          : "Check-in imeshindikana.",
        "error"
      );
    } finally {
      setProcessingGuestId(null);
    }
  }

  async function handleDeleteGuest(guest: Guest) {
    const confirmed = window.confirm(
      `Una uhakika unataka kumfuta ${guest.full_name}? Hatua hii haiwezi kurudishwa.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingGuestId(guest.id);

      const { error: invitationError } =
        await supabase
          .from("invitations")
          .delete()
          .eq("guest_id", guest.id);

      if (invitationError) {
        throw new Error(
          invitationError.message
        );
      }

      const { error: guestError } =
        await supabase
          .from("guests")
          .delete()
          .eq("id", guest.id);

      if (guestError) {
        throw new Error(
          guestError.message
        );
      }

      setGuests((currentGuests) =>
        currentGuests.filter(
          (currentGuest) =>
            currentGuest.id !== guest.id
        )
      );

      showNotification(
        `${guest.full_name} amefutwa vizuri.`,
        "success"
      );
    } catch (error) {
      console.error(
        "Delete guest error:",
        error
      );

      showNotification(
        error instanceof Error
          ? error.message
          : "Imeshindikana kumfuta guest.",
        "error"
      );
    } finally {
      setProcessingGuestId(null);
    }
  }

  const filteredGuests = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return guests.filter((guest) => {
      const guestEvent =
        getSingleEvent(guest.events);

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
          .includes(normalizedSearch) ||
        (guestEvent?.title ?? "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesEvent =
        selectedEventId === "all" ||
        String(guest.event_id) ===
          selectedEventId;

      const matchesStatus =
        selectedStatus === "all" ||
        guest.status === selectedStatus;

      return (
        matchesSearch &&
        matchesEvent &&
        matchesStatus
      );
    });
  }, [
    guests,
    searchTerm,
    selectedEventId,
    selectedStatus,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredGuests.length /
        GUESTS_PER_PAGE
    )
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedGuests =
    filteredGuests.slice(
      (safeCurrentPage - 1) *
        GUESTS_PER_PAGE,
      safeCurrentPage *
        GUESTS_PER_PAGE
    );

  // Headcount, not pass count: a Double pass with 1 of 2 checked in
  // contributes 1 to Checked In and 1 to Pending, not 0 or 2 of either.
  const totalGuestHeadcount = filteredGuests.reduce(
    (sum, guest) => sum + guest.allowed_guests,
    0
  );

  const checkedInCount = filteredGuests.reduce(
    (sum, guest) => sum + guest.checked_in_count,
    0
  );

  const pendingCount = Math.max(
    totalGuestHeadcount - checkedInCount,
    0
  );

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />

          <p className="mt-4 text-sm text-slate-600">
            Inapakua guests...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`fixed right-4 top-4 z-50 max-w-sm rounded-xl px-5 py-4 text-sm font-semibold text-white shadow-lg ${
            notification.type === "success"
              ? "bg-emerald-600"
              : "bg-red-600"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="sep-page-title">
            Guests
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Tafuta, chuja na usimamie wageni wa
            events zote.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#e7e1d7] bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Total
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {totalGuestHeadcount}
            </p>
          </div>

          <div className="rounded-xl border border-[#e7e1d7] bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Checked In
            </p>

            <p className="mt-1 text-xl font-bold text-emerald-600">
              {checkedInCount}
            </p>
          </div>

          <div className="rounded-xl border border-[#e7e1d7] bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-500">
              Pending
            </p>

            <p className="mt-1 text-xl font-bold text-amber-600">
              {pendingCount}
            </p>
          </div>
        </div>
      </div>

      <GuestImportPanel
        events={events}
        onImportCompleted={
          handleImportCompleted
        }
      />

      <div className="rounded-2xl border border-[#e7e1d7] bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label
              htmlFor="guest-search"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Search
            </label>

            <input
              id="guest-search"
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Jina, simu, email au Event Pass ID..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="event-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Event
            </label>

            <select
              id="event-filter"
              value={selectedEventId}
              onChange={(event) => {
                setSelectedEventId(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="all">
                Events zote
              </option>

              {events.map((eventItem) => (
                <option
                  key={eventItem.id}
                  value={String(
                    eventItem.id
                  )}
                >
                  {eventItem.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="status-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Status
            </label>

            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="all">
                Status zote
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="partially_checked_in">
                Partially Checked In
              </option>

              <option value="checked_in">
                Checked In
              </option>
            </select>
          </div>
        </div>
      </div>

      {paginatedGuests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Hakuna guest aliyepatikana
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Badilisha search au filters kisha
            ujaribu tena.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[#e7e1d7] bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Guest
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Event
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Pass ID
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Guests
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedGuests.map(
                    (guest) => {
                      const guestEvent =
                        getSingleEvent(
                          guest.events
                        );

                      const isProcessing =
                        processingGuestId ===
                        guest.id;

                      return (
                        <tr
                          key={guest.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {
                                guest.full_name
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {guest.phone ??
                                "No phone"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {guestEvent?.title ??
                              "Unknown event"}
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-mono text-sm font-semibold text-slate-800">
                              {guest.event_pass_id
                                ? formatPassIdForDisplay(guest.event_pass_id)
                                : "-"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center text-sm font-semibold text-slate-800">
                            {guest.allowed_guests ??
                              1}
                          </td>

                          <td className="px-5 py-4">
                            {guest.status === "checked_in" || guest.status === "partially_checked_in" ? (
                              <div>
                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(guest).className}`}>
                                  {statusBadge(guest).label}
                                </span>

                                <p className="mt-1 text-xs text-slate-400">
                                  {formatDate(
                                    guest.checked_in_at
                                  )}
                                </p>
                              </div>
                            ) : (
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(guest).className}`}>
                                {statusBadge(guest).label}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/events/${guest.event_id}/guests`}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Open Event
                              </Link>

                              <button
                                type="button"
                                disabled={
                                  isProcessing ||
                                  guest.status ===
                                    "checked_in"
                                }
                                onClick={() =>
                                  handleCheckIn(
                                    guest
                                  )
                                }
                                className="min-h-11 rounded-xl bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {checkInButtonLabel(guest, isProcessing, "Checked In")}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  isProcessing
                                }
                                onClick={() =>
                                  handleDeleteGuest(
                                    guest
                                  )
                                }
                                className="min-h-11 rounded-xl bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                Delete
                              </button>
                            </div>
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
            {paginatedGuests.map((guest) => {
              const guestEvent =
                getSingleEvent(
                  guest.events
                );

              const isProcessing =
                processingGuestId ===
                guest.id;

              return (
                <article
                  key={guest.id}
                  className="rounded-2xl border border-[#e7e1d7] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        {guest.full_name}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {guest.phone ??
                          "No phone"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(guest).className}`}
                    >
                      {statusBadge(guest).label}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase text-slate-400">
                        Event
                      </p>

                      <p className="mt-1 font-medium text-slate-800">
                        {guestEvent?.title ??
                          "Unknown event"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase text-slate-400">
                        Allowed
                      </p>

                      <p className="mt-1 font-semibold text-slate-800">
                        {guest.allowed_guests ??
                          1}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-900 px-4 py-3 text-white">
                    <p className="text-xs uppercase text-slate-300">
                      Event Pass ID
                    </p>

                    <p className="mt-1 font-mono font-bold">
                      {guest.event_pass_id
                        ? formatPassIdForDisplay(guest.event_pass_id)
                        : "-"}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Link
                      href={`/events/${guest.event_id}/guests`}
                      className="flex items-center justify-center rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700"
                    >
                      Event
                    </Link>

                    <button
                      type="button"
                      disabled={
                        isProcessing ||
                        guest.status ===
                          "checked_in"
                      }
                      onClick={() =>
                        handleCheckIn(guest)
                      }
                      className="min-h-11 rounded-xl bg-emerald-700 px-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:bg-slate-300"
                    >
                      {checkInButtonLabel(guest, isProcessing, "Done")}
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() =>
                        handleDeleteGuest(
                          guest
                        )
                      }
                      className="min-h-11 rounded-xl bg-red-600 px-2 text-xs font-semibold text-white disabled:bg-slate-300"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#e7e1d7] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(39,34,25,0.05)] sm:flex-row">
            <p className="text-sm text-slate-600">
              Showing{" "}
              <span className="font-semibold">
                {(safeCurrentPage - 1) *
                  GUESTS_PER_PAGE +
                  1}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {Math.min(
                  safeCurrentPage *
                    GUESTS_PER_PAGE,
                  filteredGuests.length
                )}
              </span>{" "}
              of{" "}
              <span className="font-semibold">
                {filteredGuests.length}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={
                  safeCurrentPage === 1
                }
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(
                      1,
                      page - 1
                    )
                  )
                }
                className="min-h-11 rounded-xl border border-[#ddd7cc] px-4 text-sm font-semibold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="px-2 text-sm font-medium tabular-nums text-slate-700">
                Page {safeCurrentPage} of{" "}
                {totalPages}
              </span>

              <button
                type="button"
                disabled={
                  safeCurrentPage ===
                  totalPages
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
    </div>
  );
}
