import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendBeemSms } from "@/services/beemSmsService";
import { sendSaveTheDateWhatsAppTemplate } from "@/services/whatsappCloudService";
import { formatEventDate } from "@/services/invitationMessageService";
import { getSaveTheDateWhatsAppTemplate } from "@/lib/saveTheDateConfig";
import {
  saveTheDateEligibility,
  type SaveTheDateIneligibleReason,
  type SaveTheDateVariant,
} from "@/lib/saveTheDateEligibility";

type EventRow = {
  id: number;
  title: string;
  bride_name: string | null;
  groom_name: string | null;
  event_date: string | null;
  venue: string | null;
  language: string | null;
  cover_image_url: string | null;
  archived_at: string | null;
  save_the_date_variant: string | null;
};
type PledgeRow = {
  id: number;
  full_name: string;
  phone: string | null;
  guest_id: number | null;
  pledged_amount: string | number;
  total_paid: string | number;
  calculated_status: string;
};
type DeliveryRow = {
  id: number;
  pledge_id: number;
  delivery_status: "processing" | "sent" | "delivered" | "read" | "failed";
  channel: "whatsapp" | "sms" | null;
  error_message: string | null;
  sent_at: string | null;
  card_token: string;
};

export type SaveTheDateSkipReason = SaveTheDateIneligibleReason | "missing_phone" | "already_sent" | "in_progress";

export type SaveTheDateRow = {
  pledgeId: number;
  guestId: number | null;
  name: string;
  phone: string | null;
  cardType: "single" | "double" | "below_minimum";
  totalPaid: number;
  calculatedStatus: string;
  /** Meets the client's rule (completed + Double >= 100k / Single >= 70k). */
  qualifies: boolean;
  /** Qualifies, has a phone and has not been sent / is not mid-send. */
  sendable: boolean;
  reason: SaveTheDateSkipReason | null;
  deliveryStatus: DeliveryRow["delivery_status"] | null;
  deliveryChannel: DeliveryRow["channel"];
  deliveryError: string | null;
  sentAt: string | null;
  cardToken: string | null;
};

export type SaveTheDatePreview = {
  event: { id: number; title: string; groomName: string; brideName: string; eventDate: string; venue: string; language: "sw" | "en"; variant: SaveTheDateVariant };
  rows: SaveTheDateRow[];
  whatsappConfigured: boolean;
  smsConfigured: boolean;
};

export type SaveTheDateSendResult = { sentWhatsapp: number; sentSms: number; failed: number; skipped: number; errors: string[] };

function idempotencyKey(eventId: number, pledgeId: number) {
  return `save-the-date:v1:${eventId}:${pledgeId}`;
}

function isSmsProviderConfigured() {
  return Boolean(process.env.BEEM_API_KEY?.trim() && process.env.BEEM_SECRET_KEY?.trim() && process.env.BEEM_SENDER_NAME?.trim());
}

function safeError(value: unknown) {
  return (value instanceof Error ? value.message : "Save the Date send failed.").slice(0, 500);
}

export function normalizeVariant(value: unknown): SaveTheDateVariant {
  return value === "cream" ? "cream" : "navy";
}

async function loadEvent(db: SupabaseClient, eventId: number) {
  const { data, error } = await db
    .from("events")
    .select("id,title,bride_name,groom_name,event_date,venue,language,cover_image_url,archived_at,save_the_date_variant")
    .eq("id", eventId)
    .single();
  if (error || !data) throw new Error("Event could not be loaded.");
  return data as EventRow;
}

export async function previewSaveTheDate(db: SupabaseClient, eventId: number): Promise<SaveTheDatePreview> {
  const event = await loadEvent(db, eventId);
  if (event.archived_at) throw new Error("This event is archived.");
  const language: "sw" | "en" = event.language === "en" ? "en" : "sw";

  const [settingsResult, pledgesResult, deliveriesResult] = await Promise.all([
    db.from("event_contributor_guest_settings").select("classification_basis,single_card_minimum,double_card_minimum").eq("event_id", eventId).maybeSingle(),
    db.from("event_pledge_financial_summary").select("id,full_name,phone,guest_id,pledged_amount,total_paid,calculated_status").eq("event_id", eventId).order("full_name", { ascending: true }),
    db.from("save_the_date_deliveries").select("id,pledge_id,delivery_status,channel,error_message,sent_at,card_token").eq("event_id", eventId),
  ]);
  if (settingsResult.error) throw new Error(settingsResult.error.message);
  if (pledgesResult.error) throw new Error(pledgesResult.error.message);
  if (deliveriesResult.error) throw new Error(deliveriesResult.error.message);
  // Without classification settings no pledge can be Single/Double, so nobody qualifies.
  const settings = settingsResult.data ?? { classification_basis: "paid_amount" as const, single_card_minimum: "Infinity", double_card_minimum: "Infinity" };

  const pledges = (pledgesResult.data ?? []) as PledgeRow[];
  const guestIds = [...new Set(pledges.map((pledge) => pledge.guest_id).filter((id): id is number => id !== null))];
  const guests = new Map<number, { full_name: string; phone: string | null }>();
  for (let index = 0; index < guestIds.length; index += 200) {
    const { data, error } = await db.from("guests").select("id,full_name,phone").in("id", guestIds.slice(index, index + 200));
    if (error) throw new Error(error.message);
    for (const guest of data ?? []) guests.set(guest.id, guest);
  }
  const deliveries = new Map<number, DeliveryRow>();
  for (const delivery of (deliveriesResult.data ?? []) as DeliveryRow[]) deliveries.set(delivery.pledge_id, delivery);

  const rows = pledges.map((pledge): SaveTheDateRow => {
    const guest = pledge.guest_id !== null ? guests.get(pledge.guest_id) ?? null : null;
    // The guest record is what the invitation uses, so prefer its name/phone over the pledge's.
    const name = guest?.full_name?.trim() || pledge.full_name;
    const phone = guest?.phone?.trim() || pledge.phone?.trim() || null;
    const rule = saveTheDateEligibility(pledge, settings);
    const delivery = deliveries.get(pledge.id) ?? null;
    let reason: SaveTheDateSkipReason | null = rule.eligible ? null : rule.reason;
    // delivered/read come from WhatsApp receipts (webhook) and count as sent.
    if (!reason && (delivery?.delivery_status === "sent" || delivery?.delivery_status === "delivered" || delivery?.delivery_status === "read")) reason = "already_sent";
    else if (!reason && delivery?.delivery_status === "processing") reason = "in_progress";
    else if (!reason && !phone) reason = "missing_phone";
    return {
      pledgeId: pledge.id,
      guestId: pledge.guest_id,
      name,
      phone,
      cardType: rule.cardType,
      totalPaid: Number(pledge.total_paid),
      calculatedStatus: pledge.calculated_status,
      qualifies: rule.eligible,
      sendable: reason === null,
      reason,
      deliveryStatus: delivery?.delivery_status ?? null,
      deliveryChannel: delivery?.channel ?? null,
      deliveryError: delivery?.error_message ?? null,
      sentAt: delivery?.sent_at ?? null,
      cardToken: delivery?.card_token ?? null,
    };
  });

  return {
    event: {
      id: event.id,
      title: event.title,
      groomName: event.groom_name?.trim() || "",
      brideName: event.bride_name?.trim() || "",
      eventDate: formatEventDate(event.event_date, language) || event.event_date || "-",
      venue: event.venue?.trim() || "-",
      language,
      variant: normalizeVariant(event.save_the_date_variant),
    },
    rows,
    whatsappConfigured: getSaveTheDateWhatsAppTemplate(language).configured,
    smsConfigured: isSmsProviderConfigured(),
  };
}

export async function setSaveTheDateVariant(db: SupabaseClient, eventId: number, variant: SaveTheDateVariant) {
  const { error } = await db.from("events").update({ save_the_date_variant: variant }).eq("id", eventId);
  if (error) throw new Error(error.message);
}

function coupleLine(event: SaveTheDatePreview["event"]) {
  return event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : event.title;
}

function buildSms(event: SaveTheDatePreview["event"], name: string, link: string) {
  if (event.language === "en") {
    return `Dear ${name}, please save the date ${event.eventDate} for the wedding of ${coupleLine(event)} at ${event.venue}. A formal invitation will follow. View the card: ${link}`;
  }
  return `Mpendwa ${name}, tafadhali hifadhi tarehe ${event.eventDate} kwa ajili ya harusi ya ${coupleLine(event)} ukumbini ${event.venue}. Mwaliko rasmi utafuata. Tazama kadi: ${link}`;
}

/** Fetches the card the way Meta will, so a broken card falls back to SMS instead of a failed WhatsApp. */
async function assertCardImage(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/")) throw new Error(`Save the Date card returned HTTP ${response.status} (${type || "no type"}).`);
  await response.arrayBuffer();
}

export async function sendSaveTheDate(
  db: SupabaseClient,
  input: { eventId: number; pledgeIds: number[]; siteOrigin: string },
  actor: { userId: string }
): Promise<SaveTheDateSendResult> {
  // Re-read everything at send time: the rule is checked against current payments, not what the
  // organizer's screen showed.
  const preview = await previewSaveTheDate(db, input.eventId);
  const wanted = new Set(input.pledgeIds);
  const result: SaveTheDateSendResult = { sentWhatsapp: 0, sentSms: 0, failed: 0, skipped: 0, errors: [] };
  const template = getSaveTheDateWhatsAppTemplate(preview.event.language);

  for (const row of preview.rows.filter((item) => wanted.has(item.pledgeId))) {
    if (!row.sendable) {
      result.skipped += 1;
      result.errors.push(`${row.name}: ${row.reason === "already_sent" ? "tayari ametumiwa Save the Date." : row.reason === "in_progress" ? "bado inatumwa." : row.reason === "missing_phone" ? "hana namba ya simu." : "hastahili Save the Date (ahadi haijakamilika au kiwango hakijafikiwa)."}`);
      continue;
    }

    const key = idempotencyKey(input.eventId, row.pledgeId);
    const existing = await db.from("save_the_date_deliveries").select("id,delivery_status,card_token").eq("idempotency_key", key).maybeSingle();
    if (existing.error) {
      result.failed += 1;
      result.errors.push(`${row.name}: delivery history could not be checked.`);
      continue;
    }

    // Claim the row before sending (the unique idempotency_key stops a double send).
    let claimed: { id: number; card_token: string } | null = null;
    if (existing.data?.delivery_status === "failed") {
      const retry = await db
        .from("save_the_date_deliveries")
        .update({ delivery_status: "processing", full_name: row.name, recipient_phone: row.phone, variant: preview.event.variant, channel: null, error_message: null, whatsapp_error_message: null, failed_at: null })
        .eq("id", existing.data.id)
        .eq("delivery_status", "failed")
        .select("id,card_token")
        .maybeSingle();
      claimed = retry.data;
    } else if (!existing.data) {
      const inserted = await db
        .from("save_the_date_deliveries")
        .insert({ event_id: input.eventId, pledge_id: row.pledgeId, guest_id: row.guestId, full_name: row.name, recipient_phone: row.phone, variant: preview.event.variant, delivery_status: "processing", idempotency_key: key, created_by: actor.userId })
        .select("id,card_token")
        .maybeSingle();
      claimed = inserted.data;
    }
    if (!claimed) {
      result.skipped += 1;
      result.errors.push(`${row.name}: tayari inatumwa au imetumwa.`);
      continue;
    }

    const phone = row.phone as string;
    let channel: "whatsapp" | "sms" | null = null;
    let providerMessageId: string | undefined;
    let whatsappError = "";
    let smsError = "";

    if (template.configured) {
      try {
        // Nonce in the path, like the invitation card, so Meta can't serve a cached image.
        const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const cardImageUrl = `${input.siteOrigin}/api/save-the-date/${claimed.card_token}/card/${nonce}`;
        await assertCardImage(cardImageUrl);
        const sent = await sendSaveTheDateWhatsAppTemplate({
          phoneNumber: phone,
          templateName: template.templateName as string,
          languageCode: template.languageCode,
          cardImageUrl,
          parameters: [row.name, coupleLine(preview.event), preview.event.eventDate, preview.event.venue],
        });
        channel = "whatsapp";
        providerMessageId = sent.messageId;
      } catch (cause) {
        whatsappError = safeError(cause);
        console.error("Save the Date WhatsApp send failed:", { pledgeId: row.pledgeId, eventId: input.eventId, error: whatsappError });
      }
    } else {
      whatsappError = "WhatsApp Save the Date template is not configured.";
    }

    if (!channel) {
      try {
        const sms = await sendBeemSms({ phoneNumber: phone, message: buildSms(preview.event, row.name, `${input.siteOrigin}/save-the-date/${claimed.card_token}`) });
        if (!sms.success) throw new Error(sms.message);
        channel = "sms";
        providerMessageId = sms.providerMessageId;
      } catch (cause) {
        smsError = safeError(cause);
        console.error("Save the Date SMS send failed:", { pledgeId: row.pledgeId, eventId: input.eventId, error: smsError });
      }
    }

    if (channel) {
      const saved = await db
        .from("save_the_date_deliveries")
        .update({ delivery_status: "sent", channel, provider_message_id: providerMessageId ?? null, sent_at: new Date().toISOString(), error_message: null, whatsapp_error_message: channel === "sms" ? whatsappError || null : null })
        .eq("id", claimed.id);
      if (saved.error) result.errors.push(`${row.name}: sent but could not be recorded.`);
      if (channel === "whatsapp") result.sentWhatsapp += 1;
      else result.sentSms += 1;
    } else {
      const combined = [whatsappError && `WhatsApp: ${whatsappError}`, smsError && `SMS: ${smsError}`].filter(Boolean).join(" ") || "Send failed.";
      await db
        .from("save_the_date_deliveries")
        .update({ delivery_status: "failed", error_message: combined, whatsapp_error_message: whatsappError || null, failed_at: new Date().toISOString() })
        .eq("id", claimed.id);
      result.failed += 1;
      result.errors.push(`${row.name}: ${combined}`);
    }
  }

  return result;
}

/** Card data for the public card URL; the token is the only key it accepts. */
export async function getSaveTheDateCardByToken(db: SupabaseClient, token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data: delivery, error } = await db.from("save_the_date_deliveries").select("event_id,full_name,variant").eq("card_token", token).maybeSingle();
  if (error || !delivery) return null;
  const event = await loadEvent(db, delivery.event_id);
  return { delivery: delivery as { event_id: number; full_name: string; variant: string }, event };
}
