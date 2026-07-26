import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const attempts = new Map<string, { count: number; resetsAt: number }>();

function configuration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return { url, key };
}

export function hashOrganiserToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateOrganiserToken() {
  return randomBytes(32).toString("base64url");
}

export function generateReceiptToken() {
  return randomBytes(32).toString("base64url");
}

export function safeTokenShape(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const expected = Buffer.from("A".repeat(43));
  return timingSafeEqual(Buffer.from(token), expected) || token.length === expected.length;
}

export function publicFinanceClient() {
  const { url, key } = configuration();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function authenticatedFinanceClient(accessToken: string) {
  const { url, key } = configuration();
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function bearerToken(request: Request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export function checkPortalRateLimit(request: Request, bucket: string, limit = 20) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${bucket}:${forwarded || "unknown"}`;
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetsAt <= now) {
    attempts.set(key, { count: 1, resetsAt: now + 60_000 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};
