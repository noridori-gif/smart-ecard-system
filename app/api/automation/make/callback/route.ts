import { createHash, timingSafeEqual } from "node:crypto";
import { noStoreHeaders } from "@/lib/financePortalServer";
import { serviceDatabase } from "@/lib/makeConnectorServer";

const allowedStatuses = ["accepted", "processing", "completed", "failed", "skipped"];
const transitions: Record<string, string[]> = {
  pending: allowedStatuses, sending: allowedStatuses, accepted: allowedStatuses,
  processing: ["processing", "completed", "failed", "skipped"],
  completed: ["completed"], failed: ["failed"], skipped: ["skipped"],
};

export async function POST(request: Request) {
  const raw = await request.text();
  const deliveryHeader = request.headers.get("x-sep-delivery-id") ?? "";
  const callbackToken = request.headers.get("x-sep-callback-token") ?? "";
  const body = JSON.parse(raw || "null") as { deliveryId?: unknown; status?: unknown; externalExecutionId?: unknown } | null;
  const deliveryId = String(body?.deliveryId ?? ""), status = String(body?.status ?? "");
  if (!deliveryId || deliveryId !== deliveryHeader || !allowedStatuses.includes(status)) return unauthorized();

  const db = serviceDatabase();
  const { data: delivery } = await db.from("automation_connector_deliveries").select("id,status,callback_token_hash").eq("delivery_id", deliveryId).maybeSingle();
  const actual = createHash("sha256").update(callbackToken).digest();
  const expected = Buffer.from(delivery?.callback_token_hash ?? "", "hex");
  if (!delivery || !callbackToken || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return unauthorized();
  if (!transitions[delivery.status]?.includes(status)) return Response.json({ error: "Invalid delivery transition." }, { status: 409, headers: noStoreHeaders });

  const external = body?.externalExecutionId == null ? null : String(body.externalExecutionId);
  if (external && !/^[A-Za-z0-9._:-]{1,160}$/.test(external)) return Response.json({ error: "Invalid execution reference." }, { status: 400, headers: noStoreHeaders });
  if (delivery.status === status) return Response.json({ success: true, duplicate: true }, { headers: noStoreHeaders });
  const now = new Date().toISOString();
  const { error } = await db.from("automation_connector_deliveries").update({
    status, external_execution_id: external, acknowledged_at: now,
    completed_at: ["completed", "failed", "skipped"].includes(status) ? now : null,
    last_error: status === "failed" ? "Make scenario reported failure." : null, updated_at: now,
  }).eq("id", delivery.id).eq("status", delivery.status);
  if (error) return Response.json({ error: "Callback could not be applied." }, { status: 409, headers: noStoreHeaders });
  return Response.json({ success: true }, { headers: noStoreHeaders });
}
function unauthorized() { return Response.json({ error: "Not authorized." }, { status: 401, headers: noStoreHeaders }); }
