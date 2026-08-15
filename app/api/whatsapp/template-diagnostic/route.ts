// TEMPORARY DIAGNOSTIC ROUTE -- not a permanent feature.
// Queries Meta's Graph API directly (server-side, where WHATSAPP_ACCESS_TOKEN /
// WHATSAPP_BUSINESS_ACCOUNT_ID are actually available) for the authoritative
// language code + status Meta has on file for an approved WhatsApp Business
// template, to settle a language-code-mismatch investigation (Meta error 132001
// on pledge_acknowledgement_sw). DELETE THIS FILE once that's confirmed.
//
// Visit while logged into the dashboard, e.g.:
//   https://<your-deployment>/api/whatsapp/template-diagnostic?name=pledge_acknowledgement_sw
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return reply({ error: "Not authorized. Log in to the dashboard in this browser first, then reload this URL." }, 401);

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
    if (!accessToken || !wabaId) return reply({ error: "WhatsApp Business Account is not configured." }, 500);

    const name = new URL(request.url).searchParams.get("name")?.trim() || "pledge_acknowledgement_sw";
    const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v23.0";
    const response = await fetch(
      `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates?name=${encodeURIComponent(name)}&fields=id,name,status,category,language,rejected_reason,quality_score,components`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
    );
    const body = await response.json().catch(() => null);
    return reply({ httpStatus: response.status, queriedName: name, wabaId, meta: body });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Diagnostic request failed." }, 500);
  }
}
