import { NextResponse } from "next/server";
import {
  authenticatedFinanceClient, bearerToken, checkPortalRateLimit, noStoreHeaders, sameOrigin,
} from "@/lib/financePortalServer";

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: noStoreHeaders });
}

type MetaTemplate = { name: string; status: string; category: string; language: string };
type MetaTemplatesResponse = { data?: MetaTemplate[]; error?: { message?: string; code?: number } };

export async function GET(request: Request) {
  try {
    if (!sameOrigin(request)) return reply({ error: "Request not allowed." }, 403);
    if (!checkPortalRateLimit(request, "whatsapp-templates", 20)) return reply({ error: "Too many requests. Try again shortly." }, 429);
    const token = bearerToken(request);
    if (!token) return reply({ error: "Not authorized." }, 401);
    const authClient = authenticatedFinanceClient(token);
    const { data: auth } = await authClient.auth.getUser(token);
    if (!auth.user) return reply({ error: "Not authorized." }, 401);

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
    if (!accessToken || !wabaId) return reply({ templates: [], error: "WhatsApp Business Account is not configured." });

    const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v23.0";
    const response = await fetch(
      `https://graph.facebook.com/${graphApiVersion}/${wabaId}/message_templates?fields=name,status,category,language&limit=200`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
    );
    const body = await response.json().catch(() => null) as MetaTemplatesResponse | null;
    if (!response.ok || !body || body.error) {
      return reply({ templates: [], error: body?.error?.message || "Approved WhatsApp templates could not be loaded." });
    }
    const templates = (body.data ?? [])
      .filter((item) => item.status === "APPROVED")
      .map((item) => ({ name: item.name, language: item.language, category: item.category }));
    return reply({ templates });
  } catch (error) {
    return reply({ templates: [], error: error instanceof Error ? error.message : "Approved WhatsApp templates could not be loaded." });
  }
}
