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

export type InvitationWithDetails = Invitation & {
  events: {
    title: string;
  } | null;
  guests: {
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

export type PublicInvitation = {
  invitation_id: number;
  invitation_token: string;
  invitation_status: string;
  rsvp_status: string;

  guest_id: number;
  guest_name: string;
  allowed_guests: number;
  category: string | null;
  qr_token: string;

  event_id: number;
  event_title: string;
  event_type: string;
  bride_name: string | null;
  groom_name: string | null;
  event_date: string;
  event_time: string;
  venue: string;
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
): Promise<PublicInvitation | null> {
  const { data, error } = await supabase.rpc(
    "get_public_invitation",
    {
      token_input: token,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as PublicInvitation;
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

export async function getAllInvitations(): Promise<
  InvitationWithDetails[]
> {
  const { data, error } = await supabase
    .from("invitations")
    .select(`
      *,
      events (
        title
      ),
      guests (
        full_name,
        phone,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as InvitationWithDetails[];
}