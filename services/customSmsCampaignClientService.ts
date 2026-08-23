import { supabase } from "@/lib/supabase";

export type CustomSmsCampaign = {
  id: number;
  event_id: number;
  name: string;
  message_template: string;
  created_at: string;
  updated_at: string;
};

export type CustomSmsSkipReason = "missing_phone" | "invalid_phone" | "provider_unavailable" | "already_sent" | "in_progress";

export type CustomSmsRecipientRow = {
  guestId: number;
  name: string;
  phone: string | null;
  message: string;
  smsSegments: number;
  smsEncoding: "GSM-7" | "UCS-2";
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

async function callApi<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch("/api/sms/custom-campaign", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((payload as { error?: string } | null)?.error ?? "SMS outreach request failed.");
  }
  return payload as T;
}

export async function listCampaigns(eventId: number) {
  return (await callApi<{ campaigns: CustomSmsCampaign[] }>({ action: "listCampaigns", eventId })).campaigns;
}

export async function listDeliveries(eventId: number) {
  return (await callApi<{ deliveries: CustomSmsDeliveryRow[] }>({ action: "listDeliveries", eventId })).deliveries;
}

export async function saveCampaign(input: { eventId: number; name: string; messageTemplate: string; campaignId?: number }) {
  return (await callApi<{ campaign: CustomSmsCampaign }>({ action: "saveCampaign", ...input })).campaign;
}

export async function previewCampaign(input: { campaignId: number; guestIds: number[] }) {
  return callApi<CustomSmsPreview>({ action: "preview", ...input });
}

export async function sendCampaign(input: { campaignId: number; guestIds: number[] }) {
  return callApi<CustomSmsSendResult>({ action: "send", ...input, confirmed: true });
}
