import {
  authenticatedFinanceClient, bearerToken, generateOrganiserToken,
  hashOrganiserToken, noStoreHeaders, sameOrigin,
} from "@/lib/financePortalServer";

const permissionNames = [
  "view_pledges", "create_pledges", "edit_contributors", "record_payments",
  "view_payment_history", "send_reminders", "search",
] as const;

async function clientFor(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const client = authenticatedFinanceClient(token);
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : client;
}

export async function GET(request: Request) {
  const client = await clientFor(request);
  if (!client) return Response.json({ error: "Not authorized." }, { status: 401, headers: noStoreHeaders });
  const eventId = Number(new URL(request.url).searchParams.get("eventId"));
  if (!Number.isInteger(eventId) || eventId <= 0) return Response.json({ error: "Invalid event." }, { status: 400, headers: noStoreHeaders });
  const { data, error } = await client.from("event_finance_access_links")
    .select("id,event_id,label,permissions,expires_at,revoked_at,created_at,last_used_at")
    .eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Links could not be loaded." }, { status: 403, headers: noStoreHeaders });
  return Response.json({ links: data ?? [] }, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origin not allowed." }, { status: 403, headers: noStoreHeaders });
  const client = await clientFor(request);
  if (!client) return Response.json({ error: "Not authorized." }, { status: 401, headers: noStoreHeaders });
  const body = await request.json().catch(() => null) as { eventId?: unknown; label?: unknown; permissions?: unknown; expiresAt?: unknown } | null;
  const eventId = Number(body?.eventId); const label = typeof body?.label === "string" ? body.label.slice(0, 100) : "";
  if (!Number.isInteger(eventId) || eventId <= 0 || !body?.permissions || typeof body.permissions !== "object") {
    return Response.json({ error: "Invalid link details." }, { status: 400, headers: noStoreHeaders });
  }
  const requested = body.permissions as Record<string, unknown>;
  const permissions = Object.fromEntries(permissionNames.map((name) => [name, requested[name] === true]));
  const expiresAt = typeof body.expiresAt === "string" && body.expiresAt ? body.expiresAt : null;
  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) return Response.json({ error: "Invalid expiry." }, { status: 400, headers: noStoreHeaders });
  const rawToken = generateOrganiserToken(); const tokenHash = hashOrganiserToken(rawToken);
  const { data, error } = await client.rpc("create_finance_access_link", {
    target_event_id: eventId, supplied_token_hash: tokenHash, link_label: label,
    link_permissions: permissions, link_expires_at: expiresAt,
  });
  if (error) return Response.json({ error: "The access link could not be created." }, { status: 403, headers: noStoreHeaders });
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  return Response.json({ link: data, rawUrl: `${origin}/contributions/manage/${rawToken}` }, { status: 201, headers: noStoreHeaders });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origin not allowed." }, { status: 403, headers: noStoreHeaders });
  const client = await clientFor(request);
  if (!client) return Response.json({ error: "Not authorized." }, { status: 401, headers: noStoreHeaders });
  const body = await request.json().catch(() => null) as { linkId?: unknown } | null;
  if (typeof body?.linkId !== "string") return Response.json({ error: "Invalid link." }, { status: 400, headers: noStoreHeaders });
  const { error } = await client.rpc("revoke_finance_access_link", { target_link_id: body.linkId });
  if (error) return Response.json({ error: "The link could not be revoked." }, { status: 403, headers: noStoreHeaders });
  return Response.json({ success: true }, { headers: noStoreHeaders });
}
