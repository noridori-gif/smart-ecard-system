import type { EventDashboardStats } from "@/services/eventDashboardService";

type RSVPSummaryProps = {
  stats: EventDashboardStats;
};

type RSVPItemProps = {
  label: string;
  value: number;
  badgeClassName: string;
};

function RSVPItem({
  label,
  value,
  badgeClassName,
}: RSVPItemProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>

      <span
        className={`rounded-full px-3 py-1 text-sm font-bold ${badgeClassName}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function RSVPSummary({
  stats,
}: RSVPSummaryProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          RSVP Summary
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Muhtasari wa majibu ya wageni kwa invitation.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <RSVPItem
          label="Accepted"
          value={stats.accepted}
          badgeClassName="bg-emerald-100 text-emerald-700"
        />

        <RSVPItem
          label="Maybe"
          value={stats.maybe}
          badgeClassName="bg-amber-100 text-amber-700"
        />

        <RSVPItem
          label="Declined"
          value={stats.declined}
          badgeClassName="bg-red-100 text-red-700"
        />

        <RSVPItem
          label="No Response"
          value={stats.noResponse}
          badgeClassName="bg-slate-200 text-slate-700"
        />
      </div>
    </div>
  );
}