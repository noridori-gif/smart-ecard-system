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

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const claims = claimsError
    ? null
    : claimsData?.claims ?? null;

  const pathname =
    request.nextUrl.pathname;

  if (!claims) {
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

  const userId =
    typeof claims.sub === "string"
      ? claims.sub
      : null;

  let profile: ProxyProfile | null = null;

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

    if (!profileError && profileData) {
      profile =
        profileData as ProxyProfile;
    }
  }

  if (!profile || !profile.is_active) {
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

  if(profile.force_password_change&&isProtectedRoute(pathname)&&pathname!=="/change-password")return createRedirectResponse(request,"/change-password",supabaseResponse);

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
