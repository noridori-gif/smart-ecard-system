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

export type InvitationEventDetails = {
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

  theme_primary_color: string;
  theme_secondary_color: string;
  theme_accent_color: string;
};

export type InvitationGuestDetails = {
  full_name: string;
  phone: string | null;
  email: string | null;
  event_pass_id: string | null;
  allowed_guests: number;
};

export type InvitationWithDetails =
  Invitation & {
    language: EventLanguage;
    event_pass_id: string | null;
    allowed_guests: number;

    events:
      | InvitationEventDetails
      | null;

    guests:
      | InvitationGuestDetails
      | null;
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

  theme_primary_color: string;
  theme_secondary_color: string;
  theme_accent_color: string;
};

type RawInvitationWithDetails =
  Invitation & {
    events:
      | InvitationEventDetails
      | InvitationEventDetails[]
      | null;

    guests:
      | InvitationGuestDetails
      | InvitationGuestDetails[]
      | null;
  };

const DEFAULT_PRIMARY_COLOR =
  "#BE123C";

const DEFAULT_SECONDARY_COLOR =
  "#FFF1F2";

const DEFAULT_ACCENT_COLOR =
  "#D4AF37";

function getSingleRelation<T>(
  relation: T | T[] | null
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function normalizeEventDetails(
  event:
    | InvitationEventDetails
    | null
): InvitationEventDetails | null {
  if (!event) {
    return null;
  }

  return {
    ...event,

    theme_primary_color:
      event.theme_primary_color ||
      DEFAULT_PRIMARY_COLOR,

    theme_secondary_color:
      event.theme_secondary_color ||
      DEFAULT_SECONDARY_COLOR,

    theme_accent_color:
      event.theme_accent_color ||
      DEFAULT_ACCENT_COLOR,
  };
}

function normalizePublicInvitation(
  invitation: PublicInvitation
): PublicInvitation {
  return {
    ...invitation,

    language:
      invitation.language === "en"
        ? "en"
        : "sw",

    theme_primary_color:
      invitation.theme_primary_color ||
      DEFAULT_PRIMARY_COLOR,

    theme_secondary_color:
      invitation.theme_secondary_color ||
      DEFAULT_SECONDARY_COLOR,

    theme_accent_color:
      invitation.theme_accent_color ||
      DEFAULT_ACCENT_COLOR,
  };
}

export async function createInvitation(
  eventId: number,
  guestId: number
): Promise<Invitation> {
  const { data, error } =
    await supabase
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
  const normalizedToken =
    token.trim();

  if (!normalizedToken) {
    return null;
  }

  const { data, error } =
    await supabase.rpc(
      "get_public_invitation",
      {
        token_input:
          normalizedToken,
      }
    );

  if (error) {
    throw new Error(error.message);
  }

  if (
    !data ||
    data.length === 0
  ) {
    return null;
  }

  return normalizePublicInvitation(
    data[0] as PublicInvitation
  );
}

export async function getInvitationsByEvent(
  eventId: number
): Promise<Invitation[]> {
  const { data, error } =
    await supabase
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
  const { data, error } =
    await supabase
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
          cover_image_url,

          theme_primary_color,
          theme_secondary_color,
          theme_accent_color
        ),
        guests (
          full_name,
          phone,
          email,
          event_pass_id,
          allowed_guests
        )
      `)
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    throw new Error(error.message);
  }

  const rawInvitations =
    (data ??
      []) as unknown as RawInvitationWithDetails[];

  return rawInvitations.map(
    (invitation) => {
      const rawEventDetails =
        getSingleRelation(
          invitation.events
        );

      const eventDetails =
        normalizeEventDetails(
          rawEventDetails
        );

      const guestDetails =
        getSingleRelation(
          invitation.guests
        );

      return {
        id: invitation.id,
        event_id:
          invitation.event_id,
        guest_id:
          invitation.guest_id,

        invitation_token:
          invitation.invitation_token,

        invitation_status:
          invitation.invitation_status,

        rsvp_status:
          invitation.rsvp_status,

        viewed_at:
          invitation.viewed_at,

        created_at:
          invitation.created_at,

        language:
          eventDetails?.language ??
          "sw",

        event_pass_id:
          guestDetails?.event_pass_id ??
          null,

        allowed_guests:
          guestDetails?.allowed_guests ??
          1,

        events: eventDetails,
        guests: guestDetails,
      };
    }
  );
}