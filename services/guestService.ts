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
  status: string;
  checked_in_at: string | null;
  created_at: string;
};

export async function createGuest(
  guest: NewGuest
): Promise<Guest> {
  const { data, error } = await supabase
    .from("guests")
    .insert(guest)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const createdGuest = data as Guest;

  await createInvitation(
    createdGuest.event_id,
    createdGuest.id
  );

  return createdGuest;
}

export async function getGuestsByEvent(
  eventId: number
): Promise<Guest[]> {
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", eventId)
    .order("full_name", { ascending: true });

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
      full_name: guest.full_name,
      phone: guest.phone || null,
      email: guest.email || null,
      category: guest.category || "Normal",
      allowed_guests: guest.allowed_guests ?? 1,
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
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Guest | null;
}

export async function checkInGuest(
  qrToken: string
) {
  const guest = await getGuestByQrToken(qrToken);

  if (!guest) {
    return {
      success: false,
      status: "invalid",
      message: "Invalid QR Code",
      guest: null,
    };
  }

  if (guest.status === "checked_in") {
    return {
      success: false,
      status: "already_checked_in",
      message: "Guest has already checked in",
      guest,
    };
  }

  const checkedInAt = new Date().toISOString();

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
    message: "Guest checked in successfully",
    guest: data as Guest,
  };
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