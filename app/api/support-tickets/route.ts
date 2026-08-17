import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  authenticatedFinanceClient,
  bearerToken,
  checkPortalRateLimit,
  noStoreHeaders,
  sameOrigin,
} from "@/lib/financePortalServer";
import { sendBeemSms } from "@/services/beemSmsService";

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: noStoreHeaders });
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Support ticket notifications are not configured.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function notifyAdminsBySms(subject: string) {
  try {
    const db = serviceClient();

    const { data: admins } = await db
      .from("profiles")
      .select("login_phone")
      .eq("role", "admin")
      .eq("is_active", true)
      .not("login_phone", "is", null);

    const phoneNumbers = (admins ?? [])
      .map((admin) => admin.login_phone)
      .filter((phone): phone is string => Boolean(phone));

    if (phoneNumbers.length === 0) {
      return false;
    }

    const smsText = `New support ticket opened: "${subject}". Open the dashboard to reply.`;

    const results = await Promise.all(
      phoneNumbers.map((phoneNumber) =>
        sendBeemSms({ phoneNumber, message: smsText })
      )
    );

    return results.some((result) => result.success);
  } catch (error) {
    console.error("Support ticket admin SMS notification failed:", error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return reply({ error: "Request not allowed." }, 403);
    }

    if (!checkPortalRateLimit(request, "support-tickets-create", 10)) {
      return reply({ error: "Too many requests. Try again shortly." }, 429);
    }

    const token = bearerToken(request);

    if (!token) {
      return reply({ error: "Not authorized." }, 401);
    }

    const authClient = authenticatedFinanceClient(token);
    const { data: auth } = await authClient.auth.getUser(token);

    if (!auth.user) {
      return reply({ error: "Not authorized." }, 401);
    }

    const body = (await request.json().catch(() => null)) as {
      subject?: unknown;
      message?: unknown;
    } | null;

    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!subject || subject.length > 200) {
      return reply({ error: "Subject is required (max 200 characters)." }, 400);
    }

    if (!message) {
      return reply({ error: "Message is required." }, 400);
    }

    const { data: ticket, error: ticketError } = await authClient
      .from("support_tickets")
      .insert({ organizer_id: auth.user.id, subject })
      .select("id, organizer_id, subject, status, created_at, updated_at")
      .single();

    if (ticketError || !ticket) {
      return reply(
        { error: ticketError?.message ?? "Ticket could not be created." },
        400
      );
    }

    const { error: messageError } = await authClient
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: auth.user.id,
        sender_type: "organizer",
        body: message,
      });

    if (messageError) {
      return reply({ error: messageError.message }, 400);
    }

    const adminNotified = await notifyAdminsBySms(subject);

    return reply({ ticket, adminNotified });
  } catch (error) {
    console.error("Support ticket creation failed:", error);

    return reply(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
}
