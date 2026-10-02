/**
 * Which channels a Save the Date goes out on, per recipient, for the mode the organizer picks in
 * the tab. Shared by the tab (counts, estimate, selection) and services/saveTheDateService.ts
 * (re-checked at send time), so both always agree.
 *
 * There is one phone number per person (guests.phone, else event_pledges.phone). Each channel
 * validates it with its own rule (SMS/Beem: Tanzanian 255 + 9 digits; WhatsApp: any number with at
 * least 10 digits), computed on the server and passed in as `valid`.
 */

export type SaveTheDateChannel = "whatsapp" | "sms";
export type SaveTheDateChannelMode = "whatsapp" | "sms" | "both";
export type SaveTheDateDeliveryStatus = "processing" | "sent" | "delivered" | "read" | "failed";

export type SaveTheDateChannelState = {
  /** The person's number passes this channel's rule. */
  valid: boolean;
  status: SaveTheDateDeliveryStatus | null;
  error: string | null;
  sentAt: string | null;
};

export type SaveTheDatePlanReason = "not_qualified" | "missing_phone" | "already_sent" | "in_progress";

export const SAVE_THE_DATE_CHANNEL_LABEL: Record<SaveTheDateChannel, string> = { whatsapp: "WhatsApp", sms: "SMS" };

/** sent / delivered / read all mean "this channel has reached Meta or Beem". */
export function isChannelDone(state: SaveTheDateChannelState) {
  return state.status === "sent" || state.status === "delivered" || state.status === "read";
}

export function channelsForMode(mode: SaveTheDateChannelMode): SaveTheDateChannel[] {
  return mode === "both" ? ["whatsapp", "sms"] : [mode];
}

/**
 * The channels still to send for one recipient. In "both" mode a person whose number is valid for
 * only one channel still gets that one (client's choice: nobody is dropped because their number
 * doesn't work on WhatsApp). A failed channel is sendable again (retry).
 */
export function planSaveTheDate(
  row: { qualifies: boolean; whatsapp: SaveTheDateChannelState; sms: SaveTheDateChannelState },
  mode: SaveTheDateChannelMode
): { channels: SaveTheDateChannel[]; reason: SaveTheDatePlanReason | null } {
  if (!row.qualifies) return { channels: [], reason: "not_qualified" };
  const valid = channelsForMode(mode).filter((channel) => row[channel].valid);
  if (!valid.length) return { channels: [], reason: "missing_phone" };
  const pending = valid.filter((channel) => !isChannelDone(row[channel]) && row[channel].status !== "processing");
  if (pending.length) return { channels: pending, reason: null };
  return { channels: [], reason: valid.some((channel) => row[channel].status === "processing") ? "in_progress" : "already_sent" };
}

/**
 * Whether the optional "SMS if WhatsApp fails" fallback (WhatsApp mode only, opt-in) could still
 * send an SMS to this recipient.
 */
export function smsFallbackPossible(row: { sms: SaveTheDateChannelState }) {
  return row.sms.valid && !isChannelDone(row.sms) && row.sms.status !== "processing";
}

/** SMS segments Beem bills for a message: GSM-7 160/153 per part, otherwise UCS-2 70/67. */
const GSM_7 = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;
export function smsSegments(message: string) {
  const gsm = GSM_7.test(message);
  // ^ { } \ [ ~ ] | € take two septets in GSM-7.
  const length = gsm ? [...message].reduce((sum, char) => sum + ("^{}\\[~]|€".includes(char) ? 2 : 1), 0) : [...message].length;
  const [single, multi] = gsm ? [160, 153] : [70, 67];
  return length <= single ? 1 : Math.ceil(length / multi);
}
