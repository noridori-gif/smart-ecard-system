import { createClient } from "@supabase/supabase-js";
import { createSaveTheDateCard } from "@/lib/saveTheDateCardImage";
import { getSaveTheDateCardByToken, normalizeVariant } from "@/services/saveTheDateService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public: the WhatsApp header image and the SMS page's <img>. The card_token (a random uuid on
// save_the_date_deliveries) is the only key; it is unrelated to qr_token / event_pass_id, so this
// can never reveal or act as a pass. The optional nonce segment only defeats outside caching (see
// the invitation card route).
type RouteContext = { params: Promise<{ token: string; nonce?: string[] }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return new Response("Not configured.", { status: 500 });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const card = await getSaveTheDateCardByToken(db, token);
    if (!card) return new Response("Save the Date not found.", { status: 404 });

    // The variant is the one recorded when it was sent, so a later colour change doesn't alter
    // cards guests already have.
    return await createSaveTheDateCard({
      variant: normalizeVariant(card.delivery.variant),
      language: card.event.language === "en" ? "en" : "sw",
      guestName: card.delivery.full_name,
      groomName: card.event.groom_name,
      brideName: card.event.bride_name,
      eventTitle: card.event.title,
      eventDateIso: card.event.event_date,
      venue: card.event.venue,
      coverImageUrl: card.event.cover_image_url,
    });
  } catch (error) {
    console.error("Save the Date card generation error:", error);
    return new Response("Card generation failed.", { status: 500 });
  }
}
