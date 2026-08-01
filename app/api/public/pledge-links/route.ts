import { authenticatedFinanceClient, bearerToken, noStoreHeaders, sameOrigin } from "@/lib/financePortalServer";
import { generatePublicPledgeToken, hashPublicPledgeValue } from "@/lib/publicPledge";

async function clientFor(request: Request) {
  const token = bearerToken(request); if (!token) return null;
  const client = authenticatedFinanceClient(token); const { data } = await client.auth.getUser(token);
  return data.user ? client : null;
}

export async function GET(request: Request) {
  const client = await clientFor(request); if (!client) return Response.json({ error: "Not authorized." }, { status: 401, headers: noStoreHeaders });
  const eventId = Number(new URL(request.url).searchParams.get("eventId"));
  if (!Number.isInteger(eventId) || eventId < 1) return Response.json({ error: "Invalid event." }, { status: 400, headers: noStoreHeaders });
  const { data, error } = await client.from("public_pledge_links").select("id,event_id,title,message,default_language,expires_at,is_active,created_at,last_used_at,submission_count").eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Pledge links could not be loaded." }, { status: 403, headers: noStoreHeaders });
  return Response.json({ links: data ?? [] }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origin not allowed." }, { status: 403, headers: noStoreHeaders });
  const client = await clientFor(request); if (!client) return Response.json({ error: "Not authorized." }, { status: 401, headers: noStoreHeaders });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const eventId = Number(body?.eventId), language = body?.language === "en" ? "en" : "sw";
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 500) : "";
  const expiresAt = typeof body?.expiresAt === "string" && body.expiresAt ? body.expiresAt : null;
  if (!Number.isInteger(eventId) || eventId < 1 || (expiresAt && (Number.isNaN(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()))) return Response.json({ error: "Invalid link settings." }, { status: 400, headers: noStoreHeaders });
  const rawToken = generatePublicPledgeToken();
  const { data, error } = await client.rpc("create_public_pledge_link", { target_event_id: eventId, supplied_token_hash: hashPublicPledgeValue(rawToken), link_title: title, link_message: message, link_language: language, link_expires_at: expiresAt });
  if (error) return Response.json({ error: "The pledge link could not be created." }, { status: 403, headers: noStoreHeaders });
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  return Response.json({ link: data, rawUrl: `${origin}/support/${rawToken}` }, { status: 201, headers: noStoreHeaders });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origin not allowed." }, { status: 403, headers: noStoreHeaders });
  const client = await clientFor(request); if (!client) return Response.json({ error: "Not authorized." }, { status: 401, headers: noStoreHeaders });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; const linkId = Number(body?.linkId);
  if (!Number.isInteger(linkId) || linkId < 1) return Response.json({ error: "Invalid link." }, { status: 400, headers: noStoreHeaders });
  const { data, error } = await client.rpc("update_public_pledge_link", { target_link_id: linkId, link_active: body?.active === true, link_expires_at: typeof body?.expiresAt === "string" && body.expiresAt ? body.expiresAt : null, link_title: typeof body?.title === "string" ? body.title.slice(0,120) : "", link_message: typeof body?.message === "string" ? body.message.slice(0,500) : "", link_language: body?.language === "en" ? "en" : "sw" });
  if (error) return Response.json({ error: "The pledge link could not be updated." }, { status: 403, headers: noStoreHeaders });
  return Response.json({ link: data }, { headers: noStoreHeaders });
}

