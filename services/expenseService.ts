import { supabase } from "@/lib/supabase";

export type EventExpense = {
  id: number; event_id: number; category: string; description: string | null; amount: string;
  expense_date: string; payee: string | null; receipt_path: string | null; notes: string | null;
  recorded_by: string | null; created_at: string; updated_at: string;
  voided_at: string | null; voided_by: string | null; void_reason: string | null;
};

export const EXPENSE_CATEGORY_PRESETS = [
  "Venue", "Transport", "Photographer", "MC", "Cake", "Drinks", "Food", "Decoration", "Other",
] as const;

export type ExpenseInput = {
  category: string; description?: string; amount: string; expenseDate: string;
  payee?: string; receiptPath?: string | null; notes?: string;
};
export type ExpenseCorrectionInput = ExpenseInput & { reason: string };

export async function getExpenses(eventId: number) {
  const { data, error } = await supabase.from("event_expenses").select("*")
    .eq("event_id", eventId).order("expense_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as EventExpense[];
}

export async function recordExpense(eventId: number, input: ExpenseInput) {
  const { data, error } = await supabase.rpc("record_event_expense", {
    target_event_id: eventId, category: input.category, description: input.description ?? null,
    amount: input.amount, expense_date: input.expenseDate, payee: input.payee ?? null,
    receipt_path: input.receiptPath ?? null, notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
  return data as EventExpense;
}

export async function correctExpense(id: number, input: ExpenseCorrectionInput) {
  const { data, error } = await supabase.rpc("correct_event_expense", {
    target_expense_id: id, corrected_category: input.category, corrected_description: input.description ?? null,
    corrected_amount: input.amount, corrected_expense_date: input.expenseDate, corrected_payee: input.payee ?? null,
    corrected_receipt_path: input.receiptPath ?? null, corrected_notes: input.notes ?? null,
    correction_reason: input.reason,
  });
  if (error) throw new Error(error.message);
  return data as EventExpense;
}

export async function voidExpense(id: number, reason: string) {
  const { data, error } = await supabase.rpc("void_event_expense", { target_expense_id: id, reason });
  if (error) throw new Error(error.message);
  return data as EventExpense;
}

export async function uploadExpenseReceipt(eventId: number, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${eventId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("expense-receipts").upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type,
  });
  if (error) throw new Error(`Receipt could not be uploaded: ${error.message}`);
  return path;
}

export async function getExpenseReceiptUrl(path: string) {
  const { data, error } = await supabase.storage.from("expense-receipts").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new Error("Receipt link could not be prepared.");
  return data.signedUrl;
}
