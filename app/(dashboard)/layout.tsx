"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  return (
    <div className="dashboard-shell min-h-screen lg:flex">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <main className="min-w-0 p-4 sm:p-6 lg:p-8 xl:p-10">
          <div className="mx-auto min-w-0 max-w-[1500px]">
            <Header
              onMenuClick={() =>
                setIsSidebarOpen(true)
              }
            />

            <div className="mt-6 min-w-0">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
