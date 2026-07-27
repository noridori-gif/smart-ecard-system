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
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-blue-700">
            Events
          </h1>

          <p className="mt-2 text-gray-600">
            Manage all your events in one place.
          </p>
        </div>

        <Link
          href="/events/create"
          className="inline-flex w-fit rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
        >
          + New Event
        </Link>
      </div>
      <div className="mt-5 flex gap-2" role="tablist" aria-label="Event views">
        <button onClick={() => setArchivedView(false)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${!archivedView ? "bg-blue-700 text-white" : "border bg-white"}`}>Active Events</button>
        <button onClick={() => setArchivedView(true)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${archivedView ? "bg-slate-800 text-white" : "border bg-white"}`}>Archived Events</button>
      </div>

      {successMessage && (
        <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-md">
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
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-gray-50 text-sm uppercase text-gray-600">
                <tr>
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Venue</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {events.map((event) => {
                  const isWorking = workingEventId === event.id;

                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {event.title}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {event.event_type}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {event.event_date}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {event.event_time}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {event.venue}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex min-w-max flex-wrap gap-2">
                          <Link
                            href={`/events/${event.id}/edit`}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                          >
                            Edit
                          </Link>

                          <Link
                            href={`/events/${event.id}/guests`}
                            className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
                          >
                            Guests
                          </Link>

                          <Link
                            href={`/events/${event.id}/contributions`}
                            className="rounded-lg bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-200"
                          >
                            Michango &amp; Ahadi
                          </Link>

                          {(!archivedView || isAdmin) && <button type="button" disabled={isWorking} onClick={() => void handleArchive(event)}
                            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                            {isWorking ? "Working…" : archivedView ? "Restore" : "Archive Event"}
                          </button>}
                          {isAdmin && <button type="button" onClick={() => setPermanentDeleteEvent(event)}
                            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Delete Permanently</button>}
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
