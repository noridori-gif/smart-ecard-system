import {
  createCompactWhatsAppInvitationCard,
  createWhatsAppInvitationCard,
  normalizeWhatsAppCardPhotoLayout,
  normalizeWhatsAppCardTemplate,
  type WhatsAppCardTemplate,
} from "@/lib/whatsappInvitationCard";
import type { PhotoLayout } from "@/services/eventService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const previewTemplates = new Set<WhatsAppCardTemplate>([
  "royal_portrait",
  "golden_elegance",
  "botanical_romance",
  "modern_minimal_photo",
  "heritage_pattern",
]);

type RouteContext = {
  params: Promise<{ template: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { template: requestedTemplate } = await context.params;
  const photoLayout = normalizeWhatsAppCardPhotoLayout(
    new URL(request.url).searchParams.get("layout")
  );

  if (requestedTemplate === "compact_horizontal") {
    return createCompactWhatsAppInvitationCard(
      previewData("royal_portrait", requestedTemplate, photoLayout)
    );
  }

  const template = normalizeWhatsAppCardTemplate(requestedTemplate);

  if (
    !previewTemplates.has(template) ||
    (template === "royal_portrait" && requestedTemplate !== "royal_portrait")
  ) {
    return new Response("Unknown WhatsApp card template.", { status: 404 });
  }

  return createWhatsAppInvitationCard(
    template,
    previewData(template, requestedTemplate, photoLayout)
  );
}

function previewData(
  template: WhatsAppCardTemplate,
  qrVariant: string,
  photoLayout: PhotoLayout
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
    photoLayout,
    coverImageUrl: null,
    customBackgroundUrl: null,
    customLayoutElements: null,
    primary: "#145A46",
    secondary: "#FFF8EC",
    accent: "#C9A962",
  } as const;
}
