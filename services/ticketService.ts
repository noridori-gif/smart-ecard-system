import { createClient } from "@/lib/supabase/client";

export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketSenderType = "organizer" | "admin";

export type SupportTicket = {
  id: number;
  organizer_id: string;
  organizer_name: string;
  subject: string;
  status: TicketStatus;
  event_id: number | null;
  event_title: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportTicketMessage = {
  id: number;
  ticket_id: number;
  sender_id: string;
  sender_name: string;
  sender_type: TicketSenderType;
  body: string;
  created_at: string;
};

export type OrganizerEventOption = {
  id: number;
  title: string;
};

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

  const { data, error } = await supabase.rpc("list_support_tickets");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SupportTicket[];
}

export async function getTicket(
  ticketId: number
): Promise<SupportTicket> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc("get_support_ticket", {
    target_ticket_id: ticketId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const ticket = ((data ?? []) as SupportTicket[])[0];

  if (!ticket) {
    throw new Error("Ticket haipatikani.");
  }

  return ticket;
}

export async function listTicketMessages(
  ticketId: number
): Promise<SupportTicketMessage[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc(
    "list_support_ticket_messages",
    { target_ticket_id: ticketId }
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SupportTicketMessage[];
}

export async function listMyEvents(): Promise<
  OrganizerEventOption[]
> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("events")
    .select("id, title")
    .eq("organizer_id", user.id)
    .is("archived_at", null)
    .order("event_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrganizerEventOption[];
}

export async function createTicket(input: {
  subject: string;
  message: string;
  eventId?: number | null;
}): Promise<{ id: number }> {
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
      event_id: input.eventId ?? null,
    }),
  });

  const result = (await response.json()) as {
    ticket?: { id: number };
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
}): Promise<void> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Session haijapatikana. Tafadhali login tena.");
  }

  const senderType: TicketSenderType =
    user.id === input.organizerId ? "organizer" : "admin";

  const { error } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: input.ticketId,
      sender_id: user.id,
      sender_type: senderType,
      body: input.body.trim(),
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateTicketStatus(
  ticketId: number,
  status: TicketStatus
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("support_tickets")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    throw new Error(error.message);
  }
}
