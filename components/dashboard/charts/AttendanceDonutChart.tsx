"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type AttendanceDonutChartProps = {
  checkedIn: number;
  pending: number;
};

type TooltipPayloadItem = {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    color: string;
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
};

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: item.payload.color }}
        />

        <p className="text-sm font-medium text-slate-600">
          {item.name}
        </p>
      </div>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {item.value.toLocaleString()}
      </p>
    </div>
  );
}

export default function AttendanceDonutChart({
  checkedIn,
  pending,
}: AttendanceDonutChartProps) {
  const safeCheckedIn = Math.max(0, checkedIn);
  const safePending = Math.max(0, pending);

  const totalGuests = safeCheckedIn + safePending;

  const attendancePercentage =
    totalGuests > 0
      ? Math.round((safeCheckedIn / totalGuests) * 100)
      : 0;

  const chartData =
    totalGuests > 0
      ? [
          {
            name: "Checked In",
            value: safeCheckedIn,
            color: "#10b981",
          },
          {
            name: "Pending",
            value: safePending,
            color: "#f59e0b",
          },
        ]
      : [
          {
            name: "No Guests",
            value: 1,
            color: "#e2e8f0",
          },
        ];

  return (
    <section className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">
          Attendance Overview
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Live guest check-in progress
        </p>
      </div>

      <div className="relative h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={72}
              outerRadius={105}
              paddingAngle={totalGuests > 0 ? 4 : 0}
              stroke="none"
            >
              {chartData.map((item) => (
                <Cell
                  key={item.name}
                  fill={item.color}
                />
              ))}
            </Pie>

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value: string) => (
                <span className="text-sm font-medium text-slate-600">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-3xl font-bold text-slate-900">
            {attendancePercentage}%
          </p>

          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Attendance
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Checked In
          </p>

          <p className="mt-1 text-2xl font-bold text-emerald-900">
            {safeCheckedIn.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Pending
          </p>

          <p className="mt-1 text-2xl font-bold text-amber-900">
            {safePending.toLocaleString()}
          </p>
        </div>
      </div>
    </section>
  );
}
