import { supabase } from "@/lib/supabase";

export type FinanceActivityLogEntry = {
  id: number;
  pledge_id: number | null;
  payment_id: number | null;
  expense_id: number | null;
  actor_type: "authenticated_user" | "organiser_link" | "system";
  actor_name: string;
  action: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  contributor_name: string | null;
  is_admin_action: boolean;
};

export type ActivityLogCursor = { createdAt: string; id: number };

export async function getFinanceActivityLog(eventId: number, cursor: ActivityLogCursor | null, pageSize: number) {
  const { data, error } = await supabase.rpc("get_finance_activity_log", {
    target_event_id: eventId,
    cursor_created_at: cursor?.createdAt ?? null,
    cursor_id: cursor?.id ?? null,
    page_size: pageSize,
  });
  if (error) throw new Error(error.message);
  const entries = (data ?? []) as FinanceActivityLogEntry[];
  const last = entries[entries.length - 1];
  const nextCursor: ActivityLogCursor | null = entries.length === pageSize && last ? { createdAt: last.created_at, id: last.id } : null;
  return { entries, nextCursor };
}
