import { supabase } from "@/lib/supabase";

export type EventLanguage = "sw" | "en";

export type Invitation = {
  id: number;
  event_id: number;
  guest_id: number;
  invitation_token: string;
  invitation_status: string;
  rsvp_status: string;
  viewed_at?: string | null;
  created_at: string;
};

export type InvitationWithDetails = Invitation & {
  events: {
    title: string;
    event_type: string;

    language: EventLanguage;

    ceremony_title: string | null;
    ceremony_date: string | null;
    ceremony_time: string | null;
    ceremony_venue: string | null;
    ceremony_map_url: string | null;

    event_date: string;
    event_time: string;
    venue: string;
    reception_map_url: string | null;

    dress_code: string | null;
    cover_image_url: string | null;
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
  event_pass_id: string | null;

  event_id: number;
  event_title: string;
  event_type: string;

  bride_name: string | null;
  groom_name: string | null;

  language: EventLanguage;

  ceremony_title: string | null;
  ceremony_date: string | null;
  ceremony_time: string | null;
  ceremony_venue: string | null;
  ceremony_map_url: string | null;

  event_date: string;
  event_time: string;
  venue: string;
  reception_map_url: string | null;

  dress_code: string | null;
  cover_image_url: string | null;
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
    .order("created_at", {
      ascending: false,
    });

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
        title,
        event_type,
        language,

        ceremony_title,
        ceremony_date,
        ceremony_time,
        ceremony_venue,
        ceremony_map_url,

        event_date,
        event_time,
        venue,
        reception_map_url,

        dress_code,
        cover_image_url
      ),
      guests (
        full_name,
        phone,
        email
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as InvitationWithDetails[];
}