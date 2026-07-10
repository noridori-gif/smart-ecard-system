import Link from "next/link";

export default function EventsPage() {
  return (
    <section>
      <div className="flex items-center justify-between">
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

      <div className="mt-8 rounded-xl bg-white p-8 shadow-md">
        <p className="text-gray-500">
          No events have been created yet.
        </p>
      </div>
    </section>
  );
}