import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  previewFinancialReminders, retryDueFinancialReminders, sendDailyFinancialSummary,
  sendFinancialReminders, type FinancialChannel,
} from "@/services/financialNotificationEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function authorized(request: Request) {
  const expected = process.env.FINANCIAL_AUTOMATION_CRON_SECRET ?? "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/, "") ?? "";
  if (!expected || !supplied) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}
function channelList(value: "sms" | "whatsapp" | "both"): FinancialChannel[] {
  return value === "both" ? ["sms", "whatsapp"] : [value];
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Not authorized." }, { status: 401, headers: noStore });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ error: "Financial automation is not configured." }, { status: 503, headers: noStore });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: settings, error } = await db.from("event_finance_automation_settings")
    .select("*,events(id,title,event_date,language,archived_at)");
  if (error) return Response.json({ error: "Automation settings could not be loaded." }, { status: 500, headers: noStore });
  const totals = { eventsProcessed: 0, remindersQueued: 0, remindersSent: 0, remindersFailed: 0, summariesSent: 0, summariesFailed: 0 };
  const now = new Date();
  for (const setting of settings ?? []) {
    const event = Array.isArray(setting.events) ? setting.events[0] : setting.events;
    if (!event || event.archived_at) continue;
    totals.eventsProcessed += 1;
    try {
      const retry = await retryDueFinancialReminders(db, event.id);
      totals.remindersQueued += retry.queued; totals.remindersSent += retry.sent; totals.remindersFailed += retry.failed;
      if (setting.reminders_enabled && setting.reminder_frequency !== "manual") {
        const preview = await previewFinancialReminders(db, {
          eventId: event.id, requestedChannels: channelList(setting.reminder_channel), scheduled: true, now,
        });
        const sent = await sendFinancialReminders(db, preview, { type: "system" });
        totals.remindersQueued += sent.queued; totals.remindersSent += sent.sent; totals.remindersFailed += sent.failed;
        if (preview.eligible > 0 || !setting.next_reminder_at || new Date(setting.next_reminder_at) <= now) {
          const days = setting.reminder_frequency === "weekly" ? 7 : Number(setting.custom_interval_days ?? 7);
          await db.from("event_finance_automation_settings").update({ next_reminder_at: new Date(now.getTime() + days * 86_400_000).toISOString() }).eq("event_id", event.id);
        }
      }
      if (setting.daily_summary_enabled && setting.owner_summary_phone) {
        const today = now.toISOString().slice(0, 10);
        const currentTime = now.toISOString().slice(11, 16);
        if (currentTime >= String(setting.daily_summary_time).slice(0, 5)) {
          const summary = await sendDailyFinancialSummary(db, {
            eventId: event.id, date: today, requestedChannels: channelList(setting.daily_summary_channel), requireEnabled: true,
          });
          totals.summariesSent += summary.sent; totals.summariesFailed += summary.failed;
        }
      }
    } catch {
      totals.remindersFailed += 1;
    }
  }
  return Response.json(totals, { headers: noStore });
}
