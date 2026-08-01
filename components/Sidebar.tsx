"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  getCurrentUserProfile,
  getRoleLabel,
  type UserRole,
} from "@/services/profileService";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type MenuItem = {
  href: string;
  label: string;
  icon:
    | "dashboard"
    | "calendar"
    | "users"
    | "mail"
    | "palette"
    | "scan"
    | "chart"
    | "import"
    | "lock"
    | "shield"
    | "message"
    | "settings";
  allowedRoles: UserRole[];
};

type SidebarUser = {
  fullName: string;
  initial: string;
  role: UserRole;
};

const menuItems: MenuItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/events",
    label: "Events",
    icon: "calendar",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/guests",
    label: "Guests",
    icon: "users",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/invitations",
    label: "Invitations",
    icon: "mail",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/check-in",
    label: "Check-In",
    icon: "scan",
    allowedRoles: [
      "admin",
      "organizer",
      "scanner",
    ],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: "chart",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/import-history",
    label: "Import History",
    icon: "import",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/change-password",
    label: "Change Password",
    icon: "lock",
    allowedRoles: [
      "admin",
      "organizer",
      "scanner",
    ],
  },
  {
    href: "/users",
    label: "User Management",
    icon: "shield",
    allowedRoles: [
      "admin",
    ],
  },
  {
    href: "/whatsapp-logs",
    label: "WhatsApp Logs",
    icon: "message",
    allowedRoles: [
      "admin",
    ],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings",
    allowedRoles: [
      "admin",
    ],
  },
];

function SidebarIcon({ name }: { name: MenuItem["icon"] }) {
  const paths: Record<MenuItem["icon"], React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    palette: <><circle cx="12" cy="12" r="9" /><circle cx="8" cy="10" r="1" /><circle cx="12" cy="7" r="1" /><circle cx="16" cy="10" r="1" /><path d="M16 16h.01" /></>,
    scan: <><path d="M4 7V4h3m10 0h3v3M4 17v3h3m10 0h3v-3" /><rect x="8" y="8" width="8" height="8" rx="1" /></>,
    chart: <><path d="M4 20V10m6 10V4m6 16v-7m4 7H2" /></>,
    import: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 19h16" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.4.3.7.6.9 1 .2.3.3.7.3 1.1v.1h.1v4h-.1a1.7 1.7 0 0 0-1.2-.2Z" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function Sidebar({
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<SidebarUser | null>(
      null
    );

  const [
    isProfileLoading,
    setIsProfileLoading,
  ] =
    useState(true);

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setErrorMessage("");

        const profile =
          await getCurrentUserProfile();

        if (!isMounted) {
          return;
        }

        if (!profile) {
          router.replace(
            "/login"
          );

          router.refresh();

          return;
        }

        if (!profile.is_active) {
          await supabase.auth.signOut({
            scope: "local",
          });

          router.replace(
            "/login"
          );

          router.refresh();

          return;
        }

        const fullName =
          profile.full_name
            ?.trim() ||
          profile.email
            .split("@")[0] ||
          "User";

        setCurrentUser({
          fullName,

          initial:
            fullName
              .charAt(0)
              .toUpperCase() ||
            "U",

          role:
            profile.role,
        });
      } catch (error) {
        console.error(
          "Sidebar profile error:",
          error
        );

        if (isMounted) {
          setErrorMessage(
            "Profile haikuweza kupakiwa."
          );
        }
      } finally {
        if (isMounted) {
          setIsProfileLoading(
            false
          );
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [
    router,
    supabase,
  ]);

  const visibleMenuItems =
    useMemo(() => {
      if (!currentUser) {
        return [];
      }

      return menuItems.filter(
        (item) =>
          item.allowedRoles.includes(
            currentUser.role
          )
      );
    }, [currentUser]);

  function isActiveRoute(
    href: string
  ) {
    if (
      href === "/dashboard"
    ) {
      return (
        pathname === href
      );
    }

    return (
      pathname === href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      setErrorMessage("");

      const {
        error,
      } =
        await supabase.auth.signOut({
          scope: "local",
        });

      if (error) {
        throw error;
      }

      onClose();

      router.replace(
        "/login"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Sidebar logout error:",
        error
      );

      setErrorMessage(
        "Logout haikufanikiwa."
      );

      setIsLoggingOut(false);
    }
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#111820] text-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:min-h-screen lg:translate-x-0 ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
              Smart Event
            </p>

            <h1 className="mt-1 text-xl font-bold">
              Pass
            </h1>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-2 text-xl transition hover:bg-white/20 lg:hidden"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {isProfileLoading ? (
            <div className="space-y-3">
              {[
                1,
                2,
                3,
                4,
                5,
              ].map(
                (item) => (
                  <div
                    key={item}
                    className="h-12 animate-pulse rounded-xl bg-white/10"
                  />
                )
              )}
            </div>
          ) : visibleMenuItems
              .length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Hakuna menu
              inayopatikana kwa
              account hii.
            </div>
          ) : (
            visibleMenuItems.map(
              (item) => {
                const isActive =
                  isActiveRoute(
                    item.href
                  );

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={
                      onClose
                    }
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      isActive
                        ? "bg-emerald-700 text-white shadow-md shadow-emerald-950/20"
                        : "text-slate-300 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="text-slate-300">
                      <SidebarIcon name={item.icon} />
                    </span>

                    <span>
                      {
                        item.label
                      }
                    </span>
                  </Link>
                );
              }
            )
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          {errorMessage && (
            <div className="mb-3 rounded-xl border border-red-300/20 bg-red-500/20 p-3 text-xs text-red-100">
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            onClick={
              handleLogout
            }
            disabled={
              isLoggingOut
            }
            className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
              </svg>
            </span>

            <span>
              {isLoggingOut
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-900">
              {isProfileLoading
                ? "..."
                : currentUser
                    ?.initial ??
                  "U"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {isProfileLoading
                  ? "Loading..."
                  : currentUser
                      ?.fullName ??
                    "User"}
              </p>

              <p className="text-xs text-slate-400">
                {isProfileLoading
                  ? "Checking role"
                  : currentUser
                    ? getRoleLabel(
                        currentUser.role
                      )
                    : "Unknown role"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
