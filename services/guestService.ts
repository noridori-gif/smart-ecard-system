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
  created_at: string;
};

export type CheckInResult = {
  success: boolean;
  status:
    | "checked_in"
    | "already_checked_in"
    | "invalid";
  message: string;
  guest: Guest | null;
};

const EVENT_PASS_PREFIX = "SEP";
const EVENT_PASS_LENGTH = 6;
const MAX_EVENT_PASS_ATTEMPTS = 5;

// Herufi kama O, I, L na namba 0, 1 zimeondolewa
// ili code iwe rahisi kusoma na kutamka.
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
          value % EVENT_PASS_CHARACTERS.length
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
    const eventPassId = generateEventPassId();

    const { data, error } = await supabase
      .from("guests")
      .insert({
        event_id: guest.event_id,
        full_name: guest.full_name.trim(),
        phone: guest.phone?.trim() || null,
        email: guest.email?.trim() || null,
        category:
          guest.category?.trim() || "Normal",
        allowed_guests:
          guest.allowed_guests ?? 1,
        event_pass_id: eventPassId,
      })
      .select()
      .single();

    if (error) {
      lastErrorMessage = error.message;

      if (isEventPassConflict(error)) {
        continue;
      }

      throw new Error(error.message);
    }

    const createdGuest = data as Guest;

    try {
      await createInvitation(
        createdGuest.event_id,
        createdGuest.id
      );
    } catch (error) {
      // Invitation ikishindwa kutengenezwa,
      // tunaondoa guest ili tusibaki na data nusu.
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from("guests")
    .update({
      full_name: guest.full_name.trim(),
      phone: guest.phone?.trim() || null,
      email: guest.email?.trim() || null,
      category:
        guest.category?.trim() || "Normal",
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
  const normalizedQrToken = qrToken.trim();

  if (!normalizedQrToken) {
    return null;
  }

  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("qr_token", normalizedQrToken)
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
    eventPassId.trim().toUpperCase();

  if (!normalizedEventPassId) {
    return null;
  }

  const { data, error } = await supabase
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

async function completeGuestCheckIn(
  guest: Guest
): Promise<CheckInResult> {
  if (guest.status === "checked_in") {
    return {
      success: false,
      status: "already_checked_in",
      message:
        "Guest has already checked in",
      guest,
    };
  }

  const checkedInAt =
    new Date().toISOString();

  const { data, error } = await supabase
    .from("guests")
    .update({
      status: "checked_in",
      checked_in_at: checkedInAt,
    })
    .eq("id", guest.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    success: true,
    status: "checked_in",
    message:
      "Guest checked in successfully",
    guest: data as Guest,
  };
}

export async function checkInGuest(
  qrToken: string
): Promise<CheckInResult> {
  const guest =
    await getGuestByQrToken(qrToken);

  if (!guest) {
    return {
      success: false,
      status: "invalid",
      message: "Invalid QR Code",
      guest: null,
    };
  }

  return completeGuestCheckIn(guest);
}

export async function checkInGuestByEventPassId(
  eventPassId: string
): Promise<CheckInResult> {
  const guest =
    await getGuestByEventPassId(
      eventPassId
    );

  if (!guest) {
    return {
      success: false,
      status: "invalid",
      message:
        "Invalid Event Pass ID",
      guest: null,
    };
  }

  return completeGuestCheckIn(guest);
}

export async function deleteGuest(
  id: number
) {
  const { error } = await supabase
    .from("guests")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}