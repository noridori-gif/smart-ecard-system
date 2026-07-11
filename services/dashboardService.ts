import { supabase } from "@/lib/supabase";

export type DashboardStats = {
  totalEvents: number;
  totalGuests: number;
  checkedIn: number;
  pending: number;
  viewed: number;
  accepted: number;
  maybe: number;
  declined: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    eventsResult,
    guestsResult,
    checkedInResult,
    pendingResult,
    viewedResult,
    acceptedResult,
    maybeResult,
    declinedResult,
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("guests")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("status", "checked_in"),

    supabase
      .from("guests")
      .select("*", { count: "exact", head: true })
      .neq("status", "checked_in"),

    supabase
      .from("invitations")
      .select("*", { count: "exact", head: true })
      .eq("invitation_status", "viewed"),

    supabase
      .from("invitations")
      .select("*", { count: "exact", head: true })
      .eq("rsvp_status", "accepted"),

    supabase
      .from("invitations")
      .select("*", { count: "exact", head: true })
      .eq("rsvp_status", "maybe"),

    supabase
      .from("invitations")
      .select("*", { count: "exact", head: true })
      .eq("rsvp_status", "declined"),
  ]);

  return {
    totalEvents: eventsResult.count ?? 0,
    totalGuests: guestsResult.count ?? 0,
    checkedIn: checkedInResult.count ?? 0,
    pending: pendingResult.count ?? 0,
    viewed: viewedResult.count ?? 0,
    accepted: acceptedResult.count ?? 0,
    maybe: maybeResult.count ?? 0,
    declined: declinedResult.count ?? 0,
  };
}