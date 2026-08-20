// TEMPORARY DIAGNOSTIC ROUTE -- not a permanent feature.
// All WhatsApp sends started failing with HTTP 400 / code 200
// ("API access blocked" -- Meta's code 200 means the access token's
// permissions are missing or revoked, not a template problem). This checks
// the configured WHATSAPP_ACCESS_TOKEN directly against Meta's Graph API
// server-side (where the token is actually available) so we can see the
// raw response before deciding whether to regenerate it. DELETE THIS FILE
// once the token issue is resolved.
//
// Visit while logged into the dashboard, e.g.:
//   https://<your-deployment>/api/whatsapp/token-diagnostic
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

async function graphGet(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const body = await response.json().catch(() => null);
    return { httpStatus: response.status, body };
  } catch (error) {
    return { httpStatus: null, error: error instanceof Error ? error.message : "Request failed." };
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return reply({ error: "Not authorized. Log in to the dashboard in this browser first, then reload this URL." }, 401);

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    if (!accessToken) return reply({ error: "WHATSAPP_ACCESS_TOKEN is not configured." }, 500);

    const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v23.0";
    const encodedToken = encodeURIComponent(accessToken);

    // Self-inspection: whether Meta considers this token valid, and its scopes/expiry.
    // Works when the token itself has enough privilege to introspect itself; if not,
    // the raw error below still tells us what's wrong.
    const debugToken = await graphGet(
      `https://graph.facebook.com/${graphApiVersion}/debug_token?input_token=${encodedToken}&access_token=${encodedToken}`
    );

    // Identity check -- for a system-user token this resolves to the system user / app.
    const me = await graphGet(`https://graph.facebook.com/${graphApiVersion}/me?access_token=${encodedToken}`);

    // Business account check -- confirms the token can actually see the configured WABA.
    const wabaCheck = wabaId
      ? await graphGet(
          `https://graph.facebook.com/${graphApiVersion}/${wabaId}?fields=id,name,message_template_namespace&access_token=${encodedToken}`
        )
      : { error: "WHATSAPP_BUSINESS_ACCOUNT_ID is not configured." };

    // Phone number check -- confirms the token can see the sending phone number.
    const phoneCheck = phoneNumberId
      ? await graphGet(
          `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}?fields=id,verified_name,display_phone_number&access_token=${encodedToken}`
        )
      : { error: "WHATSAPP_PHONE_NUMBER_ID is not configured." };

    return reply({
      graphApiVersion,
      wabaIdConfigured: Boolean(wabaId),
      phoneNumberIdConfigured: Boolean(phoneNumberId),
      debugToken,
      me,
      wabaCheck,
      phoneCheck,
    });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Diagnostic request failed." }, 500);
  }
}
