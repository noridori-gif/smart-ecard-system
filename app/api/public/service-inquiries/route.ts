import { serviceDatabase } from "@/lib/makeConnectorServer";
import { normalizePublicPhone } from "@/lib/publicPledge";
import { checkPortalRateLimit, noStoreHeaders, sameOrigin } from "@/lib/financePortalServer";
import { sendBeemSms } from "@/services/beemSmsService";

const EVENT_TYPES = new Set(["wedding", "sendoff", "birthday", "kitchen_party", "corporate"]);

function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders });
}

async function notifyAdminsBySms(fullName: string, eventType: string) {
  try {
    const db = serviceDatabase();

    const { data: admins } = await db
      .from("profiles")
      .select("login_phone")
      .eq("role", "admin")
      .eq("is_active", true)
      .not("login_phone", "is", null);

    const phoneNumbers = (admins ?? [])
      .map((admin) => admin.login_phone)
      .filter((phone): phone is string => Boolean(phone));

    if (phoneNumbers.length === 0) {
      return false;
    }

    const smsText = `New service inquiry: ${fullName} (${eventType}). Open the leads dashboard to follow up.`;

    const results = await Promise.all(
      phoneNumbers.map((phoneNumber) => sendBeemSms({ phoneNumber, message: smsText }))
    );

    return results.some((result) => result.success);
  } catch (error) {
    console.error("Service inquiry admin SMS notification failed:", error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) {
      return reply({ error: "Request not allowed." }, 403);
    }

    if (!checkPortalRateLimit(request, "service-inquiries-create", 5)) {
      return reply({ error: "Too many requests. Try again shortly." }, 429);
    }

    const body = (await request.json().catch(() => null)) as {
      fullName?: unknown;
      phone?: unknown;
      eventType?: unknown;
      eventDate?: unknown;
      website?: unknown;
      durationMs?: unknown;
    } | null;

    if (!body) {
      return reply({ error: "Invalid request." }, 400);
    }

    // Honeypot field + minimum fill time reject bots, same pattern as the
    // public pledge form (app/api/public/pledges/route.ts).
    if ((typeof body.website === "string" && body.website) || Number(body.durationMs) < 1200) {
      return reply({ error: "Submission could not be accepted." }, 400);
    }

    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const eventType = typeof body.eventType === "string" ? body.eventType : "";
    const rawPhone = typeof body.phone === "string" ? body.phone : "";
    const eventDate =
      typeof body.eventDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.eventDate)
        ? body.eventDate
        : null;

    if (!fullName || fullName.length > 200) {
      return reply({ error: "Enter your name." }, 400);
    }

    if (!EVENT_TYPES.has(eventType)) {
      return reply({ error: "Select an event type." }, 400);
    }

    let phone: string;

    try {
      phone = normalizePublicPhone(rawPhone);
    } catch {
      return reply({ error: "Enter a valid Tanzanian phone number." }, 400);
    }

    const db = serviceDatabase();

    const { error } = await db
      .from("service_inquiries")
      .insert({ full_name: fullName, phone, event_type: eventType, event_date: eventDate });

    if (error) {
      console.error("Service inquiry insert failed:", error);
      return reply({ error: "Could not submit right now. Please try again." }, 400);
    }

    const adminNotified = await notifyAdminsBySms(fullName, eventType);

    return reply({ success: true, adminNotified }, 201);
  } catch (error) {
    console.error("Service inquiry submission failed:", error);
    return reply({ error: "Something went wrong. Please try again." }, 500);
  }
}
