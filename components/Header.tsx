"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type HeaderProps = {
  onMenuClick: () => void;
};

type CurrentUser = {
  displayName: string;
  email: string;
  initial: string;
};

function getUserDetails(
  email?: string,
  fullName?: unknown
): CurrentUser {
  const safeEmail =
    email?.trim() || "Signed-in user";

  const metadataName =
    typeof fullName === "string"
      ? fullName.trim()
      : "";

  const emailName =
    safeEmail !== "Signed-in user"
      ? safeEmail.split("@")[0]
      : "";

  const displayName =
    metadataName ||
    emailName ||
    "User";

  return {
    displayName,
    email: safeEmail,
    initial:
      displayName
        .charAt(0)
        .toUpperCase() || "U",
  };
}

export default function Header({
  onMenuClick,
}: HeaderProps) {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [currentUser, setCurrentUser] =
    useState<CurrentUser>(
      getUserDetails()
    );

  const [isUserLoading, setIsUserLoading] =
    useState(true);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [
    logoutError,
    setLogoutError,
  ] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!isMounted || !user) {
          return;
        }

        setCurrentUser(
          getUserDetails(
            user.email,
            user.user_metadata?.full_name ??
              user.user_metadata?.name
          )
        );
      } catch (error) {
        console.error(
          "Unable to load user:",
          error
        );
      } finally {
        if (isMounted) {
          setIsUserLoading(false);
        }
      }
    }

    loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }

        if (!session?.user) {
          return;
        }

        setCurrentUser(
          getUserDetails(
            session.user.email,
            session.user.user_metadata
              ?.full_name ??
              session.user.user_metadata?.name
          )
        );
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      setLogoutError("");

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

      setLogoutError(
        "Logout haikufanikiwa. Jaribu tena."
      );

      setIsLoggingOut(false);
    }
  }

  return (
    <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl text-blue-800 transition hover:bg-blue-100 lg:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
              Dashboard
            </h2>

            <p className="mt-1 hidden text-sm text-slate-500 sm:block">
              Welcome back to Smart Event Pass
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-xl transition hover:bg-amber-100"
            aria-label="Notifications"
          >
            🔔
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 font-bold text-white">
              {isUserLoading
                ? "..."
                : currentUser.initial}
            </div>

            <div className="hidden max-w-48 sm:block">
              <p className="truncate font-semibold capitalize text-slate-900">
                {isUserLoading
                  ? "Loading..."
                  : currentUser.displayName}
              </p>

              <p
                className="truncate text-xs text-slate-500"
                title={currentUser.email}
              >
                {isUserLoading
                  ? "Checking session"
                  : currentUser.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            aria-label="Logout"
          >
            <span className="sm:hidden">
              ↪
            </span>

            <span className="hidden sm:inline">
              {isLoggingOut
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>
        </div>
      </div>

      {logoutError && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
        >
          {logoutError}
        </div>
      )}
    </header>
  );
}