import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const MAKE_EVENT_TYPES = ["pledge.submitted", "message.acknowledgement.requested", "pledge.reminder.send_requested", "payment.completed", "invitation.sent", "rsvp.accepted", "guest.checked_in"] as const;
export type MakeEventType = (typeof MAKE_EVENT_TYPES)[number];
const CALLBACK_PATH = "/api/automation/make/callback";

export function serviceDatabase() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error("Automation service is not configured."); return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }); }
function encryptionKey() { const value = process.env.MAKE_CONNECTOR_ENCRYPTION_KEY; if (!value || value.length < 32) throw new Error("Make connector encryption is not configured."); return createHash("sha256").update(value).digest(); }
export function encryptConnectorSecret(value: string) { const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv), encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`; }
export function decryptConnectorSecret(value: string) { const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url")); if (!iv || !tag || !encrypted) throw new Error("Invalid encrypted connector value."); const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv); decipher.setAuthTag(tag); return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8"); }
export function newSigningSecret() { return randomBytes(32).toString("base64url"); }
export function maskWebhookUrl(value: string) { const url = new URL(value); return `${url.protocol}//${url.host}/••••${url.pathname.slice(-8)}`; }
export function validateWebhookUrl(value: string) { const url = new URL(value); if (url.protocol !== "https:" || url.username || url.password || !(url.hostname === "make.com" || url.hostname.endsWith(".make.com"))) throw new Error("A Make HTTPS webhook URL is required."); return url.toString(); }
export function signMakeBody(secret: string, timestamp: string, rawBody: string) { return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"); }
export function verifyMakeSignature(secret: string, timestamp: string, rawBody: string, supplied: string) { if (!/^\d{10,13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp) * (timestamp.length === 10 ? 1000 : 1)) > 5 * 60_000 || !/^[a-f0-9]{64}$/i.test(supplied)) return false; const expected = Buffer.from(signMakeBody(secret, timestamp, rawBody), "hex"), actual = Buffer.from(supplied, "hex"); return expected.length === actual.length && timingSafeEqual(expected, actual); }
export function publicReference(scope: string, id: string | number) { const secret = process.env.MAKE_PUBLIC_REFERENCE_SECRET || process.env.MAKE_CONNECTOR_ENCRYPTION_KEY || ""; if (!secret) throw new Error("Make public references are not configured."); return createHmac("sha256", secret).update(`${scope}:${id}`).digest("base64url").slice(0, 24); }

type ClaimedWorkflow = { id: number; event_id: number; event_type: string; entity_type: string; entity_id: string | null; source: string; payload?: Record<string, unknown>; created_at: string };
export async function queueMakeDeliveries(db: SupabaseClient, workflow: ClaimedWorkflow) {
  if (!MAKE_EVENT_TYPES.includes(workflow.event_type as MakeEventType)) return;
  const { data: connectors } = await db.from("event_automation_connectors").select("id,allowed_event_types,is_active").eq("event_id", workflow.event_id).eq("provider", "make").eq("is_active", true);
  for (const connector of connectors ?? []) if ((connector.allowed_event_types as string[]).includes(workflow.event_type)) await db.from("automation_connector_deliveries").upsert({ event_id: workflow.event_id, workflow_event_id: workflow.id, connector_id: connector.id, idempotency_key: `make:${connector.id}:workflow:${workflow.id}`, event_type: workflow.event_type, request_summary: { schemaVersion: "1.0", eventType: workflow.event_type, entityType: workflow.entity_type, source: workflow.source } }, { onConflict: "idempotency_key", ignoreDuplicates: true });
}

export async function processMakeDeliveries(db: SupabaseClient, origin: string) {
  const { data: rows } = await db.from("automation_connector_deliveries").select("*,event_automation_connectors!inner(*)").in("status", ["pending", "failed"]).lte("next_attempt_at", new Date().toISOString()).order("created_at").limit(20);
  let accepted = 0, failed = 0;
  for (const row of rows ?? []) {
    const connector = Array.isArray(row.event_automation_connectors) ? row.event_automation_connectors[0] : row.event_automation_connectors;
    if (!connector?.is_active) { await db.from("automation_connector_deliveries").update({ status: "skipped", last_error: "Connector is paused.", updated_at: new Date().toISOString() }).eq("id", row.id).in("status", ["pending", "failed"]); continue; }
    const attempt = row.attempt_count + 1;
    const claimed = await db.from("automation_connector_deliveries").update({ status: "sending", attempt_count: attempt, updated_at: new Date().toISOString() }).eq("id", row.id).in("status", ["pending", "failed"]).select("id").maybeSingle();
    if (!claimed.data) continue;
    try {
      const [{ data: event }, { data: workflow }] = await Promise.all([db.from("events").select("id,title").eq("id", row.event_id).single(), row.workflow_event_id ? db.from("workflow_events").select("id,entity_type,entity_id,source,created_at,payload").eq("id", row.workflow_event_id).single() : Promise.resolve({ data: null })]);
      let eventData: Record<string, unknown> = { source: workflow?.source ?? "connector" };
      if (row.event_type === "message.acknowledgement.requested") { const pledgeId = Number((workflow?.payload as Record<string, unknown> | null)?.pledge_id); if (Number.isInteger(pledgeId) && pledgeId > 0) { const { data: pledge } = await db.from("event_pledges").select("full_name,normalized_phone").eq("id", pledgeId).eq("event_id", row.event_id).maybeSingle(); eventData = { ...eventData, recipient: pledge ? { name: pledge.full_name, phone: pledge.normalized_phone } : null }; } }
      const payload = { schemaVersion: "1.0", deliveryId: row.delivery_id, workflowEventId: row.workflow_event_id ?? undefined, idempotencyKey: row.idempotency_key, eventType: row.event_type, occurredAt: workflow?.created_at ?? row.created_at, event: { publicReference: publicReference("event", row.event_id), name: event?.title ?? "Event" }, subject: { type: workflow?.entity_type ?? "connector", publicReference: publicReference(workflow?.entity_type ?? "delivery", workflow?.entity_id ?? row.delivery_id) }, data: eventData, callbackUrl: `${origin}${CALLBACK_PATH}` };
      const rawBody = JSON.stringify(payload), timestamp = Math.floor(Date.now() / 1000).toString(), secret = decryptConnectorSecret(connector.signing_secret_encrypted), controller = new AbortController(), timer = setTimeout(() => controller.abort(), connector.timeout_seconds * 1000);
      let response: Response; try { response = await fetch(decryptConnectorSecret(connector.webhook_url_encrypted), { method: "POST", headers: { "Content-Type": "application/json", "X-SEP-Signature": signMakeBody(secret, timestamp, rawBody), "X-SEP-Timestamp": timestamp, "X-SEP-Delivery-Id": row.delivery_id, "X-SEP-Schema-Version": "1.0" }, body: rawBody, signal: controller.signal, cache: "no-store" }); } finally { clearTimeout(timer); }
      if (!response.ok) throw Object.assign(new Error(`Make returned HTTP ${response.status}.`), { permanent: response.status >= 400 && response.status < 500, responseStatus: response.status });
      await db.from("automation_connector_deliveries").update({ status: "accepted", response_status: response.status, sent_at: new Date().toISOString(), acknowledged_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", row.id); await db.from("event_automation_connectors").update({ last_success_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", connector.id); accepted++;
    } catch (cause) {
      const error = cause as Error & { permanent?: boolean; responseStatus?: number }, exhausted = error.permanent || attempt >= connector.maximum_attempts; const delay = Math.min(3600, 30 * 2 ** Math.max(0, attempt - 1));
      await db.from("automation_connector_deliveries").update({ status: "failed", response_status: error.responseStatus ?? null, next_attempt_at: new Date(Date.now() + delay * 1000).toISOString(), last_error: error.message.slice(0, 500), updated_at: new Date().toISOString(), ...(exhausted ? { next_attempt_at: "9999-12-31T00:00:00Z" } : {}) }).eq("id", row.id); await db.from("event_automation_connectors").update({ last_failure_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", connector.id); failed++;
    }
  }
  return { accepted, failed };
}
