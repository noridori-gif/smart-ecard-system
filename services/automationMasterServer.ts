import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function automaticMessagingEnabled(db: SupabaseClient, eventId: number) {
  const { data, error } = await db.from("event_finance_automation_settings")
    .select("automatic_messaging_enabled").eq("event_id", eventId).maybeSingle();
  if (error) throw new Error("Automation state could not be verified.");
  return data?.automatic_messaging_enabled !== false;
}

export async function holdWorkflowEvent(db: SupabaseClient, workflowEventId: number) {
  await db.from("workflow_events").update({ status: "held", last_error: "automation_paused" })
    .eq("id", workflowEventId).in("status", ["pending", "processing", "failed"]);
}
