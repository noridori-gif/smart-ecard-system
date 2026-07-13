import { supabase } from "@/lib/supabase";

export type ImportHistoryEvent = {
  title: string;
};

export type ImportHistory = {
  id: number;
  event_id: number;
  file_name: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  imported_by: string | null;
  imported_at: string;

  events:
    | ImportHistoryEvent
    | ImportHistoryEvent[]
    | null;
};

export type ImportHistoryWithEvent = Omit<
  ImportHistory,
  "events"
> & {
  event: ImportHistoryEvent | null;
};

function getSingleEvent(
  relation:
    | ImportHistoryEvent
    | ImportHistoryEvent[]
    | null
): ImportHistoryEvent | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export async function getImportHistory(): Promise<
  ImportHistoryWithEvent[]
> {
  const { data, error } = await supabase
    .from("guest_import_history")
    .select(`
      id,
      event_id,
      file_name,
      total_rows,
      imported_rows,
      failed_rows,
      imported_by,
      imported_at,
      events (
        title
      )
    `)
    .order("imported_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const historyRows =
    (data ?? []) as unknown as ImportHistory[];

  return historyRows.map((historyItem) => ({
    id: historyItem.id,
    event_id: historyItem.event_id,
    file_name: historyItem.file_name,
    total_rows: historyItem.total_rows,
    imported_rows: historyItem.imported_rows,
    failed_rows: historyItem.failed_rows,
    imported_by: historyItem.imported_by,
    imported_at: historyItem.imported_at,
    event: getSingleEvent(historyItem.events),
  }));
}