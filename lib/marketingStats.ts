import { serviceDatabase } from "@/lib/makeConnectorServer";

export type MarketingStats = {
  eventsManaged: number;
  guestsCheckedIn: number;
};

// Below this, showing a number reads as thin rather than trustworthy -- the
// landing page falls back to a plain trust line instead (see app/page.tsx).
const MIN_MEANINGFUL_COUNT = 3;

export async function getMarketingStats(): Promise<MarketingStats | null> {
  try {
    const db = serviceDatabase();

    const [eventsResult, guestsResult] = await Promise.all([
      db.from("events").select("id", { count: "exact", head: true }).is("archived_at", null),
      db.from("guests").select("id", { count: "exact", head: true }).gt("checked_in_count", 0),
    ]);

    if (eventsResult.error || guestsResult.error) {
      return null;
    }

    const eventsManaged = eventsResult.count ?? 0;
    const guestsCheckedIn = guestsResult.count ?? 0;

    if (eventsManaged < MIN_MEANINGFUL_COUNT || guestsCheckedIn < MIN_MEANINGFUL_COUNT) {
      return null;
    }

    return { eventsManaged, guestsCheckedIn };
  } catch (error) {
    console.error("Marketing stats query failed:", error);
    return null;
  }
}
