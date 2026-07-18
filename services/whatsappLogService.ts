import {
  supabase,
} from "@/lib/supabase";

export type WhatsAppMessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type WhatsAppMessageLog = {
  id: number;
  invitation_id: number | null;
  recipient_phone: string;
  message_id: string | null;
  status: WhatsAppMessageStatus;
  error_message: string | null;
  error_code: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;

  guest_name: string;
  event_title: string;
};

type GuestRelation = {
  full_name: string;
};

type EventRelation = {
  title: string;
};

type InvitationRelation = {
  guests:
    | GuestRelation
    | GuestRelation[]
    | null;

  events:
    | EventRelation
    | EventRelation[]
    | null;
};

type RawWhatsAppMessageLog = {
  id: number;
  invitation_id: number | null;
  recipient_phone: string;
  message_id: string | null;
  status: WhatsAppMessageStatus;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;

  invitations:
    | InvitationRelation
    | InvitationRelation[]
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

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export async function getWhatsAppMessageLogs(): Promise<
  WhatsAppMessageLog[]
> {
  const {
    data,
    error,
  } = await supabase
    .from(
      "whatsapp_message_logs"
    )
    .select(`
      id,
      invitation_id,
      recipient_phone,
      message_id,
      status,
      error_message,
      sent_at,
      delivered_at,
      read_at,
      created_at,
      updated_at,

      invitations (
        guests (
          full_name
        ),

        events (
          title
        )
      )
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .limit(200);

  if (error) {
    throw new Error(
      error.message
    );
  }

  const rawLogs =
    (data ?? []) as unknown as
      RawWhatsAppMessageLog[];

  return rawLogs.map(
    (log) => {
      const invitation =
        getSingleRelation(
          log.invitations
        );

      const guest =
        getSingleRelation(
          invitation?.guests ??
            null
        );

      const event =
        getSingleRelation(
          invitation?.events ??
            null
        );

      return {
        id: log.id,

        invitation_id:
          log.invitation_id,

        recipient_phone:
          log.recipient_phone,

        message_id:
          log.message_id,

        status:
          log.status,

        error_message:
          log.error_message,

        error_code:
          log.error_message
            ?.match(
              /(?:Meta error|Error code)\s+(\d+)/i
            )?.[1] ?? null,

        sent_at:
          log.sent_at,

        delivered_at:
          log.delivered_at,

        read_at:
          log.read_at,

        created_at:
          log.created_at,

        updated_at:
          log.updated_at,

        guest_name:
          guest?.full_name ??
          "Unknown Guest",

        event_title:
          event?.title ??
          "Unknown Event",
      };
    }
  );
}
