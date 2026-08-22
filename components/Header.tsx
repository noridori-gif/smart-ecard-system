"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import LanguageSwitch from "@/components/LanguageSwitch";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";

import {
  getCurrentUserProfile,
  getRoleLabel,
} from "@/services/profileService";

type HeaderProps = {
  onMenuClick: () => void;
};

type HeaderUser = {
  displayName: string;
  email: string;
  initial: string;
  roleLabel: string;
};

const emptyUser: HeaderUser = {
  displayName: "User",
  email: "",
  initial: "U",
  roleLabel: "Loading role...",
};

const routeTitles = [
  { matches: (path: string) => /^\/events\/[^/]+\/contributions(?:\/|$)/.test(path), title: "Michango & Ahadi" },
  { matches: (path: string) => /^\/events(?:\/|$)/.test(path), title: "Events" },
  { matches: (path: string) => /^\/dashboard(?:\/|$)/.test(path), title: "Dashboard" },
  { matches: (path: string) => /^\/guests(?:\/|$)/.test(path), title: "Guests" },
  { matches: (path: string) => /^\/invitations(?:\/|$)/.test(path), title: "Invitations" },
  { matches: (path: string) => /^\/check-in(?:\/|$)/.test(path), title: "Check-In" },
  { matches: (path: string) => /^\/reports(?:\/|$)/.test(path), title: "Reports" },
  { matches: (path: string) => /^\/import-history(?:\/|$)/.test(path), title: "Import History" },
  { matches: (path: string) => /^\/support-tickets(?:\/|$)/.test(path), title: "Support" },
  { matches: (path: string) => /^\/change-password(?:\/|$)/.test(path), title: "Change Password" },
  { matches: (path: string) => /^\/settings(?:\/|$)/.test(path), title: "Settings" },
  { matches: (path: string) => /^\/users(?:\/|$)/.test(path), title: "User Management" },
  { matches: (path: string) => /^\/whatsapp-logs(?:\/|$)/.test(path), title: "WhatsApp Logs" },
  { matches: (path: string) => /^\/whatsapp-card-preview(?:\/|$)/.test(path), title: "WhatsApp Card Preview" },
] as const;

export function getAuthenticatedHeaderTitle(pathname: string) {
  return routeTitles.find((route) => route.matches(pathname))?.title ?? "Smart Event Pass";
}

// These pages already render their own .sep-page-title heading, so the
// Header's route-derived title would otherwise duplicate it directly above.
const routesWithOwnPageTitle = [
  /^\/settings(?:\/|$)/,
  /^\/users(?:\/|$)/,
  /^\/change-password(?:\/|$)/,
  /^\/whatsapp-logs(?:\/|$)/,
  /^\/whatsapp-card-preview(?:\/|$)/,
] as const;

function pageRendersOwnTitle(pathname: string) {
  return routesWithOwnPageTitle.some((pattern) => pattern.test(pathname));
}

function createHeaderUser(
  fullName: string | null,
  email: string,
  roleLabel: string
): HeaderUser {
  const emailName =
    email.split("@")[0] || "User";

  const displayName =
    fullName?.trim() ||
    emailName;

  return {
    displayName,
    email,
    initial:
      displayName
        .charAt(0)
        .toUpperCase() || "U",
    roleLabel,
  };
}

export default function Header({
  onMenuClick,
}: HeaderProps) {
  const { t } = useAppLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const pageTitle = /^\/events\/[^/]+\/contributions(?:\/|$)/.test(pathname)
    ? t("financial.title")
    : getAuthenticatedHeaderTitle(pathname);
  const showPageTitle = !pageRendersOwnTitle(pathname);

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [currentUser, setCurrentUser] =
    useState<HeaderUser>(emptyUser);

  const [isUserLoading, setIsUserLoading] =
    useState(true);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [
    headerError,
    setHeaderError,
  ] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setHeaderError("");

        const profile =
          await getCurrentUserProfile();

        if (!isMounted) {
          return;
        }

        if (!profile) {
          router.replace("/login");
          router.refresh();

          return;
        }

        if (!profile.is_active) {
          await supabase.auth.signOut({
            scope: "local",
          });

          if (!isMounted) {
            return;
          }

          setHeaderError(
            "Account yako imezimwa. Wasiliana na administrator."
          );

          router.replace("/login");
          router.refresh();

          return;
        }

        setCurrentUser(
          createHeaderUser(
            profile.full_name,
            profile.email,
            getRoleLabel(profile.role)
          )
        );
      } catch (error) {
        console.error(
          "Unable to load profile:",
          error
        );

        if (isMounted) {
          setHeaderError(
            error instanceof Error
              ? error.message
              : "Profile haikuweza kupakiwa."
          );
        }
      } finally {
        if (isMounted) {
          setIsUserLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      setHeaderError("");

      const { error } =
        await supabase.auth.signOut({
          scope: "local",
        });

      if (error) {
        throw error;
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setHeaderError(
        "Logout haikufanikiwa. Jaribu tena."
      );

      setIsLoggingOut(false);
    }
  }

  return (
    <header className="rounded-2xl border border-[#e7e1d7] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(39,34,25,0.05)] sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition hover:bg-emerald-100 lg:hidden"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>

          <div className="min-w-0">
            {showPageTitle && (
              <h2 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
                {pageTitle}
              </h2>
            )}

            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              {t("header.welcome")}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            aria-label={t("header.notifications")}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
          </button>

          <LanguageSwitch />

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 font-bold text-white">
              {isUserLoading
                ? "..."
                : currentUser.initial}
            </div>

            <div className="hidden max-w-52 sm:block">
              <p className="truncate font-semibold text-slate-900">
                {isUserLoading
                  ? "Loading..."
                  : currentUser.displayName}
              </p>

              <p className="truncate text-xs font-medium text-emerald-700">
                {isUserLoading
                  ? "Checking profile"
                  : currentUser.roleLabel}
              </p>

              {!isUserLoading &&
                currentUser.email && (
                  <p
                    className="mt-0.5 truncate text-xs text-slate-400"
                    title={currentUser.email}
                  >
                    {currentUser.email}
                  </p>
                )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            aria-label={t("header.logout")}
          >
            <span className="sm:hidden">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
              </svg>
            </span>

            <span className="hidden sm:inline">
              {isLoggingOut
                ? t("header.loggingOut")
                : t("header.logout")}
            </span>
          </button>
        </div>
      </div>

      {headerError && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
        >
          {headerError}
        </div>
      )}
    </header>
  );
}
