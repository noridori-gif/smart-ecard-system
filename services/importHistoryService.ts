import { supabase } from "@/lib/supabase";

export type ImportHistory = {
  id: number;
  file_name: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  imported_by: string | null;
  imported_at: string;

  events: {
    title: string;
  } | null;
};

export async function getImportHistory() {
  const { data, error } = await supabase
    .from("guest_import_history")
    .select(`
      *,
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

  return (data ?? []) as ImportHistory[];
}