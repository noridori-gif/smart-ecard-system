import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  createClient,
} from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WhatsAppMessageStatus =
  | "sent"
  | "delivered"
  | "read"
  | "failed";

type WhatsAppStatusError = {
  code?: number;
  title?: string;
  message?: string;

  error_data?: {
    details?: string;
  };
};

type WhatsAppStatusRecord = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: WhatsAppStatusError[];
};

type WhatsAppRsvpAction =
  | "accepted"
  | "declined";

type WhatsAppIncomingMessage = {
  id?: string;
  type?: string;

  context?: {
    id?: string;
  };

  button?: {
    payload?: string;
    text?: string;
  };

  interactive?: {
    type?: string;

    button_reply?: {
      id?: string;
      title?: string;
    };
  };
};

type WhatsAppWebhookPayload = {
  object?: string;

  entry?: Array<{
    id?: string;

    changes?: Array<{
      field?: string;

      value?: {
        messaging_product?: string;
        statuses?: WhatsAppStatusRecord[];
        messages?: WhatsAppIncomingMessage[];
      };
    }>;
  }>;
};

function getRsvpAction(
  message: WhatsAppIncomingMessage
): WhatsAppRsvpAction | null {
  const action =
    message.button?.payload ??
    message.interactive
      ?.button_reply?.id;

  if (
    action === "accepted" ||
    action === "declined"
  ) {
    return action;
  }

  return null;
}

function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  appSecret: string
) {
  if (
    !receivedSignature.startsWith(
      "sha256="
    )
  ) {
    return false;
  }

  const expectedSignature =
    `sha256=${
      createHmac(
        "sha256",
        appSecret
      )
        .update(rawBody)
        .digest("hex")
    }`;

  const receivedBuffer =
    Buffer.from(
      receivedSignature,
      "utf8"
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "utf8"
    );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

function isSupportedStatus(
  status: string
): status is WhatsAppMessageStatus {
  return [
    "sent",
    "delivered",
    "read",
    "failed",
  ].includes(status);
}

function formatStatusTime(
  timestamp?: string
) {
  if (!timestamp) {
    return new Date().toISOString();
  }

  const timestampNumber =
    Number(timestamp);

  if (
    !Number.isFinite(
      timestampNumber
    )
  ) {
    return new Date().toISOString();
  }

  return new Date(
    timestampNumber * 1000
  ).toISOString();
}

function getFailureMessage(
  errors?: WhatsAppStatusError[]
) {
  if (
    !errors ||
    errors.length === 0
  ) {
    return "WhatsApp message failed.";
  }

  return errors
    .map((error) => {
      const code =
        error.code
          ? `Meta error ${error.code}`
          : "Meta error";

      const title =
        error.title ||
        error.message ||
        "Message failed";

      const details =
        error.error_data
          ?.details;

      return details
        ? `${code}: ${title} - ${details}`
        : `${code}: ${title}`;
    })
    .join(" | ");
}

/*
 * Meta hutuma GET request mara ya kwanza
 * ili kuthibitisha webhook URL.
 */
export async function GET(
  request: Request
) {
  const requestUrl =
    new URL(request.url);

  const mode =
    requestUrl.searchParams.get(
      "hub.mode"
    );

  const receivedToken =
    requestUrl.searchParams.get(
      "hub.verify_token"
    );

  const challenge =
    requestUrl.searchParams.get(
      "hub.challenge"
    );

  const expectedToken =
    process.env
      .WHATSAPP_VERIFY_TOKEN
      ?.trim();

  if (!expectedToken) {
    return new Response(
      "WHATSAPP_VERIFY_TOKEN haijawekwa.",
      {
        status: 500,
      }
    );
  }

  if (
    mode === "subscribe" &&
    receivedToken ===
      expectedToken &&
    challenge
  ) {
    return new Response(
      challenge,
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/plain",
        },
      }
    );
  }

  return new Response(
    "Webhook verification failed.",
    {
      status: 403,
    }
  );
}

/*
 * Meta hutuma POST request kwa delivery
 * statuses na majibu ya interactive messages.
 */
export async function POST(
  request: Request
) {
  try {
    const appSecret =
      process.env
        .META_APP_SECRET
        ?.trim();

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL
        ?.trim();

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY
        ?.trim();

    if (
      !appSecret ||
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      console.error(
        "Webhook environment variables hazijakamilika."
      );

      return Response.json(
        {
          success: false,
          message:
            "Webhook configuration haijakamilika.",
        },
        {
          status: 500,
        }
      );
    }

    const rawBody =
      await request.text();

    const receivedSignature =
      request.headers.get(
        "x-hub-signature-256"
      ) || "";

    const signatureIsValid =
      verifyWebhookSignature(
        rawBody,
        receivedSignature,
        appSecret
      );

    if (!signatureIsValid) {
      return Response.json(
        {
          success: false,
          message:
            "Invalid webhook signature.",
        },
        {
          status: 401,
        }
      );
    }

    let payload:
      WhatsAppWebhookPayload;

    try {
      payload =
        JSON.parse(
          rawBody
        ) as WhatsAppWebhookPayload;
    } catch {
      return Response.json(
        {
          success: false,
          message:
            "Webhook payload si JSON sahihi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      payload.object !==
      "whatsapp_business_account"
    ) {
      return Response.json(
        {
          success: true,
          message:
            "Webhook object ignored.",
        },
        {
          status: 200,
        }
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

    const statusRecords:
      WhatsAppStatusRecord[] = [];

    const incomingMessages:
      WhatsAppIncomingMessage[] = [];

    for (
      const entry of
        payload.entry ?? []
    ) {
      for (
        const change of
          entry.changes ?? []
      ) {
        if (
          change.field !==
          "messages"
        ) {
          continue;
        }

        statusRecords.push(
          ...(
            change.value
              ?.statuses ?? []
          )
        );

        incomingMessages.push(
          ...(
            change.value
              ?.messages ?? []
          )
        );
      }
    }

    let rsvpUpdates = 0;

    for (
      const message of
        incomingMessages
    ) {
      const rsvpAction =
        getRsvpAction(message);

      const originalMessageId =
        message.context?.id;

      if (
        !rsvpAction ||
        !originalMessageId
      ) {
        continue;
      }

      const {
        data: messageLog,
        error: messageLogError,
      } = await supabase
        .from(
          "whatsapp_message_logs"
        )
        .select(
          "invitation_id"
        )
        .eq(
          "message_id",
          originalMessageId
        )
        .maybeSingle();

      if (
        messageLogError ||
        !messageLog
      ) {
        console.error(
          "WhatsApp RSVP has no matching invitation log:",
          {
            originalMessageId,
            action: rsvpAction,
            error:
              messageLogError
                ?.message,
          }
        );

        continue;
      }

      const {
        data: invitation,
        error: invitationError,
      } = await supabase
        .from("invitations")
        .select(
          "invitation_token"
        )
        .eq(
          "id",
          messageLog.invitation_id
        )
        .maybeSingle();

      if (
        invitationError ||
        !invitation
      ) {
        console.error(
          "WhatsApp RSVP invitation lookup failed:",
          {
            originalMessageId,
            action: rsvpAction,
            error:
              invitationError
                ?.message,
          }
        );

        continue;
      }

      const {
        data: rsvpResult,
        error: rsvpError,
      } = await supabase.rpc(
        "update_public_rsvp",
        {
          token_input:
            invitation.invitation_token,
          rsvp_input:
            rsvpAction,
        }
      );

      const firstResult =
        Array.isArray(rsvpResult)
          ? rsvpResult[0]
          : rsvpResult;

      if (
        rsvpError ||
        !firstResult?.success
      ) {
        console.error(
          "WhatsApp RSVP update failed:",
          {
            originalMessageId,
            action: rsvpAction,
            error:
              rsvpError?.message ??
              firstResult?.message,
          }
        );

        continue;
      }

      rsvpUpdates += 1;
    }

    for (
      const statusRecord of
        statusRecords
    ) {
      const messageId =
        statusRecord.id;

      const status =
        statusRecord.status;

      if (
        !messageId ||
        !status ||
        !isSupportedStatus(
          status
        )
      ) {
        continue;
      }

      const statusTime =
        formatStatusTime(
          statusRecord.timestamp
        );

      const updateData: {
        status: WhatsAppMessageStatus;
        updated_at: string;
        sent_at?: string;
        delivered_at?: string;
        read_at?: string;
        error_message?: string | null;
      } = {
        status,
        updated_at: statusTime,
      };

      if (status === "sent") {
        updateData.sent_at =
          statusTime;

        updateData.error_message =
          null;
      }

      if (
        status === "delivered"
      ) {
        updateData.delivered_at =
          statusTime;

        updateData.error_message =
          null;
      }

      if (status === "read") {
        updateData.read_at =
          statusTime;

        updateData.error_message =
          null;
      }

      if (status === "failed") {
        updateData.error_message =
          getFailureMessage(
            statusRecord.errors
          );

        console.error(
          "WhatsApp delivery failed:",
          {
            messageId,
            recipientId:
              statusRecord.recipient_id,
            reason:
              updateData.error_message,
            errorCodes:
              statusRecord.errors
                ?.map(
                  (statusError) =>
                    statusError.code
                )
                .filter(Boolean),
          }
        );
      }

      const {
        data: updatedLog,
        error: updateError,
      } = await supabase
        .from(
          "whatsapp_message_logs"
        )
        .update(updateData)
        .eq(
          "message_id",
          messageId
        )
        .select("id")
        .maybeSingle();

      const financialUpdate = {
        delivery_status: status,
        sent_at: status === "sent" ? statusTime : undefined,
        error_message: status === "failed" ? getFailureMessage(statusRecord.errors) : null,
        next_retry_at: status === "failed" ? undefined : null,
      };
      const meetingUpdate = {
        delivery_status: status,
        sent_at: status === "sent" ? statusTime : undefined,
        delivered_at: status === "delivered" ? statusTime : undefined,
        read_at: status === "read" ? statusTime : undefined,
        failed_at: status === "failed" ? statusTime : undefined,
        error_message: status === "failed" ? getFailureMessage(statusRecord.errors) : null,
      };
      const [{ data: updatedReminder, error: reminderStatusError }, { error: summaryStatusError }, { error: meetingStatusError }] = await Promise.all([
        supabase.from("pledge_reminders").update(financialUpdate).eq("provider_message_id", messageId).eq("channel", "whatsapp").select("id,event_id,pledge_id,retry_count").maybeSingle(),
        supabase.from("finance_automation_delivery_logs").update(financialUpdate).eq("provider_message_id", messageId).eq("channel", "whatsapp"),
        supabase.from("meeting_invitation_deliveries").update(meetingUpdate).eq("provider_message_id",messageId).eq("channel","whatsapp"),
      ]);
      if (status === "failed" && updatedReminder) {
        const transient = statusRecord.errors?.some((item) => [130429, 131000, 131016].includes(item.code ?? 0)) ?? false;
        if (transient && updatedReminder.retry_count < 3) {
          await supabase.from("pledge_reminders").update({
            next_retry_at: new Date(Date.now() + 15 * 60_000 * 2 ** Math.max(updatedReminder.retry_count - 1, 0)).toISOString(),
            failure_type: "provider",
          }).eq("id", updatedReminder.id);
        }
        await supabase.from("finance_audit_logs").insert({
          event_id: updatedReminder.event_id,
          pledge_id: updatedReminder.pledge_id,
          actor_type: "system",
          action: "reminder_failed",
          metadata: { channel: "whatsapp", reminder_id: updatedReminder.id, source: "meta_webhook" },
        });
      }
      if (reminderStatusError || summaryStatusError || meetingStatusError) {
        console.error("Financial WhatsApp status update failed:", {
          messageId,
          status,
          reminderError: reminderStatusError?.message,
          summaryError: summaryStatusError?.message,
          meetingError: meetingStatusError?.message,
        });
      }

      if (updateError) {
        console.error(
          "WhatsApp status update error:",
          {
            messageId,
            status,
            error:
              updateError.message,
          }
        );
      } else if (!updatedLog) {
        console.error(
          "WhatsApp status has no matching log:",
          {
            messageId,
            status,
          }
        );
      }
    }

    return Response.json(
      {
        success: true,
        processed:
          statusRecords.length,
        rsvpUpdates,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "WhatsApp webhook error:",
      error
    );

    return Response.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}
