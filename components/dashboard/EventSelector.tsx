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
    <section className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <label className="mb-2 block text-[15px] font-semibold text-slate-800">
            Select Event
          </label>

          <select
            value={selectedEventId ?? ""}
            onChange={(e) =>
              onChange(Number(e.target.value))
            }
            className="min-h-12 w-full rounded-xl border border-[#ddd7cc] bg-white px-4 text-[15px] outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
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
          className="min-h-12 rounded-xl bg-emerald-700 px-6 font-semibold text-white shadow-sm hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>
    </section>
  );
}
