import { supabase } from "@/lib/supabase";

export type DashboardEvent = {
  id: number;
  title: string;
  event_type: string;
  event_date: string;
  event_time: string;
  venue: string;
};

export type EventDashboardStats = {
  totalGuests: number;
  totalInvitations: number;

  checkedIn: number;
  pendingCheckIn: number;

  viewed: number;
  notViewed: number;

  accepted: number;
  maybe: number;
  declined: number;
  noResponse: number;

  invitationRate: number;
  viewRate: number;
  acceptanceRate: number;
  attendanceRate: number;
};

type GuestStatusRecord = {
  status: string | null;
};

type InvitationStatusRecord = {
  invitation_status: string | null;
  rsvp_status: string | null;
  viewed_at: string | null;
};

const emptyStats: EventDashboardStats = {
  totalGuests: 0,
  totalInvitations: 0,

  checkedIn: 0,
  pendingCheckIn: 0,

  viewed: 0,
  notViewed: 0,

  accepted: 0,
  maybe: 0,
  declined: 0,
  noResponse: 0,

  invitationRate: 0,
  viewRate: 0,
  acceptanceRate: 0,
  attendanceRate: 0,
};

function calculatePercentage(
  value: number,
  total: number
) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export async function getDashboardEvents(): Promise<
  DashboardEvent[]
> {
  const { data, error } = await supabase
    .from("events")
    .select(`
      id,
      title,
      event_type,
      event_date,
      event_time,
      venue
    `)
    .order("event_date", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DashboardEvent[];
}

export async function getEventDashboardStats(
  eventId: number
): Promise<EventDashboardStats> {
  if (!Number.isInteger(eventId)) {
    throw new Error(
      "Event iliyochaguliwa si sahihi."
    );
  }

  const [guestsResult, invitationsResult] =
    await Promise.all([
      supabase
        .from("guests")
        .select("status")
        .eq("event_id", eventId),

      supabase
        .from("invitations")
        .select(`
          invitation_status,
          rsvp_status,
          viewed_at
        `)
        .eq("event_id", eventId),
    ]);

  if (guestsResult.error) {
    throw new Error(
      guestsResult.error.message
    );
  }

  if (invitationsResult.error) {
    throw new Error(
      invitationsResult.error.message
    );
  }

  const guests =
    (guestsResult.data ??
      []) as GuestStatusRecord[];

  const invitations =
    (invitationsResult.data ??
      []) as InvitationStatusRecord[];

  const totalGuests = guests.length;
  const totalInvitations = invitations.length;

  const checkedIn = guests.filter(
    (guest) =>
      guest.status === "checked_in"
  ).length;

  const pendingCheckIn = Math.max(
    totalGuests - checkedIn,
    0
  );

  const viewed = invitations.filter(
    (invitation) =>
      invitation.invitation_status ===
        "viewed" ||
      Boolean(invitation.viewed_at)
  ).length;

  const notViewed = Math.max(
    totalInvitations - viewed,
    0
  );

  const accepted = invitations.filter(
    (invitation) =>
      invitation.rsvp_status ===
      "accepted"
  ).length;

  const maybe = invitations.filter(
    (invitation) =>
      invitation.rsvp_status === "maybe"
  ).length;

  const declined = invitations.filter(
    (invitation) =>
      invitation.rsvp_status ===
      "declined"
  ).length;

  const noResponse = invitations.filter(
    (invitation) =>
      !invitation.rsvp_status ||
      invitation.rsvp_status ===
        "pending"
  ).length;

  return {
    totalGuests,
    totalInvitations,

    checkedIn,
    pendingCheckIn,

    viewed,
    notViewed,

    accepted,
    maybe,
    declined,
    noResponse,

    invitationRate: calculatePercentage(
      totalInvitations,
      totalGuests
    ),

    viewRate: calculatePercentage(
      viewed,
      totalInvitations
    ),

    acceptanceRate: calculatePercentage(
      accepted,
      totalInvitations
    ),

    attendanceRate: calculatePercentage(
      checkedIn,
      totalGuests
    ),
  };
}

export function getEmptyEventDashboardStats() {
  return {
    ...emptyStats,
  };
}