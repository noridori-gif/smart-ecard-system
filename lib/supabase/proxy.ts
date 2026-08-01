import { createServerClient } from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

type UserRole =
  | "admin"
  | "organizer"
  | "scanner";

type ProxyProfile = {
  role: UserRole;
  is_active: boolean;
  force_password_change:boolean;
};

const protectedRoutes = [
  "/dashboard",
  "/events",
  "/guests",
  "/invitations",
  "/check-in",
  "/reports",
  "/import-history",
  "/users",
  "/settings",
  "/whatsapp-logs",
];

const adminOnlyRoutes = [
  "/users",
  "/settings",
  "/whatsapp-logs",
];

const organizerRoutes = [
  "/dashboard",
  "/events",
  "/guests",
  "/invitations",
  "/check-in",
  "/reports",
  "/import-history",
];

const scannerRoutes = [
  "/check-in",
];

function matchesRoute(
  pathname: string,
  route: string
) {
  return (
    pathname === route ||
    pathname.startsWith(`${route}/`)
  );
}

function matchesAnyRoute(
  pathname: string,
  routes: string[]
) {
  return routes.some((route) =>
    matchesRoute(pathname, route)
  );
}

function isProtectedRoute(
  pathname: string
) {
  return matchesAnyRoute(
    pathname,
    protectedRoutes
  );
}

function getDefaultRoute(
  role: UserRole
) {
  if (role === "scanner") {
    return "/check-in";
  }

  return "/dashboard";
}

function isRoleAllowed(
  pathname: string,
  role: UserRole
) {
  if (role === "admin") {
    return true;
  }

  if (role === "organizer") {
    return matchesAnyRoute(
      pathname,
      organizerRoutes
    );
  }

  return matchesAnyRoute(
    pathname,
    scannerRoutes
  );
}

function copyResponseCookies(
  sourceResponse: NextResponse,
  destinationResponse: NextResponse
) {
  sourceResponse.cookies
    .getAll()
    .forEach((cookie) => {
      destinationResponse.cookies.set(cookie);
    });

  destinationResponse.headers.set(
    "Cache-Control",
    "no-store, max-age=0"
  );

  return destinationResponse;
}

function createRedirectResponse(
  request: NextRequest,
  pathname: string,
  sourceResponse: NextResponse
) {
  const redirectUrl =
    request.nextUrl.clone();

  redirectUrl.pathname = pathname;
  redirectUrl.search = "";

  const redirectResponse =
    NextResponse.redirect(redirectUrl);

  return copyResponseCookies(
    sourceResponse,
    redirectResponse
  );
}

export async function updateSession(
  request: NextRequest
) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({ name, value }) => {
              request.cookies.set(
                name,
                value
              );
            }
          );

          supabaseResponse =
            NextResponse.next({
              request,
            });

          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  supabaseResponse.headers.set(
    "Cache-Control",
    "no-store, max-age=0"
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const pathname =
    request.nextUrl.pathname;

  if (userError || !user) {
    if (isProtectedRoute(pathname)) {
      const loginUrl =
        request.nextUrl.clone();

      loginUrl.pathname = "/login";

      loginUrl.searchParams.set(
        "redirectTo",
        `${pathname}${request.nextUrl.search}`
      );

      const redirectResponse =
        NextResponse.redirect(loginUrl);

      return copyResponseCookies(
        supabaseResponse,
        redirectResponse
      );
    }

    return supabaseResponse;
  }

  const userId = user.id;

  let profile: ProxyProfile | null = null;

  let profileLookupFailed = false;

  if (userId) {
    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(`
        role,
        is_active
        ,force_password_change
      `)
      .eq("id", userId)
      .maybeSingle();

    profileLookupFailed = Boolean(profileError);

    if (!profileError && profileData) {
      profile =
        profileData as ProxyProfile;
    }
  }

  if (profileLookupFailed || !profile || !profile.is_active) {
    if (process.env.NODE_ENV === "development") {
      console.info("Proxy profile lookup decision", {
        userId,
        pathname,
        decision: profileLookupFailed
          ? "profile-query-error"
          : !profile
            ? "profile-not-found"
            : "account-inactive",
      });
    }

    if (profileLookupFailed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: "authentication-profile-unavailable",
          },
          {
            status: 503,
            headers: { "Cache-Control": "no-store, max-age=0" },
          }
        );
      }

      return new NextResponse("Authentication profile is temporarily unavailable.", {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    await supabase.auth.signOut({
      scope: "local",
    });

    const loginUrl =
      request.nextUrl.clone();

    loginUrl.pathname = "/login";
    loginUrl.search = "";

    if (
      profile &&
      !profile.is_active
    ) {
      loginUrl.searchParams.set(
        "error",
        "account_inactive"
      );
    }

    const redirectResponse =
      NextResponse.redirect(loginUrl);

    return copyResponseCookies(
      supabaseResponse,
      redirectResponse
    );
  }

  const requiresPasswordChange = profile.force_password_change === true;

  if (process.env.NODE_ENV === "development") {
    console.info("Proxy force-password decision", {
      userId,
      pathname,
      forcePasswordChange: requiresPasswordChange,
      decision:
        requiresPasswordChange && isProtectedRoute(pathname)
          ? "redirect-change-password"
          : "allow",
    });
  }

  if(requiresPasswordChange&&isProtectedRoute(pathname))return createRedirectResponse(request,"/change-password",supabaseResponse);

  if (pathname === "/login") {
    return createRedirectResponse(
      request,
      getDefaultRoute(profile.role),
      supabaseResponse
    );
  }

  if (
    isProtectedRoute(pathname) &&
    !isRoleAllowed(
      pathname,
      profile.role
    )
  ) {
    return createRedirectResponse(
      request,
      getDefaultRoute(profile.role),
      supabaseResponse
    );
  }

  if (
    profile.role !== "admin" &&
    matchesAnyRoute(
      pathname,
      adminOnlyRoutes
    )
  ) {
    return createRedirectResponse(
      request,
      getDefaultRoute(profile.role),
      supabaseResponse
    );
  }

  return supabaseResponse;
}
