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
  icon: string;
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
    icon: "📊",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/events",
    label: "Events",
    icon: "📅",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/guests",
    label: "Guests",
    icon: "👥",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/invitations",
    label: "Invitations",
    icon: "💌",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/check-in",
    label: "Check-In",
    icon: "📷",
    allowedRoles: [
      "admin",
      "organizer",
      "scanner",
    ],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: "📈",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/import-history",
    label: "Import History",
    icon: "📥",
    allowedRoles: [
      "admin",
      "organizer",
    ],
  },
  {
    href: "/change-password",
    label: "Change Password",
    icon: "🔐",
    allowedRoles: [
      "admin",
      "organizer",
      "scanner",
    ],
  },
  {
    href: "/users",
    label: "User Management",
    icon: "🛡️",
    allowedRoles: [
      "admin",
    ],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "⚙️",
    allowedRoles: [
      "admin",
    ],
  },
];

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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 text-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:min-h-screen lg:translate-x-0 ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
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
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-sm text-blue-100">
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
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "bg-white text-blue-900 shadow-lg"
                        : "text-blue-50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="text-xl">
                      {
                        item.icon
                      }
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
            className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-xl">
              🚪
            </span>

            <span>
              {isLoggingOut
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>

          <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-950/20 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-900">
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

              <p className="text-xs text-blue-200">
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