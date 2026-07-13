"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const menuItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "📊",
  },
  {
    href: "/events",
    label: "Events",
    icon: "📅",
  },
  {
    href: "/guests",
    label: "Guests",
    icon: "👥",
  },
  {
    href: "/invitations",
    label: "Invitations",
    icon: "💌",
  },
  {
    href: "/check-in",
    label: "Check-In",
    icon: "📷",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: "📈",
  },
  {
    href: "/import-history",
    label: "Import History",
    icon: "📥",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "⚙️",
  },
];

export default function Sidebar({
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  function isActiveRoute(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname.startsWith(href);
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 text-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:min-h-screen lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">
              Smart
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Event Pass
            </h1>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-2 text-xl hover:bg-white/20 lg:hidden"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {menuItems.map((item) => {
            const isActive = isActiveRoute(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white text-blue-900 shadow-lg"
                    : "text-blue-50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-xl">
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/login"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/20"
          >
            <span className="text-xl">🚪</span>
            <span>Logout</span>
          </Link>

          <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-950/20 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-900">
              N
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                Noriega
              </p>

              <p className="text-xs text-blue-200">
                Administrator
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}