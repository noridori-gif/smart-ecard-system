import {
  createClient,
} from "@supabase/supabase-js";

import {
  normalizeWhatsAppPhoneNumber,
  sendWhatsAppInvitationTemplate,
} from "@/services/whatsappCloudService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendInvitationRequest = {
  invitationToken?: string;
};

type ProfileRecord = {
  role: string | null;
};

type GuestRecord = {
  full_name: string;
  phone: string | null;
  event_pass_id: string | null;
  allowed_guests: number | null;
};

type EventRecord = {
  title: string;
  event_date: string | null;
  event_time: string | null;
  venue: string | null;
  language: string | null;
};

type InvitationRecord = {
  id: number;
  invitation_token: string;

  guests:
    | GuestRecord
    | GuestRecord[]
    | null;

  events:
    | EventRecord
    | EventRecord[]
    | null;
};

function getSingleRelation<T>(
  relation: T | T[] | null
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getBearerToken(
  request: Request
) {
  const authorizationHeader =
    request.headers.get(
      "authorization"
    );

  if (
    !authorizationHeader ||
    !authorizationHeader.startsWith(
      "Bearer "
    )
  ) {
    return "";
  }

  return authorizationHeader
    .slice("Bearer ".length)
    .trim();
}

function formatDate(
  dateValue: string | null,
  language: "sw" | "en"
) {
  if (!dateValue) {
    return "-";
  }

  const parsedDate =
    new Date(
      `${dateValue}T00:00:00`
    );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(
    language === "en"
      ? "en-GB"
      : "sw-TZ",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(parsedDate);
}

function formatTime(
  timeValue: string | null
) {
  if (!timeValue) {
    return "-";
  }

  const timeParts =
    timeValue
      .trim()
      .match(
        /^(\d{1,2}):(\d{2})/
      );

  if (!timeParts) {
    return timeValue;
  }

  const hours =
    Number(timeParts[1]);

  const minutes =
    Number(timeParts[2]);

  const parsedTime =
    new Date(
      2000,
      0,
      1,
      hours,
      minutes
    );

  if (
    Number.isNaN(
      parsedTime.getTime()
    )
  ) {
    return timeValue;
  }

  return new Intl.DateTimeFormat(
    "sw-TZ",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(parsedTime);
}

async function assertPublicCardImage(
  cardImageUrl: string
) {
  const response = await fetch(
    cardImageUrl,
    {
      headers: {
        Accept: "image/png",
      },
      cache: "no-store",
      signal:
        AbortSignal.timeout(
          20_000
        ),
    }
  );

  const contentType =
    response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();

  if (
    !response.ok ||
    contentType !==
      "image/png"
  ) {
    throw new Error(
      "WhatsApp card image haipatikani kama PNG halali. Jaribu tena."
    );
  }

  const imageBuffer =
    await response.arrayBuffer();

  const signature =
    new Uint8Array(
      imageBuffer,
      0,
      Math.min(
        imageBuffer.byteLength,
        8
      )
    );

  const isPng =
    imageBuffer.byteLength >=
      1_000 &&
    imageBuffer.byteLength <=
      5 * 1024 * 1024 &&
    [
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
    ].every(
      (byte, index) =>
        signature[index] ===
        byte
    );

  if (!isPng) {
    throw new Error(
      "WhatsApp card image si PNG halali au ukubwa wake haukubaliki."
    );
  }

  return imageBuffer.byteLength;
}

export async function POST(
  request: Request
) {
  try {
    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Supabase environment variables hazipo.",
        },
        {
          status: 500,
        }
      );
    }

    const accessToken =
      getBearerToken(request);

    if (!accessToken) {
      return Response.json(
        {
          success: false,
          message:
            "Hujaruhusiwa kutuma WhatsApp invitation.",
        },
        {
          status: 401,
        }
      );
    }

    const supabase =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },

          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData.user
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Session yako imeisha. Ingia tena.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("role")
      .eq(
        "id",
        userData.user.id
      )
      .maybeSingle();

    if (profileError) {
      return Response.json(
        {
          success: false,
          message:
            profileError.message,
        },
        {
          status: 500,
        }
      );
    }

    const profile =
      profileData as
        | ProfileRecord
        | null;

    const userRole =
      profile?.role ?? "";

    const isAdministrator =
      userRole === "admin" ||
      userRole ===
        "administrator";

    if (!isAdministrator) {
      return Response.json(
        {
          success: false,
          message:
            "Administrator pekee ndiye anayeruhusiwa kutuma invitations.",
        },
        {
          status: 403,
        }
      );
    }

    let requestBody:
      SendInvitationRequest;

    try {
      requestBody =
        (await request.json()) as
          SendInvitationRequest;
    } catch {
      return Response.json(
        {
          success: false,
          message:
            "Request body si sahihi.",
        },
        {
          status: 400,
        }
      );
    }

    const invitationToken =
      requestBody
        .invitationToken
        ?.trim();

    if (!invitationToken) {
      return Response.json(
        {
          success: false,
          message:
            "Invitation token haipo.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: invitationData,
      error: invitationError,
    } = await supabase
      .from("invitations")
      .select(`
        id,
        invitation_token,

        guests!inner (
          full_name,
          phone,
          event_pass_id,
          allowed_guests
        ),

        events!inner (
          title,
          event_date,
          event_time,
          venue,
          language
        )
      `)
      .eq(
        "invitation_token",
        invitationToken
      )
      .maybeSingle();

    if (invitationError) {
      return Response.json(
        {
          success: false,
          message:
            invitationError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!invitationData) {
      return Response.json(
        {
          success: false,
          message:
            "Invitation haijapatikana.",
        },
        {
          status: 404,
        }
      );
    }

    const invitation =
      invitationData as unknown as
        InvitationRecord;

    const guest =
      getSingleRelation(
        invitation.guests
      );

    const event =
      getSingleRelation(
        invitation.events
      );

    if (!guest || !event) {
      return Response.json(
        {
          success: false,
          message:
            "Taarifa za event au mgeni hazijapatikana.",
        },
        {
          status: 404,
        }
      );
    }

    if (!guest.phone) {
      return Response.json(
        {
          success: false,
          message:
            "Mgeni hana namba ya simu.",
        },
        {
          status: 400,
        }
      );
    }

    const language:
      | "sw"
      | "en" =
      event.language === "en"
        ? "en"
        : "sw";

    const templateName =
      language === "en"
        ? process.env
            .WHATSAPP_TEMPLATE_NAME_EN
            ?.trim()
        : process.env
            .WHATSAPP_TEMPLATE_NAME_SW
            ?.trim();

    if (!templateName) {
      return Response.json(
        {
          success: false,

          message:
            language === "en"
              ? "WHATSAPP_TEMPLATE_NAME_EN haijawekwa."
              : "WHATSAPP_TEMPLATE_NAME_SW haijawekwa.",
        },
        {
          status: 500,
        }
      );
    }

    const siteOrigin =
      (
        process.env
          .NEXT_PUBLIC_APP_URL ||
        new URL(
          request.url
        ).origin
      ).replace(/\/$/, "");

    const cardImageUrl =
      `${siteOrigin}/api/invitations/` +
      `${encodeURIComponent(
        invitationToken
      )}/card?v=${Date.now()}`;

    try {
      const imageBytes =
        await assertPublicCardImage(
          cardImageUrl
        );

      console.info(
        "WhatsApp card preflight passed:",
        {
          path:
            "/api/invitations/:token/card",
          status: 200,
          contentType:
            "image/png",
          bytes:
            imageBytes,
        }
      );
    } catch (cardError) {
      console.error(
        "WhatsApp card preflight error:",
        cardError
      );

      return Response.json(
        {
          success: false,
          message:
            cardError instanceof Error
              ? cardError.message
              : "WhatsApp card image haikuweza kutengenezwa.",
        },
        {
          status: 502,
        }
      );
    }

    const recipientPhone =
      normalizeWhatsAppPhoneNumber(
        guest.phone
      );

    const {
      data: logData,
      error: logError,
    } = await supabase
      .from(
        "whatsapp_message_logs"
      )
      .insert({
        invitation_id:
          invitation.id,

        recipient_phone:
          recipientPhone,

        status: "queued",
      })
      .select("id")
      .single();

    if (
      logError ||
      !logData
    ) {
      return Response.json(
        {
          success: false,

          message:
            logError?.message ||
            "WhatsApp log haikuweza kutengenezwa.",
        },
        {
          status: 500,
        }
      );
    }

    try {
      const result =
        await sendWhatsAppInvitationTemplate(
          {
            phoneNumber:
              recipientPhone,

            templateName,

            languageCode:
              language === "en"
                ? "en_US"
                : "sw",

            guestName:
              guest.full_name,

            eventTitle:
              event.title,

            eventDate:
              formatDate(
                event.event_date,
                language
              ),

            eventTime:
              formatTime(
                event.event_time
              ),

            venue:
              event.venue || "-",

            eventPassId:
              guest.event_pass_id ||
              "-",

            allowedGuests:
              guest.allowed_guests ??
              1,

            invitationToken,

            cardImageUrl,
          }
        );

      const acceptedAt =
        new Date().toISOString();

      const {
        error: updateLogError,
      } = await supabase
        .from(
          "whatsapp_message_logs"
        )
        .update({
          message_id:
            result.messageId,

          status: "queued",
          updated_at:
            acceptedAt,
          error_message: null,
        })
        .eq(
          "id",
          logData.id
        );

      if (updateLogError) {
        console.error(
          "WhatsApp accepted log update error:",
          updateLogError
        );
      }

      return Response.json(
        {
          success: true,

          message:
            language === "en"
              ? "Meta accepted the WhatsApp request. Follow its delivery status in WhatsApp Logs."
              : "Meta imepokea ombi la WhatsApp. Fuatilia hali ya delivery kwenye WhatsApp Logs.",

          messageId:
            result.messageId,

          acceptanceStatus:
            result.acceptanceStatus,

          recipient:
            result.recipientPhone,
        },
        {
          status: 200,
        }
      );
    } catch (sendError) {
      const failedAt =
        new Date().toISOString();

      const failureMessage =
        sendError instanceof Error
          ? sendError.message
          : "WhatsApp invitation haikuweza kutumwa.";

      const {
        error: failedLogError,
      } = await supabase
        .from(
          "whatsapp_message_logs"
        )
        .update({
          status: "failed",

          error_message:
            failureMessage,

          updated_at:
            failedAt,
        })
        .eq(
          "id",
          logData.id
        );

      if (failedLogError) {
        console.error(
          "WhatsApp failed log update error:",
          failedLogError
        );
      }

      throw sendError;
    }
  } catch (error) {
    console.error(
      "Send WhatsApp invitation error:",
      error
    );

    return Response.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "WhatsApp invitation haikuweza kutumwa.",
      },
      {
        status: 500,
      }
    );
  }
}
