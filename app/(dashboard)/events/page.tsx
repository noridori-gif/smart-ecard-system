"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteEvent,
  getEvents,
  type Event,
} from "@/services/eventService";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingEventId, setDeletingEventId] =
    useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadEvents() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await getEvents();
      setEvents(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Events hazikuweza kupatikana."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function handleDeleteEvent(
    eventId: number,
    eventTitle: string
  ) {
    const confirmed = window.confirm(
      `Una uhakika unataka kufuta event "${eventTitle}"?\n\nKitendo hiki kinaweza pia kufuta guests na invitations zake, na hakiwezi kurudishwa.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingEventId(eventId);
      setErrorMessage("");
      setSuccessMessage("");

      await deleteEvent(eventId);

      setEvents((currentEvents) =>
        currentEvents.filter((event) => event.id !== eventId)
      );

      setSuccessMessage(
        `Event "${eventTitle}" imefutwa successfully.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Event haikuweza kufutwa."
      );
    } finally {
      setDeletingEventId(null);
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

        {!isLoading && !errorMessage && events.length === 0 && (
          <p className="p-8 text-gray-500">
            No events have been created yet.
          </p>
        )}

        {!isLoading && events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
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
                  const isDeleting =
                    deletingEventId === event.id;

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
                        <div className="flex min-w-max gap-2">
                          <Link
                            href={`/events/${event.id}/guests`}
                            className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
                          >
                            Manage Guests
                          </Link>

                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() =>
                              handleDeleteEvent(
                                event.id,
                                event.title
                              )
                            }
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleting
                              ? "Deleting..."
                              : "Delete"}
                          </button>
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
    </section>
  );
}