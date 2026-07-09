import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Card from "@/components/Card";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <Header />

        <div className="grid grid-cols-2 gap-6 mt-8">
          <Card title="Events" value={0} />
          <Card title="Guests" value={0} />
          <Card title="Checked In" value={0} />
          <Card title="Pending" value={0} />
        </div>
      </main>
    </div>
  );
}