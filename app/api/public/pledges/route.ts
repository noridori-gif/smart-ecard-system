import { hashPublicPledgeValue, normalizePublicPhone, publicPledgeClient, publicPledgeHeaders } from "@/lib/publicPledge";

function ipFor(request: Request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"; }
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length < 32 || token.length > 100) return Response.json({ error: "This pledge link is unavailable." }, { status: 404, headers: publicPledgeHeaders });
  const { data } = await publicPledgeClient().rpc("get_public_pledge_link", { supplied_token_hash: hashPublicPledgeValue(token) });
  if (!data || !data.valid) return Response.json({ error: "This pledge link is unavailable." }, { status: 404, headers: publicPledgeHeaders });
  return Response.json(data, { headers: publicPledgeHeaders });
}
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.website === "string" && body.website || Number(body.durationMs) < 1500) return Response.json({ error: "Submission could not be accepted." }, { status: 400, headers: publicPledgeHeaders });
  const token = typeof body.token === "string" ? body.token : "", fullName = typeof body.fullName === "string" ? body.fullName.trim() : "", idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  const amountText = typeof body.amount === "string" ? body.amount.replace(/,/g, "").trim() : ""; let phone: string | null = null;
  try { phone = typeof body.phone === "string" && body.phone.trim() ? normalizePublicPhone(body.phone) : null; } catch { return Response.json({ error: "Enter a valid Tanzanian phone number.", code: "phone" }, { status: 400, headers: publicPledgeHeaders }); }
  if (token.length < 32 || fullName.length < 2 || fullName.length > 160 || !/^\d+(\.\d{1,2})?$/.test(amountText) || Number(amountText) <= 0 || Number(amountText) > 1_000_000_000 || idempotencyKey.length < 16 || idempotencyKey.length > 100) return Response.json({ error: "Check the highlighted fields and try again." }, { status: 400, headers: publicPledgeHeaders });
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase().slice(0,254) : null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: "Enter a valid email address.", code: "email" }, { status: 400, headers: publicPledgeHeaders });
  const expectedDate = typeof body.expectedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.expectedDate) ? body.expectedDate : null;
  const { data, error } = await publicPledgeClient().rpc("submit_public_pledge", { supplied_token_hash: hashPublicPledgeValue(token), submission_key: idempotencyKey, submitter_name: fullName, submitter_phone: phone, submitter_email: email, amount: amountText, expected_date: expectedDate, submitter_note: typeof body.note === "string" ? body.note.trim().slice(0,1000) || null : null, request_ip_hash: hashPublicPledgeValue(ipFor(request)) });
  if (error) { const limited = error.message.includes("RATE_LIMITED"); return Response.json({ error: limited ? "Too many submissions. Please try again later." : "This pledge link is unavailable." }, { status: limited ? 429 : 400, headers: publicPledgeHeaders }); }
  return Response.json(data, { status: 201, headers: publicPledgeHeaders });
}
