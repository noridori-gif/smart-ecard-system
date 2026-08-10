"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AnalyticsCards from "@/components/dashboard/AnalyticsCards";
import EventSelector from "@/components/dashboard/EventSelector";
import InvitationFunnel from "@/components/dashboard/InvitationFunnel";
import ProgressCard from "@/components/dashboard/ProgressCard";
import RecentActivityFeed from "@/components/dashboard/RecentActivityFeed";

import AttendanceDonutChart from "@/components/dashboard/charts/AttendanceDonutChart";
import RSVPPieChart from "@/components/dashboard/charts/RSVPPieChart";

import {
  getDashboardEvents,
  getEmptyEventDashboardStats,
  getEventDashboardStats,
  getRecentEventActivities,
  type DashboardActivity,
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

  const [activities, setActivities] = useState<
    DashboardActivity[]
  >([]);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const eventsRef = useRef<DashboardEvent[]>([]);
  const selectedEventIdRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const requestInFlightRef = useRef(false);
  const mountedRef = useRef(false);

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
    async ({
      requestedEventId,
      refreshEvents,
      trigger,
    }: {
      requestedEventId?: number;
      refreshEvents: boolean;
      trigger: "initial" | "event-change" | "manual-refresh";
    }) => {
      if (requestInFlightRef.current) {
        return;
      }

      if (
        trigger === "event-change" &&
        requestedEventId === selectedEventIdRef.current
      ) {
        return;
      }

      requestInFlightRef.current = true;
      const requestId = ++requestIdRef.current;

      try {
        if (trigger === "manual-refresh") {
          setRefreshing(true);
        } else {
          setInitialLoading(true);
        }
        setErrorMessage("");

        let availableEvents = eventsRef.current;

        if (
          refreshEvents ||
          availableEvents.length === 0
        ) {
          availableEvents =
            await getDashboardEvents();

          if (!mountedRef.current || requestId !== requestIdRef.current) {
            return;
          }

          eventsRef.current = availableEvents;
          setEvents(availableEvents);
        }

        if (availableEvents.length === 0) {
          selectedEventIdRef.current = null;
          setSelectedEventId(null);

          setStats(
            getEmptyEventDashboardStats()
          );

          setActivities([]);

          return;
        }

        const currentSelectedEventId =
          selectedEventIdRef.current;

        const eventStillExists =
          currentSelectedEventId !== null &&
          availableEvents.some(
            (eventItem) =>
              eventItem.id === currentSelectedEventId
          );

        const eventIdToLoad =
          requestedEventId ??
          (eventStillExists
            ? currentSelectedEventId
            : availableEvents[0].id);

        if (eventIdToLoad !== selectedEventIdRef.current) {
          selectedEventIdRef.current = eventIdToLoad;
          setSelectedEventId(eventIdToLoad);
        }

        const [
          dashboardStats,
          recentActivities,
        ] = await Promise.all([
          getEventDashboardStats(
            eventIdToLoad
          ),

          getRecentEventActivities(
            eventIdToLoad,
            10
          ),
        ]);

        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        setStats(dashboardStats);
        setActivities(recentActivities);
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );

        if (mountedRef.current && requestId === requestIdRef.current) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Dashboard haikuweza kupakiwa."
          );
        }
      } finally {
        if (requestId === requestIdRef.current) {
          requestInFlightRef.current = false;
          if (mountedRef.current) {
            setInitialLoading(false);
            setRefreshing(false);
          }
        }
      }
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    const timer = window.setTimeout(() => {
      void loadDashboard({
        refreshEvents: true,
        trigger: "initial",
      });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      mountedRef.current = false;
    };
  }, [loadDashboard]);

  async function handleEventChange(
    eventId: number
  ) {
    await loadDashboard({
      requestedEventId: eventId,
      refreshEvents: false,
      trigger: "event-change",
    });
  }

  async function handleRefresh() {
    await loadDashboard({
      requestedEventId:
        selectedEventIdRef.current ?? undefined,
      refreshEvents: true,
      trigger: "manual-refresh",
    });
  }

  const isBusy = initialLoading || refreshing;

  return (
    <section className="space-y-7">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Smart Event Pass
          </p>

          <h1 className="sep-page-title mt-2">
            Event Analytics Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            Fuatilia invitations, RSVP na attendance
            ya event iliyochaguliwa.
          </p>
        </div>

        {selectedEvent && (
          <div className="min-w-64 rounded-2xl border border-[#e7e1d7] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
              Active Event
            </p>

            <p className="mt-1 font-bold text-slate-950">
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
        isLoading={isBusy}
        onRefresh={handleRefresh}
        onChange={handleEventChange}
      />

      {events.length === 0 && !initialLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Hakuna event iliyopatikana
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Tengeneza event kwanza ili dashboard
            iweze kuonyesha analytics.
          </p>
        </div>
      ) : initialLoading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[#e7e1d7] bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />

            <p className="mt-4 text-sm font-medium text-slate-600">
              Inapakua event analytics...
            </p>
          </div>
        </div>
      ) : (
        <>
          {selectedEvent && (
            <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-stone-50 p-5 shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
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
                  <div className="rounded-xl border border-emerald-100 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Date
                    </p>

                    <p className="mt-1 text-sm font-bold tabular-nums text-slate-800">
                      {formatEventDate(
                        selectedEvent.event_date
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Time
                    </p>

                    <p className="mt-1 text-sm font-bold tabular-nums text-slate-800">
                      {formatEventTime(
                        selectedEvent.event_time
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      Venue
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {selectedEvent.venue || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <AnalyticsCards stats={stats} />

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ProgressCard
              title="Invitation Rate"
              value={stats.invitationRate}
              description={`${stats.totalInvitations} invitations kwa ${stats.totalGuests} guests`}
              barClassName="bg-slate-800"
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
              barClassName="bg-emerald-800"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <RSVPPieChart stats={stats} />

            <AttendanceDonutChart
              checkedIn={stats.checkedIn}
              pending={stats.pendingCheckIn}
            />
          </div>

          <RecentActivityFeed
            activities={activities}
            isLoading={false}
          />

          <InvitationFunnel stats={stats} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
              <p className="text-sm text-slate-500">
                Invitations Not Viewed
              </p>

              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                {stats.notViewed}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-sm text-emerald-700">
                RSVP Accepted
              </p>

              <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-700">
                {stats.accepted}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
              <p className="text-sm text-amber-700">
                RSVP Maybe
              </p>

              <p className="mt-2 text-3xl font-bold tabular-nums text-amber-700">
                {stats.maybe}
              </p>
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
              <p className="text-sm text-red-700">
                RSVP Declined
              </p>

              <p className="mt-2 text-3xl font-bold tabular-nums text-red-700">
                {stats.declined}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#111820] p-6 text-white shadow-[0_12px_28px_rgba(17,24,32,0.16)]">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold">
                  Live Event Overview
                </h2>

                <p className="mt-1 text-sm text-slate-300">
                  Bonyeza Refresh kupata taarifa mpya
                  za RSVP, activities na check-in.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isBusy}
                className="min-h-11 rounded-xl bg-white px-5 text-sm font-bold text-slate-900 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refreshing
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
