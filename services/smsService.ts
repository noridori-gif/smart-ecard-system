import { supabase } from "@/lib/supabase";

export type SmsSendResponse = {
  success: boolean;
  message: string;
  providerMessageId?: string;
};

export async function sendSmsInvitation(invitationId: number): Promise<SmsSendResponse> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch("/api/sms/send-invitation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ invitationId }),
  });

  const payload = (await response.json().catch(() => null)) as Partial<SmsSendResponse> | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "SMS invitation could not be sent.");
  }

  return {
    success: true,
    message: payload.message || "SMS invitation accepted by BEEM Africa.",
    providerMessageId: payload.providerMessageId,
  };
}
