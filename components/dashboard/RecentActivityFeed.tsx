"use client";

import type {
  ActivityType,
  DashboardActivity,
} from "@/services/eventDashboardService";

type RecentActivityFeedProps = {
  activities: DashboardActivity[];
  isLoading?: boolean;
};

type ActivityStyle = {
  icon: string;
  iconClassName: string;
  lineClassName: string;
  label: string;
};

const activityStyles: Record<
  ActivityType,
  ActivityStyle
> = {
  check_in: {
    icon: "✓",
    iconClassName:
      "bg-violet-100 text-violet-700",
    lineClassName: "bg-violet-200",
    label: "Check-In",
  },

  invitation_viewed: {
    icon: "👁",
    iconClassName:
      "bg-blue-100 text-blue-700",
    lineClassName: "bg-blue-200",
    label: "Invitation Viewed",
  },

  rsvp_accepted: {
    icon: "✓",
    iconClassName:
      "bg-emerald-100 text-emerald-700",
    lineClassName: "bg-emerald-200",
    label: "RSVP Accepted",
  },

  rsvp_maybe: {
    icon: "?",
    iconClassName:
      "bg-amber-100 text-amber-700",
    lineClassName: "bg-amber-200",
    label: "RSVP Maybe",
  },

  rsvp_declined: {
    icon: "×",
    iconClassName:
      "bg-red-100 text-red-700",
    lineClassName: "bg-red-200",
    label: "RSVP Declined",
  },
};

function formatActivityDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(value: string) {
  const activityDate = new Date(value);

  if (Number.isNaN(activityDate.getTime())) {
    return "";
  }

  const differenceInMilliseconds =
    Date.now() - activityDate.getTime();

  const differenceInMinutes = Math.floor(
    differenceInMilliseconds / 60000
  );

  if (differenceInMinutes < 1) {
    return "Just now";
  }

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes} min ago`;
  }

  const differenceInHours = Math.floor(
    differenceInMinutes / 60
  );

  if (differenceInHours < 24) {
    return `${differenceInHours} ${
      differenceInHours === 1
        ? "hour"
        : "hours"
    } ago`;
  }

  const differenceInDays = Math.floor(
    differenceInHours / 24
  );

  if (differenceInDays < 7) {
    return `${differenceInDays} ${
      differenceInDays === 1
        ? "day"
        : "days"
    } ago`;
  }

  return formatActivityDate(value);
}

function LoadingState() {
  return (
    <div className="space-y-5">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="flex animate-pulse gap-4"
        >
          <div className="h-11 w-11 shrink-0 rounded-full bg-slate-200" />

          <div className="flex-1">
            <div className="h-4 w-40 rounded bg-slate-200" />

            <div className="mt-2 h-3 w-64 max-w-full rounded bg-slate-100" />

            <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RecentActivityFeed({
  activities,
  isLoading = false,
}: RecentActivityFeedProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Recent Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Shughuli za hivi karibuni kwenye
            event iliyochaguliwa.
          </p>
        </div>

        {!isLoading && activities.length > 0 && (
          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {activities.length} activities
          </div>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <LoadingState />
        ) : activities.length === 0 ? (
          <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-xl">
                ◷
              </div>

              <p className="mt-3 font-semibold text-slate-700">
                Hakuna recent activity bado
              </p>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Check-in, invitation views na RSVP
                responses zitaonekana hapa.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {activities.map(
              (activity, index) => {
                const style =
                  activityStyles[activity.type];

                const isLastActivity =
                  index ===
                  activities.length - 1;

                return (
                  <div
                    key={activity.id}
                    className="relative flex gap-4"
                  >
                    {!isLastActivity && (
                      <div
                        className={`absolute left-[21px] top-11 h-[calc(100%-20px)] w-px ${style.lineClassName}`}
                      />
                    )}

                    <div
                      className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ${style.iconClassName}`}
                    >
                      {style.icon}
                    </div>

                    <div
                      className={`min-w-0 flex-1 ${
                        isLastActivity
                          ? ""
                          : "pb-6"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-bold text-slate-900">
                            {activity.guestName}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {activity.description}
                          </p>
                        </div>

                        <span className="shrink-0 text-xs font-medium text-slate-400">
                          {formatRelativeTime(
                            activity.occurredAt
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.iconClassName}`}
                        >
                          {style.label}
                        </span>

                        <span
                          className="text-xs text-slate-400"
                          title={formatActivityDate(
                            activity.occurredAt
                          )}
                        >
                          {formatActivityDate(
                            activity.occurredAt
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}