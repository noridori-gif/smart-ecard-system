import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  authenticatedFinanceClient, bearerToken, checkPortalRateLimit, noStoreHeaders, sameOrigin,
} from "@/lib/financePortalServer";
import {
  getDailyFinancialSummary, previewFinancialReminders, previewPledgeThankYous, sendDailyFinancialSummary,
  sendFinancialReminders, sendPledgeThankYous, type FinancialChannel,
} from "@/services/financialNotificationEngine";

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: noStoreHeaders });
}
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Financial notifications are not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
function requestedChannels(value: unknown): FinancialChannel[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((channel): channel is FinancialChannel => channel === "sms" || channel === "whatsapp"))];
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
 try {
  if (!sameOrigin(request)) return reply({ error: "Request not allowed." }, 403);
  if (!checkPortalRateLimit(request, "financial-reminders", 20)) return reply({ error: "Too many requests. Try again shortly." }, 429);
  const token = bearerToken(request);
  if (!token) return reply({ error: "Not authorized." }, 401);
  const eventId = Number((await context.params).eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) return reply({ error: "Invalid event." }, 400);
  const authClient = authenticatedFinanceClient(token);
  const { data: auth } = await authClient.auth.getUser(token);
  if (!auth.user) return reply({ error: "Not authorized." }, 401);
  const { data: authorized } = await authClient.rpc("can_manage_event_finance", { target_event_id: eventId });
  if (!authorized) return reply({ error: "Not authorized." }, 403);
  const body = await request.json().catch(() => null) as {
    action?: string; channels?: unknown; pledgeId?: unknown; date?: unknown; confirmed?: unknown;
  } | null;
  const channels = requestedChannels(body?.channels);
  const db = serviceClient();
  try {
    if (body?.action === "history") {
      const { data, error } = await authClient.from("pledge_reminders")
        .select("id,pledge_id,channel,reminder_type,created_at,sent_at,delivery_status,retry_count,next_retry_at,error_message,event_pledges(full_name)")
        .eq("event_id", eventId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return reply({ reminders: data ?? [] });
    }
    const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date : new Date().toISOString().slice(0, 10);
    if (body?.action === "daily_preview") return reply(await getDailyFinancialSummary(authClient, eventId, date));
    if (body?.action === "daily_send") {
      if (body.confirmed !== true || channels.length === 0) return reply({ error: "Explicit confirmation and a channel are required." }, 400);
      return reply(await sendDailyFinancialSummary(db, { eventId, date, requestedChannels: channels, requireEnabled: false }));
    }
    if (body?.action === "thank_you_preview") {
      if (channels.length === 0) return reply({ error: "Choose at least one channel." }, 400);
      const pledgeId = body?.pledgeId == null ? undefined : Number(body.pledgeId);
      if (pledgeId !== undefined && (!Number.isInteger(pledgeId) || pledgeId <= 0)) return reply({ error: "Invalid pledge." }, 400);
      return reply(await previewPledgeThankYous(authClient, { eventId, requestedChannels: channels, pledgeId }));
    }
    if (body?.action === "thank_you_send") {
      if (body.confirmed !== true || channels.length === 0) return reply({ error: "Explicit confirmation and a channel are required." }, 400);
      const pledgeId = body?.pledgeId == null ? undefined : Number(body.pledgeId);
      if (pledgeId !== undefined && (!Number.isInteger(pledgeId) || pledgeId <= 0)) return reply({ error: "Invalid pledge." }, 400);
      const preview = await previewPledgeThankYous(db, { eventId, requestedChannels: channels, pledgeId });
      return reply(await sendPledgeThankYous(db, preview, { type: "authenticated_user", userId: auth.user.id }));
    }
    if (channels.length === 0) return reply({ error: "Choose at least one channel." }, 400);
    const pledgeId = body?.pledgeId == null ? undefined : Number(body.pledgeId);
    if (pledgeId !== undefined && (!Number.isInteger(pledgeId) || pledgeId <= 0)) return reply({ error: "Invalid pledge." }, 400);
    const preview = await previewFinancialReminders(authClient, { eventId, requestedChannels: channels, pledgeId });
    if (body?.action === "preview") return reply(preview);
    if (body?.action === "send") {
      if (body.confirmed !== true) return reply({ error: "Explicit confirmation is required." }, 400);
      const freshPreview = await previewFinancialReminders(db, { eventId, requestedChannels: channels, pledgeId });
      return reply(await sendFinancialReminders(db, freshPreview, { type: "authenticated_user", userId: auth.user.id }));
    }
    return reply({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error("Financial reminder action failed:", error);
    return reply({ success: false, error: error instanceof Error ? error.message : "The financial notification request could not be completed." }, 500);
  }
 } catch (error) {
  console.error("Financial reminder request failed:", error);
  return reply({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
 }
}
