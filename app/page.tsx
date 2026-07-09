export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white shadow-xl rounded-xl p-10 max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold text-blue-700">
          Smart E-Card
        </h1>

        <p className="text-gray-600 mt-4 text-xl">
          Digital Wedding & Event Guest Verification System
        </p>

        <div className="mt-8 space-y-3 text-left">
          <p>✅ Create Events</p>
          <p>✅ Manage Guests</p>
          <p>✅ Generate QR Codes</p>
          <p>✅ Verify Guests</p>
          <p>✅ View Reports</p>
        </div>

        <button className="mt-10 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg">
          Login
        </button>
      </div>
    </main>
  );
}