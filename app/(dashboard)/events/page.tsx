"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import {
  archiveEvent,
  getEvents,
  restoreEvent,
  type Event,
} from "@/services/eventService";
import { getCurrentUserProfile } from "@/services/profileService";
import EventPermanentDeleteDialog from "@/components/events/EventPermanentDeleteDialog";
import { buttonClassName } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [workingEventId, setWorkingEventId] =
    useState<number | null>(null);
  const [archivedView, setArchivedView] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permanentDeleteEvent, setPermanentDeleteEvent] = useState<Event | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [data, profile] = await Promise.all([getEvents(archivedView), getCurrentUserProfile()]);
      setEvents(data);
      setIsAdmin(profile?.role === "admin");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Events hazikuweza kupatikana."
      );
    } finally {
      setIsLoading(false);
    }
  }, [archivedView]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadEvents(), 0);
    return () => window.clearTimeout(timer);
  }, [loadEvents]);

  async function handleArchive(event: Event) {
    try {
      setWorkingEventId(event.id);
      setErrorMessage("");
      setSuccessMessage("");
      if (archivedView) await restoreEvent(event.id); else await archiveEvent(event.id);
      setEvents((currentEvents) => currentEvents.filter((item) => item.id !== event.id));
      setSuccessMessage(`Event "${event.title}" ${archivedView ? "restored" : "archived"} successfully.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The event action could not be completed."
      );
    } finally {
      setWorkingEventId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="sep-page-title">
            Events
          </h1>

          <p className="mt-2 text-[15px] text-slate-600">
            Manage all your events in one place.
          </p>
        </div>

        <Link
          href="/events/create"
          className={buttonClassName({ variant: "primary", className: "w-fit" })}
        >
          + New Event
        </Link>
      </div>
      <div className="flex w-fit gap-1 rounded-2xl border border-[#e7e1d7] bg-white p-1.5 shadow-sm" role="tablist" aria-label="Event views">
        <button type="button" role="tab" aria-selected={!archivedView} onClick={() => setArchivedView(false)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${!archivedView ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-stone-100"}`}>Active Events</button>
        <button type="button" role="tab" aria-selected={archivedView} onClick={() => setArchivedView(true)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${archivedView ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-stone-100"}`}>Archived Events</button>
      </div>

      {successMessage && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <p className="p-8 text-gray-500">
          Loading events...
        </p>
      )}

      {!isLoading && !errorMessage && events.length === 0 && (
        <EmptyState
          title={archivedView ? "No archived events." : "No events have been created yet."}
          description={archivedView ? undefined : "Create your first event to get started."}
        />
      )}

      {!isLoading && events.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {events.map((event) => {
            const isWorking = workingEventId === event.id;

            return (
              <article
                key={event.id}
                className="group rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-[0_2px_10px_rgba(39,34,25,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(39,34,25,0.10)]"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-950">{event.title}</h2>
                  <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    {event.event_type}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    {event.event_date}
                  </span>
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    {event.event_time}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="truncate">{event.venue}</span>
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0ece3] pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/events/${event.id}/contributions`}
                      className={buttonClassName({ variant: "primary", size: "lg", className: "w-full sm:w-auto" })}
                    >
                      Michango &amp; Ahadi
                    </Link>

                    <Link
                      href={`/events/${event.id}/guests`}
                      className={buttonClassName({ variant: "outline", size: "sm" })}
                    >
                      Guests
                    </Link>

                    <Link
                      href={`/events/${event.id}/edit`}
                      className={buttonClassName({ variant: "outline", size: "sm" })}
                    >
                      Edit
                    </Link>
                  </div>

                  <div className="flex items-center gap-4 sm:ml-4 sm:border-l sm:border-[#f0ece3] sm:pl-4">
                    {(!archivedView || isAdmin) && (
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => void handleArchive(event)}
                        className="text-xs font-semibold text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isWorking ? "Working…" : archivedView ? "Restore" : "Archive Event"}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setPermanentDeleteEvent(event)}
                        className="text-xs font-semibold text-red-400 underline-offset-2 transition hover:text-red-600 hover:underline"
                      >
                        Delete Permanently
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {permanentDeleteEvent && <EventPermanentDeleteDialog event={permanentDeleteEvent} onClose={() => setPermanentDeleteEvent(null)} onDeleted={() => {
        setEvents((current) => current.filter((event) => event.id !== permanentDeleteEvent.id));
        setSuccessMessage(`Event "${permanentDeleteEvent.title}" was permanently deleted.`);
        setPermanentDeleteEvent(null);
      }} />}
    </section>
  );
}
