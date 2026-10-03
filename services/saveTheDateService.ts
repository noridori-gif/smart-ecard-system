import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeBeemPhoneNumber, sendBeemSms } from "@/services/beemSmsService";
import { normalizeWhatsAppPhoneNumber, sendSaveTheDateWhatsAppTemplate } from "@/services/whatsappCloudService";
import { formatEventDate } from "@/services/invitationMessageService";
import { getSaveTheDateWhatsAppTemplate } from "@/lib/saveTheDateConfig";
import {
  saveTheDateEligibility,
  type SaveTheDateIneligibleReason,
  type SaveTheDateVariant,
} from "@/lib/saveTheDateEligibility";
import {
  planSaveTheDate,
  smsFallbackPossible,
  smsSegments,
  type SaveTheDateChannel,
  type SaveTheDateChannelMode,
  type SaveTheDateChannelState,
  type SaveTheDateDeliveryStatus,
} from "@/lib/saveTheDateChannels";

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
  delivery_status: SaveTheDateDeliveryStatus;
  channel: SaveTheDateChannel | null;
  error_message: string | null;
  sent_at: string | null;
};

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
  /** Why the rule excludes this pledge (null when it qualifies). */
  ruleReason: SaveTheDateIneligibleReason | null;
  whatsapp: SaveTheDateChannelState;
  sms: SaveTheDateChannelState;
  /** Beem segments for this person's SMS (for the cost estimate). */
  smsSegments: number;
};

export type SaveTheDatePreview = {
  event: { id: number; title: string; groomName: string; brideName: string; eventDate: string; venue: string; language: "sw" | "en"; variant: SaveTheDateVariant };
  rows: SaveTheDateRow[];
  whatsappConfigured: boolean;
  smsConfigured: boolean;
};

export type SaveTheDateSendResult = { sentWhatsapp: number; sentSms: number; smsFallbacks: number; failed: number; skipped: number; errors: string[] };

// v2: one row per (pledge, channel), so "both" can send WhatsApp AND SMS to the same person.
// v1 rows (one per pledge) are still honoured: already-sent is checked by pledge_id + channel.
// A resend ("Tuma tena") adds a row keyed by how many rows that channel already has, so two
// simultaneous resends of the same state collide on the unique key and only one goes out.
function idempotencyKey(eventId: number, pledgeId: number, channel: SaveTheDateChannel, resendOf?: number) {
  const key = `save-the-date:v2:${eventId}:${pledgeId}:${channel}`;
  return resendOf === undefined ? key : `${key}:resend:${resendOf}`;
}

function isSmsProviderConfigured() {
  return Boolean(process.env.BEEM_API_KEY?.trim() && process.env.BEEM_SECRET_KEY?.trim() && process.env.BEEM_SENDER_NAME?.trim());
}

function safeError(value: unknown) {
  return (value instanceof Error ? value.message : "Save the Date send failed.").slice(0, 500);
}

function whatsappNumber(phone: string | null) {
  if (!phone) return null;
  try { return normalizeWhatsAppPhoneNumber(phone); } catch { return null; }
}

export function normalizeVariant(value: unknown): SaveTheDateVariant {
  return value === "cream" ? "cream" : "navy";
}

export function normalizeMode(value: unknown): SaveTheDateChannelMode {
  return value === "sms" || value === "both" ? value : "whatsapp";
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

function coupleLine(event: SaveTheDatePreview["event"]) {
  return event.groomName && event.brideName ? `${event.groomName} & ${event.brideName}` : event.title;
}

function buildSms(event: SaveTheDatePreview["event"], name: string, link: string) {
  if (event.language === "en") {
    return `Dear ${name}, please save the date ${event.eventDate} for the wedding of ${coupleLine(event)} at ${event.venue}. A formal invitation will follow. View the card: ${link}`;
  }
  return `Mpendwa ${name}, tafadhali hifadhi tarehe ${event.eventDate} kwa ajili ya harusi ya ${coupleLine(event)} ukumbini ${event.venue}. Mwaliko rasmi utafuata. Tazama kadi: ${link}`;
}

function channelState(phoneValid: boolean, delivery: DeliveryRow | undefined): SaveTheDateChannelState {
  return { valid: phoneValid, status: delivery?.delivery_status ?? null, error: delivery?.error_message ?? null, sentAt: delivery?.sent_at ?? null };
}

// Most relevant row per channel (v1 rows, retries and resends can coexist): one still processing
// wins, then the newest not failed, then the newest failed.
function pickDelivery(current: DeliveryRow | undefined, next: DeliveryRow) {
  if (!current) return next;
  const rank = (row: DeliveryRow) => (row.delivery_status === "processing" ? 2 : row.delivery_status !== "failed" ? 1 : 0);
  if (rank(next) !== rank(current)) return rank(next) > rank(current) ? next : current;
  return next.id > current.id ? next : current;
}

export async function previewSaveTheDate(db: SupabaseClient, eventId: number, siteOrigin = "https://www.smarteventpass.co.tz"): Promise<SaveTheDatePreview> {
  const event = await loadEvent(db, eventId);
  if (event.archived_at) throw new Error("This event is archived.");
  const language: "sw" | "en" = event.language === "en" ? "en" : "sw";

  const [settingsResult, pledgesResult, deliveriesResult] = await Promise.all([
    db.from("event_contributor_guest_settings").select("classification_basis,single_card_minimum,double_card_minimum").eq("event_id", eventId).maybeSingle(),
    db.from("event_pledge_financial_summary").select("id,full_name,phone,guest_id,pledged_amount,total_paid,calculated_status").eq("event_id", eventId).order("full_name", { ascending: true }),
    db.from("save_the_date_deliveries").select("id,pledge_id,delivery_status,channel,error_message,sent_at").eq("event_id", eventId),
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
  const deliveries = new Map<number, { whatsapp?: DeliveryRow; sms?: DeliveryRow }>();
  for (const delivery of (deliveriesResult.data ?? []) as DeliveryRow[]) {
    // A v1 row that failed before a channel was recorded doesn't block or count for either channel.
    if (!delivery.channel) continue;
    const entry = deliveries.get(delivery.pledge_id) ?? {};
    entry[delivery.channel] = pickDelivery(entry[delivery.channel], delivery);
    deliveries.set(delivery.pledge_id, entry);
  }

  const eventInfo: SaveTheDatePreview["event"] = {
    id: event.id,
    title: event.title,
    groomName: event.groom_name?.trim() || "",
    brideName: event.bride_name?.trim() || "",
    eventDate: formatEventDate(event.event_date, language) || event.event_date || "-",
    venue: event.venue?.trim() || "-",
    language,
    variant: normalizeVariant(event.save_the_date_variant),
  };
  // Same length as a real card link, for the segment estimate.
  const sampleLink = `${siteOrigin}/save-the-date/00000000-0000-0000-0000-000000000000`;

  const rows = pledges.map((pledge): SaveTheDateRow => {
    const guest = pledge.guest_id !== null ? guests.get(pledge.guest_id) ?? null : null;
    // The guest record is what the invitation uses, so prefer its name/phone over the pledge's.
    const name = guest?.full_name?.trim() || pledge.full_name;
    const phone = guest?.phone?.trim() || pledge.phone?.trim() || null;
    const rule = saveTheDateEligibility(pledge, settings);
    const sent = deliveries.get(pledge.id) ?? {};
    return {
      pledgeId: pledge.id,
      guestId: pledge.guest_id,
      name,
      phone,
      cardType: rule.cardType,
      totalPaid: Number(pledge.total_paid),
      calculatedStatus: pledge.calculated_status,
      qualifies: rule.eligible,
      ruleReason: rule.eligible ? null : rule.reason,
      whatsapp: channelState(Boolean(whatsappNumber(phone)), sent.whatsapp),
      sms: channelState(Boolean(normalizeBeemPhoneNumber(phone)), sent.sms),
      smsSegments: smsSegments(buildSms(eventInfo, name, sampleLink)),
    };
  });

  return {
    event: eventInfo,
    rows,
    whatsappConfigured: getSaveTheDateWhatsAppTemplate(language).configured,
    smsConfigured: isSmsProviderConfigured(),
  };
}

export async function setSaveTheDateVariant(db: SupabaseClient, eventId: number, variant: SaveTheDateVariant) {
  const { error } = await db.from("events").update({ save_the_date_variant: variant }).eq("id", eventId);
  if (error) throw new Error(error.message);
}

/** Fetches the card the way Meta will, so a broken card fails here instead of after Meta accepts. */
async function assertCardImage(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.startsWith("image/")) throw new Error(`Save the Date card returned HTTP ${response.status} (${type || "no type"}).`);
  await response.arrayBuffer();
}

/**
 * Claims the (pledge, channel) row before sending: returns the row to send on, or null when that
 * channel is already sent / in progress (including v1 rows). A failed row is reused (retry).
 * With `resend`, only a send in progress blocks, and every resend gets its own new row.
 */
async function claim(
  db: SupabaseClient,
  input: { eventId: number; row: SaveTheDateRow; channel: SaveTheDateChannel; variant: SaveTheDateVariant; userId: string; resend: boolean }
): Promise<{ id: number; card_token: string } | null> {
  const { eventId, row, channel } = input;
  const existing = await db
    .from("save_the_date_deliveries")
    .select("id,delivery_status,card_token")
    .eq("pledge_id", row.pledgeId)
    .eq("channel", channel);
  if (existing.error) throw new Error("delivery history could not be checked.");
  const rows = (existing.data ?? []) as Array<{ id: number; delivery_status: SaveTheDateDeliveryStatus; card_token: string }>;
  const fields = { full_name: row.name, recipient_phone: row.phone as string, variant: input.variant, error_message: null, whatsapp_error_message: null, failed_at: null };
  const insertRow = (key: string) => db
    .from("save_the_date_deliveries")
    .insert({ ...fields, event_id: eventId, pledge_id: row.pledgeId, guest_id: row.guestId, channel, delivery_status: "processing", idempotency_key: key, created_by: input.userId })
    .select("id,card_token")
    .maybeSingle();
  if (input.resend) {
    if (rows.some((item) => item.delivery_status === "processing")) return null;
    return (await insertRow(idempotencyKey(eventId, row.pledgeId, channel, rows.length))).data; // null on a race.
  }
  if (rows.some((item) => item.delivery_status !== "failed")) return null;
  const failed = rows.sort((a, b) => b.id - a.id)[0];
  if (failed) {
    const retry = await db
      .from("save_the_date_deliveries")
      .update({ ...fields, delivery_status: "processing", provider_message_id: null, delivered_at: null, read_at: null })
      .eq("id", failed.id)
      .eq("delivery_status", "failed")
      .select("id,card_token")
      .maybeSingle();
    return retry.data;
  }
  const inserted = await insertRow(idempotencyKey(eventId, row.pledgeId, channel));
  return inserted.data; // null on a unique-key race: someone else claimed it first.
}

async function finish(db: SupabaseClient, id: number, outcome: { ok: true; messageId?: string } | { ok: false; error: string }) {
  const update = outcome.ok
    ? { delivery_status: "sent", provider_message_id: outcome.messageId ?? null, sent_at: new Date().toISOString(), error_message: null }
    : { delivery_status: "failed", error_message: outcome.error, failed_at: new Date().toISOString() };
  return db.from("save_the_date_deliveries").update(update).eq("id", id);
}

export async function sendSaveTheDate(
  db: SupabaseClient,
  input: { eventId: number; pledgeIds: number[]; siteOrigin: string; mode: SaveTheDateChannelMode; smsFallback: boolean; resend: boolean },
  actor: { userId: string }
): Promise<SaveTheDateSendResult> {
  // Re-read everything at send time: the rule and each channel's state are checked against the
  // database now, not what the organizer's screen showed.
  const preview = await previewSaveTheDate(db, input.eventId, input.siteOrigin);
  const wanted = new Set(input.pledgeIds);
  const result: SaveTheDateSendResult = { sentWhatsapp: 0, sentSms: 0, smsFallbacks: 0, failed: 0, skipped: 0, errors: [] };
  const template = getSaveTheDateWhatsAppTemplate(preview.event.language);
  const smsReady = isSmsProviderConfigured();
  // The fallback is opt-in and only exists in WhatsApp mode (never hidden).
  const fallback = input.mode === "whatsapp" && input.smsFallback;

  const sendSms = async (row: SaveTheDateRow, claimed: { id: number; card_token: string }) => {
    try {
      if (!smsReady) throw new Error("BEEM SMS is not configured.");
      const sms = await sendBeemSms({ phoneNumber: row.phone as string, message: buildSms(preview.event, row.name, `${input.siteOrigin}/save-the-date/${claimed.card_token}`) });
      if (!sms.success) throw new Error(sms.message);
      await finish(db, claimed.id, { ok: true, messageId: sms.providerMessageId });
      return true;
    } catch (cause) {
      const error = safeError(cause);
      await finish(db, claimed.id, { ok: false, error: `SMS: ${error}` });
      result.errors.push(`${row.name} (SMS): ${error}`);
      return false;
    }
  };

  const sendWhatsApp = async (row: SaveTheDateRow, claimed: { id: number; card_token: string }) => {
    try {
      if (!template.configured) throw new Error("WhatsApp Save the Date template is not configured.");
      // Nonce in the path, like the invitation card, so Meta can't serve a cached image.
      const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const cardImageUrl = `${input.siteOrigin}/api/save-the-date/${claimed.card_token}/card/${nonce}`;
      await assertCardImage(cardImageUrl);
      const sent = await sendSaveTheDateWhatsAppTemplate({
        phoneNumber: row.phone as string,
        templateName: template.templateName as string,
        languageCode: template.languageCode,
        cardImageUrl,
        parameters: [row.name, coupleLine(preview.event), preview.event.eventDate, preview.event.venue],
      });
      await finish(db, claimed.id, { ok: true, messageId: sent.messageId });
      return true;
    } catch (cause) {
      const error = safeError(cause);
      await finish(db, claimed.id, { ok: false, error: `WhatsApp: ${error}` });
      result.errors.push(`${row.name} (WhatsApp): ${error}`);
      return false;
    }
  };

  for (const row of preview.rows.filter((item) => wanted.has(item.pledgeId))) {
    const plan = planSaveTheDate(row, input.mode, input.resend);
    if (!plan.channels.length) {
      result.skipped += 1;
      result.errors.push(`${row.name}: ${plan.reason === "already_sent" ? "tayari ametumiwa Save the Date kwa njia hii." : plan.reason === "in_progress" ? "bado inatumwa." : plan.reason === "missing_phone" ? "hana namba sahihi kwa njia hii." : "hastahili Save the Date (ahadi haijakamilika au kiwango hakijafikiwa)."}`);
      continue;
    }

    for (const channel of plan.channels) {
      let claimed: { id: number; card_token: string } | null;
      try {
        claimed = await claim(db, { eventId: input.eventId, row, channel, variant: preview.event.variant, userId: actor.userId, resend: input.resend });
      } catch (cause) {
        result.failed += 1;
        result.errors.push(`${row.name} (${channel}): ${safeError(cause)}`);
        continue;
      }
      if (!claimed) {
        result.skipped += 1;
        result.errors.push(`${row.name} (${channel}): tayari inatumwa au imetumwa.`);
        continue;
      }

      if (channel === "sms") {
        if (await sendSms(row, claimed)) result.sentSms += 1;
        else result.failed += 1;
        continue;
      }

      if (await sendWhatsApp(row, claimed)) {
        result.sentWhatsapp += 1;
        continue;
      }
      result.failed += 1;
      // Opt-in fallback: an SMS on its own delivery row, so the WhatsApp failure stays visible.
      if (fallback && smsFallbackPossible(row, input.resend)) {
        const smsClaim = await claim(db, { eventId: input.eventId, row, channel: "sms", variant: preview.event.variant, userId: actor.userId, resend: input.resend }).catch(() => null);
        if (smsClaim && (await sendSms(row, smsClaim))) {
          result.sentSms += 1;
          result.smsFallbacks += 1;
        }
      }
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
