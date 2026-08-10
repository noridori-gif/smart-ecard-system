import {
  authenticatedFinanceClient,
  bearerToken,
  checkPortalRateLimit,
  noStoreHeaders,
  sameOrigin,
} from "@/lib/financePortalServer";

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders });
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  if (!sameOrigin(request)) return reply({ error: "Request not allowed." }, 403);
  if (!checkPortalRateLimit(request, "event-lifecycle", 12)) return reply({ error: "Too many requests. Try again shortly." }, 429);
  const token = bearerToken(request);
  if (!token) return reply({ error: "Not authorized." }, 401);
  const eventId = Number((await context.params).eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) return reply({ error: "Invalid event." }, 400);
  const client = authenticatedFinanceClient(token);
  const { data: auth } = await client.auth.getUser(token);
  if (!auth.user) return reply({ error: "Not authorized." }, 401);
  const body = await request.json().catch(() => null) as {
    action?: "archive" | "restore" | "preview_delete" | "delete";
    eventTitle?: string;
    secondConfirmation?: boolean;
  } | null;
  if (!body?.action) return reply({ error: "Invalid request." }, 400);

  let result: { data: unknown; error: { message: string } | null };
  if (body.action === "archive" || body.action === "restore") {
    result = await client.rpc("set_event_archived", {
      target_event_id: eventId,
      should_archive: body.action === "archive",
    });
  } else if (body.action === "preview_delete") {
    result = await client.rpc("preview_event_permanent_deletion", { target_event_id: eventId });
  } else if (body.action === "delete") {
    if (typeof body.eventTitle !== "string" || body.secondConfirmation !== true) {
      return reply({ error: "Both deletion confirmations are required." }, 400);
    }
    result = await client.rpc("delete_event_permanently", {
      target_event_id: eventId,
      expected_event_title: body.eventTitle,
      second_confirmation: true,
    });
  } else {
    return reply({ error: "Invalid request." }, 400);
  }
  if (result.error) {
    const denied = /not authorized/i.test(result.error.message);
    console.error(`[event-lifecycle] eventId=${eventId} action=${body.action} error=${result.error.message}`);
    if (denied) return reply({ error: "Not authorized." }, 403);
    const adminOnlyAction = body.action === "delete" || body.action === "preview_delete";
    return reply({ error: adminOnlyAction ? result.error.message : "The event action could not be completed." }, 400);
  }
  return reply(result.data);
}
