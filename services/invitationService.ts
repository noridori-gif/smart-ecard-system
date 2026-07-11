import { supabase } from "@/lib/supabase";

export type Invitation = {
  id: number;
  event_id: number;
  guest_id: number;
  invitation_token: string;
  invitation_status: string;
  rsvp_status: string;
  created_at: string;
};

export async function createInvitation(
  eventId: number,
  guestId: number
): Promise<Invitation> {
  const { data, error } = await supabase
    .from("invitations")
    .insert({
      event_id: eventId,
      guest_id: guestId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Invitation;
}

export async function getInvitationByToken(
  token: string
): Promise<Invitation | null> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("invitation_token", token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Invitation | null;
}

export async function getInvitationsByEvent(
  eventId: number
): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Invitation[];
}