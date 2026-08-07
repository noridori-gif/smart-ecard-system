import type { EventLanguage, InvitationTemplate, PhotoLayout } from "@/services/eventService";
import type { PublicInvitation } from "@/services/invitationService";

export type SampleInvitationInput = {
  template: InvitationTemplate;
  photoLayout?: PhotoLayout;
  language: EventLanguage;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  eventTitle?: string;
  eventType?: string;
  brideName?: string;
  groomName?: string;
  invitationMessage?: string;
  ceremonyTitle?: string;
  ceremonyDate?: string;
  ceremonyTime?: string;
  ceremonyVenue?: string;
  eventDate?: string;
  eventTime?: string;
  venue?: string;
  dressCode?: string;
  coverImageUrl?: string | null;
};

const SAMPLE_COPY = {
  sw: {
    eventTitle: "Harusi ya Amina na Rajabu",
    eventType: "Harusi",
    brideName: "Amina",
    groomName: "Rajabu",
    invitationMessage: "Pamoja na familia zetu, tunayo furaha kukualika kushiriki nasi katika siku yetu maalumu.",
    ceremonyTitle: "Ibada ya Ndoa",
    ceremonyVenue: "Kanisa la Mtakatifu Yosefu, Dar es Salaam",
    venue: "Diamond Jubilee Hall, Dar es Salaam",
    dressCode: "Rangi za Dhahabu na Kijani Iva",
    guestName: "Familia ya Mgeni",
  },
  en: {
    eventTitle: "Amina & Rajabu's Wedding",
    eventType: "Wedding",
    brideName: "Amina",
    groomName: "Rajabu",
    invitationMessage: "Together with our families, we joyfully invite you to celebrate our special day with us.",
    ceremonyTitle: "Wedding Ceremony",
    ceremonyVenue: "St. Joseph's Cathedral, Dar es Salaam",
    venue: "Diamond Jubilee Hall, Dar es Salaam",
    dressCode: "Gold & Emerald Green",
    guestName: "Honored Guest",
  },
} satisfies Record<EventLanguage, Record<string, string>>;

const SAMPLE_CEREMONY_DATE = "2026-09-12";
const SAMPLE_CEREMONY_TIME = "10:00:00";
const SAMPLE_EVENT_DATE = "2026-09-12";
const SAMPLE_EVENT_TIME = "16:00:00";

export function buildSampleInvitation(input: SampleInvitationInput): PublicInvitation {
  const copy = SAMPLE_COPY[input.language] ?? SAMPLE_COPY.sw;

  return {
    invitation_id: 0,
    invitation_token: "preview",
    invitation_status: "sent",
    rsvp_status: "pending",
    guest_id: 0,
    guest_name: copy.guestName,
    allowed_guests: 2,
    category: null,
    qr_token: "SEP-PREVIEW",
    event_pass_id: "SEP-PREVIEW",
    event_id: 0,
    event_title: input.eventTitle?.trim() || copy.eventTitle,
    event_type: input.eventType?.trim() || copy.eventType,
    bride_name: input.brideName?.trim() || copy.brideName,
    groom_name: input.groomName?.trim() || copy.groomName,
    language: input.language,
    invitation_template: input.template,
    photo_layout: input.photoLayout ?? "top_banner",
    ceremony_title: input.ceremonyTitle?.trim() || copy.ceremonyTitle,
    ceremony_date: input.ceremonyDate?.trim() || SAMPLE_CEREMONY_DATE,
    ceremony_time: input.ceremonyTime?.trim() || SAMPLE_CEREMONY_TIME,
    ceremony_venue: input.ceremonyVenue?.trim() || copy.ceremonyVenue,
    ceremony_map_url: null,
    event_date: input.eventDate?.trim() || SAMPLE_EVENT_DATE,
    event_time: input.eventTime?.trim() || SAMPLE_EVENT_TIME,
    venue: input.venue?.trim() || copy.venue,
    reception_map_url: null,
    dress_code: input.dressCode?.trim() || copy.dressCode,
    cover_image_url: input.coverImageUrl || null,
    theme_primary_color: input.primaryColor,
    theme_secondary_color: input.secondaryColor,
    theme_accent_color: input.accentColor,
    invitation_message: input.invitationMessage?.trim() || copy.invitationMessage,
  };
}

export function deriveHeroTitle(invitation: PublicInvitation): string {
  const eventType = invitation.event_type.trim().toLowerCase();
  const isWedding = eventType === "wedding" || eventType.includes("harusi");
  const isSendOff = eventType.includes("send");

  if (isWedding && invitation.bride_name && invitation.groom_name) {
    return `${invitation.groom_name} & ${invitation.bride_name}`;
  }

  if (isSendOff && invitation.bride_name) {
    return invitation.bride_name;
  }

  return invitation.event_title;
}
