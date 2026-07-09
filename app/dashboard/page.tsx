import Card from "@/components/Card";

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
        <Card title="Events" value={0} />
        <Card title="Guests" value={0} />
        <Card title="Checked In" value={0} />
        <Card title="Pending" value={0} />
      </div>
    </main>
  );
}