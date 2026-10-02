import { supabase } from "@/lib/supabase";
import type { SaveTheDateIneligibleReason, SaveTheDateVariant } from "@/lib/saveTheDateEligibility";
import type { SaveTheDateChannelMode, SaveTheDateChannelState } from "@/lib/saveTheDateChannels";

// Types duplicated (not imported) from the server-only saveTheDateService.ts, same convention as
// guestThankYouClientService.ts, so this client module never pulls in a "server-only" import.
export type SaveTheDateRow = {
  pledgeId: number;
  guestId: number | null;
  name: string;
  phone: string | null;
  cardType: "single" | "double" | "below_minimum";
  totalPaid: number;
  calculatedStatus: string;
  qualifies: boolean;
  ruleReason: SaveTheDateIneligibleReason | null;
  whatsapp: SaveTheDateChannelState;
  sms: SaveTheDateChannelState;
  smsSegments: number;
};

export type SaveTheDatePreview = {
  event: { id: number; title: string; groomName: string; brideName: string; eventDate: string; venue: string; language: "sw" | "en"; variant: SaveTheDateVariant };
  rows: SaveTheDateRow[];
  whatsappConfigured: boolean;
  smsConfigured: boolean;
  /** Server-side lock (SAVE_THE_DATE_SEND_ALLOWED_EVENT_IDS): sending refused for this event. */
  sendBlocked?: boolean;
  /** Server-side restriction (SAVE_THE_DATE_WHATSAPP_ONLY_EVENT_IDS): WhatsApp only, no SMS fallback. */
  whatsappOnly?: boolean;
};

export type SaveTheDateSendResult = { sentWhatsapp: number; sentSms: number; smsFallbacks: number; failed: number; skipped: number; errors: string[] };

async function request(body: Record<string, unknown>) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired. Please sign in again.");
  const response = await fetch("/api/save-the-date", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  if (response.ok && response.headers.get("content-type")?.startsWith("image/")) return response;
  const payload = (await response.json().catch(() => null)) as (Record<string, unknown> & { error?: string }) | null;
  if (!response.ok || !payload || payload.error) throw new Error(payload?.error || "Save the Date request failed.");
  return payload;
}

export async function previewSaveTheDate(eventId: number): Promise<SaveTheDatePreview> {
  return (await request({ action: "preview", eventId })) as unknown as SaveTheDatePreview;
}

export async function setSaveTheDateVariant(eventId: number, variant: SaveTheDateVariant) {
  await request({ action: "set_variant", eventId, variant });
}

/** Object URL of a rendered card (caller revokes it). Creates no delivery. */
export async function renderSaveTheDateCardPreview(eventId: number, variant: SaveTheDateVariant, guestName?: string) {
  const response = (await request({ action: "card_preview", eventId, variant, guestName })) as Response;
  return URL.createObjectURL(await response.blob());
}

export async function sendSaveTheDate(eventId: number, pledgeIds: number[], mode: SaveTheDateChannelMode, smsFallback: boolean): Promise<SaveTheDateSendResult> {
  return (await request({ action: "send", eventId, pledgeIds, mode, smsFallback, confirmed: true })) as unknown as SaveTheDateSendResult;
}
