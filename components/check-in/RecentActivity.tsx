import { formatPassIdForDisplay } from "@/lib/passId";
import CheckInIcon, { type CheckInIconName } from "./CheckInIcons";

export type ActivityStatus = "checked_in" | "already_checked_in" | "invalid";

export type ActivityEntry = {
  id: string;
  status: ActivityStatus;
  guestName: string | null;
  passId: string | null;
  detail: string;
  occurredAt: string;
};

export function passLabel(allowed: number) {
  return allowed === 1 ? "Single Pass" : allowed === 2 ? "Double Pass" : `${allowed}-Guest Pass`;
}

const statusConfig: Record<ActivityStatus, { icon: CheckInIconName; iconWrap: string; label: string }> = {
  checked_in: { icon: "success", iconWrap: "bg-emerald-50 text-emerald-700", label: "Checked in" },
  already_checked_in: { icon: "warning", iconWrap: "bg-amber-50 text-amber-700", label: "Duplicate scan" },
  invalid: { icon: "error", iconWrap: "bg-red-50 text-red-700", label: "Rejected" },
};

export default function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section className="sep-card p-4 sm:p-6" aria-labelledby="recent-activity-title">
      <div>
        <h2 id="recent-activity-title" className="sep-card-title">Recent Activity</h2>
        <p className="sep-secondary mt-1">Successful, duplicate, and rejected scans for this session.</p>
      </div>
      <div className="mt-4 max-h-96 overflow-y-auto">
        {entries.length ? (
          <ul className="divide-y divide-stone-200">
            {entries.map((entry) => {
              const config = statusConfig[entry.status];
              return (
                <li key={entry.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${config.iconWrap}`}>
                    <CheckInIcon name={config.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{entry.guestName ?? (entry.passId ? formatPassIdForDisplay(entry.passId) : null) ?? "Unknown pass"}</p>
                    <p className="truncate text-xs text-slate-500">{config.label} · {entry.detail}</p>
                  </div>
                  <time className="shrink-0 text-sm font-semibold tabular-nums text-slate-600" dateTime={entry.occurredAt}>
                    {new Intl.DateTimeFormat("en-TZ", { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.occurredAt))}
                  </time>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">No scan activity recorded for this event yet.</p>
        )}
      </div>
    </section>
  );
}
