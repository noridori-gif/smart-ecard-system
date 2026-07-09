import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function EventsPage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <Header />

        <div className="bg-white rounded-xl shadow-md p-8 mt-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold">
              Events
            </h2>

            <button className="bg-blue-700 text-white px-5 py-3 rounded-lg hover:bg-blue-800">
              + New Event
            </button>
          </div>

          <p className="text-gray-500 mt-3">
            No events have been created yet.
          </p>
        </div>
      </main>
    </div>
  );
}