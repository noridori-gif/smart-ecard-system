import { supabase } from "@/lib/supabase";

import { createInvitation } from "@/services/invitationService";

export type NewGuest = {
  event_id: number;
  full_name: string;
  phone?: string;
  email?: string;
  category?: string;
  allowed_guests?: number;
};

export type UpdateGuest = {
  full_name: string;
  phone?: string;
  email?: string;
  category?: string;
  allowed_guests?: number;
};

export type Guest = {
  id: number;
  event_id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  category: string | null;
  allowed_guests: number;
  qr_token: string;
  event_pass_id: string | null;
  status: string;
  checked_in_at: string | null;
  checked_in_count: number;
  last_checked_in_at: string | null;
  created_at: string;
};

export type CheckInResult = {
  success: boolean;
  status:
    | "checked_in"
    | "partially_checked_in"
    | "already_checked_in"
    | "invalid";
  message: string;
  guest: Guest | null;
};

const EVENT_PASS_PREFIX = "SEP";
const EVENT_PASS_LENGTH = 6;
const MAX_EVENT_PASS_ATTEMPTS = 5;

const EVENT_PASS_CHARACTERS =
  "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateEventPassId(): string {
  const randomValues = new Uint32Array(
    EVENT_PASS_LENGTH
  );

  crypto.getRandomValues(randomValues);

  const code = Array.from(randomValues)
    .map(
      (value) =>
        EVENT_PASS_CHARACTERS[
          value %
            EVENT_PASS_CHARACTERS.length
        ]
    )
    .join("");

  return `${EVENT_PASS_PREFIX}-${code}`;
}

function isEventPassConflict(error: {
  code?: string;
  message?: string;
}) {
  return (
    error.code === "23505" &&
    (error.message
      ?.toLowerCase()
      .includes("event_pass_id") ??
      false)
  );
}

function normalizeCheckInResult(
  data: unknown
): CheckInResult {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return {
      success: false,
      status: "invalid",
      message:
        "Check-in response is invalid.",
      guest: null,
    };
  }

  const result = data as {
    success?: unknown;
    status?: unknown;
    message?: unknown;
    guest?: unknown;
  };

  const validStatuses = [
    "checked_in",
    "partially_checked_in",
    "already_checked_in",
    "invalid",
  ] as const;

  const status =
    typeof result.status === "string" &&
    validStatuses.includes(
      result.status as
        (typeof validStatuses)[number]
    )
      ? (result.status as
          | "checked_in"
          | "partially_checked_in"
          | "already_checked_in"
          | "invalid")
      : "invalid";

  return {
    success: result.success === true,
    status,
    message:
      typeof result.message === "string"
        ? result.message
        : "Check-in could not be completed.",
    guest:
      result.guest &&
      typeof result.guest === "object"
        ? (result.guest as Guest)
        : null,
  };
}

async function secureCheckIn(
  values: {
    qrToken?: string;
    eventPassId?: string;
  }
): Promise<CheckInResult> {
  const qrToken =
    values.qrToken?.trim() || null;

  const eventPassId =
    values.eventPassId
      ?.trim()
      .toUpperCase() || null;

  if (!qrToken && !eventPassId) {
    return {
      success: false,
      status: "invalid",
      message:
        "QR Code or Event Pass ID is required.",
      guest: null,
    };
  }

  const { data, error } =
    await supabase.rpc(
      "secure_guest_check_in",
      {
        qr_token_input: qrToken,
        event_pass_id_input:
          eventPassId,
      }
    );

  if (error) {
    if (
      error.code === "42501" ||
      error.message
        .toLowerCase()
        .includes("not authorized")
    ) {
      throw new Error(
        "Huna ruhusa ya kufanya guest check-in."
      );
    }

    throw new Error(error.message);
  }

  return normalizeCheckInResult(data);
}

export async function createGuest(
  guest: NewGuest
): Promise<Guest> {
  let lastErrorMessage =
    "Mgeni hakuweza kuhifadhiwa.";

  for (
    let attempt = 1;
    attempt <= MAX_EVENT_PASS_ATTEMPTS;
    attempt += 1
  ) {
    const eventPassId =
      generateEventPassId();

    const { data, error } =
      await supabase
        .from("guests")
        .insert({
          event_id: guest.event_id,
          full_name:
            guest.full_name.trim(),
          phone:
            guest.phone?.trim() ||
            null,
          email:
            guest.email?.trim() ||
            null,
          category:
            guest.category?.trim() ||
            "Normal",
          allowed_guests:
            guest.allowed_guests ?? 1,
          event_pass_id:
            eventPassId,
        })
        .select()
        .single();

    if (error) {
      lastErrorMessage =
        error.message;

      if (isEventPassConflict(error)) {
        continue;
      }

      throw new Error(error.message);
    }

    const createdGuest =
      data as Guest;

    try {
      await createInvitation(
        createdGuest.event_id,
        createdGuest.id
      );
    } catch (error) {
      await supabase
        .from("guests")
        .delete()
        .eq("id", createdGuest.id);

      throw new Error(
        error instanceof Error
          ? `Mgeni hakukamilika kuhifadhiwa: ${error.message}`
          : "Invitation ya mgeni haikuweza kutengenezwa."
      );
    }

    return createdGuest;
  }

  throw new Error(
    `Event Pass ID haikuweza kutengenezwa baada ya majaribio kadhaa. ${lastErrorMessage}`
  );
}

export async function getGuestsByEvent(
  eventId: number
): Promise<Guest[]> {
  const { data, error } =
    await supabase
      .from("guests")
      .select("*")
      .eq("event_id", eventId)
      .order("full_name", {
        ascending: true,
      });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Guest[];
}

export async function getGuestById(
  guestId: number
): Promise<Guest> {
  const { data, error } =
    await supabase
      .from("guests")
      .select("*")
      .eq("id", guestId)
      .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Guest;
}

export async function updateGuest(
  guestId: number,
  guest: UpdateGuest
): Promise<Guest> {
  const { data, error } =
    await supabase
      .from("guests")
      .update({
        full_name:
          guest.full_name.trim(),
        phone:
          guest.phone?.trim() ||
          null,
        email:
          guest.email?.trim() ||
          null,
        category:
          guest.category?.trim() ||
          "Normal",
        allowed_guests:
          guest.allowed_guests ?? 1,
      })
      .eq("id", guestId)
      .select()
      .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Guest;
}

export async function getGuestByQrToken(
  qrToken: string
): Promise<Guest | null> {
  const normalizedQrToken =
    qrToken.trim();

  if (!normalizedQrToken) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("guests")
      .select("*")
      .eq(
        "qr_token",
        normalizedQrToken
      )
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Guest | null;
}

export async function getGuestByEventPassId(
  eventPassId: string
): Promise<Guest | null> {
  const normalizedEventPassId =
    eventPassId
      .trim()
      .toUpperCase();

  if (!normalizedEventPassId) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("guests")
      .select("*")
      .eq(
        "event_pass_id",
        normalizedEventPassId
      )
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Guest | null;
}

export async function checkInGuest(
  qrToken: string
): Promise<CheckInResult> {
  return secureCheckIn({
    qrToken,
  });
}

export async function checkInGuestByEventPassId(
  eventPassId: string
): Promise<CheckInResult> {
  return secureCheckIn({
    eventPassId,
  });
}

export async function deleteGuest(
  id: number
) {
  const { error } =
    await supabase
      .from("guests")
      .delete()
      .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}