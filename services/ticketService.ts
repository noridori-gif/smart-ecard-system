import { createClient } from "@/lib/supabase/client";

export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketSenderType = "organizer" | "admin";

export type SupportTicket = {
  id: number;
  organizer_id: string;
  subject: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
};

export type SupportTicketMessage = {
  id: number;
  ticket_id: number;
  sender_id: string;
  sender_type: TicketSenderType;
  body: string;
  created_at: string;
};

const TICKET_COLUMNS =
  "id, organizer_id, subject, status, created_at, updated_at";

const MESSAGE_COLUMNS =
  "id, ticket_id, sender_id, sender_type, body, created_at";

function getSupabaseClient() {
  return createClient();
}

export function getStatusLabel(status: TicketStatus) {
  if (status === "in_progress") {
    return "In Progress";
  }

  if (status === "resolved") {
    return "Resolved";
  }

  return "Open";
}

export async function listTickets(): Promise<SupportTicket[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("support_tickets")
    .select(TICKET_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SupportTicket[];
}

export async function getTicket(
  ticketId: number
): Promise<SupportTicket> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("support_tickets")
    .select(TICKET_COLUMNS)
    .eq("id", ticketId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SupportTicket;
}

export async function listTicketMessages(
  ticketId: number
): Promise<SupportTicketMessage[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("support_ticket_messages")
    .select(MESSAGE_COLUMNS)
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SupportTicketMessage[];
}

export async function createTicket(input: {
  subject: string;
  message: string;
}): Promise<SupportTicket> {
  const supabase = getSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Session haijapatikana. Tafadhali login tena.");
  }

  const response = await fetch("/api/support-tickets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      subject: input.subject,
      message: input.message,
    }),
  });

  const result = (await response.json()) as {
    ticket?: SupportTicket;
    error?: string;
  };

  if (!response.ok || !result.ticket) {
    throw new Error(
      result.error ?? "Ticket haikuweza kutengenezwa."
    );
  }

  return result.ticket;
}

export async function postTicketMessage(input: {
  ticketId: number;
  organizerId: string;
  body: string;
}): Promise<SupportTicketMessage> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Session haijapatikana. Tafadhali login tena.");
  }

  const senderType: TicketSenderType =
    user.id === input.organizerId ? "organizer" : "admin";

  const { data, error } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: input.ticketId,
      sender_id: user.id,
      sender_type: senderType,
      body: input.body.trim(),
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SupportTicketMessage;
}

export async function updateTicketStatus(
  ticketId: number,
  status: TicketStatus
): Promise<SupportTicket> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("support_tickets")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .select(TICKET_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SupportTicket;
}
