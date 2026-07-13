"use client";

import type { EventDashboardStats } from "@/services/eventDashboardService";

type Props = {
  stats: EventDashboardStats;
};

function Card({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <h2
        className={`mt-2 text-3xl font-bold ${color}`}
      >
        {value}
      </h2>
    </div>
  );
}

export default function AnalyticsCards({
  stats,
}: Props) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

      <Card
        title="Guests"
        value={stats.totalGuests}
        color="text-blue-700"
      />

      <Card
        title="Invitations"
        value={stats.totalInvitations}
        color="text-indigo-700"
      />

      <Card
        title="Viewed"
        value={stats.viewed}
        color="text-amber-600"
      />

      <Card
        title="Checked In"
        value={stats.checkedIn}
        color="text-emerald-600"
      />

    </div>
  );
}