import { createClient } from "@/lib/supabase/client";

export type ServiceInquiryStatus = "new" | "contacted" | "closed";

export type ServiceInquiry = {
  id: number;
  full_name: string;
  phone: string;
  event_type: string;
  event_date: string | null;
  status: ServiceInquiryStatus;
  created_at: string;
};

const EVENT_TYPE_LABELS: Record<string, { en: string; sw: string }> = {
  wedding: { en: "Wedding", sw: "Harusi" },
  sendoff: { en: "Send-off", sw: "Kupeleka Bibi" },
  birthday: { en: "Birthday", sw: "Siku ya Kuzaliwa" },
  kitchen_party: { en: "Kitchen Party", sw: "Kitchen Party" },
  corporate: { en: "Corporate", sw: "Kampuni" },
};

export function getEventTypeLabel(eventType: string) {
  const label = EVENT_TYPE_LABELS[eventType];

  return label ? `${label.en} / ${label.sw}` : eventType;
}

function getSupabaseClient() {
  return createClient();
}

export async function listServiceInquiries(): Promise<ServiceInquiry[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("service_inquiries")
    .select("id, full_name, phone, event_type, event_date, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ServiceInquiry[];
}

export async function updateServiceInquiryStatus(
  id: number,
  status: ServiceInquiryStatus
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("service_inquiries")
    .update({ status })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function countNewServiceInquiries(): Promise<number> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from("service_inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
