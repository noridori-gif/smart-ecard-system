import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/events",
  "/guests",
  "/invitations",
  "/reports",
  "/scanner",
  "/settings",
  "/users",
];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
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
    data,
    error,
  } = await supabase.auth.getClaims();

  const claims = error
    ? null
    : data?.claims ?? null;

  const pathname =
    request.nextUrl.pathname;

  if (
    !claims &&
    isProtectedRoute(pathname)
  ) {
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

  if (
    claims &&
    pathname === "/login"
  ) {
    const dashboardUrl =
      request.nextUrl.clone();

    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";

    const redirectResponse =
      NextResponse.redirect(
        dashboardUrl
      );

    return copyResponseCookies(
      supabaseResponse,
      redirectResponse
    );
  }

  return supabaseResponse;
}