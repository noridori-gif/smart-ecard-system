export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-blue-700">
        Smart Event Pass
      </h1>

      <p className="text-gray-600 mt-2">
        Welcome to your Dashboard
      </p>

      <div className="grid grid-cols-2 gap-6 mt-10">

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-500">Events</h2>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-500">Guests</h2>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-500">Checked In</h2>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-500">Pending</h2>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>

      </div>
    </main>
  );
}