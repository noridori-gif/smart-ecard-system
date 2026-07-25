import {
  checkPortalRateLimit, hashOrganiserToken, noStoreHeaders,
  publicFinanceClient, safeTokenShape, sameOrigin,
} from "@/lib/financePortalServer";
import { normalizeTanzanianPhone } from "@/services/pledgeMessageService";

type Body = {
  token?: unknown; action?: unknown; pledgeId?: unknown;
  fullName?: unknown; phone?: unknown; email?: unknown; pledgedAmount?: unknown; notes?: unknown;
  amount?: unknown; date?: unknown; method?: unknown; reference?: unknown; provider?: unknown;
};
function text(value: unknown, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function safeError(message: string) {
  const known = ["Access denied", "Pledge not found", "Payment exceeds the remaining pledge balance", "Payment is not allowed"];
  return known.some((item) => message.includes(item)) ? message : "The request could not be completed.";
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origin not allowed." }, { status: 403, headers: noStoreHeaders });
  if (!checkPortalRateLimit(request, "organiser-write")) return Response.json({ error: "Too many requests. Please wait and try again." }, { status: 429, headers: noStoreHeaders });
  const body = await request.json().catch(() => null) as Body | null;
  const token = text(body?.token, 100); const action = text(body?.action, 40);
  if (!safeTokenShape(token)) return Response.json({ error: "Invalid access link." }, { status: 403, headers: noStoreHeaders });
  const supplied_token_hash = hashOrganiserToken(token); const client = publicFinanceClient();
  try {
    if (action === "refresh") {
      const { data, error } = await client.rpc("get_organiser_finance_portal", { supplied_token_hash });
      if (error) throw error;
      return Response.json(data, { headers: noStoreHeaders });
    }
    if (action === "create_pledge") {
      const phone = text(body?.phone, 30); const amount = text(body?.pledgedAmount, 30);
      if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) throw new Error("Invalid amount");
      const { data, error } = await client.rpc("organiser_create_pledge", {
        supplied_token_hash, contributor_name: text(body?.fullName, 160), contributor_phone: phone,
        contributor_normalized_phone: normalizeTanzanianPhone(phone), contributor_email: text(body?.email, 254),
        amount, pledge_notes: text(body?.notes, 1000),
      });
      if (error) throw error; return Response.json({ pledge: data }, { status: 201, headers: noStoreHeaders });
    }
    const pledgeId = Number(body?.pledgeId);
    if (!Number.isInteger(pledgeId) || pledgeId <= 0) throw new Error("Pledge not found");
    if (action === "edit_pledge") {
      const phone = text(body?.phone, 30);
      const { data, error } = await client.rpc("organiser_update_pledge", {
        supplied_token_hash, target_pledge_id: pledgeId, contributor_name: text(body?.fullName, 160),
        contributor_phone: phone, contributor_normalized_phone: normalizeTanzanianPhone(phone),
        contributor_email: text(body?.email, 254), pledge_notes: text(body?.notes, 1000),
      });
      if (error) throw error; return Response.json({ pledge: data }, { headers: noStoreHeaders });
    }
    if (action === "record_payment") {
      const amount = text(body?.amount, 30); const methods = ["cash","mobile_money","bank","card","other"];
      const method = text(body?.method, 30);
      if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || !methods.includes(method)) throw new Error("Invalid payment");
      const { data, error } = await client.rpc("organiser_record_payment", {
        supplied_token_hash, target_pledge_id: pledgeId, payment_amount: amount,
        paid_on: text(body?.date, 10) || new Date().toISOString().slice(0,10), method,
        reference: text(body?.reference, 200), payment_provider: text(body?.provider, 100),
        payment_notes: text(body?.notes, 1000),
      });
      if (error) throw error; return Response.json(data, { status: 201, headers: noStoreHeaders });
    }
    if (action === "payment_history") {
      const { data, error } = await client.rpc("organiser_payment_history", { supplied_token_hash, target_pledge_id: pledgeId });
      if (error) throw error; return Response.json({ payments: data }, { headers: noStoreHeaders });
    }
    return Response.json({ error: "Unsupported action." }, { status: 400, headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json({ error: safeError(message) }, { status: 400, headers: noStoreHeaders });
  }
}
