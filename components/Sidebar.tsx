import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="min-h-screen w-64 bg-blue-800 text-white p-6">
      <h1 className="text-2xl font-bold mb-10">
        Smart Event Pass
      </h1>

      <nav className="space-y-3">
        <Link href="/dashboard" className="block rounded-lg p-3 hover:bg-blue-700">
          📊 Dashboard
        </Link>

        <Link href="/events" className="block rounded-lg p-3 hover:bg-blue-700">
          📅 Events
        </Link>

        <Link href="/guests" className="block rounded-lg p-3 hover:bg-blue-700">
          👥 Guests
        </Link>

        <Link href="/invitations" className="block rounded-lg p-3 hover:bg-blue-700">
          📨 Invitations
        </Link>

        <Link href="/check-in" className="block rounded-lg p-3 hover:bg-blue-700">
          📷 Check-In
        </Link>

        <Link href="/reports" className="block rounded-lg p-3 hover:bg-blue-700">
          📊 Reports
        </Link>

        <Link href="/settings" className="block rounded-lg p-3 hover:bg-blue-700">
          ⚙️ Settings
        </Link>

        <Link href="/login" className="block rounded-lg p-3 hover:bg-blue-700">
          🚪 Logout
        </Link>
      </nav>
    </aside>
  );
}