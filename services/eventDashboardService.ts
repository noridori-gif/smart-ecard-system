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

export type ActivityType =
  | "check_in"
  | "invitation_viewed"
  | "rsvp_accepted"
  | "rsvp_maybe"
  | "rsvp_declined";

export type DashboardActivity = {
  id: string;
  type: ActivityType;
  guestName: string;
  description: string;
  occurredAt: string;
};

type GuestStatusRecord = {
  status: string | null;
};

type InvitationStatusRecord = {
  invitation_status: string | null;
  rsvp_status: string | null;
  viewed_at: string | null;
};

type ActivityGuestRecord = {
  id: number;
  full_name: string | null;
  status: string | null;
  checked_in_at: string | null;
};

type InvitationGuestRelation =
  | {
      full_name: string | null;
    }
  | {
      full_name: string | null;
    }[]
  | null;

type ActivityInvitationRecord = {
  id: number;
  invitation_status: string | null;
  rsvp_status: string | null;
  viewed_at: string | null;
  created_at: string | null;
  guests: InvitationGuestRelation;
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

function getInvitationGuestName(
  guests: InvitationGuestRelation
) {
  if (!guests) {
    return "Unknown Guest";
  }

  if (Array.isArray(guests)) {
    return (
      guests[0]?.full_name?.trim() ||
      "Unknown Guest"
    );
  }

  return (
    guests.full_name?.trim() ||
    "Unknown Guest"
  );
}

function getRSVPDescription(
  status: string
) {
  if (status === "accepted") {
    return "amekubali kuhudhuria event";
  }

  if (status === "maybe") {
    return "amejibu kuwa huenda atahudhuria";
  }

  if (status === "declined") {
    return "amekataa kuhudhuria event";
  }

  return "amewasilisha jibu la RSVP";
}

function getRSVPActivityType(
  status: string
): ActivityType | null {
  if (status === "accepted") {
    return "rsvp_accepted";
  }

  if (status === "maybe") {
    return "rsvp_maybe";
  }

  if (status === "declined") {
    return "rsvp_declined";
  }

  return null;
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
    .is("archived_at", null)
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

export async function getRecentEventActivities(
  eventId: number,
  limit = 10
): Promise<DashboardActivity[]> {
  if (!Number.isInteger(eventId)) {
    throw new Error(
      "Event iliyochaguliwa si sahihi."
    );
  }

  const safeLimit = Math.min(
    Math.max(Math.floor(limit), 1),
    30
  );

  const [guestsResult, invitationsResult] =
    await Promise.all([
      supabase
        .from("guests")
        .select(`
          id,
          full_name,
          status,
          checked_in_at
        `)
        .eq("event_id", eventId)
        .eq("status", "checked_in")
        .not("checked_in_at", "is", null)
        .order("checked_in_at", {
          ascending: false,
        })
        .limit(safeLimit),

      supabase
        .from("invitations")
        .select(`
          id,
          invitation_status,
          rsvp_status,
          viewed_at,
          created_at,
          guests (
            full_name
          )
        `)
        .eq("event_id", eventId)
        .order("viewed_at", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(safeLimit),
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
      []) as ActivityGuestRecord[];

  const invitations =
    (invitationsResult.data ??
      []) as ActivityInvitationRecord[];

  const activities: DashboardActivity[] = [];

  guests.forEach((guest) => {
    if (!guest.checked_in_at) {
      return;
    }

    activities.push({
      id: `check-in-${guest.id}`,
      type: "check_in",
      guestName:
        guest.full_name?.trim() ||
        "Unknown Guest",
      description:
        "amefanya check-in kwenye event",
      occurredAt: guest.checked_in_at,
    });
  });

  invitations.forEach((invitation) => {
    const guestName =
      getInvitationGuestName(
        invitation.guests
      );

    if (
      invitation.viewed_at &&
      (invitation.invitation_status ===
        "viewed" ||
        Boolean(invitation.viewed_at))
    ) {
      activities.push({
        id: `viewed-${invitation.id}`,
        type: "invitation_viewed",
        guestName,
        description:
          "amefungua invitation",
        occurredAt: invitation.viewed_at,
      });
    }

    const rsvpStatus =
      invitation.rsvp_status;

    if (
      rsvpStatus &&
      rsvpStatus !== "pending"
    ) {
      const activityType =
        getRSVPActivityType(rsvpStatus);

      if (activityType) {
        activities.push({
          id: `rsvp-${invitation.id}`,
          type: activityType,
          guestName,
          description:
            getRSVPDescription(rsvpStatus),
          occurredAt:
            invitation.viewed_at ??
            invitation.created_at ??
            new Date(0).toISOString(),
        });
      }
    }
  });

  return activities
    .filter(
      (activity) =>
        Boolean(activity.occurredAt) &&
        !Number.isNaN(
          new Date(
            activity.occurredAt
          ).getTime()
        )
    )
    .sort(
      (firstActivity, secondActivity) =>
        new Date(
          secondActivity.occurredAt
        ).getTime() -
        new Date(
          firstActivity.occurredAt
        ).getTime()
    )
    .slice(0, safeLimit);
}

export function getEmptyEventDashboardStats() {
  return {
    ...emptyStats,
  };
}
