import { supabase } from "@/lib/supabase";

// Types are duplicated (not imported) from the server-only
// guestThankYouService.ts on purpose -- same convention as
// customSmsCampaignClientService.ts, so this client module never pulls in
// a "server-only" import.
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

async function requestThankYou(body: Record<string, unknown>) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch("/api/invitations/thank-you", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as (Record<string, unknown> & { error?: string }) | null;
  if (!response.ok || !payload || payload.error) {
    throw new Error(payload?.error || "Guest thank-you request failed.");
  }

  return payload;
}

export async function previewGuestThankYou(eventId: number, guestIds?: number[]): Promise<GuestThankYouPreview> {
  return (await requestThankYou({ action: "preview", eventId, guestIds })) as unknown as GuestThankYouPreview;
}

export async function sendGuestThankYou(eventId: number, guestIds: number[]): Promise<GuestThankYouSendResult> {
  return (await requestThankYou({ action: "send", eventId, guestIds, confirmed: true })) as unknown as GuestThankYouSendResult;
}
