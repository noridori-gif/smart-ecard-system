import {
  createCompactWhatsAppInvitationCard,
  createWhatsAppInvitationCard,
  normalizeWhatsAppCardTemplate,
  type WhatsAppCardTemplate,
} from "@/lib/whatsappInvitationCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const previewTemplates = new Set<WhatsAppCardTemplate>([
  "midnight_luxe",
  "emerald_botanical_halo",
  "modern_floral",
  "royal_dark",
  "elegant_gold",
  "chateau_letterpress",
  "luxury_envelope",
  "classic_photo",
]);

type RouteContext = {
  params: Promise<{ template: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { template: requestedTemplate } = await context.params;

  if (requestedTemplate === "compact_horizontal") {
    return createCompactWhatsAppInvitationCard(
      previewData("classic_photo", requestedTemplate)
    );
  }

  const template = normalizeWhatsAppCardTemplate(requestedTemplate);

  if (
    !previewTemplates.has(template) ||
    (template === "classic_photo" && requestedTemplate !== "classic_photo")
  ) {
    return new Response("Unknown WhatsApp card template.", { status: 404 });
  }

  return createWhatsAppInvitationCard(
    template,
    previewData(template, requestedTemplate)
  );
}

function previewData(
  template: WhatsAppCardTemplate,
  qrVariant: string
) {
  return {
    title: "Samwel & Dio",
    invitationMessage:
      "Familia za Bw. na Bi. Mushi pamoja na waandaaji wa hafla\nwana furaha kubwa kukualika kushiriki nasi siku hii ya pekee.",
    date: "12 Septemba 2026",
    eventTime: "Saa 2:00 Asubuhi",
    venue: "Noble Hall Kimara,\nDar es Salaam",
    ceremonyTitle: "IBADA YA NDOA",
    ceremonyTime: "Saa 2:00 Asubuhi",
    ceremonyVenue: "Kanisa la Mt. Yosefu, Dar es Salaam",
    receptionVenue: "Noble Hall Kimara,\nDar es Salaam",
    guestName: "Mr & Mrs Noriega Ludovick",
    dressCode: "Emerald Green",
    allowedGuests: 2,
    eventPassId: "SEP-8F42KD",
    qrToken: `preview-only:${qrVariant}:SEP-8F42KD`,
    language: "sw",
    invitationTemplate: template,
    coverImageUrl: null,
    primary: "#145A46",
    secondary: "#FFF8EC",
    accent: "#C9A962",
  } as const;
}
