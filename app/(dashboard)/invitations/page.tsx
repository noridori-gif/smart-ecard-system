"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  getAllInvitations,
  InvitationWithDetails,
} from "@/services/invitationService";

type NotificationType = "success" | "error";

type NotificationState = {
  message: string;
  type: NotificationType;
} | null;

function formatPhoneNumber(phone: string | null | undefined) {
  if (!phone) {
    return "";
  }

  let cleanedPhone = phone.replace(/\D/g, "");

  // Tanzania local number: 0712 345 678
  if (cleanedPhone.startsWith("0")) {
    cleanedPhone = `255${cleanedPhone.slice(1)}`;
  }

  // Remove + if it was included before cleaning.
  return cleanedPhone;
}

function formatEventDate(
  eventDate: string | null | undefined,
  language: string | null | undefined
) {
  if (!eventDate) {
    return "";
  }

  const locale = language === "sw" ? "sw-TZ" : "en-GB";

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${eventDate}T00:00:00`));
}

function normalizeLanguage(language: string | null | undefined) {
  return language?.toLowerCase() === "en" ? "en" : "sw";
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
  const invitationUrl = buildInvitationUrl(invitation.invitation_token);

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
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] =
    useState<NotificationState>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadInvitations() {
      try {
        setLoading(true);

        const invitationData = await getAllInvitations();

        setInvitations(invitationData ?? []);
      } catch (error) {
        console.error("Error loading invitations:", error);

        showNotification(
          "Imeshindikana kupakua invitations. Jaribu tena.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    }

    loadInvitations();
  }, []);

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

  function handleWhatsApp(invitation: InvitationWithDetails) {
    const phoneNumber = formatPhoneNumber(invitation.guests?.phone);

    if (!phoneNumber) {
      showNotification(
        "Mgeni huyu hana namba ya simu. Ongeza namba kwanza.",
        "error"
      );

      return;
    }

    const message = buildInvitationMessage(invitation);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function handleSMS(invitation: InvitationWithDetails) {
    const phoneNumber = formatPhoneNumber(invitation.guests?.phone);

    if (!phoneNumber) {
      showNotification(
        "Mgeni huyu hana namba ya simu. Ongeza namba kwanza.",
        "error"
      );

      return;
    }

    const message = buildInvitationMessage(invitation);

    /*
     * Android kwa kawaida hutumia ?body=
     * iPhone wakati mwingine hutumia &body=.
     * Mfumo huu unatumia ?body= ambayo hufanya kazi vizuri
     * kwenye simu nyingi za Android.
     */
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;

    window.location.href = smsUrl;
  }

  async function handleCopyMessage(invitation: InvitationWithDetails) {
    const message = buildInvitationMessage(invitation);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(message);
      } else {
        const textArea = document.createElement("textarea");

        textArea.value = message;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";

        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();

        const copied = document.execCommand("copy");

        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error("Fallback copy failed.");
        }
      }

      showNotification("Ujumbe umenakiliwa vizuri.");
    } catch (error) {
      console.error("Error copying message:", error);

      showNotification(
        "Imeshindikana kunakili ujumbe. Jaribu tena.",
        "error"
      );
    }
  }

  const filteredInvitations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return invitations;
    }

    return invitations.filter((invitation) => {
      const guestName =
        invitation.guests?.full_name?.toLowerCase() ?? "";
      const phone = invitation.guests?.phone?.toLowerCase() ?? "";
      const eventTitle =
        invitation.events?.title?.toLowerCase() ?? "";
      const eventPassId =
        invitation.event_pass_id?.toLowerCase() ?? "";

      return (
        guestName.includes(normalizedSearch) ||
        phone.includes(normalizedSearch) ||
        eventTitle.includes(normalizedSearch) ||
        eventPassId.includes(normalizedSearch)
      );
    });
  }, [invitations, searchTerm]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
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
          className={`fixed right-4 top-4 z-50 max-w-sm rounded-xl px-5 py-4 text-sm font-medium text-white shadow-lg ${
            notification.type === "success"
              ? "bg-emerald-600"
              : "bg-red-600"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Invitations
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Tuma na usimamie mialiko ya wageni.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total Invitations
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {invitations.length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label
          htmlFor="invitation-search"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Search invitation
        </label>

        <input
          id="invitation-search"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Tafuta jina, simu, event au Event Pass ID..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      {filteredInvitations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Hakuna invitation iliyopatikana
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            {searchTerm
              ? "Badilisha neno la utafutaji na ujaribu tena."
              : "Invitations zitakapotengenezwa zitaonekana hapa."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredInvitations.map((invitation) => {
            const language = normalizeLanguage(invitation.language);
            const guestName =
              invitation.guests?.full_name ?? "Guest name unavailable";
            const phone =
              invitation.guests?.phone ?? "No phone number";
            const eventTitle =
              invitation.events?.title ?? "Event unavailable";
            const allowedGuests = invitation.allowed_guests ?? 1;
            const eventPassId =
              invitation.event_pass_id ?? "Not assigned";

            return (
              <article
                key={invitation.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        {guestName}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {phone}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-700">
                      {language}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Event
                      </p>

                      <p className="mt-1 font-medium text-slate-800">
                        {eventTitle}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Allowed Guests
                        </p>

                        <p className="mt-1 font-semibold text-slate-800">
                          {allowedGuests}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Status
                        </p>

                        <p className="mt-1 capitalize text-slate-800">
                          {invitation.invitation_status ?? "pending"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
                      <p className="text-xs uppercase tracking-wider text-slate-300">
                        Event Pass ID
                      </p>

                      <p className="mt-1 font-mono text-lg font-bold tracking-wider">
                        {eventPassId}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/invite/${invitation.invitation_token}`}
                      target="_blank"
                      className="flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      View
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleWhatsApp(invitation)}
                      className="rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSMS(invitation)}
                      className="rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      SMS
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyMessage(invitation)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Copy Message
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}