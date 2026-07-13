import type { EventDashboardStats } from "@/services/eventDashboardService";

type InvitationFunnelProps = {
  stats: EventDashboardStats;
};

type FunnelStepProps = {
  label: string;
  value: number;
  percentage: number;
  barClassName: string;
};

function clampPercentage(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function FunnelStep({
  label,
  value,
  percentage,
  barClassName,
}: FunnelStepProps) {
  const safePercentage =
    clampPercentage(percentage);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {label}
          </p>

          <p className="text-xs text-slate-500">
            {value} records
          </p>
        </div>

        <span className="text-sm font-bold text-slate-700">
          {safePercentage}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
          style={{
            width: `${safePercentage}%`,
          }}
        />
      </div>
    </div>
  );
}

export default function InvitationFunnel({
  stats,
}: InvitationFunnelProps) {
  const guestTotal = stats.totalGuests;

  function percentageFromGuests(value: number) {
    if (guestTotal <= 0) {
      return 0;
    }

    return Math.round(
      (value / guestTotal) * 100
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Invitation Funnel
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Safari ya mgeni kutoka guest list mpaka check-in.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <FunnelStep
          label="Guests"
          value={stats.totalGuests}
          percentage={
            stats.totalGuests > 0 ? 100 : 0
          }
          barClassName="bg-slate-700"
        />

        <FunnelStep
          label="Invitations Created"
          value={stats.totalInvitations}
          percentage={stats.invitationRate}
          barClassName="bg-indigo-600"
        />

        <FunnelStep
          label="Invitations Viewed"
          value={stats.viewed}
          percentage={percentageFromGuests(
            stats.viewed
          )}
          barClassName="bg-blue-600"
        />

        <FunnelStep
          label="RSVP Accepted"
          value={stats.accepted}
          percentage={percentageFromGuests(
            stats.accepted
          )}
          barClassName="bg-emerald-600"
        />

        <FunnelStep
          label="Checked In"
          value={stats.checkedIn}
          percentage={stats.attendanceRate}
          barClassName="bg-violet-600"
        />
      </div>
    </div>
  );
}