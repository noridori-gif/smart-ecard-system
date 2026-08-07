import {
  supabase,
} from "@/lib/supabase";

export type EventLanguage =
  | "sw"
  | "en";

export type InvitationTemplate =
  | "royal_portrait"
  | "golden_elegance"
  | "botanical_romance"
  | "modern_minimal_photo"
  | "heritage_pattern";

export const DEFAULT_INVITATION_TEMPLATE: InvitationTemplate =
  "royal_portrait";

export type PhotoLayout =
  | "top_banner"
  | "side_by_side"
  | "text_only";

export const DEFAULT_PHOTO_LAYOUT: PhotoLayout =
  "top_banner";

export const DEFAULT_EVENT_THEME = {
  primaryColor: "#BE123C",
  secondaryColor: "#FFF1F2",
  accentColor: "#D4AF37",
};

export type Event = {
  id: number;
  organizer_id: string | null;
  title: string;
  event_type: string;

  bride_name?:
    | string
    | null;

  groom_name?:
    | string
    | null;

  language: EventLanguage;
  invitation_template: InvitationTemplate;
  photo_layout: PhotoLayout;

  ceremony_title?:
    | string
    | null;

  ceremony_date?:
    | string
    | null;

  ceremony_time?:
    | string
    | null;

  ceremony_venue?:
    | string
    | null;

  ceremony_map_url?:
    | string
    | null;

  event_date: string;
  event_time: string;
  venue: string;

  reception_map_url?:
    | string
    | null;

  dress_code?:
    | string
    | null;

  cover_image_url?:
    | string
    | null;

  invitation_message?:
    | string
    | null;

  theme_primary_color: string;
  theme_secondary_color: string;
  theme_accent_color: string;

  created_at?: string;
  archived_at?: string | null;
};

export type NewEvent = {
  title: string;
  event_type: string;

  bride_name?: string;
  groom_name?: string;

  language?: EventLanguage;
  invitation_template?: InvitationTemplate;
  photo_layout?: PhotoLayout;

  ceremony_title?: string;
  ceremony_date?: string;
  ceremony_time?: string;
  ceremony_venue?: string;
  ceremony_map_url?: string;

  event_date: string;
  event_time: string;
  venue: string;

  reception_map_url?: string;

  dress_code?: string;

  cover_image_url?:
    | string
    | null;

  invitation_message?: string;

  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_accent_color?: string;
};

export type UpdateEvent = {
  title: string;
  event_type: string;

  bride_name?: string;
  groom_name?: string;

  language: EventLanguage;
  invitation_template?: InvitationTemplate;
  photo_layout?: PhotoLayout;

  ceremony_title?: string;
  ceremony_date?: string;
  ceremony_time?: string;
  ceremony_venue?: string;
  ceremony_map_url?: string;

  event_date: string;
  event_time: string;
  venue: string;

  reception_map_url?: string;

  dress_code?: string;

  cover_image_url?:
    | string
    | null;

  invitation_message?: string;

  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_accent_color?: string;
};

const HEX_COLOR_PATTERN =
  /^#[0-9A-Fa-f]{6}$/;

const MAX_INVITATION_MESSAGE_LENGTH =
  600;

const INVITATION_TEMPLATES: InvitationTemplate[] = [
  "royal_portrait",
  "golden_elegance",
  "botanical_romance",
  "modern_minimal_photo",
  "heritage_pattern",
];

function normalizeInvitationTemplate(
  template: InvitationTemplate | undefined
): InvitationTemplate {
  if (!template) {
    return DEFAULT_INVITATION_TEMPLATE;
  }

  if (!INVITATION_TEMPLATES.includes(template)) {
    throw new Error(
      "Invitation template iliyochaguliwa si sahihi."
    );
  }

  return template;
}

const PHOTO_LAYOUTS: PhotoLayout[] = [
  "top_banner",
  "side_by_side",
  "text_only",
];

function normalizePhotoLayout(
  layout: PhotoLayout | undefined
): PhotoLayout {
  if (!layout) {
    return DEFAULT_PHOTO_LAYOUT;
  }

  if (!PHOTO_LAYOUTS.includes(layout)) {
    throw new Error(
      "Muonekano wa picha uliochaguliwa si sahihi."
    );
  }

  return layout;
}

function normalizeHexColor(
  color: string | undefined,
  fallbackColor: string
) {
  const normalizedColor =
    color
      ?.trim()
      .toUpperCase();

  if (
    !normalizedColor ||
    !HEX_COLOR_PATTERN.test(
      normalizedColor
    )
  ) {
    return fallbackColor;
  }

  return normalizedColor;
}

function normalizeOptionalText(
  value:
    | string
    | undefined
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue || null;
}

function normalizeInvitationMessage(
  message:
    | string
    | undefined
) {
  const normalizedMessage =
    message?.trim();

  if (!normalizedMessage) {
    return null;
  }

  if (
    normalizedMessage.length >
    MAX_INVITATION_MESSAGE_LENGTH
  ) {
    throw new Error(
      `Ujumbe wa mwaliko usizidi characters ${MAX_INVITATION_MESSAGE_LENGTH}.`
    );
  }

  return normalizedMessage;
}

function getEventThemeColors(
  event: {
    theme_primary_color?:
      string;

    theme_secondary_color?:
      string;

    theme_accent_color?:
      string;
  }
) {
  return {
    theme_primary_color:
      normalizeHexColor(
        event.theme_primary_color,
        DEFAULT_EVENT_THEME.primaryColor
      ),

    theme_secondary_color:
      normalizeHexColor(
        event.theme_secondary_color,
        DEFAULT_EVENT_THEME.secondaryColor
      ),

    theme_accent_color:
      normalizeHexColor(
        event.theme_accent_color,
        DEFAULT_EVENT_THEME.accentColor
      ),
  };
}

function validateRequiredEventFields(
  event: {
    title: string;
    event_type: string;
    event_date: string;
    event_time: string;
    venue: string;
  }
) {
  if (!event.title.trim()) {
    throw new Error(
      "Event title inahitajika."
    );
  }

  if (
    !event.event_type.trim()
  ) {
    throw new Error(
      "Event type inahitajika."
    );
  }

  if (!event.event_date) {
    throw new Error(
      "Event date inahitajika."
    );
  }

  if (!event.event_time) {
    throw new Error(
      "Event time inahitajika."
    );
  }

  if (!event.venue.trim()) {
    throw new Error(
      "Event venue inahitajika."
    );
  }
}

export async function uploadEventCover(
  imageFile: File
): Promise<string> {
  if (
    !imageFile.type.startsWith(
      "image/"
    )
  ) {
    throw new Error(
      "File lililochaguliwa si picha."
    );
  }

  const fileExtension =
    imageFile.name
      .split(".")
      .pop()
      ?.toLowerCase() ??
    "jpg";

  const fileName =
    `${crypto.randomUUID()}.` +
    fileExtension;

  const filePath =
    `covers/${fileName}`;

  const {
    error: uploadError,
  } = await supabase.storage
    .from("event-covers")
    .upload(
      filePath,
      imageFile,
      {
        cacheControl:
          "3600",

        upsert: false,

        contentType:
          imageFile.type,
      }
    );

  if (uploadError) {
    throw new Error(
      `Picha haikuweza kupakiwa: ${uploadError.message}`
    );
  }

  const {
    data,
  } = supabase.storage
    .from("event-covers")
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error(
      "Public URL ya picha haikuweza kupatikana."
    );
  }

  return data.publicUrl;
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(
      `Imeshindikana kuthibitisha mtumiaji: ${error.message}`
    );
  }

  if (!user) {
    throw new Error(
      "Hujaingia kwenye akaunti. Tafadhali ingia tena."
    );
  }

  return user.id;
}

export async function createEvent(
  event: NewEvent
): Promise<Event> {
  validateRequiredEventFields(
    event
  );

  const organizerId =
    await getAuthenticatedUserId();

  const themeColors =
    getEventThemeColors(
      event
    );

  const invitationMessage =
    normalizeInvitationMessage(
      event.invitation_message
    );

  const {
    data,
    error,
  } = await supabase
    .from("events")
    .insert({
      organizer_id:
        organizerId,

      title:
        event.title.trim(),

      event_type:
        event.event_type.trim(),

      bride_name:
        normalizeOptionalText(
          event.bride_name
        ),

      groom_name:
        normalizeOptionalText(
          event.groom_name
        ),

      language:
        event.language ??
        "sw",

      invitation_template:
        normalizeInvitationTemplate(
          event.invitation_template
        ),

      photo_layout:
        normalizePhotoLayout(
          event.photo_layout
        ),

      ceremony_title:
        normalizeOptionalText(
          event.ceremony_title
        ) ??
        (
          event.language ===
          "en"
            ? "Wedding Ceremony"
            : "Ibada ya Ndoa"
        ),

      ceremony_date:
        event.ceremony_date ||
        null,

      ceremony_time:
        event.ceremony_time ||
        null,

      ceremony_venue:
        normalizeOptionalText(
          event.ceremony_venue
        ),

      ceremony_map_url:
        normalizeOptionalText(
          event.ceremony_map_url
        ),

      event_date:
        event.event_date,

      event_time:
        event.event_time,

      venue:
        event.venue.trim(),

      reception_map_url:
        normalizeOptionalText(
          event.reception_map_url
        ),

      dress_code:
        normalizeOptionalText(
          event.dress_code
        ),

      cover_image_url:
        event.cover_image_url ??
        null,

      invitation_message:
        invitationMessage,

      ...themeColors,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as Event;
}

export async function getEvents(archived = false): Promise<
  Event[]
> {
  let query = supabase
    .from("events")
    .select("*");

  query = archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  const {
    data,
    error,
  } = await query
    .order(
      "event_date",
      {
        ascending: true,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data ?? []
  ) as Event[];
}

export async function getEventById(
  id: number
): Promise<Event | null> {
  if (!Number.isInteger(id)) {
    throw new Error(
      "Event ID si sahihi."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("events")
    .select("*")
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as
    | Event
    | null;
}

export async function updateEvent(
  id: number,
  event: UpdateEvent
): Promise<Event> {
  if (!Number.isInteger(id)) {
    throw new Error(
      "Event ID si sahihi."
    );
  }

  validateRequiredEventFields(
    event
  );

  const themeUpdates: {
    theme_primary_color?:
      string;

    theme_secondary_color?:
      string;

    theme_accent_color?:
      string;
  } = {};

  if (
    event.theme_primary_color
  ) {
    themeUpdates.theme_primary_color =
      normalizeHexColor(
        event.theme_primary_color,
        DEFAULT_EVENT_THEME.primaryColor
      );
  }

  if (
    event.theme_secondary_color
  ) {
    themeUpdates.theme_secondary_color =
      normalizeHexColor(
        event.theme_secondary_color,
        DEFAULT_EVENT_THEME.secondaryColor
      );
  }

  if (
    event.theme_accent_color
  ) {
    themeUpdates.theme_accent_color =
      normalizeHexColor(
        event.theme_accent_color,
        DEFAULT_EVENT_THEME.accentColor
      );
  }

  const invitationMessage =
    normalizeInvitationMessage(
      event.invitation_message
    );

  const templateUpdates: {
    invitation_template?: InvitationTemplate;
  } = {};

  if (event.invitation_template) {
    templateUpdates.invitation_template =
      normalizeInvitationTemplate(
        event.invitation_template
      );
  }

  const layoutUpdates: {
    photo_layout?: PhotoLayout;
  } = {};

  if (event.photo_layout) {
    layoutUpdates.photo_layout =
      normalizePhotoLayout(
        event.photo_layout
      );
  }

  const {
    data,
    error,
  } = await supabase
    .from("events")
    .update({
      title:
        event.title.trim(),

      event_type:
        event.event_type.trim(),

      bride_name:
        normalizeOptionalText(
          event.bride_name
        ),

      groom_name:
        normalizeOptionalText(
          event.groom_name
        ),

      language:
        event.language,

      ...templateUpdates,
      ...layoutUpdates,

      ceremony_title:
        normalizeOptionalText(
          event.ceremony_title
        ) ??
        (
          event.language ===
          "en"
            ? "Wedding Ceremony"
            : "Ibada ya Ndoa"
        ),

      ceremony_date:
        event.ceremony_date ||
        null,

      ceremony_time:
        event.ceremony_time ||
        null,

      ceremony_venue:
        normalizeOptionalText(
          event.ceremony_venue
        ),

      ceremony_map_url:
        normalizeOptionalText(
          event.ceremony_map_url
        ),

      event_date:
        event.event_date,

      event_time:
        event.event_time,

      venue:
        event.venue.trim(),

      reception_map_url:
        normalizeOptionalText(
          event.reception_map_url
        ),

      dress_code:
        normalizeOptionalText(
          event.dress_code
        ),

      cover_image_url:
        event.cover_image_url ??
        null,

      invitation_message:
        invitationMessage,

      ...themeUpdates,
    })
    .eq(
      "id",
      id
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as Event;
}

export type EventDeletionPreview = {
  eventId: number; eventTitle: string; guests: number; invitations: number; pledges: number;
  validPayments: number; voidedPayments: number; receipts: number; committeeLinks: number;
  reminderHistory: number; automationDeliveries: number; wishes: number; guestImportHistory: number;
  financeTargets: number; whatsappMessageLogs: number; financeAuditLogs: number;
  financeAutomationSettings: number;
};

async function eventLifecycleRequest(id: number, body: Record<string, unknown>) {
  if (!Number.isInteger(id)) throw new Error("Event ID si sahihi.");
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Your session has expired.");
  const response = await fetch(`/api/events/${id}/lifecycle`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "The event action could not be completed.");
  return payload;
}

export async function archiveEvent(id: number) {
  return eventLifecycleRequest(id, { action: "archive" });
}

export async function restoreEvent(id: number) {
  return eventLifecycleRequest(id, { action: "restore" });
}

export async function previewPermanentEventDeletion(id: number): Promise<EventDeletionPreview> {
  return eventLifecycleRequest(id, { action: "preview_delete" }) as Promise<EventDeletionPreview>;
}

export async function deleteEventPermanently(id: number, eventTitle: string) {
  return eventLifecycleRequest(id, { action: "delete", eventTitle, secondConfirmation: true });
}
