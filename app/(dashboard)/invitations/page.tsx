"use client";

import { useEffect, useState } from "react";
import {
  getAllInvitations,
  InvitationWithDetails,
} from "@/services/invitationService";

function formatPhoneForWhatsApp(phone: string | null) {
  if (!phone) {
    return "";
  }

  let cleanedPhone = phone.replace(/\D/g, "");

  if (cleanedPhone.startsWith("0")) {
    cleanedPhone = `255${cleanedPhone.slice(1)}`;
  }

  return cleanedPhone;
}

function formatEventDate(eventDate?: string) {
  if (!eventDate) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${eventDate}T00:00:00`));
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<
    InvitationWithDetails[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadInvitations() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getAllInvitations();

        setInvitations(data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load invitations"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadInvitations();
  }, []);

  function getInvitationLink(invitationToken: string) {
    return `${window.location.origin}/invite/${invitationToken}`;
  }

  function handleViewInvitation(invitationToken: string) {
    const invitationLink =
      getInvitationLink(invitationToken);

    window.open(
      invitationLink,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleWhatsAppShare(
    invitation: InvitationWithDetails
  ) {
    const guestName =
      invitation.guests?.full_name ?? "Guest";

    const eventTitle =
      invitation.events?.title ?? "our special event";

    const eventDate = formatEventDate(
      invitation.events?.event_date
    );

    const eventTime = invitation.events?.event_time
      ? invitation.events.event_time.slice(0, 5)
      : "";

    const venue =
      invitation.events?.venue ?? "";

    const invitationLink = getInvitationLink(
      invitation.invitation_token
    );

    const messageLines = [
      `Hello ${guestName},`,
      "",
      `You are warmly invited to ${eventTitle}.`,
      "",
      eventDate ? `📅 Date: ${eventDate}` : "",
      eventTime ? `🕒 Time: ${eventTime}` : "",
      venue ? `📍 Venue: ${venue}` : "",
      "",
      "Please open your personal invitation using the link below:",
      invitationLink,
      "",
      "Your invitation contains your unique QR pass. Please present it at the entrance.",
      "",
      "We look forward to celebrating with you.",
    ];

    const message = messageLines.join("\n");

    const encodedMessage = encodeURIComponent(message);

    const formattedPhone = formatPhoneForWhatsApp(
      invitation.guests?.phone ?? null
    );

    const whatsappUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <main className="p-4 sm:p-8">
      <div className="rounded-xl bg-white p-5 shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Invitations
        </h1>

        <p className="mt-2 text-slate-500">
          Manage event invitations, sharing, and RSVP responses.
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
              Add a new guest to generate an invitation automatically.
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
                    Invitation Status
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    RSVP Status
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {invitations.map((invitation) => (
                  <tr
                    key={invitation.id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-4 py-4 text-sm text-slate-800">
                      <p className="font-semibold">
                        {invitation.guests?.full_name ??
                          "Unknown guest"}
                      </p>

                      {invitation.guests?.phone && (
                        <p className="mt-1 text-xs text-slate-500">
                          {invitation.guests.phone}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-800">
                      {invitation.events?.title ??
                        "Unknown event"}
                    </td>

                    <td className="px-4 py-4 text-sm">
                      <span className="rounded-full bg-blue-50 px-3 py-1 capitalize text-blue-700">
                        {invitation.invitation_status}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      <span className="rounded-full bg-amber-50 px-3 py-1 capitalize text-amber-700">
                        {invitation.rsvp_status}
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
                          View Invitation
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleWhatsAppShare(invitation)
                          }
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                        >
                          WhatsApp
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}