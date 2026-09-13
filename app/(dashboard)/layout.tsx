"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] =
    useState(false);

  const pathname = usePathname();
  // The Check-In / scanner screen is a focused, full-bleed kiosk view with its own
  // top bar (see components/check-in/ScannerTopBar) rather than the admin Sidebar +
  // Header shell -- scanners working an event entrance need a distraction-free,
  // camera-first layout instead of the full dashboard chrome.
  const isScannerMode = pathname?.startsWith("/check-in") ?? false;

  if (isScannerMode) {
    return (
      <LanguageProvider>
        <div className="dashboard-shell min-h-screen">{children}</div>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider><div className="dashboard-shell min-h-screen lg:flex">
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
    </div></LanguageProvider>
  );
}
