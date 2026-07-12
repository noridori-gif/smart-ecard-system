"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";

import {
  getDashboardStats,
  type DashboardStats,
} from "@/services/dashboardService";

import {
  getEvents,
  type Event,
} from "@/services/eventService";

const initialStats: DashboardStats = {
  totalEvents: 0,
  totalGuests: 0,
  checkedIn: 0,
  pending: 0,
  viewed: 0,
  accepted: 0,
  maybe: 0,
  declined: 0,
};

function formatEventDate(dateValue: string) {
  if (!dateValue) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function formatEventTime(timeValue: string) {
  if (!timeValue) {
    return "-";
  }

  const [hours, minutes] = timeValue.split(":");

  if (!hours || !minutes) {
    return timeValue;
  }

  const timeDate = new Date();

  timeDate.setHours(
    Number(hours),
    Number(minutes),
    0,
    0
  );

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timeDate);
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);

  const [selectedEventId, setSelectedEventId] =
    useState<string>("all");

  const [stats, setStats] =
    useState<DashboardStats>(initialStats);

  const [isLoadingEvents, setIsLoadingEvents] =
    useState(true);

  const [isLoadingStats, setIsLoadingStats] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        setIsLoadingEvents(true);
        setErrorMessage("");

        const eventData = await getEvents();

        setEvents(eventData);
      } catch (error) {
        console.error("Error loading events:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Events hazikuweza kupatikana."
        );
      } finally {
        setIsLoadingEvents(false);
      }
    }

    loadEvents();
  }, []);

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        setIsLoadingStats(true);
        setErrorMessage("");

        const eventId =
          selectedEventId === "all"
            ? null
            : Number(selectedEventId);

        const data = await getDashboardStats(
          eventId
        );

        setStats(data);
      } catch (error) {
        console.error(
          "Error loading dashboard stats:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Dashboard statistics hazikuweza kupatikana."
        );
      } finally {
        setIsLoadingStats(false);
      }
    }

    loadDashboardStats();
  }, [selectedEventId]);

  const selectedEvent = useMemo(() => {
    if (selectedEventId === "all") {
      return null;
    }

    return (
      events.find(
        (eventItem) =>
          String(eventItem.id) === selectedEventId
      ) ?? null
    );
  }, [events, selectedEventId]);

  const attendancePercentage =
    stats.totalGuests > 0
      ? Math.round(
          (stats.checkedIn / stats.totalGuests) *
            100
        )
      : 0;

  const acceptedPercentage =
    stats.totalGuests > 0
      ? Math.round(
          (stats.accepted / stats.totalGuests) *
            100
        )
      : 0;

  const isLoading =
    isLoadingEvents || isLoadingStats;

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-4xl font-bold text-blue-700">
            Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            Welcome to Smart Event Pass
          </p>
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:w-96">
          <label
            htmlFor="dashboard-event"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Select Event
          </label>

          <select
            id="dashboard-event"
            value={selectedEventId}
            disabled={isLoadingEvents}
            onChange={(event) =>
              setSelectedEventId(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="all">
              All Events
            </option>

            {events.map((eventItem) => (
              <option
                key={eventItem.id}
                value={String(eventItem.id)}
              >
                {eventItem.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {selectedEvent ? (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Selected Event
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {selectedEvent.title}
              </h2>

              <p className="mt-1 text-sm capitalize text-slate-500">
                {selectedEvent.event_type}
              </p>
            </div>

            <span className="w-fit rounded-full bg-blue-100 px-4 py-2 text-xs font-semibold uppercase text-blue-700">
              {selectedEvent.language === "en"
                ? "English"
                : "Kiswahili"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Date
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatEventDate(
                  selectedEvent.event_date
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Time
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatEventTime(
                  selectedEvent.event_time
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Venue
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {selectedEvent.venue || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Dress Code
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {selectedEvent.dress_code || "-"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current View
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            All Events Summary
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Statistics hapa yanajumuisha events zote.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-gray-500">
            Loading dashboard statistics...
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card
              title={
                selectedEvent
                  ? "Selected Event"
                  : "Total Events"
              }
              value={stats.totalEvents}
            />

            <Card
              title="Total Guests"
              value={stats.totalGuests}
            />

            <Card
              title="Checked In"
              value={stats.checkedIn}
            />

            <Card
              title="Pending Check-In"
              value={stats.pending}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card
              title="Invitations Viewed"
              value={stats.viewed}
            />

            <Card
              title="RSVP Accepted"
              value={stats.accepted}
            />

            <Card
              title="RSVP Maybe"
              value={stats.maybe}
            />

            <Card
              title="RSVP Declined"
              value={stats.declined}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Attendance Summary
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedEvent
                    ? selectedEvent.title
                    : "Events zote"}
                </p>
              </div>

              <span className="w-fit rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                {attendancePercentage}% Checked In
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-700">
                  Total Guests
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-900">
                  {stats.totalGuests}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-5">
                <p className="text-sm font-medium text-emerald-700">
                  Checked In
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-900">
                  {stats.checkedIn}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-5">
                <p className="text-sm font-medium text-amber-700">
                  Remaining
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-900">
                  {stats.pending}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
                <span>Check-in Progress</span>

                <span className="font-semibold">
                  {attendancePercentage}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                  style={{
                    width: `${attendancePercentage}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  RSVP Summary
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Majibu ya wageni kwa invitation
                </p>
              </div>

              <span className="w-fit rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                {acceptedPercentage}% Accepted
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-600">
                  Viewed
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {stats.viewed}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-5">
                <p className="text-sm font-medium text-emerald-700">
                  Accepted
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-900">
                  {stats.accepted}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-5">
                <p className="text-sm font-medium text-amber-700">
                  Maybe
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-900">
                  {stats.maybe}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-5">
                <p className="text-sm font-medium text-red-700">
                  Declined
                </p>

                <p className="mt-2 text-3xl font-bold text-red-900">
                  {stats.declined}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}