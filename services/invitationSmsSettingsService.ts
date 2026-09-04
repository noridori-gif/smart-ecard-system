import { supabase } from "@/lib/supabase";

export type InvitationSmsSettings = {
  event_id: number;
  custom_invitation_sms_message: string | null;
};

export async function getInvitationSmsSettings(
  eventId: number
): Promise<InvitationSmsSettings> {
  const { data, error } = await supabase
    .from("event_invitation_sms_settings")
    .select("event_id, custom_invitation_sms_message")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (
    (data as InvitationSmsSettings | null) ?? {
      event_id: eventId,
      custom_invitation_sms_message: null,
    }
  );
}

export async function saveInvitationSmsSettings(
  eventId: number,
  customInvitationSmsMessage: string | null
) {
  const { error } = await supabase
    .from("event_invitation_sms_settings")
    .upsert(
      {
        event_id: eventId,
        custom_invitation_sms_message: customInvitationSmsMessage,
      },
      { onConflict: "event_id" }
    );

  if (error) {
    throw new Error(error.message);
  }
}
