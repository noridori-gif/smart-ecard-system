import { supabase } from "@/lib/supabase";

export type ContributorGuestSettings = {
  event_id: number;
  contributor_guest_sync_enabled: boolean;
  classification_basis: "paid_amount" | "pledged_amount";
  single_card_minimum: string;
  double_card_minimum: string;
  below_minimum_behavior: "no_guest" | "pending_guest";
  auto_upgrade_guest_card: boolean;
  auto_downgrade_guest_card: boolean;
};

export const defaultContributorGuestSettings = (eventId: number): ContributorGuestSettings => ({
  event_id: eventId,
  contributor_guest_sync_enabled: false,
  classification_basis: "paid_amount",
  single_card_minimum: "50000",
  double_card_minimum: "120000",
  below_minimum_behavior: "no_guest",
  auto_upgrade_guest_card: true,
  auto_downgrade_guest_card: false,
});

export async function getContributorGuestSettings(eventId: number) {
  const { data, error } = await supabase
    .from("event_contributor_guest_settings")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ContributorGuestSettings | null) ?? defaultContributorGuestSettings(eventId);
}

export async function saveContributorGuestSettings(settings: ContributorGuestSettings) {
  const payload = {
    target_event_id: settings.event_id,
    sync_enabled: settings.contributor_guest_sync_enabled,
    basis: settings.classification_basis,
    single_minimum: settings.single_card_minimum,
    double_minimum: settings.double_card_minimum,
    minimum_behavior: settings.below_minimum_behavior,
    auto_upgrade: settings.auto_upgrade_guest_card,
    auto_downgrade: settings.auto_downgrade_guest_card,
  };
  const { data, error } = await supabase.rpc("save_contributor_guest_settings", payload);
  if (error) {
    console.error("save_contributor_guest_settings RPC failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      eventId: settings.event_id,
      payload: {
        ...payload,
        target_event_id: settings.event_id,
      },
    });
    throw new Error(error.message);
  }
  return data as ContributorGuestSettings;
}

export async function recalculateContributorGuest(pledgeId: number) {
  const { data, error } = await supabase.rpc("sync_contributor_guest", {
    target_pledge_id: pledgeId,
    sync_source: "eligibility_dashboard",
  });
  if (error) {
    console.error("sync_contributor_guest RPC failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      pledgeId,
    });
    throw new Error(error.message);
  }
  return data as { status: string };
}
