import {
  supabase,
} from "@/lib/supabase";

export type ReportEvent = {
  id: number;
  title: string;
  event_type: string;
  event_date: string;
  event_time: string;
  venue: string;
};

export type ReportGuest = {
  id: number;
  event_id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  category: string | null;
  allowed_guests: number;
  event_pass_id: string | null;
  status: string;
  checked_in_at: string | null;
  created_at: string;
};

export type ReportInvitation = {
  id: number;
  event_id: number;
  guest_id: number;
  invitation_status: string;
  rsvp_status: string;
  viewed_at: string | null;
  created_at: string;

  guests: {
    full_name: string;
    phone: string | null;
    event_pass_id: string | null;
  } | null;
};

export type ReportWish = {
  id: number;
  event_id: number;
  invitation_id: number;
  guest_id: number;
  guest_name: string;
  message: string;
  created_at: string;
  updated_at: string;
};

export type EventReportSummary = {
  totalGuests: number;
  checkedIn: number;
  pending: number;
  attendancePercentage: number;

  totalInvitations: number;
  viewed: number;
  notViewed: number;

  accepted: number;
  maybe: number;
  declined: number;
  noResponse: number;
};

type RawInvitation = {
  id: number;
  event_id: number;
  guest_id: number;
  invitation_status: string;
  rsvp_status: string;
  viewed_at: string | null;
  created_at: string;

  guests:
    | {
        full_name: string;
        phone: string | null;
        event_pass_id: string | null;
      }
    | {
        full_name: string;
        phone: string | null;
        event_pass_id: string | null;
      }[]
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

export async function getReportEvents(): Promise<
  ReportEvent[]
> {
  const {
    data,
    error,
  } = await supabase
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
  ) as ReportEvent[];
}

export async function getReportGuests(
  eventId: number
): Promise<ReportGuest[]> {
  if (!Number.isInteger(eventId)) {
    throw new Error(
      "Event ID si sahihi."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("guests")
    .select(`
      id,
      event_id,
      full_name,
      phone,
      email,
      category,
      allowed_guests,
      event_pass_id,
      status,
      checked_in_at,
      created_at
    `)
    .eq(
      "event_id",
      eventId
    )
    .order(
      "full_name",
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
  ) as ReportGuest[];
}

export async function getReportInvitations(
  eventId: number
): Promise<ReportInvitation[]> {
  if (!Number.isInteger(eventId)) {
    throw new Error(
      "Event ID si sahihi."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("invitations")
    .select(`
      id,
      event_id,
      guest_id,
      invitation_status,
      rsvp_status,
      viewed_at,
      created_at,

      guests (
        full_name,
        phone,
        event_pass_id
      )
    `)
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

  const rawInvitations =
    (
      data ?? []
    ) as unknown as
      RawInvitation[];

  return rawInvitations.map(
    (invitation) => ({
      id:
        invitation.id,

      event_id:
        invitation.event_id,

      guest_id:
        invitation.guest_id,

      invitation_status:
        invitation
          .invitation_status,

      rsvp_status:
        invitation.rsvp_status,

      viewed_at:
        invitation.viewed_at,

      created_at:
        invitation.created_at,

      guests:
        getSingleRelation(
          invitation.guests
        ),
    })
  );
}

export async function getReportWishes(
  eventId: number
): Promise<ReportWish[]> {
  if (!Number.isInteger(eventId)) {
    throw new Error(
      "Event ID si sahihi."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("event_wishes")
    .select(`
      id,
      event_id,
      invitation_id,
      guest_id,
      guest_name,
      message,
      created_at,
      updated_at
    `)
    .eq(
      "event_id",
      eventId
    )
    .order(
      "updated_at",
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
  ) as ReportWish[];
}

export function calculateEventReportSummary(
  guests: ReportGuest[],
  invitations: ReportInvitation[]
): EventReportSummary {
  const totalGuests =
    guests.length;

  const checkedIn =
    guests.filter(
      (guest) =>
        guest.status ===
        "checked_in"
    ).length;

  const pending =
    Math.max(
      totalGuests -
        checkedIn,
      0
    );

  const attendancePercentage =
    totalGuests > 0
      ? Math.round(
          (
            checkedIn /
            totalGuests
          ) * 100
        )
      : 0;

  const totalInvitations =
    invitations.length;

  const viewed =
    invitations.filter(
      (invitation) =>
        invitation
          .invitation_status ===
          "viewed" ||
        Boolean(
          invitation.viewed_at
        )
    ).length;

  const notViewed =
    Math.max(
      totalInvitations -
        viewed,
      0
    );

  const accepted =
    invitations.filter(
      (invitation) =>
        invitation
          .rsvp_status ===
          "accepted"
    ).length;

  const maybe =
    invitations.filter(
      (invitation) =>
        invitation
          .rsvp_status ===
          "maybe"
    ).length;

  const declined =
    invitations.filter(
      (invitation) =>
        invitation
          .rsvp_status ===
          "declined"
    ).length;

  const noResponse =
    invitations.filter(
      (invitation) =>
        !invitation.rsvp_status ||
        invitation
          .rsvp_status ===
          "pending"
    ).length;

  return {
    totalGuests,
    checkedIn,
    pending,
    attendancePercentage,

    totalInvitations,
    viewed,
    notViewed,

    accepted,
    maybe,
    declined,
    noResponse,
  };
}
