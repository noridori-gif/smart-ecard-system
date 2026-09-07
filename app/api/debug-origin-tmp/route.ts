export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const envValue = process.env.NEXT_PUBLIC_APP_URL || null;
  const siteOrigin = (envValue || requestOrigin).replace(/\/$/, "");

  return Response.json({
    NEXT_PUBLIC_APP_URL: envValue,
    requestOrigin,
    resolvedSiteOrigin: siteOrigin,
    sampleCardImageUrl: `${siteOrigin}/api/invitations/0a83c090-e00c-4aee-891a-b47a0cff892a/card/diagnostic-check`,
  });
}
