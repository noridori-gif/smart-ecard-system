import { supabase } from "@/lib/supabase";

/**
 * "sent" covers queued/sent/delivered/read (WhatsApp) or queued/sent (SMS) --
 * anything that reached the provider successfully at least once. "failed"
 * means the most recent attempt was rejected. "not_sent" means no send was
 * ever attempted for that channel. Collapsing WhatsApp's queued/delivered/
 * read distinctions here is deliberate: that finer detail already has its
 * own page (WhatsApp Logs); this is just "has this guest gotten it".
 */
export type MessageChannelState = "not_sent" | "sent" | "failed";

export type MessageChannelStatus = {
  state: MessageChannelState;
  at: string | null;
};

export type GuestMessageStatus = {
  whatsapp: MessageChannelStatus;
  sms: MessageChannelStatus;
};

export type MessageFilter = "all" | "not_whatsapp" | "not_sms" | "not_either";

/** Shared by both guest-list pages so the filter semantics can't drift between them. "Not sent" for filtering purposes includes "failed" -- a failed send still means the guest hasn't actually received it, which is exactly who the organizer wants this filter to surface. */
export function matchesMessageFilter(
  status: GuestMessageStatus | undefined,
  filter: MessageFilter
) {
  if (filter === "all") {
    return true;
  }

  const whatsappSent = status?.whatsapp.state === "sent";
  const smsSent = status?.sms.state === "sent";

  if (filter === "not_whatsapp") {
    return !whatsappSent;
  }

  if (filter === "not_sms") {
    return !smsSent;
  }

  return !whatsappSent && !smsSent;
}

const NOT_SENT: MessageChannelStatus = { state: "not_sent", at: null };

type LogRow = {
  invitation_id: number;
  status: string;
  sent_at: string | null;
  created_at: string;
};

function toChannelState(status: string): MessageChannelState {
  return status === "failed" ? "failed" : "sent";
}

/** Picks the most recent row per invitation_id (a guest can be resent, each attempt is its own row) and reduces it to a single channel status. */
function latestPerInvitation(rows: LogRow[]): Map<number, MessageChannelStatus> {
  const latestByInvitation = new Map<number, LogRow>();

  for (const row of rows) {
    const existing = latestByInvitation.get(row.invitation_id);

    if (!existing || row.created_at > existing.created_at) {
      latestByInvitation.set(row.invitation_id, row);
    }
  }

  const result = new Map<number, MessageChannelStatus>();

  for (const [invitationId, row] of latestByInvitation) {
    result.set(invitationId, {
      state: toChannelState(row.status),
      at: row.sent_at ?? row.created_at,
    });
  }

  return result;
}

/**
 * Looks up the latest WhatsApp/SMS send status per guest, for however many
 * guest ids are passed in (one event's guest list, or all guests loaded on
 * the cross-event page). Guests are matched to logs via their invitation
 * (guests has no invitation_id column directly -- invitations has guest_id).
 */
export async function getGuestMessageStatusMap(
  guestIds: number[]
): Promise<Map<number, GuestMessageStatus>> {
  const result = new Map<number, GuestMessageStatus>();

  if (guestIds.length === 0) {
    return result;
  }

  const { data: invitationRows, error: invitationError } = await supabase
    .from("invitations")
    .select("id, guest_id")
    .in("guest_id", guestIds);

  if (invitationError) {
    throw new Error(invitationError.message);
  }

  const invitationToGuest = new Map<number, number>();
  const invitationIds: number[] = [];

  for (const row of (invitationRows ?? []) as { id: number; guest_id: number }[]) {
    invitationToGuest.set(row.id, row.guest_id);
    invitationIds.push(row.id);
  }

  if (invitationIds.length === 0) {
    return result;
  }

  const [whatsappResult, smsResult] = await Promise.all([
    supabase
      .from("whatsapp_message_logs")
      .select("invitation_id, status, sent_at, created_at")
      .in("invitation_id", invitationIds),

    supabase
      .from("sms_message_logs")
      .select("invitation_id, status, sent_at, created_at")
      .in("invitation_id", invitationIds),
  ]);

  if (whatsappResult.error) {
    throw new Error(whatsappResult.error.message);
  }

  // sms_message_logs is new -- if this deployment's database hasn't had the
  // migration applied yet, treat every SMS status as "not_sent" instead of
  // breaking the guest list.
  const smsRows = smsResult.error ? [] : ((smsResult.data ?? []) as LogRow[]);

  const latestWhatsapp = latestPerInvitation((whatsappResult.data ?? []) as LogRow[]);
  const latestSms = latestPerInvitation(smsRows);

  for (const [invitationId, guestId] of invitationToGuest) {
    result.set(guestId, {
      whatsapp: latestWhatsapp.get(invitationId) ?? NOT_SENT,
      sms: latestSms.get(invitationId) ?? NOT_SENT,
    });
  }

  return result;
}
