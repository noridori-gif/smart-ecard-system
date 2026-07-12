"use client";

import { useEffect, useState } from "react";
import {
  getAllInvitations,
  type InvitationWithDetails,
} from "@/services/invitationService";

type Language = "sw" | "en";

function normalizeTanzaniaPhone(
  phone: string | null
): string {
  if (!phone) {
    return "";
  }

  let cleanedPhone = phone.replace(/\D/g, "");

  if (cleanedPhone.startsWith("255")) {
    return cleanedPhone;
  }

  if (cleanedPhone.startsWith("0")) {
    return `255${cleanedPhone.slice(1)}`;
  }

  if (cleanedPhone.length === 9) {
    return `255${cleanedPhone}`;
  }

  return cleanedPhone;
}

function formatEventDate(
  eventDate: string | undefined,
  language: Language
) {
  if (!eventDate) {
    return "";
  }

  return new Intl.DateTimeFormat(
    language === "sw" ? "sw-TZ" : "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(`${eventDate}T00:00:00`)
  );
}

function formatEventTime(
  eventTime: string | undefined,
  language: Language
) {
  if (!eventTime) {
    return "";
  }

  const shortTime = eventTime.slice(0, 5);

  if (language === "en") {
    const [hour, minute] = shortTime
      .split(":")
      .map(Number);

    return new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(
      new Date(2026, 0, 1, hour, minute)
    );
  }

  const [hourValue, minuteValue] =
    shortTime.split(":").map(Number);

  const swahiliHourValue =
    (hourValue + 6) % 12;

  const swahiliHour =
    swahiliHourValue === 0
      ? 12
      : swahiliHourValue;

  let period = "usiku";

  if (hourValue >= 5 && hourValue < 12) {
    period = "asubuhi";
  } else if (
    hourValue >= 12 &&
    hourValue < 16
  ) {
    period = "mchana";
  } else if (
    hourValue >= 16 &&
    hourValue < 19
  ) {
    period = "jioni";
  }

  const minutes = String(
    minuteValue
  ).padStart(2, "0");

  return `Saa ${swahiliHour}:${minutes} ${period}`;
}

function getLanguage(
  invitation: InvitationWithDetails
): Language {
  return invitation.events?.language === "en"
    ? "en"
    : "sw";
}

function createWhatsAppMessage(
  invitation: InvitationWithDetails,
  invitationLink: string
) {
  const language = getLanguage(invitation);

  const guestName =
    invitation.guests?.full_name ??
    (language === "sw" ? "Mgeni" : "Guest");

  const eventTitle =
    invitation.events?.title ??
    (language === "sw"
      ? "tukio letu maalumu"
      : "our special event");

  const eventDate = formatEventDate(
    invitation.events?.event_date,
    language
  );

  const eventTime = formatEventTime(
    invitation.events?.event_time,
    language
  );

  const venue =
    invitation.events?.venue ?? "";

  const eventPassId =
    invitation.guests?.event_pass_id ??
    (language === "sw"
      ? "Haijapatikana"
      : "Not available");

  const allowedGuests =
    invitation.guests?.allowed_guests ?? 1;

  if (language === "sw") {
    return [
      `Habari ${guestName},`,
      "",
      `Unaalikwa kwenye ${eventTitle}.`,
      "",
      eventDate
        ? `Tarehe: ${eventDate}`
        : "",
      eventTime
        ? `Muda: ${eventTime}`
        : "",
      venue ? `Mahali: ${venue}` : "",
      "",
      `Event Pass ID: ${eventPassId}`,
      `Mwaliko unaruhusu: ${allowedGuests} ${
        allowedGuests === 1
          ? "mgeni"
          : "wageni"
      }`,
      "",
      "Fungua mwaliko wako kupitia link hii:",
      invitationLink,
      "",
      "Onyesha QR Code au Event Pass ID mlangoni.",
      "",
      "Tunatarajia kukukaribisha.",
    ]
      .filter((line) => line !== "")
      .join("\n");
  }

  return [
    `Hello ${guestName},`,
    "",
    `You are warmly invited to ${eventTitle}.`,
    "",
    eventDate
      ? `Date: ${eventDate}`
      : "",
    eventTime
      ? `Time: ${eventTime}`
      : "",
    venue ? `Venue: ${venue}` : "",
    "",
    `Event Pass ID: ${eventPassId}`,
    `Invitation admits: ${allowedGuests} ${
      allowedGuests === 1
        ? "guest"
        : "guests"
    }`,
    "",
    "Open your personal invitation using this link:",
    invitationLink,
    "",
    "Present your QR Code or Event Pass ID at the entrance.",
    "",
    "We look forward to welcoming you.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function createSmsMessage(
  invitation: InvitationWithDetails
) {
  const language = getLanguage(invitation);

  const guestName =
    invitation.guests?.full_name ??
    (language === "sw" ? "Mgeni" : "Guest");

  const eventTitle =
    invitation.events?.title ??
    (language === "sw"
      ? "tukio letu"
      : "our event");

  const eventDate = formatEventDate(
    invitation.events?.event_date,
    language
  );

  const eventTime = formatEventTime(
    invitation.events?.event_time,
    language
  );

  const venue =
    invitation.events?.venue ?? "";

  const eventPassId =
    invitation.guests?.event_pass_id ??
    "N/A";

  const allowedGuests =
    invitation.guests?.allowed_guests ?? 1;

  if (language === "sw") {
    return [
      `Habari ${guestName}.`,
      `Unaalikwa kwenye ${eventTitle}.`,
      eventDate,
      eventTime,
      venue,
      `Event Pass ID: ${eventPassId}.`,
      `Inaruhusu wageni ${allowedGuests}.`,
      "Onyesha code hii mlangoni.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `Hello ${guestName}.`,
    `You are invited to ${eventTitle}.`,
    eventDate,
    eventTime,
    venue,
    `Event Pass ID: ${eventPassId}.`,
    `Admits ${allowedGuests} ${
      allowedGuests === 1
        ? "guest"
        : "guests"
    }.`,
    "Present this code at the entrance.",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function InvitationsPage() {
  const [invitations, setInvitations] =
    useState<InvitationWithDetails[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [copiedInvitationId, setCopiedInvitationId] =
    useState<number | null>(null);

  useEffect(() => {
    async function loadInvitations() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data =
          await getAllInvitations();

        setInvitations(data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load invitations."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadInvitations();
  }, []);

  function getInvitationLink(
    invitationToken: string
  ) {
    return `${window.location.origin}/invite/${invitationToken}`;
  }

  function handleViewInvitation(
    invitationToken: string
  ) {
    window.open(
      getInvitationLink(invitationToken),
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleWhatsAppShare(
    invitation: InvitationWithDetails
  ) {
    const invitationLink =
      getInvitationLink(
        invitation.invitation_token
      );

    const message =
      createWhatsAppMessage(
        invitation,
        invitationLink
      );

    const phone =
      normalizeTanzaniaPhone(
        invitation.guests?.phone ?? null
      );

    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(
          message
        )}`
      : `https://wa.me/?text=${encodeURIComponent(
          message
        )}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleSmsShare(
    invitation: InvitationWithDetails
  ) {
    const message =
      createSmsMessage(invitation);

    const phone =
      normalizeTanzaniaPhone(
        invitation.guests?.phone ?? null
      );

    if (!phone) {
      setErrorMessage(
        "Mgeni huyu hana namba ya simu."
      );
      return;
    }

    const smsUrl =
      `sms:+${phone}?body=${encodeURIComponent(
        message
      )}`;

    window.location.href = smsUrl;
  }

  async function handleCopyMessage(
    invitation: InvitationWithDetails
  ) {
    const invitationLink =
      getInvitationLink(
        invitation.invitation_token
      );

    const message =
      createWhatsAppMessage(
        invitation,
        invitationLink
      );

    try {
      await navigator.clipboard.writeText(
        message
      );

      setCopiedInvitationId(
        invitation.id
      );

      window.setTimeout(() => {
        setCopiedInvitationId(null);
      }, 2000);
    } catch {
      setErrorMessage(
        "Message haikuweza kunakiliwa."
      );
    }
  }

  return (
    <main className="p-4 sm:p-8">
      <div className="rounded-xl bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Invitations
        </h1>

        <p className="mt-2 text-slate-500">
          Manage invitations, WhatsApp,
          SMS and RSVP responses.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            Loading invitations...
          </div>
        ) : invitations.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-10 text-center">
            <p className="text-lg font-medium text-slate-700">
              No invitations found.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Add a guest to generate an
              invitation automatically.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Guest
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Event
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Event Pass ID
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Invitation
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    RSVP
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {invitations.map(
                  (invitation) => (
                    <tr
                      key={invitation.id}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="px-4 py-4 text-sm text-slate-800">
                        <p className="font-semibold">
                          {invitation.guests
                            ?.full_name ??
                            "Unknown guest"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {invitation.guests
                            ?.phone ??
                            "No phone number"}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-800">
                        <p className="font-medium">
                          {invitation.events
                            ?.title ??
                            "Unknown event"}
                        </p>

                        <p className="mt-1 text-xs uppercase text-slate-500">
                          {invitation.events
                            ?.language === "en"
                            ? "English"
                            : "Kiswahili"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 font-mono text-sm font-bold tracking-wider text-blue-700">
                          {invitation.guests
                            ?.event_pass_id ??
                            "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <span className="rounded-full bg-blue-50 px-3 py-1 capitalize text-blue-700">
                          {
                            invitation.invitation_status
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <span className="rounded-full bg-amber-50 px-3 py-1 capitalize text-amber-700">
                          {
                            invitation.rsvp_status
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex min-w-max flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleViewInvitation(
                                invitation.invitation_token
                              )
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleWhatsAppShare(
                                invitation
                              )
                            }
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                          >
                            WhatsApp
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleSmsShare(
                                invitation
                              )
                            }
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
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
                            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            {copiedInvitationId ===
                            invitation.id
                              ? "Copied"
                              : "Copy"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}