import { supabase } from "@/lib/supabase";

export type NewGuest = {
  event_id: number;
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

export async function createGuest(guest: NewGuest) {
  const { error } = await supabase
    .from("guests")
    .insert(guest);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getGuestsByEvent(eventId: number) {
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

export async function getGuestById(guestId: number) {
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

export async function deleteGuest(id: number) {
  const { error } = await supabase
    .from("guests")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}