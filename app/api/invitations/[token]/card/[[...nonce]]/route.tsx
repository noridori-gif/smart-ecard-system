import { getInvitationByToken } from "@/services/invitationService";
import {
  createWhatsAppInvitationCard,
  getWhatsAppCardData,
  normalizeWhatsAppCardTemplate,
} from "@/lib/whatsappInvitationCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// The optional [[...nonce]] segment isn't read here -- it exists so callers
// that need a guaranteed-fresh fetch (WhatsApp sends) can embed a per-send
// nonce in the URL PATH rather than a query string. Some link-fetchers
// (including, per WhatsApp Business Platform reports, Meta's own header-image
// fetcher) can normalize or drop query strings when deciding whether a URL
// was already fetched; a path segment can't be stripped that way. This route
// is already force-dynamic/revalidate:0 so a bare /card URL (e.g. the
// organizer-facing share button) still always renders fresh -- the nonce is
// only a defense against caching *outside* this app.
type RouteContext = {
  params: Promise<{
    token: string;
    nonce?: string[];
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token) {
      return new Response("Invitation token is missing.", { status: 400 });
    }

    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return new Response("Invitation not found.", { status: 404 });
    }

    return await createWhatsAppInvitationCard(
      normalizeWhatsAppCardTemplate(invitation.invitation_template),
      getWhatsAppCardData(invitation)
    );
  } catch (error) {
    console.error("Invitation card generation error:", error);

    return new Response("Card generation failed.", { status: 500 });
  }
}
