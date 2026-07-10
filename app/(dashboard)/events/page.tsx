"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getEvents } from "@/services/eventService";

type EventItem = {
  id: string;
  title: string;
  event_type: string;
  bride_name: string | null;
  groom_name: string | null;
  event_date: string;
  event_time: string;
  venue: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await getEvents();
        setEvents((data ?? []) as EventItem[]);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Events hazikuweza kupatikana.";

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadEvents();
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
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
          className="rounded-lg bg-blue-700 px-5 py-3 text-white hover:bg-blue-800"
        >
          + New Event
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-md">
        {isLoading && (
          <p className="p-8 text-gray-500">
            Loading events...
          </p>
        )}

        {errorMessage && (
          <div className="m-8 rounded-lg bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && events.length === 0 && (
          <p className="p-8 text-gray-500">
            No events have been created yet.
          </p>
        )}

        {!isLoading && !errorMessage && events.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-sm uppercase text-gray-600">
                <tr>
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Venue</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}