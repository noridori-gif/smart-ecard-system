import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendBeemSms } from "@/services/beemSmsService";
import {
  getGuestThankYouWhatsAppReadiness,
  getGuestThankYouWhatsAppTemplate,
} from "@/lib/guestThankYouConfig";
import { formatEventDate } from "@/services/invitationMessageService";
import { sendGuestThankYouWhatsAppTemplate } from "@/services/whatsappCloudService";

type GuestRow = { id: number; full_name: string; phone: string | null };
type EventRow = {
  id: number;
  title: string;
  bride_name: string | null;
  groom_name: string | null;
  event_date: string | null;
  language: string | null;
  archived_at: string | null;
};
type DeliveryHistoryRow = {
  guest_id: number;
  delivery_status: string;
  channel: string | null;
  error_message: string | null;
};

export type GuestThankYouSkipReason = "missing_phone" | "already_sent" | "in_progress";

export type GuestThankYouRecipientRow = {
  guestId: number;
  name: string;
  phone: string | null;
  message: string;
  eligible: boolean;
  skippedReason: GuestThankYouSkipReason | null;
  deliveryStatus: string | null;
  deliveryChannel: string | null;
  errorMessage: string | null;
  idempotencyKey: string;
};

export type GuestThankYouPreview = {
  event: {
    id: number;
    title: string;
    eventDate: string;
    brideName: string;
    groomName: string;
    language: "sw" | "en";
  };
  rows: GuestThankYouRecipientRow[];
  providerReady: boolean;
  providerMessage: string;
  whatsappConfigured: boolean;
  smsConfigured: boolean;
};

export type GuestThankYouSendResult = {
  queued: number;
  sentWhatsapp: number;
  sentSms: number;
  failed: number;
  skipped: number;
  errors: string[];
};

function idempotencyKey(eventId: number, guestId: number) {
  return `guest-thank-you:v1:${eventId}:${guestId}`;
}

// Deliberately duplicated (not imported) from beemSmsService's internal
// getBeemConfig -- same reasoning as customSmsCampaignService.ts's
// smsProviderStatus: that helper isn't exported, and this is just a one-line
// env check.
function isSmsProviderConfigured() {
  return Boolean(
    process.env.BEEM_API_KEY?.trim() &&
      process.env.BEEM_SECRET_KEY?.trim() &&
      process.env.BEEM_SENDER_NAME?.trim()
  );
}

function safeError(value: unknown) {
  return (value instanceof Error ? value.message : "Guest thank-you send failed.").slice(0, 500);
}

function buildThankYouMessage(
  language: "sw" | "en",
  guestName: string,
  brideName: string,
  groomName: string,
  eventDate: string
) {
  if (language === "en") {
    return `Hello ${guestName}, thank you so much for attending / supporting the wedding of ${brideName} and ${groomName} on ${eventDate}. God bless you!`;
  }

  return `Habari ${guestName}, tunakushukuru sana kwa kuhudhuria/kutusaidia kwenye harusi ya ${brideName} na ${groomName} tarehe ${eventDate}. Mungu akubariki!`;
}

export async function previewGuestThankYou(
  db: SupabaseClient,
  input: { eventId: number; guestIds?: number[] }
): Promise<GuestThankYouPreview> {
  const { data: event, error: eventError } = await db
    .from("events")
    .select("id,title,bride_name,groom_name,event_date,language,archived_at")
    .eq("id", input.eventId)
    .single();
  if (eventError || !event) throw new Error("Event could not be loaded.");
  const eventRow = event as EventRow;
  if (eventRow.archived_at) throw new Error("This event is archived.");

  const language: "sw" | "en" = eventRow.language === "en" ? "en" : "sw";
  const eventDate = formatEventDate(eventRow.event_date, language) || eventRow.event_date || "-";
  const brideName = eventRow.bride_name?.trim() || "-";
  const groomName = eventRow.groom_name?.trim() || "-";

  let guestQuery = db
    .from("guests")
    .select("id,full_name,phone")
    .eq("event_id", input.eventId)
    .order("full_name", { ascending: true });
  if (input.guestIds?.length) guestQuery = guestQuery.in("id", input.guestIds);
  const { data: guests, error: guestsError } = await guestQuery;
  if (guestsError) throw new Error(guestsError.message);
  const guestRows = (guests ?? []) as GuestRow[];

  const guestIds = guestRows.map((guest) => guest.id);
  const { data: history, error: historyError } = guestIds.length
    ? await db
        .from("guest_thank_you_deliveries")
        .select("guest_id,delivery_status,channel,error_message")
        .eq("event_id", input.eventId)
        .in("guest_id", guestIds)
    : { data: [] as DeliveryHistoryRow[], error: null };
  if (historyError) throw new Error(historyError.message);

  const historyByGuest = new Map<number, DeliveryHistoryRow>();
  for (const item of (history ?? []) as DeliveryHistoryRow[]) historyByGuest.set(item.guest_id, item);

  const whatsappReadiness = getGuestThankYouWhatsAppReadiness();
  const whatsappConfigured =
    whatsappReadiness.whatsappConfigured &&
    (language === "en" ? whatsappReadiness.templateEnConfigured : whatsappReadiness.templateSwConfigured);
  const smsReady = isSmsProviderConfigured();

  const rows: GuestThankYouRecipientRow[] = guestRows.map((guest) => {
    const existing = historyByGuest.get(guest.id) ?? null;
    const message = buildThankYouMessage(language, guest.full_name, brideName, groomName, eventDate);

    let reason: GuestThankYouSkipReason | null = null;
    if (!guest.phone?.trim()) reason = "missing_phone";
    else if (existing?.delivery_status === "sent") reason = "already_sent";
    else if (existing?.delivery_status === "processing") reason = "in_progress";

    return {
      guestId: guest.id,
      name: guest.full_name,
      phone: guest.phone,
      message,
      eligible: !reason,
      skippedReason: reason,
      deliveryStatus: existing?.delivery_status ?? null,
      deliveryChannel: existing?.channel ?? null,
      errorMessage: existing?.error_message ?? null,
      idempotencyKey: idempotencyKey(input.eventId, guest.id),
    };
  });

  return {
    event: { id: eventRow.id, title: eventRow.title, eventDate, brideName, groomName, language },
    rows,
    providerReady: whatsappConfigured || smsReady,
    providerMessage: [
      whatsappConfigured
        ? "WhatsApp: thank-you template imesetiwa."
        : "WhatsApp: thank-you template haijasetiwa bado (angalia Meta Business Manager na environment variables).",
      smsReady ? "SMS: BEEM imesetiwa (fallback)." : "SMS: BEEM haijasetiwa bado.",
    ].join(" "),
    whatsappConfigured,
    smsConfigured: smsReady,
  };
}

export async function sendGuestThankYou(
  db: SupabaseClient,
  input: { eventId: number; guestIds: number[] },
  actor: { userId: string }
): Promise<GuestThankYouSendResult> {
  const preview = await previewGuestThankYou(db, { eventId: input.eventId, guestIds: input.guestIds });
  const result: GuestThankYouSendResult = { queued: 0, sentWhatsapp: 0, sentSms: 0, failed: 0, skipped: 0, errors: [] };
  const template = getGuestThankYouWhatsAppTemplate(preview.event.language);

  for (const row of preview.rows) {
    if (!row.eligible) {
      result.skipped += 1;
      result.errors.push(
        row.skippedReason === "already_sent"
          ? `${row.name}: tayari ametumiwa ujumbe huu wa shukrani.`
          : row.skippedReason === "in_progress"
            ? `${row.name}: ujumbe wake bado unatumwa.`
            : `${row.name}: hana namba ya simu.`
      );
      continue;
    }

    const existing = await db
      .from("guest_thank_you_deliveries")
      .select("id,delivery_status")
      .eq("idempotency_key", row.idempotencyKey)
      .maybeSingle();
    if (existing.error) {
      result.failed += 1;
      result.errors.push(`${row.name}: delivery history could not be checked.`);
      continue;
    }
    if (existing.data && existing.data.delivery_status === "sent") {
      result.skipped += 1;
      result.errors.push(`${row.name}: tayari ametumiwa ujumbe huu wa shukrani.`);
      continue;
    }
    if (existing.data && existing.data.delivery_status === "processing") {
      result.skipped += 1;
      result.errors.push(`${row.name}: ujumbe wake bado unatumwa.`);
      continue;
    }

    let log: { id: number } | null = null;
    if (existing.data && existing.data.delivery_status === "failed") {
      const retry = await db
        .from("guest_thank_you_deliveries")
        .update({
          delivery_status: "processing",
          full_name: row.name,
          recipient_phone: row.phone ?? "",
          channel: null,
          error_message: null,
          failed_at: null,
        })
        .eq("id", existing.data.id)
        .eq("delivery_status", "failed")
        .select("id")
        .maybeSingle();
      if (retry.error || !retry.data) {
        result.failed += 1;
        result.errors.push(`${row.name}: retry could not be prepared.`);
        continue;
      }
      log = retry.data;
    } else {
      const inserted = await db
        .from("guest_thank_you_deliveries")
        .insert({
          event_id: input.eventId,
          guest_id: row.guestId,
          full_name: row.name,
          recipient_phone: row.phone ?? "",
          delivery_status: "processing",
          idempotency_key: row.idempotencyKey,
          created_by: actor.userId,
        })
        .select("id")
        .maybeSingle();
      if (inserted.error || !inserted.data) {
        result.failed += 1;
        result.errors.push(`${row.name}: delivery could not be recorded.`);
        continue;
      }
      log = inserted.data;
    }

    result.queued += 1;

    const phone = row.phone as string;
    let sentChannel: "whatsapp" | "sms" | null = null;
    let providerMessageId: string | undefined;
    let lastError = "";

    if (template.configured) {
      try {
        const sent = await sendGuestThankYouWhatsAppTemplate({
          phoneNumber: phone,
          templateName: template.templateName as string,
          languageCode: template.languageCode,
          parameters: [row.name, preview.event.brideName, preview.event.groomName, preview.event.eventDate],
        });
        sentChannel = "whatsapp";
        providerMessageId = sent.messageId;
      } catch (cause) {
        lastError = `WhatsApp: ${safeError(cause)}`;
      }
    } else {
      lastError = "WhatsApp: thank-you template is not configured.";
    }

    if (!sentChannel) {
      try {
        const sms = await sendBeemSms({ phoneNumber: phone, message: row.message });
        if (!sms.success) throw new Error(sms.message);
        sentChannel = "sms";
        providerMessageId = sms.providerMessageId;
      } catch (cause) {
        lastError = `${lastError} SMS: ${safeError(cause)}`;
      }
    }

    if (sentChannel) {
      const saved = await db
        .from("guest_thank_you_deliveries")
        .update({
          delivery_status: "sent",
          channel: sentChannel,
          provider_message_id: providerMessageId ?? null,
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", log.id);
      if (saved.error) {
        result.failed += 1;
        result.errors.push(`${row.name}: sent but could not be recorded.`);
        continue;
      }
      if (sentChannel === "whatsapp") result.sentWhatsapp += 1;
      else result.sentSms += 1;
    } else {
      const saved = await db
        .from("guest_thank_you_deliveries")
        .update({
          delivery_status: "failed",
          error_message: lastError || "Send failed.",
          failed_at: new Date().toISOString(),
        })
        .eq("id", log.id);
      result.failed += 1;
      result.errors.push(`${row.name}: ${lastError}`);
      if (saved.error) result.errors.push(`${row.name}: failure could not be recorded.`);
    }
  }

  return result;
}
