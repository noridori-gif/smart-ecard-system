import {
  authenticatedFinanceClient, bearerToken, generateReceiptToken,
  hashOrganiserToken, noStoreHeaders, sameOrigin,
} from "@/lib/financePortalServer";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Origin not allowed." }, { status: 403, headers: noStoreHeaders });
  const accessToken = bearerToken(request);
  if (!accessToken) return Response.json({ error: "Not authorized." }, { status: 401, headers: noStoreHeaders });
  const client = authenticatedFinanceClient(accessToken);
  const { data: userData, error: userError } = await client.auth.getUser(accessToken);
  if (userError || !userData.user) return Response.json({ error: "Not authorized." }, { status: 401, headers: noStoreHeaders });
  const body = await request.json().catch(() => null) as { receiptNumber?: unknown } | null;
  const receiptNumber = typeof body?.receiptNumber === "string" ? body.receiptNumber.trim() : "";
  if (!/^SEP-PAY-\d{4}-\d{6,}$/.test(receiptNumber)) return Response.json({ error: "Invalid receipt." }, { status: 400, headers: noStoreHeaders });
  const rawToken = generateReceiptToken();
  const { data, error } = await client.rpc("issue_receipt_verification", {
    target_receipt_number: receiptNumber,
    supplied_token_hash: hashOrganiserToken(rawToken),
  });
  if (error || !data) return Response.json({ error: "Receipt could not be issued." }, { status: 403, headers: noStoreHeaders });
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  return Response.json({ receipt: data, verificationUrl: `${origin}/r/${rawToken}` }, { status: 201, headers: noStoreHeaders });
}
