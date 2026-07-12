"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  getAllInvitations,
  InvitationWithDetails,
} from "@/services/invitationService";

type NotificationType = "success" | "error";

type NotificationState = {
  message: string;
  type: NotificationType;
} | null;

const INVITATIONS_PER_PAGE = 10;

function formatPhoneNumber(phone: string | null | undefined) {
  if (!phone) {
    return "";
  }

  let cleanedPhone = phone.replace(/\D/g, "");

  if (cleanedPhone.startsWith("0")) {
    cleanedPhone = `255${cleanedPhone.slice(1)}`;
  }

  return cleanedPhone;
}

function formatEventDate(
  eventDate: string | null | undefined,
  language: string | null | undefined
) {
  if (!eventDate) {
    return "";
  }

  const locale = language === "en" ? "en-GB" : "sw-TZ";

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${eventDate}T00:00:00`));
}

function normalizeLanguage(language: string | null | undefined) {
  return language === "en" ? "en" : "sw";
}

function buildInvitationUrl(invitationToken: string) {
  if (typeof window === "undefined") {
    return `/invite/${invitationToken}`;
  }

  return `${window.location.origin}/invite/${invitationToken}`;
}

function buildInvitationMessage(invitation: InvitationWithDetails) {
  const language = normalizeLanguage(invitation.language);

  const guestName = invitation.guests?.full_name ?? "Guest";
  const eventTitle = invitation.events?.title ?? "Event";
  const eventDate = formatEventDate(
    invitation.events?.event_date,
    invitation.language
  );
  const eventVenue = invitation.events?.venue ?? "";
  const eventPassId = invitation.event_pass_id ?? "Not available";
  const allowedGuests = invitation.allowed_guests ?? 1;
  const invitationUrl = buildInvitationUrl(
    invitation.invitation_token
  );

  if (language === "en") {
    return [
      `Hello ${guestName},`,
      "",
      `You are warmly invited to ${eventTitle}.`,
      eventDate ? `Date: ${eventDate}` : "",
      eventVenue ? `Venue: ${eventVenue}` : "",
      `Allowed guests: ${allowedGuests}`,
      `Event Pass ID: ${eventPassId}`,
      "",
      "Open your invitation using the link below:",
      invitationUrl,
      "",
      "Please keep your Event Pass ID or QR code ready for check-in.",
      "",
      "Smart Event Pass",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Habari ${guestName},`,
    "",
    `Unakaribishwa kwa moyo mkunjufu kwenye ${eventTitle}.`,
    eventDate ? `Tarehe: ${eventDate}` : "",
    eventVenue ? `Mahali: ${eventVenue}` : "",
    `Idadi ya wageni wanaoruhusiwa: ${allowedGuests}`,
    `Event Pass ID: ${eventPassId}`,
    "",
    "Fungua mwaliko wako kupitia link hii:",
    invitationUrl,
    "",
    "Tafadhali hifadhi Event Pass ID au QR code yako kwa ajili ya check-in.",
    "",
    "Smart Event Pass",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<
    InvitationWithDetails[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [notification, setNotification] =
    useState<NotificationState>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [selectedLanguage, setSelectedLanguage] =
    useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedEventId, selectedLanguage]);

  async function loadInvitations() {
    try {
      setLoading(true);

      const invitationData = await getAllInvitations();

      setInvitations(invitationData ?? []);
    } catch (error) {
      console.error("Error loading invitations:", error);

      showNotification(
        error instanceof Error
          ? error.message
          : "Imeshindikana kupakua invitations.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  function showNotification(
    message: string,
    type: NotificationType = "success"
  ) {
    setNotification({
      message,
      type,
    });

    window.setTimeout(() => {
      setNotification(null);
    }, 3500);
  }

  function handleWhatsApp(
    invitation: InvitationWithDetails
  ) {
    const phoneNumber = formatPhoneNumber(
      invitation.guests?.phone
    );

    if (!phoneNumber) {
      showNotification(
        "Mgeni huyu hana namba ya simu.",
        "error"
      );

      return;
    }

    const message = buildInvitationMessage(invitation);

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message
    )}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleSMS(invitation: InvitationWithDetails) {
    const phoneNumber = formatPhoneNumber(
      invitation.guests?.phone
    );

    if (!phoneNumber) {
      showNotification(
        "Mgeni huyu hana namba ya simu.",
        "error"
      );

      return;
    }

    const message = buildInvitationMessage(invitation);

    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(
      message
    )}`;

    window.location.href = smsUrl;
  }

  async function handleCopyMessage(
    invitation: InvitationWithDetails
  ) {
    const message = buildInvitationMessage(invitation);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        const textArea = document.createElement("textarea");

        textArea.value = message;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";

        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const copied = document.execCommand("copy");

        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error("Copy failed.");
        }
      }

      showNotification(
        "Ujumbe umenakiliwa vizuri.",
        "success"
      );
    } catch (error) {
      console.error("Copy message error:", error);

      showNotification(
        "Imeshindikana kunakili ujumbe.",
        "error"
      );
    }
  }

  const eventOptions = useMemo(() => {
    const eventMap = new Map<number, string>();

    invitations.forEach((invitation) => {
      if (
        invitation.event_id &&
        invitation.events?.title
      ) {
        eventMap.set(
          invitation.event_id,
          invitation.events.title
        );
      }
    });

    return Array.from(eventMap.entries()).map(
      ([id, title]) => ({
        id,
        title,
      })
    );
  }, [invitations]);

  const filteredInvitations = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLowerCase();

    return invitations.filter((invitation) => {
      const guestName =
        invitation.guests?.full_name?.toLowerCase() ?? "";

      const phone =
        invitation.guests?.phone?.toLowerCase() ?? "";

      const eventTitle =
        invitation.events?.title?.toLowerCase() ?? "";

      const eventPassId =
        invitation.event_pass_id?.toLowerCase() ?? "";

      const matchesSearch =
        !normalizedSearch ||
        guestName.includes(normalizedSearch) ||
        phone.includes(normalizedSearch) ||
        eventTitle.includes(normalizedSearch) ||
        eventPassId.includes(normalizedSearch);

      const matchesEvent =
        selectedEventId === "all" ||
        String(invitation.event_id) === selectedEventId;

      const matchesLanguage =
        selectedLanguage === "all" ||
        invitation.language === selectedLanguage;

      return (
        matchesSearch &&
        matchesEvent &&
        matchesLanguage
      );
    });
  }, [
    invitations,
    searchTerm,
    selectedEventId,
    selectedLanguage,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredInvitations.length / INVITATIONS_PER_PAGE
    )
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedInvitations = filteredInvitations.slice(
    (safeCurrentPage - 1) * INVITATIONS_PER_PAGE,
    safeCurrentPage * INVITATIONS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-600">
            Inapakua invitations...
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
          <h1 className="text-2xl font-bold text-slate-900">
            Invitations
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Tuma na usimamie mialiko ya wageni.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Invitations
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {filteredInvitations.length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label
              htmlFor="invitation-search"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Search
            </label>

            <input
              id="invitation-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Jina, simu, event au Event Pass ID..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
              onChange={(event) =>
                setSelectedEventId(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">Events zote</option>

              {eventOptions.map((eventItem) => (
                <option
                  key={eventItem.id}
                  value={String(eventItem.id)}
                >
                  {eventItem.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="language-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Language
            </label>

            <select
              id="language-filter"
              value={selectedLanguage}
              onChange={(event) =>
                setSelectedLanguage(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">Languages zote</option>
              <option value="sw">Kiswahili</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {paginatedInvitations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Hakuna invitation iliyopatikana
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Badilisha search au filters kisha ujaribu tena.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
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

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Language
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedInvitations.map(
                    (invitation) => (
                      <tr
                        key={invitation.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {invitation.guests?.full_name ??
                              "Guest"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {invitation.guests?.phone ??
                              "No phone"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {invitation.events?.title ??
                            "Unknown event"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-sm font-semibold text-slate-800">
                            {invitation.event_pass_id ??
                              "-"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center text-sm font-semibold text-slate-800">
                          {invitation.allowed_guests ?? 1}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-700">
                            {invitation.language}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/invite/${invitation.invitation_token}`}
                              target="_blank"
                              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                            >
                              View
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                handleWhatsApp(invitation)
                              }
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              WhatsApp
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleSMS(invitation)
                              }
                              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                            >
                              SMS
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleCopyMessage(
                                  invitation
                                )
                              }
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Copy
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {paginatedInvitations.map((invitation) => (
              <article
                key={invitation.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {invitation.guests?.full_name ??
                        "Guest"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {invitation.guests?.phone ??
                        "No phone"}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-700">
                    {invitation.language}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase text-slate-400">
                      Event
                    </p>

                    <p className="mt-1 font-medium text-slate-800">
                      {invitation.events?.title ??
                        "Unknown event"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-slate-400">
                      Allowed
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {invitation.allowed_guests ?? 1}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-slate-900 px-4 py-3 text-white">
                  <p className="text-xs uppercase text-slate-300">
                    Event Pass ID
                  </p>

                  <p className="mt-1 font-mono font-bold">
                    {invitation.event_pass_id ?? "-"}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/invite/${invitation.invitation_token}`}
                    target="_blank"
                    className="flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    View
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      handleWhatsApp(invitation)
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSMS(invitation)}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    SMS
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyMessage(invitation)
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Copy
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
            <p className="text-sm text-slate-600">
              Showing{" "}
              <span className="font-semibold">
                {(safeCurrentPage - 1) *
                  INVITATIONS_PER_PAGE +
                  1}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {Math.min(
                  safeCurrentPage *
                    INVITATIONS_PER_PAGE,
                  filteredInvitations.length
                )}
              </span>{" "}
              of{" "}
              <span className="font-semibold">
                {filteredInvitations.length}
              </span>
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
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="px-2 text-sm font-medium text-slate-700">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={
                  safeCurrentPage === totalPages
                }
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
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