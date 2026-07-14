import { supabase } from "@/lib/supabase";

export type EventLanguage = "sw" | "en";

export const DEFAULT_EVENT_THEME = {
  primaryColor: "#BE123C",
  secondaryColor: "#FFF1F2",
  accentColor: "#D4AF37",
};

export type Event = {
  id: number;
  title: string;
  event_type: string;

  bride_name?: string | null;
  groom_name?: string | null;

  language: EventLanguage;

  ceremony_title?: string | null;
  ceremony_date?: string | null;
  ceremony_time?: string | null;
  ceremony_venue?: string | null;
  ceremony_map_url?: string | null;

  event_date: string;
  event_time: string;
  venue: string;
  reception_map_url?: string | null;

  dress_code?: string | null;
  cover_image_url?: string | null;

  theme_primary_color: string;
  theme_secondary_color: string;
  theme_accent_color: string;

  created_at?: string;
};

export type NewEvent = {
  title: string;
  event_type: string;

  bride_name?: string;
  groom_name?: string;

  language?: EventLanguage;

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
  cover_image_url?: string | null;

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
  cover_image_url?: string | null;

  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_accent_color?: string;
};

const HEX_COLOR_PATTERN =
  /^#[0-9A-Fa-f]{6}$/;

function normalizeHexColor(
  color: string | undefined,
  fallbackColor: string
) {
  const normalizedColor =
    color?.trim().toUpperCase();

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

function getEventThemeColors(event: {
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_accent_color?: string;
}) {
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

export async function uploadEventCover(
  imageFile: File
): Promise<string> {
  const fileExtension =
    imageFile.name
      .split(".")
      .pop()
      ?.toLowerCase() ?? "jpg";

  const fileName =
    `${crypto.randomUUID()}.${fileExtension}`;

  const filePath =
    `covers/${fileName}`;

  const { error: uploadError } =
    await supabase.storage
      .from("event-covers")
      .upload(filePath, imageFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: imageFile.type,
      });

  if (uploadError) {
    throw new Error(
      `Picha haikuweza kupakiwa: ${uploadError.message}`
    );
  }

  const { data } = supabase.storage
    .from("event-covers")
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error(
      "Public URL ya picha haikuweza kupatikana."
    );
  }

  return data.publicUrl;
}

export async function createEvent(
  event: NewEvent
): Promise<Event> {
  const themeColors =
    getEventThemeColors(event);

  const { data, error } =
    await supabase
      .from("events")
      .insert({
        title: event.title.trim(),
        event_type:
          event.event_type.trim(),

        bride_name:
          event.bride_name?.trim() ||
          null,

        groom_name:
          event.groom_name?.trim() ||
          null,

        language:
          event.language ?? "sw",

        ceremony_title:
          event.ceremony_title?.trim() ||
          "Ibada ya Ndoa",

        ceremony_date:
          event.ceremony_date || null,

        ceremony_time:
          event.ceremony_time || null,

        ceremony_venue:
          event.ceremony_venue?.trim() ||
          null,

        ceremony_map_url:
          event.ceremony_map_url?.trim() ||
          null,

        event_date:
          event.event_date,

        event_time:
          event.event_time,

        venue:
          event.venue.trim(),

        reception_map_url:
          event.reception_map_url?.trim() ||
          null,

        dress_code:
          event.dress_code?.trim() ||
          null,

        cover_image_url:
          event.cover_image_url ?? null,

        ...themeColors,
      })
      .select()
      .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Event;
}

export async function getEvents(): Promise<
  Event[]
> {
  const { data, error } =
    await supabase
      .from("events")
      .select("*")
      .order("event_date", {
        ascending: true,
      });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Event[];
}

export async function getEventById(
  id: number
): Promise<Event | null> {
  const { data, error } =
    await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Event | null;
}

export async function updateEvent(
  id: number,
  event: UpdateEvent
): Promise<Event> {
  const themeUpdates: {
    theme_primary_color?: string;
    theme_secondary_color?: string;
    theme_accent_color?: string;
  } = {};

  if (event.theme_primary_color) {
    themeUpdates.theme_primary_color =
      normalizeHexColor(
        event.theme_primary_color,
        DEFAULT_EVENT_THEME.primaryColor
      );
  }

  if (event.theme_secondary_color) {
    themeUpdates.theme_secondary_color =
      normalizeHexColor(
        event.theme_secondary_color,
        DEFAULT_EVENT_THEME.secondaryColor
      );
  }

  if (event.theme_accent_color) {
    themeUpdates.theme_accent_color =
      normalizeHexColor(
        event.theme_accent_color,
        DEFAULT_EVENT_THEME.accentColor
      );
  }

  const { data, error } =
    await supabase
      .from("events")
      .update({
        title: event.title.trim(),
        event_type:
          event.event_type.trim(),

        bride_name:
          event.bride_name?.trim() ||
          null,

        groom_name:
          event.groom_name?.trim() ||
          null,

        language: event.language,

        ceremony_title:
          event.ceremony_title?.trim() ||
          "Ibada ya Ndoa",

        ceremony_date:
          event.ceremony_date || null,

        ceremony_time:
          event.ceremony_time || null,

        ceremony_venue:
          event.ceremony_venue?.trim() ||
          null,

        ceremony_map_url:
          event.ceremony_map_url?.trim() ||
          null,

        event_date:
          event.event_date,

        event_time:
          event.event_time,

        venue:
          event.venue.trim(),

        reception_map_url:
          event.reception_map_url?.trim() ||
          null,

        dress_code:
          event.dress_code?.trim() ||
          null,

        cover_image_url:
          event.cover_image_url ?? null,

        ...themeUpdates,
      })
      .eq("id", id)
      .select()
      .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Event;
}

export async function deleteEvent(
  id: number
) {
  const { error } =
    await supabase
      .from("events")
      .delete()
      .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}