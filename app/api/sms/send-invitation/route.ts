import { createClient } from "@supabase/supabase-js";

import { sendBeemSms } from "@/services/beemSmsService";
import { buildSmsMessage } from "@/services/invitationMessageService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SmsSendRequest = {
  invitationId?: number;
};

type ProfileRecord = {
  role: string | null;
};

type InvitationRow = {
  id: number;
  invitation_token: string;
  guests:
    | {
        full_name: string | null;
        phone: string | null;
        event_pass_id: string | null;
        allowed_guests: number | null;
      }
    | {
        full_name: string | null;
        phone: string | null;
        event_pass_id: string | null;
        allowed_guests: number | null;
      }[]
    | null;
  events:
    | {
        title: string | null;
        event_date: string | null;
        event_time: string | null;
        venue: string | null;
        language: string | null;
      }
    | {
        title: string | null;
        event_date: string | null;
        event_time: string | null;
        venue: string | null;
        language: string | null;
      }[]
    | null;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

function getSingleRelation<T>(relation: T | T[] | null): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function isAllowedRole(role: string | null | undefined) {
  return role === "admin" || role === "administrator" || role === "organizer";
}

function getSafeSiteOrigin(request: Request) {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin
  );
}


export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const accessToken = getBearerToken(request);

    if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
      return Response.json(
        { success: false, message: "You are not authorized to send SMS invitations." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return Response.json(
        { success: false, message: "Your session has expired. Please sign in again." },
        { status: 401 }
      );
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      return Response.json({ success: false, message: profileError.message }, { status: 500 });
    }

    const profile = profileData as ProfileRecord | null;

    if (!isAllowedRole(profile?.role)) {
      return Response.json(
        { success: false, message: "Only admins or organizers can send SMS invitations." },
        { status: 403 }
      );
    }

    let requestBody: SmsSendRequest;

    try {
      requestBody = (await request.json()) as SmsSendRequest;
    } catch {
      return Response.json(
        { success: false, message: "The request body is invalid." },
        { status: 400 }
      );
    }

    const invitationId = Number(requestBody.invitationId);

    if (!Number.isInteger(invitationId) || invitationId <= 0) {
      return Response.json(
        { success: false, message: "Invitation ID is required." },
        { status: 400 }
      );
    }

    const { data: invitationData, error: invitationError } = await supabase
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
      .eq("id", invitationId)
      .maybeSingle();

    if (invitationError) {
      return Response.json({ success: false, message: invitationError.message }, { status: 500 });
    }

    if (!invitationData) {
      return Response.json({ success: false, message: "Invitation was not found." }, { status: 404 });
    }

    const invitationRecord = invitationData as InvitationRow;
    const guest = getSingleRelation(invitationRecord.guests);
    const event = getSingleRelation(invitationRecord.events);

    if (!guest || !event) {
      return Response.json(
        { success: false, message: "Invitation details could not be loaded." },
        { status: 404 }
      );
    }

    if (!guest.phone?.trim()) {
      return Response.json(
        { success: false, message: "This guest does not have a phone number." },
        { status: 400 }
      );
    }

    const siteOrigin = getSafeSiteOrigin(request);
    const message = buildSmsMessage(
      {
        id: invitationRecord.id,
        event_id: 0,
        guest_id: 0,
        invitation_token: invitationRecord.invitation_token,
        invitation_status: "sent",
        rsvp_status: "pending",
        created_at: new Date().toISOString(),
        event_pass_id: guest.event_pass_id ?? null,
        allowed_guests: guest.allowed_guests ?? 1,
        language: (event.language || "sw") as "sw" | "en",
        invitation_template: "minimal_ivory",
        events: {
          title: event.title ?? "Event",
          event_type: "",
          bride_name: null,
          groom_name: null,
          language: (event.language === "en" ? "en" : "sw") as "sw" | "en",
          invitation_template: "minimal_ivory",
          ceremony_title: null,
          ceremony_date: null,
          ceremony_time: null,
          ceremony_venue: null,
          ceremony_map_url: null,
          event_date: event.event_date ?? "",
          event_time: event.event_time ?? "",
          venue: event.venue ?? "",
          reception_map_url: null,
          dress_code: null,
          cover_image_url: null,
          theme_primary_color: null,
          theme_secondary_color: null,
          theme_accent_color: null,
          invitation_message: null,
        },
        guests: {
          full_name: guest.full_name ?? "Guest",
          phone: guest.phone ?? null,
          email: null,
          category: null,
          event_pass_id: guest.event_pass_id ?? null,
          allowed_guests: guest.allowed_guests ?? 1,
        },
      },
      siteOrigin
    );

    const result = await sendBeemSms({
      phoneNumber: guest.phone,
      message,
    });

    if (!result.success) {
      console.error("BEEM SMS send failed", {
        invitationId,
        userId: userData.user.id,
        errorType: result.errorDetails?.type,
        message: result.message,
      });

      return Response.json(
        {
          success: false,
          message:
            result.errorDetails?.type === "configuration"
              ? result.message || "SMS sending is not configured yet."
              : result.errorDetails?.type === "validation"
                ? "The guest phone number is invalid."
                : result.errorDetails?.type === "timeout"
                  ? "The SMS provider did not respond in time."
                  : "The SMS could not be sent right now.",
        },
        { status: result.statusCode && result.statusCode >= 400 ? result.statusCode : 502 }
      );
    }

    console.info("BEEM SMS send accepted", {
      invitationId,
      userId: userData.user.id,
      providerMessageId: result.providerMessageId,
    });

    return Response.json(
      {
        success: true,
        message: result.message || "SMS invitation accepted by BEEM Africa.",
        providerMessageId: result.providerMessageId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send SMS invitation error", error);

    return Response.json(
      { success: false, message: "The SMS invitation could not be sent." },
      { status: 500 }
    );
  }
}
