import { getInvitationByToken } from "@/services/invitationService";
import {
  createWhatsAppInvitationCard,
  getWhatsAppCardData,
  normalizeWhatsAppCardTemplate,
} from "@/lib/whatsappInvitationCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    token: string;
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
