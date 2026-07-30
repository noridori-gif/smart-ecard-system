"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  archiveEvent,
  getEvents,
  restoreEvent,
  type Event,
} from "@/services/eventService";
import { getCurrentUserProfile } from "@/services/profileService";
import EventPermanentDeleteDialog from "@/components/events/EventPermanentDeleteDialog";
import { buttonClassName } from "@/components/ui/Button";

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
          <h1 className="text-[32px] font-bold leading-tight text-slate-950 sm:text-4xl">
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
        <button type="button" role="tab" aria-selected={!archivedView} onClick={() => setArchivedView(false)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 ${!archivedView ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-stone-100"}`}>Active Events</button>
        <button type="button" role="tab" aria-selected={archivedView} onClick={() => setArchivedView(true)} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 ${archivedView ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-stone-100"}`}>Archived Events</button>
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

      <div className="overflow-hidden rounded-2xl border border-[#e7e1d7] bg-white shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
        {isLoading && (
          <p className="p-8 text-gray-500">
            Loading events...
          </p>
        )}

        {!isLoading &&
          !errorMessage &&
          events.length === 0 && (
            <p className="p-8 text-gray-500">
              No events have been created yet.
            </p>
          )}

        {!isLoading && events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-[15px]">
              <thead className="border-b border-[#e8e2d9] bg-[#faf8f4] text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Venue</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#eee9e1]">
                {events.map((event) => {
                  const isWorking = workingEventId === event.id;

                  return (
                    <tr
                      key={event.id}
                      className="transition hover:bg-[#fcfbf8]"
                    >
                      <td className="min-w-64 px-6 py-4 font-semibold text-slate-950">
                        {event.title}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 capitalize text-slate-600">
                        {event.event_type}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 tabular-nums text-slate-600">
                        {event.event_date}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 tabular-nums text-slate-600">
                        {event.event_time}
                      </td>

                      <td className="min-w-56 px-6 py-4 text-slate-600">
                        {event.venue}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex min-w-max flex-wrap gap-2">
                          <Link
                            href={`/events/${event.id}/edit`}
                            className={buttonClassName({ variant: "warning", size: "sm" })}
                          >
                            Edit
                          </Link>

                          <Link
                            href={`/events/${event.id}/guests`}
                            className={buttonClassName({ variant: "info", size: "sm" })}
                          >
                            Guests
                          </Link>

                          <Link
                            href={`/events/${event.id}/contributions`}
                            className={buttonClassName({ variant: "primary", size: "sm" })}
                          >
                            Michango &amp; Ahadi
                          </Link>

                          {(!archivedView || isAdmin) && <button type="button" disabled={isWorking} onClick={() => void handleArchive(event)}
                            className={buttonClassName({ variant: "dark", size: "sm" })}>
                            {isWorking ? "Working…" : archivedView ? "Restore" : "Archive Event"}
                          </button>}
                          {isAdmin && <button type="button" onClick={() => setPermanentDeleteEvent(event)}
                            className={buttonClassName({ variant: "danger", size: "sm" })}>Delete Permanently</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {permanentDeleteEvent && <EventPermanentDeleteDialog event={permanentDeleteEvent} onClose={() => setPermanentDeleteEvent(null)} onDeleted={() => {
        setEvents((current) => current.filter((event) => event.id !== permanentDeleteEvent.id));
        setSuccessMessage(`Event "${permanentDeleteEvent.title}" was permanently deleted.`);
        setPermanentDeleteEvent(null);
      }} />}
    </section>
  );
}
