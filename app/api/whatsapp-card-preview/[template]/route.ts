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
  "garden_elegance",
  "rose_garden",
]);

type RouteContext = {
  params: Promise<{ template: string }>;
};

// Fixed sample photo for the `cover=1` preview toggle -- deliberately not a
// user-supplied URL, since this route has no auth gate and forwarding an
// arbitrary caller-supplied URL into fetchCoverImageDataUrl's server-side
// fetch would be an open SSRF proxy. Free-to-use Unsplash wedding photo.
const PREVIEW_COVER_PHOTO_URL =
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80";

export async function GET(request: Request, context: RouteContext) {
  const { template: requestedTemplate } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const photoLayout = normalizeWhatsAppCardPhotoLayout(searchParams.get("layout"));
  const coverImageUrl = searchParams.get("cover") ? PREVIEW_COVER_PHOTO_URL : null;

  if (requestedTemplate === "compact_horizontal") {
    return createCompactWhatsAppInvitationCard(
      previewData("royal_portrait", requestedTemplate, photoLayout, coverImageUrl)
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
    previewData(template, requestedTemplate, photoLayout, coverImageUrl)
  );
}

function previewData(
  template: WhatsAppCardTemplate,
  qrVariant: string,
  photoLayout: PhotoLayout,
  coverImageUrl: string | null
) {
  // rose_garden gets the exact sample set used throughout its visual-quality
  // review (Dr. Samwel & Dionista's wedding, guest Ann Anna) so this preview
  // matches what was already reviewed, instead of the generic sample below.
  if (template === "rose_garden") {
    return {
      title: "Samwel & Dionista",
      invitationMessage: "",
      date: "12 Septemba 2026",
      eventTime: "18:00",
      venue: "Noble Hall Kimara,\nDar es Salaam",
      ceremonyTitle: "",
      ceremonyTime: "",
      ceremonyVenue: "",
      receptionVenue: "Noble Hall Kimara, Dar es Salaam",
      guestName: "Ann Anna",
      dressCode: "Deep Forest Green, Deep Red, Blush Pink",
      allowedGuests: 2,
      eventPassId: "ZTAKTW",
      qrToken: `preview-only:${qrVariant}:ZTAKTW`,
      language: "sw",
      invitationTemplate: template,
      photoLayout,
      coverImageUrl,
      customBackgroundUrl: null,
      customLayoutElements: null,
      primary: "#145A46",
      secondary: "#FFF8EC",
      accent: "#C9A962",
    } as const;
  }

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
    coverImageUrl,
    customBackgroundUrl: null,
    customLayoutElements: null,
    primary: "#145A46",
    secondary: "#FFF8EC",
    accent: "#C9A962",
  } as const;
}
