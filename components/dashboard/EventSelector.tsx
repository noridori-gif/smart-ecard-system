"use client";

import type { DashboardEvent } from "@/services/eventDashboardService";

type EventSelectorProps = {
  events: DashboardEvent[];
  selectedEventId: number | null;
  isLoading: boolean;
  onRefresh: () => void;
  onChange: (eventId: number) => void;
};

export default function EventSelector({
  events,
  selectedEventId,
  isLoading,
  onRefresh,
  onChange,
}: EventSelectorProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Select Event
          </label>

          <select
            value={selectedEventId ?? ""}
            onChange={(e) =>
              onChange(Number(e.target.value))
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          >
            {events.map((event) => (
              <option
                key={event.id}
                value={event.id}
              >
                {event.title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
        >
          {isLoading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>
    </div>
  );
}