import {
  checkPortalRateLimit, generateReceiptToken, hashOrganiserToken, noStoreHeaders,
  publicFinanceClient, safeTokenShape, sameOrigin,
} from "@/lib/financePortalServer";
import { normalizeTanzanianPhone } from "@/services/pledgeMessageService";
import { createClient } from "@supabase/supabase-js";
import { previewFinancialReminders, previewPledgeThankYous, sendFinancialReminders, sendPledgeThankYous, type FinancialChannel } from "@/services/financialNotificationEngine";

type Body = {
  token?: unknown; action?: unknown; pledgeId?: unknown;
  fullName?: unknown; phone?: unknown; email?: unknown; pledgedAmount?: unknown; notes?: unknown;
  amount?: unknown; date?: unknown; method?: unknown; reference?: unknown; provider?: unknown;
  receiptNumber?: unknown;
  channel?: unknown; confirmed?: unknown;
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
    if (action === "portal_report") {
      const { data: portal, error: portalError } = await client.rpc("get_organiser_finance_portal", { supplied_token_hash });
      if (portalError || portal?.access_status !== "active" || portal.permissions?.view_reports !== true) throw new Error("Access denied");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !serviceKey) throw new Error("Report configuration unavailable");
      const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const { data: payments, error: paymentError } = await db.from("pledge_payments")
        .select("amount,payment_date,voided_at,event_pledges!inner(event_id)")
        .eq("event_pledges.event_id", Number(portal.event.id));
      if (paymentError) throw paymentError;
      const valid=(payments??[]).filter(payment=>!payment.voided_at);
      const trendMap=new Map<string,{amount:number;transactions:number}>();
      valid.forEach(payment=>{const current=trendMap.get(payment.payment_date)??{amount:0,transactions:0};current.amount+=Number(payment.amount);current.transactions+=1;trendMap.set(payment.payment_date,current);});
      const pledges=(portal.pledges??[]) as Array<{full_name:string;total_paid:string;balance:string;calculated_status:string}>;
      const active=pledges.filter(pledge=>pledge.calculated_status!=="cancelled");
      return Response.json({
        validTransactions:valid.length,
        trend:[...trendMap].sort().map(([date,value])=>({date,...value})),
        topContributors:[...active].sort((a,b)=>Number(b.total_paid)-Number(a.total_paid)).slice(0,5).map(pledge=>({name:pledge.full_name,amount:pledge.total_paid})),
        outstanding:[...active].filter(pledge=>Number(pledge.balance)>0).sort((a,b)=>Number(b.balance)-Number(a.balance)).slice(0,5).map(pledge=>({name:pledge.full_name,amount:pledge.balance})),
      }, { headers: noStoreHeaders });
    }
    if (action === "message_statuses") {
      const { data: portal, error: portalError } = await client.rpc("get_organiser_finance_portal", { supplied_token_hash });
      if (portalError || portal?.access_status !== "active"
        || (portal.permissions?.send_reminders !== true && portal.permissions?.send_thank_you !== true)) throw new Error("Access denied");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !serviceKey) throw new Error("Message status is unavailable");
      const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const allowedTypes = [
        ...(portal.permissions.send_reminders === true ? ["pledge_reminder"] : []),
        ...(portal.permissions.send_thank_you === true ? ["pledge_thank_you"] : []),
      ];
      const { data: rows, error: statusError } = await db.from("pledge_reminders")
        .select("pledge_id,reminder_type,channel,delivery_status,created_at")
        .eq("event_id", Number(portal.event.id)).in("reminder_type", allowedTypes)
        .order("created_at", { ascending: false }).limit(500);
      if (statusError) throw statusError;
      return Response.json({ statuses: rows ?? [] }, { headers: noStoreHeaders });
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
    if (action === "reminder_preview" || action === "send_reminder" || action === "thank_you_preview" || action === "thank_you_send") {
      const channel = text(body?.channel, 20) as FinancialChannel;
      if (channel !== "sms" && channel !== "whatsapp") throw new Error("Unsupported channel");
      const { data: portal, error: portalError } = await client.rpc("get_organiser_finance_portal", { supplied_token_hash });
      const thankYouAction = action === "thank_you_preview" || action === "thank_you_send";
      const requiredPermission = thankYouAction ? "send_thank_you" : "send_reminders";
      if (portalError || portal?.access_status !== "active" || portal.permissions?.[requiredPermission] !== true) throw new Error("Access denied");
      if (!Array.isArray(portal.pledges) || !portal.pledges.some((pledge: { id?: number }) => pledge.id === pledgeId)) throw new Error("Pledge not found");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !serviceKey) throw new Error("Provider configuration unavailable");
      const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const { data: accessLink } = await db.from("event_finance_access_links").select("id").eq("token_hash", supplied_token_hash).eq("event_id", Number(portal.event.id)).single();
      if (!accessLink) throw new Error("Access denied");
      if (thankYouAction) {
        const preview = await previewPledgeThankYous(db, { eventId: Number(portal.event.id), requestedChannels: [channel], pledgeId });
        if (action === "thank_you_preview") return Response.json(preview, { headers: noStoreHeaders });
        if (body?.confirmed !== true) throw new Error("Confirmation required");
        return Response.json(await sendPledgeThankYous(db, preview, { type: "organiser_link", linkId: accessLink.id }), { headers: noStoreHeaders });
      }
      const preview = await previewFinancialReminders(db, { eventId: Number(portal.event.id), requestedChannels: [channel], pledgeId });
      if (action === "reminder_preview") return Response.json(preview, { headers: noStoreHeaders });
      if (body?.confirmed !== true) throw new Error("Confirmation required");
      return Response.json(await sendFinancialReminders(db, preview, { type: "organiser_link", linkId: accessLink.id }), { headers: noStoreHeaders });
    }
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
    if (action === "issue_receipt") {
      const receiptNumber = text(body?.receiptNumber, 40);
      if (!/^SEP-PAY-\d{4}-\d{6,}$/.test(receiptNumber)) throw new Error("Receipt not found");
      const rawReceiptToken = generateReceiptToken();
      const { data, error } = await client.rpc("organiser_issue_receipt_verification", {
        supplied_organiser_token_hash: supplied_token_hash,
        target_receipt_number: receiptNumber,
        supplied_receipt_token_hash: hashOrganiserToken(rawReceiptToken),
      });
      if (error) throw error;
      const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
      return Response.json({ receipt: data, verificationUrl: `${origin}/r/${rawReceiptToken}` }, { status: 201, headers: noStoreHeaders });
    }
    return Response.json({ error: "Unsupported action." }, { status: 400, headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json({ error: safeError(message) }, { status: 400, headers: noStoreHeaders });
  }
}
