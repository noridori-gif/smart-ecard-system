import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { normalizeTanzanianPhone } from "@/services/pledgeMessageService";

export type PledgeStatus = "pledged" | "partial" | "completed" | "cancelled";
export type FinancialPledge = {
  id: number; event_id: number; guest_id: number | null; full_name: string; phone: string;
  normalized_phone: string; email: string | null; pledged_amount: string; currency_code: string;
  notes: string | null; total_paid: string; balance: string; calculated_status: PledgeStatus;
  payment_count: number; last_payment_at: string | null; cancelled_at: string | null;
  cancellation_reason: string | null; created_at: string; updated_at: string;
  payment_row_count: number; has_protected_financial_history: boolean;
};
export type FinanceSummary = {
  total_pledged: string; total_collected: string; remaining_balance: string;
  active_pledge_count: number; pledged_count: number; partial_count: number;
  completed_count: number; cancelled_count: number; completion_percentage: string;
  total_contributors: number; budget_amount: string | null; contribution_deadline: string | null;
  budget_progress_percentage: string | null; remaining_to_budget: string | null;
  days_remaining: number | null; deadline_status: string;
};
export type FinanceTarget = Pick<FinanceSummary,"budget_amount"|"contribution_deadline">;
export type PledgePayment = {
  id: number; pledge_id: number; receipt_number: string; amount: string; currency_code?: string; payment_date: string;
  payment_method: string; payment_reference: string | null; provider: string | null;
  notes: string | null; created_at: string; voided_at: string | null; void_reason: string | null;
};
export type PledgeInput = {
  eventId: number; guestId?: number | null; fullName: string; phone: string;
  email?: string; pledgedAmount: string; notes?: string;
};
export type PaymentCorrectionInput = {
  amount: string; date: string; method: string; reference: string;
  provider: string; notes: string; reason: string;
};

export async function getFinancialSuite(eventId: number) {
  const [eventResult, pledgeResult, summaryResult, guestsResult] = await Promise.all([
    supabase.from("events").select("id,title,event_date,language").eq("id", eventId).single(),
    supabase.from("event_pledge_financial_summary").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
    supabase.rpc("get_event_finance_summary", { target_event_id: eventId }).single(),
    supabase.from("guests").select("id,full_name,phone,email").eq("event_id", eventId).order("full_name"),
  ]);
  const error = eventResult.error || pledgeResult.error || summaryResult.error || guestsResult.error;
  if (error) throw new Error(error.message);
  return {
    event: eventResult.data as { id: number; title: string; event_date: string; language: "sw" | "en" },
    pledges: (pledgeResult.data ?? []) as FinancialPledge[],
    summary: summaryResult.data as unknown as FinanceSummary,
    guests: (guestsResult.data ?? []) as { id: number; full_name: string; phone: string | null; email: string | null }[],
  };
}

export async function createPledge(input: PledgeInput) {
  const normalizedPhone = normalizeTanzanianPhone(input.phone);
  const { data: duplicate } = await supabase.from("event_pledges").select("id,full_name")
    .eq("event_id", input.eventId).eq("normalized_phone", normalizedPhone).is("cancelled_at", null).limit(1);
  if (duplicate?.length) throw new Error(`Possible duplicate: ${duplicate[0].full_name} already uses this phone.`);
  const { error } = await supabase.from("event_pledges").insert({
    event_id: input.eventId, guest_id: input.guestId || null, full_name: input.fullName.trim(),
    phone: input.phone.trim(), normalized_phone: normalizedPhone, email: input.email?.trim() || null,
    pledged_amount: input.pledgedAmount, notes: input.notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function saveFinanceTarget(eventId:number,target:FinanceTarget) {
  const budget=target.budget_amount?.trim()||null;
  if(budget!==null&&(!/^\d+(\.\d{1,2})?$/.test(budget)||Number(budget)<=0))throw new Error("Budget must be greater than zero with at most two decimal places.");
  if(target.contribution_deadline&&!/^\d{4}-\d{2}-\d{2}$/.test(target.contribution_deadline))throw new Error("Enter a valid contribution deadline.");
  const {error}=await supabase.from("event_finance_targets").upsert({event_id:eventId,budget_amount:budget,contribution_deadline:target.contribution_deadline||null},{onConflict:"event_id"});
  if(error)throw new Error(error.message);
}

export async function updatePledge(id: number, input: PledgeInput, paid: string) {
  if (BigInt(input.pledgedAmount) < BigInt(String(paid).split(".")[0])) {
    throw new Error("Pledged amount cannot be lower than the amount already paid.");
  }
  const { error } = await supabase.from("event_pledges").update({
    guest_id: input.guestId || null, full_name: input.fullName.trim(), phone: input.phone.trim(),
    normalized_phone: normalizeTanzanianPhone(input.phone), email: input.email?.trim() || null,
    pledged_amount: input.pledgedAmount, notes: input.notes?.trim() || null,
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function recordPayment(pledgeId: number, values: {
  amount: string; date: string; method: string; reference?: string; provider?: string; notes?: string;
}) {
  const {data:session}=await supabase.auth.getSession();
  if(!session.session?.access_token)throw new Error("Your session has expired.");
  const response=await fetch("/api/contributions/payments",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.session.access_token}`},body:JSON.stringify({pledgeId,...values})});
  const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Payment could not be recorded.");
  return payload as {pledge:FinancialPledge;receipt:import("@/services/receiptMessageService").FinanceReceipt;verificationUrl:string};
}

export async function cancelPledge(id: number, reason: string) {
  const { error } = await supabase.rpc("cancel_event_pledge", { target_pledge_id: id, reason });
  if (error) throw new Error(error.message);
}
export async function restorePledge(id: number) {
  const { data, error } = await supabase.rpc("restore_event_pledge", { target_pledge_id: id });
  if (error) throw new Error(error.message);
  return data as FinancialPledge;
}
export async function permanentlyDeletePledge(id: number, confirmation: string) {
  const { data, error } = await supabase.rpc("permanently_delete_event_pledge", {
    target_pledge_id: id,
    expected_confirmation: confirmation,
  });
  if (error) throw new Error(error.message);
  return data as { deleted: boolean; pledge_id: number };
}
export async function getPayments(pledgeId: number) {
  const { data, error } = await supabase.from("pledge_payments").select("*")
    .eq("pledge_id", pledgeId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PledgePayment[];
}
export async function voidPayment(id: number, reason: string) {
  if (reason.trim().length < 3) throw new Error("A clear void reason is required.");
  const { data, error } = await supabase.rpc("void_pledge_payment", {
    target_payment_id: id,
    void_reason: reason.trim(),
  });
  if (error) throw new Error(error.message);
  return data as FinancialPledge;
}
export async function correctPayment(id: number, values: PaymentCorrectionInput) {
  const { data, error } = await supabase.rpc("correct_pledge_payment", {
    target_payment_id: id,
    corrected_amount: values.amount,
    corrected_payment_date: values.date,
    corrected_method: values.method,
    corrected_reference: values.reference,
    corrected_provider: values.provider,
    corrected_notes: values.notes,
    correction_reason: values.reason,
  });
  if (error) throw new Error(error.message);
  return data as FinancialPledge;
}

export type ContributionCleanupPreview = {
  totalContributors: number;
  contributorsWithPayments: number;
  contributorsWithoutPayments: number;
  guestsCanBeRemoved: number;
  guestsMustBePreserved: number;
  receiptsRemainValid: number;
};

async function bulkContributionRequest(eventId: number, body: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Your session has expired.");
  const response = await fetch(`/api/contributions/bulk/${eventId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "The bulk action could not be completed.");
  return payload;
}

export async function previewContributionCleanup(eventId: number, removeLinkedGuests: boolean) {
  return bulkContributionRequest(eventId, {
    action: "preview", removeLinkedGuests,
  }) as Promise<ContributionCleanupPreview>;
}

export async function runContributionCleanup(eventId: number, input: {
  action: "cancel_all" | "delete_contributions" | "delete_contributions_and_guests";
  reason: string; confirmation?: string; removeLinkedGuests?: boolean;
}) {
  return bulkContributionRequest(eventId, input) as Promise<{
    deletedPledges: number; cancelledPledges: number; deletedGuests: number;
  }>;
}

export function exportPledges(eventTitle: string, pledges: FinancialPledge[]) {
  const rows = pledges.map((p) => ({
    "Full Name": p.full_name, Phone: p.phone, Email: p.email ?? "",
    "Pledged Amount": p.pledged_amount, "Total Paid": p.total_paid, Balance: p.balance,
    Status: p.calculated_status, "Payment Count": p.payment_count,
    "Last Payment Date": p.last_payment_at ?? "", Notes: p.notes ?? "",
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Pledges");
  XLSX.writeFile(book, `${eventTitle.replace(/\W+/g, "_")}_Contributions.xlsx`);
}

export const PLEDGE_IMPORT_HEADERS = ["Full Name", "Phone", "Email", "Pledged Amount", "Notes"] as const;
export function downloadPledgeTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([[...PLEDGE_IMPORT_HEADERS], ["Example Contributor", "0712345678", "", "100000", ""]]);
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Pledges");
  XLSX.writeFile(book, "Smart_Event_Pass_Pledge_Import.xlsx");
}
