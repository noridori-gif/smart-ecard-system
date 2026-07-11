import { supabase } from "@/lib/supabase";

export type Event = {
  id: number;
  title: string;
  event_type: string;
  bride_name?: string | null;
  groom_name?: string | null;
  event_date: string;
  event_time: string;
  venue: string;
  cover_image_url?: string | null;
  created_at?: string;
};

export type NewEvent = {
  title: string;
  event_type: string;
  bride_name?: string;
  groom_name?: string;
  event_date: string;
  event_time: string;
  venue: string;
  cover_image_url?: string | null;
};

export type UpdateEvent = {
  title: string;
  event_type: string;
  bride_name?: string;
  groom_name?: string;
  event_date: string;
  event_time: string;
  venue: string;
  cover_image_url?: string | null;
};

export async function uploadEventCover(
  imageFile: File
): Promise<string> {
  const fileExtension =
    imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";

  const fileName = `${crypto.randomUUID()}.${fileExtension}`;
  const filePath = `covers/${fileName}`;

  const { error: uploadError } = await supabase.storage
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
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: event.title,
      event_type: event.event_type,
      bride_name: event.bride_name || null,
      groom_name: event.groom_name || null,
      event_date: event.event_date,
      event_time: event.event_time,
      venue: event.venue,
      cover_image_url: event.cover_image_url ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Event;
}

export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Event[];
}

export async function getEventById(
  id: number
): Promise<Event | null> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from("events")
    .update({
      title: event.title,
      event_type: event.event_type,
      bride_name: event.bride_name || null,
      groom_name: event.groom_name || null,
      event_date: event.event_date,
      event_time: event.event_time,
      venue: event.venue,
      cover_image_url: event.cover_image_url ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Event;
}

export async function deleteEvent(id: number) {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}