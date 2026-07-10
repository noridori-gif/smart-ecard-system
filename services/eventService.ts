import { supabase } from "@/lib/supabase";

export type NewEvent = {
  title: string;
  event_type: string;
  bride_name?: string;
  groom_name?: string;
  event_date: string;
  event_time: string;
  venue: string;
};

export async function createEvent(event: NewEvent) {
  const { error } = await supabase
    .from("events")
    .insert(event);

  if (error) {
    throw new Error(error.message);
  }
}