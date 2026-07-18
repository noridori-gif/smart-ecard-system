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

type WhatsAppWebhookPayload = {
  object?: string;

  entry?: Array<{
    id?: string;

    changes?: Array<{
      field?: string;

      value?: {
        messaging_product?: string;
        statuses?: WhatsAppStatusRecord[];
      };
    }>;
  }>;
};

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
 * Meta hutuma POST request kila
 * message status inapobadilika.
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
      }
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
