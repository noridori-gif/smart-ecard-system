"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { getFinanceActivityLog, type ActivityLogCursor, type FinanceActivityLogEntry } from "@/services/financeActivityLogService";
import { describeActivityEntry } from "@/lib/financeActivitySentences";
import { formatAppRelativeTime, formatAppTzs } from "@/lib/i18n/formatters";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";

const PAGE_SIZE = 30;

export default function ActivityLogFeed({ eventId }: { eventId: number }) {
  const { language } = useAppLanguage();
  const formatTzs = (value: number) => formatAppTzs(value, language);
  const [entries, setEntries] = useState<FinanceActivityLogEntry[]>([]);
  const [cursor, setCursor] = useState<ActivityLogCursor | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadFirstPage = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const { entries: rows, nextCursor } = await getFinanceActivityLog(eventId, null, PAGE_SIZE);
      setEntries(rows); setCursor(nextCursor); setHasMore(nextCursor !== null);
    } catch (err) { setError(err instanceof Error ? err.message : "Activity log could not be loaded."); }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { const timer = setTimeout(() => void loadFirstPage(), 0); return () => clearTimeout(timer); }, [loadFirstPage]);

  async function loadMore() {
    if (!cursor) return;
    try {
      setLoadingMore(true);
      const { entries: rows, nextCursor } = await getFinanceActivityLog(eventId, cursor, PAGE_SIZE);
      setEntries((current) => [...current, ...rows]); setCursor(nextCursor); setHasMore(nextCursor !== null);
    } catch (err) { setError(err instanceof Error ? err.message : "More activity could not be loaded."); }
    finally { setLoadingMore(false); }
  }

  return (
    <section className="sep-card p-5">
      <h2 className="text-xl font-bold">Activity Log</h2>
      <p className="mt-1 text-xs text-slate-500">A running history of pledge, payment, and expense actions for this event.</p>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-500">Loading…</p>
        ) : entries.length ? (
          entries.map((entry) => {
            const { text, badge } = describeActivityEntry(entry, formatTzs);
            const finalBadge = entry.is_admin_action ? "Admin action" : badge;
            return (
              <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <p className="text-slate-700">{text}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {finalBadge && <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{finalBadge}</span>}
                  <span className="whitespace-nowrap text-xs text-slate-400">{formatAppRelativeTime(entry.created_at, language)}</span>
                </div>
              </div>
            );
          })
        ) : (
          <p className="p-6 text-center text-sm text-slate-500">No activity recorded yet.</p>
        )}
      </div>
      {hasMore && !loading && (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="secondary" size="sm" loading={loadingMore} disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </section>
  );
}
