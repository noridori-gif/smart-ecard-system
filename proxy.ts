import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(
  request: NextRequest
) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Proxy itafanya kazi kwenye routes zote
     * isipokuwa static files na images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};