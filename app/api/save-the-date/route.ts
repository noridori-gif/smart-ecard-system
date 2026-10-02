import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSaveTheDateCard } from "@/lib/saveTheDateCardImage";
import {
  normalizeMode,
  normalizeVariant,
  previewSaveTheDate,
  sendSaveTheDate,
  setSaveTheDateVariant,
} from "@/services/saveTheDateService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Save the Date is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

function idList(value: unknown) {
  return Array.isArray(value) ? [...new Set(value.map(Number).filter((item) => Number.isInteger(item) && item > 0))] : [];
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token) return reply({ error: "Not authorized." }, 401);

    const db = serviceClient();
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: "Your session has expired. Please sign in again." }, 401);

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const eventId = Number(body?.eventId);
    if (!Number.isInteger(eventId) || eventId <= 0) return reply({ error: "Invalid event." }, 400);

    // Admins for any event; organizers only for events they own (same rule as the Contributions
    // pages, can_manage_event_finance).
    const [{ data: profile }, { data: event }] = await Promise.all([
      db.from("profiles").select("role,is_active").eq("id", auth.user.id).maybeSingle(),
      db.from("events").select("id,organizer_id,title,bride_name,groom_name,event_date,venue,language,cover_image_url,save_the_date_variant").eq("id", eventId).maybeSingle(),
    ]);
    if (!event) return reply({ error: "Event not found." }, 404);
    const isAdmin = profile?.role === "admin" || profile?.role === "administrator";
    const isOwner = profile?.role === "organizer" && event.organizer_id === auth.user.id;
    if (!profile?.is_active || (!isAdmin && !isOwner)) return reply({ error: "Only the event's admin or organizer can use Save the Date." }, 403);

    const action = body?.action;

    const siteOrigin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");

    if (action === "preview") return reply(await previewSaveTheDate(db, eventId, siteOrigin));

    if (action === "set_variant") {
      await setSaveTheDateVariant(db, eventId, normalizeVariant(body?.variant));
      return reply({ ok: true });
    }

    if (action === "card_preview") {
      // Renders the card for the organizer without creating any delivery.
      const guestName = typeof body?.guestName === "string" && body.guestName.trim() ? body.guestName.trim().slice(0, 120) : "Mr & Mrs Mgeni";
      return await createSaveTheDateCard({
        variant: normalizeVariant(body?.variant ?? event.save_the_date_variant),
        language: event.language === "en" ? "en" : "sw",
        guestName,
        groomName: event.groom_name,
        brideName: event.bride_name,
        eventTitle: event.title,
        eventDateIso: event.event_date,
        venue: event.venue,
        coverImageUrl: event.cover_image_url,
      });
    }

    if (action === "send") {
      const pledgeIds = idList(body?.pledgeIds);
      if (!pledgeIds.length) return reply({ error: "Chagua angalau mchangiaji mmoja." }, 400);
      if (body?.confirmed !== true) return reply({ error: "Explicit confirmation is required." }, 400);
      // mode: whatsapp | sms | both. smsFallback only applies to whatsapp and is opt-in from the tab.
      return reply(await sendSaveTheDate(db, { eventId, pledgeIds, siteOrigin, mode: normalizeMode(body?.mode), smsFallback: body?.smsFallback === true }, { userId: auth.user.id }));
    }

    return reply({ error: "Unsupported action." }, 400);
  } catch (cause) {
    console.error("Save the Date request failed:", cause);
    return reply({ error: cause instanceof Error ? cause.message : "Save the Date request failed." }, 500);
  }
}
