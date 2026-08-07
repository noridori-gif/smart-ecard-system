import {
  supabase,
} from "@/lib/supabase";

import {
  DEFAULT_INVITATION_TEMPLATE,
  DEFAULT_PHOTO_LAYOUT,
} from "@/services/eventService";

import type {
  InvitationTemplate,
  PhotoLayout,
} from "@/services/eventService";

export type EventLanguage =
  | "sw"
  | "en";

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

  bride_name: string | null;
  groom_name: string | null;

  language: EventLanguage;

  invitation_template:
    InvitationTemplate;

  ceremony_title: string | null;
  ceremony_date: string | null;
  ceremony_time: string | null;
  ceremony_venue: string | null;
  ceremony_map_url: string | null;

  event_date: string;
  event_time: string;
  venue: string;

  reception_map_url:
    | string
    | null;

  dress_code:
    | string
    | null;

  cover_image_url:
    | string
    | null;

  theme_primary_color:
    | string
    | null;

  theme_secondary_color:
    | string
    | null;

  theme_accent_color:
    | string
    | null;

  invitation_message:
    | string
    | null;
};

export type InvitationGuestDetails = {
  full_name: string;
  phone: string | null;
  email: string | null;

  category: string | null;

  event_pass_id:
    | string
    | null;

  allowed_guests: number;
};

export type InvitationWithDetails =
  Invitation & {
    language: EventLanguage;

    invitation_template:
      InvitationTemplate;

    event_pass_id:
      | string
      | null;

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

  event_pass_id:
    | string
    | null;

  event_id: number;
  event_title: string;
  event_type: string;

  bride_name:
    | string
    | null;

  groom_name:
    | string
    | null;

  language: EventLanguage;

  invitation_template:
    InvitationTemplate;

  photo_layout:
    PhotoLayout;

  ceremony_title:
    | string
    | null;

  ceremony_date:
    | string
    | null;

  ceremony_time:
    | string
    | null;

  ceremony_venue:
    | string
    | null;

  ceremony_map_url:
    | string
    | null;

  event_date: string;
  event_time: string;
  venue: string;

  reception_map_url:
    | string
    | null;

  dress_code:
    | string
    | null;

  cover_image_url:
    | string
    | null;

  theme_primary_color:
    | string
    | null;

  theme_secondary_color:
    | string
    | null;

  theme_accent_color:
    | string
    | null;

  invitation_message:
    | string
    | null;
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

function getSingleRelation<T>(
  relation:
    | T
    | T[]
    | null
): T | null {
  if (!relation) {
    return null;
  }

  if (
    Array.isArray(relation)
  ) {
    return relation[0] ?? null;
  }

  return relation;
}

function normalizeLanguage(
  language:
    | string
    | null
    | undefined
): EventLanguage {
  return language === "en"
    ? "en"
    : "sw";
}

function normalizeInvitationTemplate(
  template:
    | string
    | null
    | undefined
): InvitationTemplate {
  if (
    template === "royal_portrait" ||
    template === "golden_elegance" ||
    template === "botanical_romance" ||
    template === "modern_minimal_photo" ||
    template === "heritage_pattern"
  ) {
    return template;
  }

  return DEFAULT_INVITATION_TEMPLATE;
}

function normalizePhotoLayout(
  layout:
    | string
    | null
    | undefined
): PhotoLayout {
  if (
    layout === "top_banner" ||
    layout === "side_by_side" ||
    layout === "text_only"
  ) {
    return layout;
  }

  return DEFAULT_PHOTO_LAYOUT;
}

export async function createInvitation(
  eventId: number,
  guestId: number
): Promise<Invitation> {
  if (
    !Number.isInteger(eventId) ||
    !Number.isInteger(guestId)
  ) {
    throw new Error(
      "Event ID au Guest ID si sahihi."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("invitations")
    .insert({
      event_id: eventId,
      guest_id: guestId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as Invitation;
}

export async function getInvitationByToken(
  token: string
): Promise<
  PublicInvitation | null
> {
  const normalizedToken =
    token.trim();

  if (!normalizedToken) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_public_invitation",
    {
      token_input:
        normalizedToken,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (
    !data ||
    data.length === 0
  ) {
    return null;
  }

  const invitation =
    data[0] as PublicInvitation;

  return {
    ...invitation,

    language:
      normalizeLanguage(
        invitation.language
      ),

    invitation_template:
      normalizeInvitationTemplate(
        invitation
          .invitation_template
      ),

    photo_layout:
      normalizePhotoLayout(
        invitation
          .photo_layout
      ),

    allowed_guests:
      invitation.allowed_guests ??
      1,

    invitation_message:
      invitation
        .invitation_message
        ?.trim() ||
      null,
  };
}

export async function getInvitationsByEvent(
  eventId: number
): Promise<Invitation[]> {
  if (
    !Number.isInteger(eventId)
  ) {
    throw new Error(
      "Event ID si sahihi."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("invitations")
    .select("*")
    .eq(
      "event_id",
      eventId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data ?? []
  ) as Invitation[];
}

export async function getAllInvitations(): Promise<
  InvitationWithDetails[]
> {
  const {
    data,
    error,
  } = await supabase
    .from("invitations")
    .select(`
      *,

      events (
        title,
        event_type,

        bride_name,
        groom_name,

        language,
        invitation_template,

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
        theme_accent_color,

        invitation_message
      ),

      guests (
        full_name,
        phone,
        email,
        category,
        event_pass_id,
        allowed_guests
      )
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const rawInvitations =
    (
      data ?? []
    ) as unknown as
      RawInvitationWithDetails[];

  return rawInvitations.map(
    (invitation) => {
      const eventDetails =
        getSingleRelation(
          invitation.events
        );

      const guestDetails =
        getSingleRelation(
          invitation.guests
        );

      const language =
        normalizeLanguage(
          eventDetails?.language
        );

      const invitationTemplate =
        normalizeInvitationTemplate(
          eventDetails
            ?.invitation_template
        );

      return {
        id:
          invitation.id,

        event_id:
          invitation.event_id,

        guest_id:
          invitation.guest_id,

        invitation_token:
          invitation
            .invitation_token,

        invitation_status:
          invitation
            .invitation_status,

        rsvp_status:
          invitation.rsvp_status,

        viewed_at:
          invitation.viewed_at,

        created_at:
          invitation.created_at,

        language,

        invitation_template:
          invitationTemplate,

        event_pass_id:
          guestDetails
            ?.event_pass_id ??
          null,

        allowed_guests:
          guestDetails
            ?.allowed_guests ??
          1,

        events:
          eventDetails
            ? {
                ...eventDetails,

                language,

                invitation_template:
                  invitationTemplate,

                invitation_message:
                  eventDetails
                    .invitation_message
                    ?.trim() ||
                  null,
              }
            : null,

        guests:
          guestDetails,
      };
    }
  );
}
