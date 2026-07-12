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

type CountResult = {
  count: number | null;
  error: {
    message: string;
  } | null;
};

function checkCountError(
  result: CountResult,
  description: string
) {
  if (result.error) {
    throw new Error(
      `${description}: ${result.error.message}`
    );
  }
}

/**
 * Inarudisha dashboard statistics.
 *
 * eventId ikiwa number:
 * - Inarudisha statistics za event hiyo pekee.
 *
 * eventId ikiwa null au haijatumwa:
 * - Inarudisha statistics za events zote.
 */
export async function getDashboardStats(
  eventId?: number | null
): Promise<DashboardStats> {
  let totalEventsQuery = supabase
    .from("events")
    .select("*", {
      count: "exact",
      head: true,
    });

  let totalGuestsQuery = supabase
    .from("guests")
    .select("*", {
      count: "exact",
      head: true,
    });

  let checkedInQuery = supabase
    .from("guests")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("status", "checked_in");

  let viewedQuery = supabase
    .from("invitations")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("invitation_status", "viewed");

  let acceptedQuery = supabase
    .from("invitations")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("rsvp_status", "accepted");

  let maybeQuery = supabase
    .from("invitations")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("rsvp_status", "maybe");

  let declinedQuery = supabase
    .from("invitations")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("rsvp_status", "declined");

  /*
   * Event ikichaguliwa, tunaongeza event_id filter
   * kwenye guests na invitations.
   */
  if (eventId !== undefined && eventId !== null) {
    totalEventsQuery = totalEventsQuery.eq("id", eventId);

    totalGuestsQuery = totalGuestsQuery.eq(
      "event_id",
      eventId
    );

    checkedInQuery = checkedInQuery.eq(
      "event_id",
      eventId
    );

    viewedQuery = viewedQuery.eq(
      "event_id",
      eventId
    );

    acceptedQuery = acceptedQuery.eq(
      "event_id",
      eventId
    );

    maybeQuery = maybeQuery.eq(
      "event_id",
      eventId
    );

    declinedQuery = declinedQuery.eq(
      "event_id",
      eventId
    );
  }

  const [
    eventsResult,
    guestsResult,
    checkedInResult,
    viewedResult,
    acceptedResult,
    maybeResult,
    declinedResult,
  ] = await Promise.all([
    totalEventsQuery,
    totalGuestsQuery,
    checkedInQuery,
    viewedQuery,
    acceptedQuery,
    maybeQuery,
    declinedQuery,
  ]);

  checkCountError(
    eventsResult,
    "Total events hazikuweza kupatikana"
  );

  checkCountError(
    guestsResult,
    "Total guests hawakuweza kupatikana"
  );

  checkCountError(
    checkedInResult,
    "Checked-in guests hawakuweza kupatikana"
  );

  checkCountError(
    viewedResult,
    "Viewed invitations hazikuweza kupatikana"
  );

  checkCountError(
    acceptedResult,
    "Accepted RSVP hazikuweza kupatikana"
  );

  checkCountError(
    maybeResult,
    "Maybe RSVP hazikuweza kupatikana"
  );

  checkCountError(
    declinedResult,
    "Declined RSVP hazikuweza kupatikana"
  );

  const totalGuests = guestsResult.count ?? 0;
  const checkedIn = checkedInResult.count ?? 0;

  /*
   * Pending tunahesabu kwa total guests minus checked-in.
   * Hii inasaidia hata kama status ya guest ni null
   * au ina value tofauti na "pending".
   */
  const pending = Math.max(
    totalGuests - checkedIn,
    0
  );

  return {
    totalEvents: eventsResult.count ?? 0,
    totalGuests,
    checkedIn,
    pending,
    viewed: viewedResult.count ?? 0,
    accepted: acceptedResult.count ?? 0,
    maybe: maybeResult.count ?? 0,
    declined: declinedResult.count ?? 0,
  };
}