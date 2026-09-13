import { formatPassIdForDisplay } from "@/lib/passId";
import CheckInIcon, { type CheckInIconName } from "./CheckInIcons";

export type ActivityStatus = "checked_in" | "partially_checked_in" | "already_checked_in" | "invalid";

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

const statusConfig: Record<ActivityStatus, { icon: CheckInIconName; pill: string; label: string }> = {
  checked_in: { icon: "success", pill: "bg-emerald-50 text-emerald-700", label: "Checked In" },
  partially_checked_in: { icon: "clock", pill: "bg-sky-50 text-sky-700", label: "Partial" },
  already_checked_in: { icon: "warning", pill: "bg-amber-50 text-amber-700", label: "Duplicate" },
  invalid: { icon: "error", pill: "bg-red-50 text-red-700", label: "Rejected" },
};

export default function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section className="sep-table-shell" aria-labelledby="recent-activity-title">
      <div className="p-4 sm:p-6 sm:pb-0">
        <h2 id="recent-activity-title" className="sep-card-title">Recent Check-Ins</h2>
        <p className="sep-secondary mt-1">Successful, duplicate, and rejected scans for this session.</p>
      </div>

      {entries.length ? (
        <div className="sep-table-scroll mt-4">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 sm:px-6">#</th>
                <th className="px-4 py-2 sm:px-6">Name</th>
                <th className="px-4 py-2 sm:px-6">Details</th>
                <th className="px-4 py-2 sm:px-6">Time</th>
                <th className="px-4 py-2 pr-4 text-right sm:pr-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => {
                const config = statusConfig[entry.status];
                return (
                  <tr key={entry.id} className="border-t border-stone-200">
                    <td className="px-4 py-3 font-semibold text-slate-400 sm:px-6">{index + 1}</td>
                    <td className="max-w-[12rem] truncate px-4 py-3 font-bold text-slate-900 sm:px-6">{entry.guestName ?? (entry.passId ? formatPassIdForDisplay(entry.passId) : null) ?? "Unknown pass"}</td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-slate-500 sm:px-6">{entry.detail}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-600 sm:px-6">
                      <time dateTime={entry.occurredAt}>{new Intl.DateTimeFormat("en-TZ", { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.occurredAt))}</time>
                    </td>
                    <td className="px-4 py-3 pr-4 text-right sm:pr-6">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${config.pill}`}>
                        <CheckInIcon name={config.icon} className="h-3.5 w-3.5" />
                        {config.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">No scan activity recorded for this event yet.</p>
      )}
    </section>
  );
}
