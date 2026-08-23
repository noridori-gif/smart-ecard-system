import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendBeemSms } from "@/services/beemSmsService";
import { analyzeSms, renderCustomSmsTemplate, type PledgeMessageValues, type SmsAnalysis } from "@/services/pledgeMessageService";

export type CustomSmsCampaign = {
  id: number;
  event_id: number;
  name: string;
  message_template: string;
  created_at: string;
  updated_at: string;
};

type GuestRow = { id: number; full_name: string; phone: string | null };
type EventRow = { id: number; title: string; event_date: string; archived_at: string | null };
type DeliveryHistoryRow = { guest_id: number; delivery_status: string; error_message: string | null };

export type CustomSmsSkipReason = "missing_phone" | "invalid_phone" | "provider_unavailable" | "already_sent" | "in_progress";

export type CustomSmsRecipientRow = {
  guestId: number;
  name: string;
  phone: string | null;
  message: string;
  smsSegments: number;
  smsEncoding: SmsAnalysis["encoding"];
  smsUnits: number;
  eligible: boolean;
  skippedReason: CustomSmsSkipReason | null;
  deliveryStatus: string | null;
  idempotencyKey: string;
  errorMessage: string | null;
};

export type CustomSmsPreview = {
  campaign: CustomSmsCampaign;
  event: { id: number; title: string; eventDate: string };
  rows: CustomSmsRecipientRow[];
  providerReady: boolean;
  providerMessage: string;
};

export type CustomSmsSendResult = { queued: number; sent: number; failed: number; skipped: number; errors: string[] };

// Deliberately duplicated (not imported) from beemSmsService's internal getBeemConfig --
// that helper isn't exported, and pulling in the whole pledge/finance provider-status
// stack for a one-line env check would couple this guest-domain feature to it for no reason.
function smsProviderStatus() {
  const configured = Boolean(
    process.env.BEEM_API_KEY?.trim() && process.env.BEEM_SECRET_KEY?.trim() && process.env.BEEM_SENDER_NAME?.trim()
  );
  return { configured, message: configured ? "BEEM SMS is configured and ready." : "BEEM SMS is not configured yet." };
}

function normalizePhoneForCheck(phone: string | null) {
  if (!phone) return null;
  let value = phone.trim().replace(/\D/g, "");
  if (!value) return null;
  if (value.startsWith("2550")) value = `255${value.slice(4)}`;
  else if (value.startsWith("0")) value = `255${value.slice(1)}`;
  else if (/^[67]\d{8}$/.test(value)) value = `255${value}`;
  return /^255[67]\d{8}$/.test(value) ? value : null;
}

function safeError(value: unknown) {
  return (value instanceof Error ? value.message : "SMS delivery failed.").slice(0, 500);
}

export async function saveCampaign(
  db: SupabaseClient,
  input: { campaignId?: number; eventId: number; name: string; messageTemplate: string; createdBy: string }
): Promise<CustomSmsCampaign> {
  const values = { event_id: input.eventId, name: input.name, message_template: input.messageTemplate };
  // created_by's column default (auth.uid()) never fires here -- this route runs on the
  // service-role client, which has no session, so the admin's id must be passed explicitly.
  const result = input.campaignId
    ? await db.from("sms_campaigns").update(values).eq("id", input.campaignId).eq("event_id", input.eventId).select("*").maybeSingle()
    : await db.from("sms_campaigns").insert({ ...values, created_by: input.createdBy }).select("*").single();
  if (result.error || !result.data) throw new Error(result.error?.message ?? "Campaign could not be saved.");
  return result.data as CustomSmsCampaign;
}

export async function listCampaigns(db: SupabaseClient, eventId: number): Promise<CustomSmsCampaign[]> {
  const { data, error } = await db.from("sms_campaigns").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomSmsCampaign[];
}

export type CustomSmsDeliveryRow = {
  id: number;
  campaign_id: number;
  guest_id: number;
  guest_name: string;
  recipient_phone: string;
  delivery_status: string;
  error_message: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  created_at: string;
};

export async function listDeliveries(db: SupabaseClient, eventId: number): Promise<CustomSmsDeliveryRow[]> {
  const { data, error } = await db
    .from("sms_campaign_deliveries")
    .select("id,campaign_id,guest_id,recipient_phone,delivery_status,error_message,provider_message_id,sent_at,created_at,guests(full_name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Array<Omit<CustomSmsDeliveryRow, "guest_name"> & { guests: { full_name: string } | { full_name: string }[] | null }>).map((row) => {
    const guest = Array.isArray(row.guests) ? row.guests[0] : row.guests;
    return { ...row, guest_name: guest?.full_name ?? "Unknown guest" };
  });
}

export async function previewCustomSmsCampaign(
  db: SupabaseClient,
  input: { campaignId: number; guestIds: number[] }
): Promise<CustomSmsPreview> {
  const { data: campaign, error: campaignError } = await db.from("sms_campaigns").select("*").eq("id", input.campaignId).single();
  if (campaignError || !campaign) throw new Error("Campaign could not be loaded.");
  const campaignRow = campaign as CustomSmsCampaign;

  const { data: event, error: eventError } = await db
    .from("events")
    .select("id,title,event_date,archived_at")
    .eq("id", campaignRow.event_id)
    .single();
  if (eventError || !event) throw new Error("Event could not be loaded.");
  const eventRow = event as EventRow;
  if (eventRow.archived_at) throw new Error("This event is archived.");

  const guestIds = [...new Set(input.guestIds)];
  const { data: guests, error: guestsError } = guestIds.length
    ? await db.from("guests").select("id,full_name,phone").eq("event_id", campaignRow.event_id).in("id", guestIds)
    : { data: [] as GuestRow[], error: null };
  if (guestsError) throw new Error("Recipients could not be loaded.");

  const { data: history, error: historyError } = guestIds.length
    ? await db.from("sms_campaign_deliveries").select("guest_id,delivery_status,error_message").eq("campaign_id", campaignRow.id).in("guest_id", guestIds)
    : { data: [] as DeliveryHistoryRow[], error: null };
  if (historyError) throw new Error("Delivery history could not be loaded.");

  const provider = smsProviderStatus();
  const historyByGuest = new Map<number, DeliveryHistoryRow>();
  for (const item of (history ?? []) as DeliveryHistoryRow[]) historyByGuest.set(item.guest_id, item);

  const rows: CustomSmsRecipientRow[] = ((guests ?? []) as GuestRow[]).map((guest) => {
    const idempotencyKey = `custom-sms:v1:${campaignRow.id}:${guest.id}`;
    const existing = historyByGuest.get(guest.id) ?? null;
    const normalizedPhone = normalizePhoneForCheck(guest.phone);
    const values: PledgeMessageValues = {
      guestName: guest.full_name,
      eventTitle: eventRow.title,
      pledgedAmount: "0",
      totalPaid: "0",
      balance: "0",
      eventDate: eventRow.event_date,
    };
    const message = renderCustomSmsTemplate(campaignRow.message_template, values);
    const analysis = analyzeSms(message);

    let reason: CustomSmsSkipReason | null = null;
    if (!guest.phone) reason = "missing_phone";
    else if (!normalizedPhone) reason = "invalid_phone";
    else if (!provider.configured) reason = "provider_unavailable";
    else if (existing?.delivery_status === "sent") reason = "already_sent";
    else if (existing?.delivery_status === "processing") reason = "in_progress";

    return {
      guestId: guest.id,
      name: guest.full_name,
      phone: normalizedPhone,
      message,
      smsSegments: analysis.segments,
      smsEncoding: analysis.encoding,
      smsUnits: analysis.units,
      eligible: !reason,
      skippedReason: reason,
      deliveryStatus: existing?.delivery_status ?? null,
      idempotencyKey,
      errorMessage: existing?.error_message ?? null,
    };
  });

  return {
    campaign: campaignRow,
    event: { id: eventRow.id, title: eventRow.title, eventDate: eventRow.event_date },
    rows,
    providerReady: provider.configured,
    providerMessage: provider.message,
  };
}

export async function sendCustomSmsCampaign(
  db: SupabaseClient,
  input: { campaignId: number; guestIds: number[] }
): Promise<CustomSmsSendResult> {
  const preview = await previewCustomSmsCampaign(db, input);
  const result: CustomSmsSendResult = { queued: 0, sent: 0, failed: 0, skipped: 0, errors: [] };

  for (const row of preview.rows) {
    if (!row.eligible) {
      result.skipped += 1;
      result.errors.push(
        row.skippedReason === "already_sent"
          ? `${row.name} was already sent this campaign.`
          : row.skippedReason === "in_progress"
            ? `${row.name}'s SMS is already in progress.`
            : row.skippedReason === "provider_unavailable"
              ? preview.providerMessage
              : row.skippedReason === "invalid_phone"
                ? `${row.name} has an invalid phone number.`
                : `${row.name} has no phone number.`
      );
      continue;
    }

    const existing = await db.from("sms_campaign_deliveries").select("id,delivery_status").eq("idempotency_key", row.idempotencyKey).maybeSingle();
    if (existing.error) {
      result.failed += 1;
      result.errors.push(`${row.name}'s delivery history could not be checked.`);
      continue;
    }

    let log: { id: number } | null = null;
    if (existing.data && existing.data.delivery_status === "sent") {
      result.skipped += 1;
      result.errors.push(`${row.name} was already sent this campaign.`);
      continue;
    }
    if (existing.data && existing.data.delivery_status === "processing") {
      result.skipped += 1;
      result.errors.push(`${row.name}'s SMS is already in progress.`);
      continue;
    }
    if (existing.data && existing.data.delivery_status === "failed") {
      const retry = await db
        .from("sms_campaign_deliveries")
        .update({ delivery_status: "processing", recipient_phone: row.phone, message_body: row.message, error_message: null, failed_at: null })
        .eq("id", existing.data.id)
        .eq("delivery_status", "failed")
        .select("id")
        .maybeSingle();
      if (retry.error || !retry.data) {
        result.failed += 1;
        result.errors.push(`${row.name}'s retry could not be prepared.`);
        continue;
      }
      log = retry.data;
    } else {
      const inserted = await db
        .from("sms_campaign_deliveries")
        .insert({
          campaign_id: preview.campaign.id,
          event_id: preview.event.id,
          guest_id: row.guestId,
          recipient_phone: row.phone,
          message_body: row.message,
          delivery_status: "processing",
          idempotency_key: row.idempotencyKey,
        })
        .select("id")
        .maybeSingle();
      if (inserted.error || !inserted.data) {
        result.failed += 1;
        result.errors.push(`${row.name}'s delivery could not be recorded.`);
        continue;
      }
      log = inserted.data;
    }

    result.queued += 1;
    try {
      const sent = await sendBeemSms({ phoneNumber: row.phone!, message: row.message });
      if (!sent.success) throw new Error(sent.message);
      const saved = await db
        .from("sms_campaign_deliveries")
        .update({ delivery_status: "sent", provider_message_id: sent.providerMessageId ?? null, sent_at: new Date().toISOString(), error_message: null })
        .eq("id", log.id);
      if (saved.error) {
        result.failed += 1;
        result.errors.push(`${row.name}'s SMS was accepted but could not be recorded.`);
        continue;
      }
      result.sent += 1;
    } catch (cause) {
      const message = safeError(cause);
      const saved = await db
        .from("sms_campaign_deliveries")
        .update({ delivery_status: "failed", error_message: message, failed_at: new Date().toISOString() })
        .eq("id", log.id);
      result.failed += 1;
      result.errors.push(`${row.name}: ${message}`);
      if (saved.error) result.errors.push(`${row.name}'s failure could not be recorded.`);
    }
  }

  return result;
}
