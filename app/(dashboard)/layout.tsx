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
    <div className="min-h-screen bg-slate-100 lg:flex">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Header
            onMenuClick={() =>
              setIsSidebarOpen(true)
            }
          />

          <div className="mt-6 min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}