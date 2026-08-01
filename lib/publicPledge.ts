import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const publicPledgeHeaders = { "Cache-Control": "private, no-store, max-age=0" };
export const hashPublicPledgeValue = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
export const generatePublicPledgeToken = () => randomBytes(32).toString("base64url");

export function publicPledgeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Public pledge service is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export function normalizePublicPhone(input: string) {
  let value = input.trim().replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (value.startsWith("2550")) value = `255${value.slice(4)}`;
  else if (value.startsWith("0")) value = `255${value.slice(1)}`;
  if (!/^255[67]\d{8}$/.test(value)) throw new Error("INVALID_PHONE");
  return value;
}

