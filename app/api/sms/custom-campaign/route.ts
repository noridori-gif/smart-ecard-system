import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  listCampaigns,
  listDeliveries,
  previewCustomSmsCampaign,
  saveCampaign,
  sendCustomSmsCampaign,
} from "@/services/customSmsCampaignService";

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
  if (!url || !key) throw new Error("SMS outreach is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function eventId(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function guestIds(value: unknown) {
  return Array.isArray(value) ? [...new Set(value.map(Number).filter((item) => Number.isInteger(item) && item > 0))] : [];
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) return reply({ error: "Not authorized." }, 401);

    const db = serviceClient();
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: "Your session has expired. Please sign in again." }, 401);

    const { data: profile, error: profileError } = await db.from("profiles").select("role,is_active").eq("id", auth.user.id).maybeSingle();
    if (profileError) return reply({ error: profileError.message }, 500);
    if (!profile || profile.role !== "admin" || !profile.is_active) {
      return reply({ error: "Only admins can use SMS outreach." }, 403);
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = body?.action;

    if (action === "listCampaigns") {
      const id = eventId(body?.eventId);
      if (!id) return reply({ error: "Invalid event." }, 400);
      return reply({ campaigns: await listCampaigns(db, id) });
    }

    if (action === "listDeliveries") {
      const id = eventId(body?.eventId);
      if (!id) return reply({ error: "Invalid event." }, 400);
      return reply({ deliveries: await listDeliveries(db, id) });
    }

    if (action === "saveCampaign") {
      const id = eventId(body?.eventId);
      const name = text(body?.name, 160);
      const messageTemplate = text(body?.messageTemplate, 2000);
      const campaignId = Number(body?.campaignId);
      if (!id) return reply({ error: "Invalid event." }, 400);
      if (!name) return reply({ error: "Campaign name is required." }, 400);
      if (!messageTemplate) return reply({ error: "Message template is required." }, 400);
      const campaign = await saveCampaign(db, {
        eventId: id,
        name,
        messageTemplate,
        campaignId: Number.isInteger(campaignId) && campaignId > 0 ? campaignId : undefined,
        createdBy: auth.user.id,
      });
      return reply({ campaign });
    }

    if (action === "preview") {
      const campaignId = Number(body?.campaignId);
      if (!Number.isInteger(campaignId) || campaignId <= 0) return reply({ error: "Choose a campaign." }, 400);
      const ids = guestIds(body?.guestIds);
      if (!ids.length) return reply({ error: "Choose at least one recipient." }, 400);
      return reply(await previewCustomSmsCampaign(db, { campaignId, guestIds: ids }));
    }

    if (action === "send") {
      const campaignId = Number(body?.campaignId);
      if (!Number.isInteger(campaignId) || campaignId <= 0) return reply({ error: "Choose a campaign." }, 400);
      const ids = guestIds(body?.guestIds);
      if (!ids.length) return reply({ error: "Choose at least one recipient." }, 400);
      if (body?.confirmed !== true) return reply({ error: "Explicit confirmation is required." }, 400);
      return reply(await sendCustomSmsCampaign(db, { campaignId, guestIds: ids }));
    }

    return reply({ error: "Unsupported action." }, 400);
  } catch (cause) {
    console.error("Custom SMS campaign request failed:", cause);
    return reply({ error: cause instanceof Error ? cause.message : "SMS outreach request failed." }, 500);
  }
}
