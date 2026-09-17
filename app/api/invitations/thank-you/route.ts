import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  previewGuestThankYou,
  sendGuestThankYou,
} from "@/services/guestThankYouService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Guest thank-you messaging is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

function eventId(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function idList(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.map(Number).filter((item) => Number.isInteger(item) && item > 0))]
    : [];
}

// Same admin/organizer allowance as SMS/WhatsApp invitation sending
// (app/api/sms/send-invitation, app/api/whatsapp/send-invitation) -- this is
// the guest-invitation domain, not the finance/admin-only SMS outreach
// domain, so organizers are allowed here too.
function isAllowedRole(role: string | null | undefined) {
  return role === "admin" || role === "administrator" || role === "organizer";
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) return reply({ error: "Not authorized." }, 401);

    const db = serviceClient();
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: "Your session has expired. Please sign in again." }, 401);

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("role,is_active")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (profileError) return reply({ error: profileError.message }, 500);
    if (!profile || !profile.is_active || !isAllowedRole(profile.role)) {
      return reply({ error: "Only admins or organizers can send guest thank-you messages." }, 403);
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = body?.action;
    const id = eventId(body?.eventId);
    if (!id) return reply({ error: "Invalid event." }, 400);

    if (action === "preview") {
      const guestIds = idList(body?.guestIds);
      return reply(await previewGuestThankYou(db, { eventId: id, guestIds: guestIds.length ? guestIds : undefined }));
    }

    if (action === "send") {
      const guestIds = idList(body?.guestIds);
      if (!guestIds.length) return reply({ error: "Choose at least one guest." }, 400);
      if (body?.confirmed !== true) return reply({ error: "Explicit confirmation is required." }, 400);
      return reply(await sendGuestThankYou(db, { eventId: id, guestIds }, { userId: auth.user.id }));
    }

    return reply({ error: "Unsupported action." }, 400);
  } catch (cause) {
    console.error("Guest thank-you request failed:", cause);
    return reply({ error: cause instanceof Error ? cause.message : "Guest thank-you request failed." }, 500);
  }
}
