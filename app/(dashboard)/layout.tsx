import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <Header />
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}