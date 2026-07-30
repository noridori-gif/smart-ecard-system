"use client";

import type { EventDashboardStats } from "@/services/eventDashboardService";
import { MetricCard } from "@/components/ui/Card";

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
    <MetricCard
      label={title}
      value={<span className={color}>{value}</span>}
    />
  );
}

export default function AnalyticsCards({
  stats,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

      <Card
        title="Guests"
        value={stats.totalGuests}
        color="text-slate-950"
      />

      <Card
        title="Invitations"
        value={stats.totalInvitations}
        color="text-blue-700"
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
