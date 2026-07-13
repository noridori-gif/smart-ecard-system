"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AnalyticsCards from "@/components/dashboard/AnalyticsCards";
import EventSelector from "@/components/dashboard/EventSelector";
import InvitationFunnel from "@/components/dashboard/InvitationFunnel";
import ProgressCard from "@/components/dashboard/ProgressCard";

import AttendanceDonutChart from "@/components/dashboard/charts/AttendanceDonutChart";
import RSVPPieChart from "@/components/dashboard/charts/RSVPPieChart";

import {
  getDashboardEvents,
  getEmptyEventDashboardStats,
  getEventDashboardStats,
  type DashboardEvent,
  type EventDashboardStats,
} from "@/services/eventDashboardService";

function formatEventDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatEventTime(value: string) {
  if (!value) {
    return "-";
  }

  const [hours, minutes] = value.split(":");

  if (!hours || !minutes) {
    return value;
  }

  const date = new Date();

  date.setHours(
    Number(hours),
    Number(minutes),
    0,
    0
  );

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function DashboardPage() {
  const [events, setEvents] = useState<
    DashboardEvent[]
  >([]);

  const [selectedEventId, setSelectedEventId] =
    useState<number | null>(null);

  const [stats, setStats] =
    useState<EventDashboardStats>(
      getEmptyEventDashboardStats()
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const selectedEvent = useMemo(() => {
    if (selectedEventId === null) {
      return null;
    }

    return (
      events.find(
        (eventItem) =>
          eventItem.id === selectedEventId
      ) ?? null
    );
  }, [events, selectedEventId]);

  const loadDashboard = useCallback(
    async (
      requestedEventId?: number,
      refreshEvents = false
    ) => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        let availableEvents = events;

        if (
          refreshEvents ||
          availableEvents.length === 0
        ) {
          availableEvents =
            await getDashboardEvents();

          setEvents(availableEvents);
        }

        if (availableEvents.length === 0) {
          setSelectedEventId(null);

          setStats(
            getEmptyEventDashboardStats()
          );

          return;
        }

        const eventStillExists =
          selectedEventId !== null &&
          availableEvents.some(
            (eventItem) =>
              eventItem.id === selectedEventId
          );

        const eventIdToLoad =
          requestedEventId ??
          (eventStillExists
            ? selectedEventId
            : availableEvents[0].id);

        setSelectedEventId(eventIdToLoad);

        const dashboardStats =
          await getEventDashboardStats(
            eventIdToLoad
          );

        setStats(dashboardStats);
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Dashboard haikuweza kupakiwa."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [events, selectedEventId]
  );

  useEffect(() => {
    loadDashboard(undefined, true);
  }, []);

  async function handleEventChange(
    eventId: number
  ) {
    await loadDashboard(eventId);
  }

  async function handleRefresh() {
    await loadDashboard(
      selectedEventId ?? undefined,
      true
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Smart Event Pass
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Event Analytics Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Fuatilia invitations, RSVP na attendance
            ya event iliyochaguliwa.
          </p>
        </div>

        {selectedEvent && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-semibold">
              Active Event
            </p>

            <p className="mt-1">
              {selectedEvent.title}
            </p>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <EventSelector
        events={events}
        selectedEventId={selectedEventId}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onChange={handleEventChange}
      />

      {events.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Hakuna event iliyopatikana
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Tengeneza event kwanza ili dashboard
            iweze kuonyesha analytics.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm font-medium text-slate-600">
              Inapakua event analytics...
            </p>
          </div>
        </div>
      ) : (
        <>
          {selectedEvent && (
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                    Selected Event
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    {selectedEvent.title}
                  </h2>

                  <p className="mt-1 text-sm capitalize text-slate-600">
                    {selectedEvent.event_type}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[580px]">
                  <div className="rounded-xl border border-white bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Date
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {formatEventDate(
                        selectedEvent.event_date
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Time
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {formatEventTime(
                        selectedEvent.event_time
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white bg-white/80 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Venue
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {selectedEvent.venue || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <AnalyticsCards stats={stats} />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ProgressCard
              title="Invitation Rate"
              value={stats.invitationRate}
              description={`${stats.totalInvitations} invitations kwa ${stats.totalGuests} guests`}
              barClassName="bg-indigo-600"
            />

            <ProgressCard
              title="View Rate"
              value={stats.viewRate}
              description={`${stats.viewed} invitations zimefunguliwa`}
              barClassName="bg-blue-600"
            />

            <ProgressCard
              title="Acceptance Rate"
              value={stats.acceptanceRate}
              description={`${stats.accepted} guests wamekubali`}
              barClassName="bg-emerald-600"
            />

            <ProgressCard
              title="Attendance Rate"
              value={stats.attendanceRate}
              description={`${stats.checkedIn} guests wamefanya check-in`}
              barClassName="bg-violet-600"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <RSVPPieChart stats={stats} />

            <AttendanceDonutChart
              checkedIn={stats.checkedIn}
              pending={stats.pendingCheckIn}
            />
          </div>

          <InvitationFunnel stats={stats} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Invitations Not Viewed
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.notViewed}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm text-emerald-700">
                RSVP Accepted
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {stats.accepted}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-sm text-amber-700">
                RSVP Maybe
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-700">
                {stats.maybe}
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <p className="text-sm text-red-700">
                RSVP Declined
              </p>

              <p className="mt-2 text-3xl font-bold text-red-700">
                {stats.declined}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold">
                  Live Event Overview
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  Bonyeza Refresh kupata taarifa mpya
                  za RSVP na check-in.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? "Refreshing..."
                  : "Refresh Analytics"}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}