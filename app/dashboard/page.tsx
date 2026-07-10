import Card from "@/components/Card";

export default function DashboardPage() {
  return (
    <section>
      <h1 className="text-4xl font-bold text-blue-700">
        Dashboard
      </h1>

      <p className="mt-2 text-gray-600">
        Welcome to Smart Event Pass
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Events" value={0} />
        <Card title="Guests" value={0} />
        <Card title="Checked In" value={0} />
        <Card title="Pending" value={0} />
      </div>
    </section>
  );
}