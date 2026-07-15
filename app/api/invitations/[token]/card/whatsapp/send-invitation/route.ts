import {
  createClient,
} from "@supabase/supabase-js";

import {
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
  relation:
    | T
    | T[]
    | null
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

  return timeValue.slice(0, 5);
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

    /*
     * Tunatengeneza Supabase client maalumu
     * kwa request hii. Access token ya user
     * ndiyo inayotumika kuthibitisha ruhusa.
     */
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

    if (
      profile?.role !== "admin"
    ) {
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
        : process.env
            .WHATSAPP_TEMPLATE_NAME_SW;

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
        new URL(request.url).origin
      ).replace(/\/$/, "");

    const cardImageUrl =
      `${siteOrigin}/api/invitations/` +
      `${invitationToken}/card`;

    const result =
      await sendWhatsAppInvitationTemplate(
        {
          phoneNumber:
            guest.phone,

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

    return Response.json(
      {
        success: true,
        message:
          "WhatsApp invitation imetumwa.",
        messageId:
          result.messageId,
        recipient:
          result.recipientPhone,
      },
      {
        status: 200,
      }
    );
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