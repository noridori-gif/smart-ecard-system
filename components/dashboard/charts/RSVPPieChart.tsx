"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { EventDashboardStats } from "@/services/eventDashboardService";

type RSVPPieChartProps = {
  stats: EventDashboardStats;
};

type TooltipPayloadItem = {
  name?: string;
  value?: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
};

const chartColors = [
  "#059669",
  "#f59e0b",
  "#dc2626",
  "#94a3b8",
];

function CustomTooltip({
  active,
  payload,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-slate-800">
        {item.name ?? "RSVP"}
      </p>

      <p className="mt-1 text-sm text-slate-600">
        {item.value ?? 0} guests
      </p>
    </div>
  );
}

export default function RSVPPieChart({
  stats,
}: RSVPPieChartProps) {
  const chartData = [
    {
      name: "Accepted",
      value: stats.accepted,
    },
    {
      name: "Maybe",
      value: stats.maybe,
    },
    {
      name: "Declined",
      value: stats.declined,
    },
    {
      name: "No Response",
      value: stats.noResponse,
    },
  ];

  const totalResponses = chartData.reduce(
    (total, item) => total + item.value,
    0
  );

  return (
    <section className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          RSVP Distribution
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Mgawanyo wa majibu ya wageni kwa invitation.
        </p>
      </div>

      {totalResponses === 0 ? (
        <div className="flex h-56 items-center justify-center">
          <div className="text-center">
            <p className="font-semibold text-slate-700">
              Hakuna RSVP data bado
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Data itaonekana wageni watakapojibu invitation.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
                strokeWidth={2}
              >
                {chartData.map((item, index) => (
                  <Cell
                    key={item.name}
                    fill={
                      chartColors[
                        index % chartColors.length
                      ]
                    }
                  />
                ))}
              </Pie>

              <Tooltip
                content={<CustomTooltip />}
              />

              <Legend
                verticalAlign="bottom"
                height={36}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-emerald-50 p-3 text-center">
          <p className="text-xs font-semibold text-emerald-700">
            Accepted
          </p>

          <p className="mt-1 text-xl font-bold text-emerald-700">
            {stats.accepted}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-3 text-center">
          <p className="text-xs font-semibold text-amber-700">
            Maybe
          </p>

          <p className="mt-1 text-xl font-bold text-amber-700">
            {stats.maybe}
          </p>
        </div>

        <div className="rounded-xl bg-red-50 p-3 text-center">
          <p className="text-xs font-semibold text-red-700">
            Declined
          </p>

          <p className="mt-1 text-xl font-bold text-red-700">
            {stats.declined}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-center">
          <p className="text-xs font-semibold text-slate-700">
            No Response
          </p>

          <p className="mt-1 text-xl font-bold text-slate-700">
            {stats.noResponse}
          </p>
        </div>
      </div>
    </section>
  );
}
