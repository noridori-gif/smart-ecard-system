import type { ContributorGuestSettings } from "@/services/contributorGuestService";

/**
 * Who receives the Save the Date (the client's rule): a pledge that is fully paid AND classified
 * Double with at least 100,000 paid, or Single with at least 70,000 paid. A partial pledge never
 * qualifies, even if the guest already has a card. Note the Single bar (70,000) is the client's own
 * and can sit above the event's single_card_minimum -- e.g. event 23 has single_card_minimum 50,000,
 * so a Single who pledged and paid exactly 50,000 is complete but does not qualify.
 *
 * Shared by the Save the Date tab (display) and services/saveTheDateService.ts (re-checked at send).
 */
export const SAVE_THE_DATE_MIN_PAID = { double: 100_000, single: 70_000 } as const;

export type SaveTheDateVariant = "navy" | "cream";

export type SaveTheDatePledge = {
  pledged_amount: string | number;
  total_paid: string | number;
  calculated_status: string;
};

type ClassificationSettings = Pick<ContributorGuestSettings, "classification_basis" | "single_card_minimum" | "double_card_minimum">;

// Same rule as classifyContribution in services/contributorGuestService.ts (not imported: that
// module is client-side and pulls in the browser Supabase client).
export function saveTheDateClassification(pledge: SaveTheDatePledge, settings: ClassificationSettings) {
  const basis = settings.classification_basis === "pledged_amount" ? Number(pledge.pledged_amount) : Number(pledge.total_paid);
  if (basis >= Number(settings.double_card_minimum)) return "double" as const;
  if (basis >= Number(settings.single_card_minimum)) return "single" as const;
  return "below_minimum" as const;
}

export type SaveTheDateIneligibleReason = "cancelled" | "not_completed" | "below_minimum" | "single_below_70k" | "double_below_100k";

export function saveTheDateEligibility(pledge: SaveTheDatePledge, settings: ClassificationSettings):
  | { eligible: true; cardType: "single" | "double" }
  | { eligible: false; reason: SaveTheDateIneligibleReason; cardType: "single" | "double" | "below_minimum" } {
  const cardType = saveTheDateClassification(pledge, settings);
  if (pledge.calculated_status === "cancelled") return { eligible: false, reason: "cancelled", cardType };
  if (pledge.calculated_status !== "completed") return { eligible: false, reason: "not_completed", cardType };
  const paid = Number(pledge.total_paid);
  if (cardType === "double") return paid >= SAVE_THE_DATE_MIN_PAID.double ? { eligible: true, cardType } : { eligible: false, reason: "double_below_100k", cardType };
  if (cardType === "single") return paid >= SAVE_THE_DATE_MIN_PAID.single ? { eligible: true, cardType } : { eligible: false, reason: "single_below_70k", cardType };
  return { eligible: false, reason: "below_minimum", cardType };
}
