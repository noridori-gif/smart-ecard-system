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
  if (!checkPortalRateLimit(request, "contribution-bulk", 10)) return reply({ error: "Too many requests. Try again shortly." }, 429);
  const token = bearerToken(request);
  if (!token) return reply({ error: "Not authorized." }, 401);
  const eventId = Number((await context.params).eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) return reply({ error: "Invalid event." }, 400);
  const client = authenticatedFinanceClient(token);
  const { data: auth } = await client.auth.getUser(token);
  if (!auth.user) return reply({ error: "Not authorized." }, 401);
  const body = await request.json().catch(() => null) as {
    action?: "preview" | "cancel_all" | "delete_contributions" | "delete_contributions_and_guests";
    reason?: string;
    confirmation?: string;
    removeLinkedGuests?: boolean;
  } | null;
  if (!body?.action) return reply({ error: "Invalid request." }, 400);

  const result = body.action === "preview"
    ? await client.rpc("preview_event_contribution_cleanup", {
      target_event_id: eventId,
      allow_unmarked_guest_removal: body.removeLinkedGuests === true,
    })
    : await client.rpc("bulk_cleanup_event_contributions", {
      target_event_id: eventId,
      cleanup_action: body.action,
      cancellation_reason: body.reason ?? "",
      typed_confirmation: body.confirmation ?? null,
      remove_linked_guests: body.action === "delete_contributions_and_guests",
      allow_unmarked_guest_removal: body.removeLinkedGuests === true,
    });
  if (result.error) {
    const denied = /not authorized/i.test(result.error.message);
    return reply({ error: denied ? "Not authorized." : "The bulk action could not be completed." }, denied ? 403 : 400);
  }
  return reply(result.data);
}
