import type {
  InvitationWithDetails,
} from "@/services/invitationService";

export type MessageLanguage =
  | "sw"
  | "en";

type InvitationEventDetails = {
  title?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  venue?: string | null;
  dress_code?: string | null;
};

type InvitationGuestDetails = {
  full_name?: string | null;
  category?: string | null;
  allowed_guests?: number | null;
  event_pass_id?: string | null;
};

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

export function getInvitationStatusLabel(
  language: MessageLanguage,
  allowedGuests:
    | number
    | null
    | undefined
) {
  const normalizedAllowedGuests =
    Number(allowedGuests);

  const safeCount =
    Number.isFinite(
      normalizedAllowedGuests
    ) &&
    normalizedAllowedGuests >= 1
      ? Math.floor(
          normalizedAllowedGuests
        )
      : 1;

  if (language === "en") {
    if (safeCount === 1) {
      return "Single (1 Person)";
    }

    if (safeCount === 2) {
      return "Double (2 People)";
    }

    return `${safeCount} People`;
  }

  if (safeCount === 1) {
    return "Single (Mtu 1)";
  }

  if (safeCount === 2) {
    return "Double (Watu 2)";
  }

  return `Watu ${safeCount}`;
}

function getEventDetails(
  invitation:
    InvitationWithDetails
) {
  return invitation.events as
    | InvitationEventDetails
    | null
    | undefined;
}

function getGuestDetails(
  invitation:
    InvitationWithDetails
) {
  return invitation.guests as
    | InvitationGuestDetails
    | null
    | undefined;
}

export function formatEventDate(
  eventDate:
    | string
    | null
    | undefined,

  language: MessageLanguage
) {
  if (!eventDate) {
    return "";
  }

  const parsedDate =
    new Date(
      `${eventDate}T00:00:00`
    );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return eventDate;
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
  ).format(parsedDate);
}

export function formatEventTime(
  eventTime:
    | string
    | null
    | undefined,

  language: MessageLanguage
) {
  if (!eventTime) {
    return "";
  }

  const timeParts =
    eventTime
      .trim()
      .match(
        /^(\d{1,2}):(\d{2})/
      );

  if (!timeParts) {
    return eventTime;
  }

  const hours =
    Number(timeParts[1]);

  const minutes =
    Number(timeParts[2]);

  const parsedTime =
    new Date(
      2000,
      0,
      1,
      hours,
      minutes
    );

  if (
    Number.isNaN(
      parsedTime.getTime()
    )
  ) {
    return eventTime;
  }

  return new Intl.DateTimeFormat(
    language === "en"
      ? "en-GB"
      : "sw-TZ",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(parsedTime);
}

function formatCategory(
  category:
    | string
    | null
    | undefined
) {
  if (!category) {
    return "-";
  }

  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export function buildInvitationUrl(
  invitationToken: string,
  siteOrigin: string
) {
  const cleanOrigin =
    siteOrigin.replace(/\/$/, "");

  return (
    `${cleanOrigin}/invite/` +
    invitationToken
  );
}

export function buildWhatsAppMessage(
  invitation:
    InvitationWithDetails,

  siteOrigin: string
) {
  const language =
    getLanguage(invitation);

  const event =
    getEventDetails(invitation);

  const guest =
    getGuestDetails(invitation);

  const guestName =
    guest?.full_name ??
    "Guest";

  const eventTitle =
    event?.title ??
    "Event";

  const eventDate =
    formatEventDate(
      event?.event_date,
      language
    );

  const eventTime =
    formatEventTime(
      event?.event_time,
      language
    );

  const venue =
    event?.venue ?? "";

  const eventPassId =
    guest?.event_pass_id?.trim() ||
    "";

  const allowedGuests =
    guest?.allowed_guests ?? 1;

  const invitationUrl =
    buildInvitationUrl(
      invitation.invitation_token,
      siteOrigin
    );

  if (language === "en") {
    return [
      `Hello ${guestName},`,
      "",
      `You are invited to ${eventTitle}.`,
      "",
      eventDate ? `📅 ${eventDate}` : null,
      eventTime ? `🕒 ${eventTime}` : null,
      venue ? `📍 ${venue}` : null,
      "",
      `🎟️ Pass ID: ${eventPassId || "-"}`,
      `👥 Guests: ${allowedGuests}`,
      "",
      "Use the button below to open your full invitation.",
      invitationUrl,
    ]
      .filter(
        (line) =>
          line !== undefined &&
          line !== null
      )
      .join("\n");
  }

  return [
    `Habari ${guestName},`,
    "",
    `Umealikwa kwenye ${eventTitle}.`,
    "",
    eventDate ? `📅 ${eventDate}` : null,
    eventTime ? `🕒 ${eventTime}` : null,
    venue ? `📍 ${venue}` : null,
    "",
    `🎟️ Pass ID: ${eventPassId || "-"}`,
    `👥 Idadi: ${allowedGuests}`,
    "",
    "Bonyeza kitufe hapa chini kufungua mwaliko kamili.",
    invitationUrl,
  ]
    .filter(
      (line) =>
        line !== undefined &&
        line !== null
    )
    .join("\n");
}

export function buildSmsMessage(
  invitation:
    InvitationWithDetails,

  siteOrigin: string
) {
  const language =
    getLanguage(invitation);

  const event =
    getEventDetails(invitation);

  const guest =
    getGuestDetails(invitation);

  const guestName =
    guest?.full_name ??
    "Guest";

  const eventTitle =
    event?.title ??
    "Event";

  const eventDate =
    formatEventDate(
      event?.event_date,
      language
    );

  const eventTime =
    formatEventTime(
      event?.event_time,
      language
    );

  const venue =
    event?.venue?.trim() || "";

  const eventPassId =
    invitation.event_pass_id ??
    guest?.event_pass_id ??
    "-";

  const allowedGuests =
    invitation.allowed_guests ??
    guest?.allowed_guests ??
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
      `You are invited to ${eventTitle}.`,
      eventDate
        ? `Date: ${eventDate}`
        : "",
      eventTime
        ? `Time: ${eventTime}`
        : "",
      venue
        ? `Venue: ${venue}`
        : "",
      `Event Pass ID: ${eventPassId}`,
      `Allowed guests: ${allowedGuests}`,
      "",
      "Open your invitation:",
      invitationUrl,
    ]
      .filter(
        (line) =>
          line !== undefined &&
          line !== null
      )
      .join("\n");
  }

  return [
    `Habari ${guestName},`,
    "",
    `Umealikwa kwenye ${eventTitle}.`,
    eventDate
      ? `Tarehe: ${eventDate}`
      : "",
    eventTime
      ? `Muda: ${eventTime}`
      : "",
    venue
      ? `Mahali: ${venue}`
      : "",
    `Event Pass ID: ${eventPassId}`,
    `Idadi ya wageni: ${allowedGuests}`,
    "",
    "Fungua mwaliko wako:",
    invitationUrl,
  ]
    .filter(
      (line) =>
        line !== undefined &&
        line !== null
    )
    .join("\n");
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
