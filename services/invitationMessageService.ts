import type {
  InvitationWithDetails,
} from "@/services/invitationService";

type MessageLanguage =
  | "sw"
  | "en";

export function formatGuestPhoneNumber(
  phone:
    | string
    | null
    | undefined
) {
  if (!phone) {
    return "";
  }

  let cleanedPhone =
    phone.replace(/\D/g, "");

  if (
    cleanedPhone.startsWith("0")
  ) {
    cleanedPhone =
      `255${cleanedPhone.slice(1)}`;
  }

  if (
    cleanedPhone.startsWith("255")
  ) {
    return cleanedPhone;
  }

  return cleanedPhone;
}

function getLanguage(
  invitation:
    InvitationWithDetails
): MessageLanguage {
  return invitation.language === "en"
    ? "en"
    : "sw";
}

function formatEventDate(
  eventDate:
    | string
    | null
    | undefined,

  language: MessageLanguage
) {
  if (!eventDate) {
    return "";
  }

  return new Intl.DateTimeFormat(
    language === "en"
      ? "en-GB"
      : "sw-TZ",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${eventDate}T00:00:00`
    )
  );
}

export function buildInvitationUrl(
  invitationToken: string,
  siteOrigin: string
) {
  const cleanOrigin =
    siteOrigin.replace(/\/$/, "");

  return `${cleanOrigin}/invite/${invitationToken}`;
}

export function buildWhatsAppMessage(
  invitation:
    InvitationWithDetails,

  siteOrigin: string
) {
  const language =
    getLanguage(invitation);

  const guestName =
    invitation.guests
      ?.full_name ?? "Guest";

  const eventTitle =
    invitation.events
      ?.title ?? "Event";

  const eventDate =
    formatEventDate(
      invitation.events
        ?.event_date,
      language
    );

  const venue =
    invitation.events
      ?.venue ?? "";

  const eventPassId =
    invitation.event_pass_id ??
    "-";

  const allowedGuests =
    invitation.allowed_guests ??
    1;

  const invitationUrl =
    buildInvitationUrl(
      invitation.invitation_token,
      siteOrigin
    );

  if (language === "en") {
    return [
      `Hello ${guestName},`,
      "",
      `You are invited to *${eventTitle}*.`,
      eventDate
        ? `📅 ${eventDate}`
        : "",
      venue
        ? `📍 ${venue}`
        : "",
      `👥 Entry: ${allowedGuests}`,
      `🎟 Pass ID: *${eventPassId}*`,
      "",
      `Open invitation:`,
      invitationUrl,
      "",
      "Please present your QR code or Pass ID at check-in.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Habari ${guestName},`,
    "",
    `Umealikwa kwenye *${eventTitle}*.`,
    eventDate
      ? `📅 ${eventDate}`
      : "",
    venue
      ? `📍 ${venue}`
      : "",
    `👥 Ruhusa: Wageni ${allowedGuests}`,
    `🎟 Pass ID: *${eventPassId}*`,
    "",
    `Fungua mwaliko:`,
    invitationUrl,
    "",
    "Onyesha QR code au Pass ID wakati wa kuingia.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSmsMessage(
  invitation:
    InvitationWithDetails,

  siteOrigin: string
) {
  const language =
    getLanguage(invitation);

  const guestName =
    invitation.guests
      ?.full_name ?? "Guest";

  const eventTitle =
    invitation.events
      ?.title ?? "Event";

  const eventPassId =
    invitation.event_pass_id ??
    "-";

  const invitationUrl =
    buildInvitationUrl(
      invitation.invitation_token,
      siteOrigin
    );

  if (language === "en") {
    return [
      `Hello ${guestName}.`,
      `Invitation: ${eventTitle}.`,
      `Pass: ${eventPassId}.`,
      invitationUrl,
    ].join(" ");
  }

  return [
    `Habari ${guestName}.`,
    `Mwaliko: ${eventTitle}.`,
    `Pass: ${eventPassId}.`,
    invitationUrl,
  ].join(" ");
}

export function buildWhatsAppUrl(
  phoneNumber: string,
  message: string
) {
  return (
    `https://wa.me/${phoneNumber}` +
    `?text=${encodeURIComponent(
      message
    )}`
  );
}

export function buildDeviceSmsUrl(
  phoneNumber: string,
  message: string
) {
  return (
    `sms:${phoneNumber}` +
    `?body=${encodeURIComponent(
      message
    )}`
  );
}