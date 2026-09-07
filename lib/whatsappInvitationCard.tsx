import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import sharp from "sharp";
import PremiumWhatsAppCard, {
  CompactHorizontalCard,
  copy,
  whatsAppCardTotalHeight,
} from "./PremiumWhatsAppCard";
import { formatPassIdForDisplay } from "./passId";
import { DEFAULT_CUSTOM_LAYOUT } from "@/services/invitationLayoutService";

import type { PublicInvitation } from "@/services/invitationService";
import type { PhotoLayout } from "@/services/eventService";
import type { CustomLayoutElement } from "@/services/invitationLayoutService";

export type WhatsAppCardTemplate =
  | "royal_portrait"
  | "golden_elegance"
  | "botanical_romance"
  | "modern_minimal_photo"
  | "heritage_pattern"
  | "garden_elegance"
  | "rose_garden"
  | "custom";

export type WhatsAppCardData = {
  title: string;
  invitationMessage: string;
  date: string;
  eventTime: string;
  venue: string;
  ceremonyTitle: string;
  ceremonyTime: string;
  ceremonyVenue: string;
  receptionVenue: string;
  guestName: string;
  dressCode: string;
  allowedGuests: number;
  eventPassId: string;
  qrToken: string | null;
  language: "sw" | "en";
  invitationTemplate: WhatsAppCardTemplate;
  photoLayout: PhotoLayout;
  coverImageUrl: string | null;
  customBackgroundUrl: string | null;
  customLayoutElements: CustomLayoutElement[] | null;
  primary: string;
  secondary: string;
  accent: string;
};

type RenderData = WhatsAppCardData & {
  coverImageDataUrl: string | null;
  coverImageBannerHeight: number;
  qrCodeDataUrl: string | null;
  primaryText: string;
  secondaryText: string;
  accentText: string;
  titleSize: number;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1800;
const ROSE_GARDEN_CARD_HEIGHT = 2080;

// Rose Garden's four corner motifs (green silk, red/pink roses, ribbon) are
// cropped once from a bundled reference photo -- see
// public/invitation-assets/README.md for the source and crop provenance --
// and read at module load, same pattern as app/opengraph-image.tsx's logo.
// Fixed display size in CSS px at CARD_WIDTH=1080; files are baked at 2x
// that for a crisp downscale through the JPEG re-encode.
const ROSE_GARDEN_ASSET_DIR = join(process.cwd(), "public", "invitation-assets", "rose-garden");
const ROSE_CORNER_TL = {
  dataUrl: `data:image/png;base64,${readFileSync(join(ROSE_GARDEN_ASSET_DIR, "tl.png")).toString("base64")}`,
  width: 236,
  height: 1019,
};
const ROSE_CORNER_TR = {
  dataUrl: `data:image/png;base64,${readFileSync(join(ROSE_GARDEN_ASSET_DIR, "tr.png")).toString("base64")}`,
  width: 236,
  height: 1160,
};
const ROSE_CORNER_BL = {
  dataUrl: `data:image/png;base64,${readFileSync(join(ROSE_GARDEN_ASSET_DIR, "bl.png")).toString("base64")}`,
  width: 236,
  height: 939,
};
const ROSE_CORNER_BR = {
  dataUrl: `data:image/png;base64,${readFileSync(join(ROSE_GARDEN_ASSET_DIR, "br.png")).toString("base64")}`,
  width: 226,
  height: 842,
};

// Rose Garden's typography relies on real serif/script contrast (Playfair
// Display + Great Vibes) against the photographic corners -- without fonts
// registered here, next/og's ImageResponse silently falls back to Satori's
// generic default sans for every fontFamily in this file (Georgia, Arial,
// etc. are not embedded and Satori does not read system fonts), which is
// most of why the un-registered render reads as "text on a background"
// rather than a designed invitation. Bundled as local WOFF files (same
// load-once-at-module-load pattern as the corner PNGs above) rather than
// fetched from Google Fonts at request time, to keep this off the network
// path that caused the Meta 131053 timeout regression before.
const ROSE_GARDEN_FONT_DIR = join(process.cwd(), "public", "invitation-assets", "fonts");
function loadRoseGardenFont(file: string) {
  return readFileSync(join(ROSE_GARDEN_FONT_DIR, file));
}
type EmbeddedFont = {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal" | "italic";
};
const ROSE_GARDEN_FONTS: EmbeddedFont[] = [
  { name: "Playfair Display", data: loadRoseGardenFont("PlayfairDisplay-Regular.woff"), weight: 400, style: "normal" },
  { name: "Playfair Display", data: loadRoseGardenFont("PlayfairDisplay-Bold.woff"), weight: 700, style: "normal" },
  { name: "Playfair Display", data: loadRoseGardenFont("PlayfairDisplay-Italic.woff"), weight: 400, style: "italic" },
  { name: "Great Vibes", data: loadRoseGardenFont("GreatVibes-Regular.woff"), weight: 400, style: "normal" },
  { name: "Inter", data: loadRoseGardenFont("Inter-Bold.woff"), weight: 700, style: "normal" },
];
// Embedded (not left as a plain public URL) for the same reason as the
// Rose Garden fonts above -- next/og's ImageResponse renders through this
// module's server-only path, and embedding avoids a live network fetch
// during render. lib/PremiumWhatsAppCard.tsx also renders in the browser
// (EventFormWizard's live preview), where readFileSync isn't available at
// all, which is why that file takes these as data instead of loading them.
const ROYAL_PORTRAIT_ASSET_DIR = join(process.cwd(), "public", "invitation-assets", "royal-portrait");
function loadRoyalPortraitAsset(file: string) {
  return `data:image/png;base64,${readFileSync(join(ROYAL_PORTRAIT_ASSET_DIR, file)).toString("base64")}`;
}
const LEAF_TOP_LEFT_URL = loadRoyalPortraitAsset("leaf_top_left.png");
const LEAF_BOTTOM_LEFT_URL = loadRoyalPortraitAsset("leaf_bottom_left.png");
const LEAF_TOP_RIGHT_URL = loadRoyalPortraitAsset("leaf_top_right_light.png");

// Matches SIDE_PHOTO_WIDTH / SIDE_BY_SIDE_HEIGHT in PremiumWhatsAppCard.tsx.
const SIDE_PHOTO_OVERLAY_WIDTH = 400;
const SIDE_PHOTO_OVERLAY_HEIGHT = 1500;

function safeHexColor(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback;
}

/**
 * Blends the side_by_side layout's photo into the panel's own background
 * color -- rendered as an actual PNG (not a CSS-styled div) because satori
 * does not composite a plain <div> over a sibling <img> in this pipeline;
 * only <img>-over-<img> stacking paints correctly (confirmed by testing:
 * identical PNG byte output whether or not overlay divs were present at
 * all, vs. a real difference once the same overlay was rendered as an
 * <img>). A low-opacity wash across the whole photo does most of the work
 * -- it survives WhatsApp's own heavy downscaling of the header image for
 * its inline chat thumbnail, where a narrow edge gradient that looks
 * smooth at full 1080px resolution collapses to a few real pixels and
 * reads as a hard cut again. The right-edge gradient and the top/bottom
 * feathers are the final polish at full resolution.
 *
 * Tuned down after a live test against a white/gray studio backdrop photo
 * (event 14): the original 0.22 blanket wash plus a linear 38%->100%
 * gradient visibly dulled the subject whenever they sat in the right ~60%
 * of the photo, not just at the seam. The wash opacity is lower and the
 * gradient now holds near-zero until 62% before ramping (via extra stops,
 * not a straight line) so the fade stays concentrated in the last ~20%
 * next to the panel, while keeping enough width for the ramp to survive
 * WhatsApp's thumbnail downscale the same way the wider original did.
 */
async function buildSidePhotoBlendOverlayUrl(paperColor: string) {
  const width = SIDE_PHOTO_OVERLAY_WIDTH;
  const height = SIDE_PHOTO_OVERLAY_HEIGHT;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rightFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${paperColor}" stop-opacity="0" />
          <stop offset="62%" stop-color="${paperColor}" stop-opacity="0" />
          <stop offset="78%" stop-color="${paperColor}" stop-opacity="0.15" />
          <stop offset="90%" stop-color="${paperColor}" stop-opacity="0.55" />
          <stop offset="100%" stop-color="${paperColor}" stop-opacity="1" />
        </linearGradient>
        <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${paperColor}" stop-opacity="1" />
          <stop offset="22%" stop-color="${paperColor}" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="bottomFade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="${paperColor}" stop-opacity="1" />
          <stop offset="22%" stop-color="${paperColor}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="${paperColor}" opacity="0.12" />
      <rect width="${width}" height="${height}" fill="url(#rightFade)" />
      <rect width="${width}" height="${height}" fill="url(#topFade)" />
      <rect width="${width}" height="${height}" fill="url(#bottomFade)" />
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

const DEFAULT_BANNER_HEIGHT = 620;
const MIN_BANNER_HEIGHT = 480;
// Capped well below the photo's true aspect ratio for very tall portrait
// photos: an uncapped banner nearly doubles total canvas pixels vs. the old
// fixed-height card, which is what caused the oversized (4.47MB) PNG payload
// that made Meta time out fetching the media (error 131053).
const MAX_BANNER_HEIGHT = 1500;
const COVER_FETCH_TIMEOUT_MS = 6_000;
const MAX_COVER_BYTES = 8 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_FORMAT_SIGNATURE = [0x57, 0x45, 0x42, 0x50];

function cleanText(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function formatDate(dateValue: string | null, language: "sw" | "en") {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(timeValue: string | null, language: "sw" | "en") {
  if (!timeValue) {
    return "";
  }

  const [hoursValue, minutesValue] = timeValue.split(":");
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return timeValue;
  }

  const date = new Date(2000, 0, 1, hours, minutes);

  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}


function safeColor(value: string | null, fallback: string) {
  const normalized = value?.trim();

  return normalized && /^#[0-9a-f]{6}$/i.test(normalized)
    ? normalized.toUpperCase()
    : fallback;
}

function readableText(background: string) {
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  const luminance =
    (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance > 0.56 ? "#111827" : "#FFFFFF";
}

function displayTitle(invitation: PublicInvitation) {
  const eventType = cleanText(invitation.event_type, "").toLowerCase();
  const isWedding =
    eventType === "wedding" || eventType.includes("harusi");
  const isSendOff = eventType.includes("send");

  if (isWedding && invitation.bride_name && invitation.groom_name) {
    return `${invitation.groom_name} & ${invitation.bride_name}`;
  }

  if (isSendOff && invitation.bride_name) {
    return invitation.bride_name;
  }

  return invitation.event_title;
}

function titleFontSize(title: string) {
  if (title.length > 55) return 52;
  if (title.length > 38) return 60;
  if (title.length > 25) return 68;
  return 78;
}

export function normalizeWhatsAppCardPhotoLayout(
  layout: string | null | undefined
): PhotoLayout {
  if (
    layout === "top_banner" ||
    layout === "side_by_side" ||
    layout === "text_only"
  ) {
    return layout;
  }

  return "top_banner";
}

export function normalizeWhatsAppCardTemplate(
  template: string | null | undefined
): WhatsAppCardTemplate {
  if (
    template === "royal_portrait" ||
    template === "golden_elegance" ||
    template === "botanical_romance" ||
    template === "modern_minimal_photo" ||
    template === "heritage_pattern" ||
    template === "garden_elegance" ||
    template === "rose_garden" ||
    template === "custom"
  ) {
    return template;
  }

  return "royal_portrait";
}

export function getWhatsAppCardData(
  invitation: PublicInvitation
): WhatsAppCardData {
  const language = invitation.language === "en" ? "en" : "sw";
  const title = cleanText(displayTitle(invitation), "Invitation");
  const invitationTemplate = normalizeWhatsAppCardTemplate(
    invitation.invitation_template
  );

  return {
    title,
    invitationMessage: invitation.invitation_message ?? "",
    date: formatDate(invitation.event_date, language),
    eventTime: formatTime(invitation.event_time, language),
    venue: cleanText(invitation.venue, "-"),
    ceremonyTitle: cleanText(invitation.ceremony_title, ""),
    ceremonyTime: formatTime(invitation.ceremony_time, language),
    ceremonyVenue: cleanText(invitation.ceremony_venue, ""),
    receptionVenue: cleanText(invitation.venue, ""),
    guestName: cleanText(invitation.guest_name, "Guest"),
    dressCode: cleanText(invitation.dress_code, ""),
    allowedGuests: Number.isFinite(invitation.allowed_guests)
      ? Math.max(1, Math.floor(invitation.allowed_guests))
      : 1,
    eventPassId: cleanText(invitation.event_pass_id, ""),
    qrToken: invitation.qr_token?.trim() || null,
    language,
    invitationTemplate,
    photoLayout: normalizeWhatsAppCardPhotoLayout(invitation.photo_layout),
    coverImageUrl: invitation.cover_image_url?.trim() || null,
    customBackgroundUrl: invitation.custom_invitation_background_url?.trim() || null,
    customLayoutElements: invitation.custom_layout_elements ?? null,
    primary: safeColor(invitation.theme_primary_color, "#145A46"),
    secondary: safeColor(invitation.theme_secondary_color, "#FFF8EC"),
    accent: safeColor(invitation.theme_accent_color, "#C9A962"),
  };
}

function isPng(bytes: Uint8Array) {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function isJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebP(bytes: Uint8Array) {
  const hasRiffHeader = WEBP_RIFF_SIGNATURE.every(
    (byte, index) => bytes[index] === byte
  );

  const hasWebPHeader = WEBP_FORMAT_SIGNATURE.every(
    (byte, index) => bytes[index + 8] === byte
  );

  return hasRiffHeader && hasWebPHeader;
}

async function fetchCoverImageDataUrl(urlValue: string | null) {
  if (!urlValue) {
    return null;
  }

  try {
    const url = new URL(urlValue);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Cover image URL must use HTTP or HTTPS.");
    }

    const response = await fetch(url, {
      headers: {
        Accept: "image/png,image/jpeg,image/webp",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(COVER_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Cover image returned HTTP ${response.status}.`);
    }

    const declaredLength = Number(response.headers.get("content-length"));

    if (declaredLength > MAX_COVER_BYTES) {
      throw new Error("Cover image is larger than 8 MB.");
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength === 0 || buffer.byteLength > MAX_COVER_BYTES) {
      throw new Error("Cover image is empty or larger than 8 MB.");
    }

    const bytes = new Uint8Array(buffer);
    const mimeType = isPng(bytes)
  ? "image/png"
  : isJpeg(bytes)
    ? "image/jpeg"
    : isWebP(bytes)
      ? "image/webp"
      : null;

    if (!mimeType) {
      throw new Error("Cover image is not a supported PNG, JPEG, or WebP file.");
    }

    // Downscale + re-encode before embedding: originals can be several
    // thousand pixels wide, and embedding that directly bloats the final
    // rasterized PNG the card renderer produces. Capping to the card's own
    // render width keeps the embedded photo at the resolution it's actually
    // displayed at.
    const { data: processedBuffer, info } = await sharp(Buffer.from(buffer))
      .rotate()
      .resize({ width: CARD_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    const dataUrl = `data:image/jpeg;base64,${processedBuffer.toString("base64")}`;
    const bannerHeight = clampBannerHeight(
      Math.round((CARD_WIDTH / info.width) * info.height)
    );

    return { dataUrl, bannerHeight };
  } catch (error) {
    console.warn("WhatsApp card cover image fallback:", {
      urlHost: getUrlHost(urlValue),
      reason: error instanceof Error ? error.message : "Unknown image error",
    });

    return null;
  }
}

function clampBannerHeight(naturalHeight: number) {
  return Math.min(MAX_BANNER_HEIGHT, Math.max(MIN_BANNER_HEIGHT, naturalHeight));
}

function getUrlHost(urlValue: string) {
  try {
    return new URL(urlValue).host;
  } catch {
    return "invalid-url";
  }
}

function renderData(
  data: WhatsAppCardData,
  coverImageDataUrl: string | null,
  coverImageBannerHeight: number,
  qrCodeDataUrl: string | null
): RenderData {
  const primary = safeColor(data.primary, "#145A46");
  const secondary = safeColor(data.secondary, "#FFF8EC");
  const accent = safeColor(data.accent, "#C9A962");
  const title = cleanText(data.title, "Invitation");

  return {
    ...data,
    title,
    invitationMessage: data.invitationMessage,
    date: cleanText(data.date, "-"),
    eventTime: cleanText(data.eventTime, ""),
    venue: cleanText(data.venue, "-"),
    ceremonyTitle: cleanText(data.ceremonyTitle, ""),
    ceremonyTime: cleanText(data.ceremonyTime, ""),
    ceremonyVenue: cleanText(data.ceremonyVenue, ""),
    receptionVenue: cleanText(data.receptionVenue, ""),
    guestName: cleanText(data.guestName, "Guest"),
    dressCode: cleanText(data.dressCode, ""),
    eventPassId: cleanText(data.eventPassId, ""),
    allowedGuests: Number.isFinite(data.allowedGuests)
      ? Math.max(1, Math.floor(data.allowedGuests))
      : 1,
    primary,
    secondary,
    accent,
    coverImageDataUrl,
    coverImageBannerHeight,
    qrCodeDataUrl,
    primaryText: readableText(primary),
    secondaryText: readableText(secondary),
    accentText: readableText(accent),
    titleSize: titleFontSize(title),
  };
}

async function materializePng(
  element: ReactElement,
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
  fonts?: EmbeddedFont[]
) {
  const imageResponse = new ImageResponse(element, {
    width,
    height,
    ...(fonts ? { fonts } : {}),
  });
  const buffer = await imageResponse.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (!isPng(bytes) || buffer.byteLength < 1_000) {
    throw new Error("ImageResponse did not produce a valid PNG.");
  }

  return buffer;
}

/**
 * ImageResponse only outputs PNG, which is lossless and badly suited to
 * photo-heavy cards (multi-MB files even after bounding canvas size).
 * Re-encode to JPEG so the response transfers fast enough for WhatsApp's
 * media fetch (Meta error 131053 "media upload error" fires when the host
 * is too slow / the file is too large) and stays well under WhatsApp's
 * 5MB media limit.
 */
async function materializeJpeg(
  element: ReactElement,
  width = CARD_WIDTH,
  height = CARD_HEIGHT,
  fonts?: EmbeddedFont[]
) {
  const pngBuffer = await materializePng(element, width, height, fonts);

  return sharp(Buffer.from(pngBuffer))
    .flatten({ background: "#ffffff" })
    // 4:4:4 (no chroma subsampling) keeps small saturated text/hairline
    // dividers full-color -- default 4:2:0 halves color resolution, which
    // reads as "washed out" on the small-caps labels and thin rules.
    .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

function jpegResponse(buffer: Buffer) {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=300, s-maxage=300, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function buildQrCodeDataUrl(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  try {
    return await QRCode.toDataURL(token, {
      margin: 3,
      width: 400,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });
  } catch (error) {
    console.warn("WhatsApp card QR fallback:", error);
    return null;
  }
}

export async function createWhatsAppInvitationCard(
  template: WhatsAppCardTemplate,
  data: WhatsAppCardData
) {
  if (template === "custom") {
    return createCustomInvitationCard(data);
  }

  if (template === "rose_garden") {
    return createRoseGardenInvitationCard(data);
  }

  const cover = await fetchCoverImageDataUrl(data.coverImageUrl);
  const qrCodeDataUrl = await buildQrCodeDataUrl(data.qrToken);
  let normalizedData = renderData(
    data,
    cover?.dataUrl ?? null,
    cover?.bannerHeight ?? DEFAULT_BANNER_HEIGHT,
    qrCodeDataUrl
  );

  const sidePhotoBlendOverlayUrl =
    normalizedData.photoLayout === "side_by_side"
      ? await buildSidePhotoBlendOverlayUrl(safeHexColor(normalizedData.secondary, "#FFF8EC"))
      : undefined;

  try {
    return jpegResponse(
      await materializeJpeg(
        renderWhatsAppCard(template, normalizedData, sidePhotoBlendOverlayUrl),
        CARD_WIDTH,
        whatsAppCardTotalHeight(normalizedData.photoLayout, normalizedData.coverImageBannerHeight)
      )
    );
  } catch (error) {
    if (normalizedData.coverImageDataUrl) {
      console.warn("WhatsApp card image decode fallback:", error);
      normalizedData = renderData(data, null, DEFAULT_BANNER_HEIGHT, qrCodeDataUrl);

      try {
        return jpegResponse(
          await materializeJpeg(
            renderWhatsAppCard(template, normalizedData, sidePhotoBlendOverlayUrl),
            CARD_WIDTH,
            whatsAppCardTotalHeight(normalizedData.photoLayout, normalizedData.coverImageBannerHeight)
          )
        );
      } catch (fallbackError) {
        console.error("WhatsApp card template fallback failed:", fallbackError);
      }
    } else {
      console.error("WhatsApp card template render failed:", error);
    }

    return jpegResponse(
      await materializeJpeg(<SafeFallbackCard data={normalizedData} />)
    );
  }
}

/**
 * The "custom" template: the organizer's own uploaded design is the entire
 * card (not a banner within a fixed layout), with guest name / venue /
 * date-time / QR composited on top at the saved percentage positions.
 * Reuses fetchCoverImageDataUrl()'s existing fetch/resize/re-encode guardrails
 * (size cap, timeout, CARD_WIDTH resize) so this path inherits the same
 * protection against the 131053 media-timeout failure mode as the 5 preset
 * templates -- it's just resizing the background instead of a cover photo.
 */
async function createCustomInvitationCard(data: WhatsAppCardData) {
  const background = await fetchCoverImageDataUrl(data.customBackgroundUrl);
  const qrCodeDataUrl = await buildQrCodeDataUrl(data.qrToken);
  const normalizedData = renderData(
    data,
    background?.dataUrl ?? null,
    background?.bannerHeight ?? DEFAULT_BANNER_HEIGHT,
    qrCodeDataUrl
  );

  if (!normalizedData.coverImageDataUrl) {
    console.warn("Custom invitation card missing a usable background image, using fallback card.");
    return jpegResponse(
      await materializeJpeg(<SafeFallbackCard data={normalizedData} />)
    );
  }

  try {
    return jpegResponse(
      await materializeJpeg(
        <CustomInvitationCard data={normalizedData} />,
        CARD_WIDTH,
        normalizedData.coverImageBannerHeight
      )
    );
  } catch (error) {
    console.error("Custom invitation card render failed:", error);

    return jpegResponse(
      await materializeJpeg(<SafeFallbackCard data={normalizedData} />)
    );
  }
}

const ELEMENT_ALIGN_STYLE: Record<"left" | "center" | "right", { justifyContent: "flex-start" | "center" | "flex-end"; textAlign: "left" | "center" | "right" }> = {
  left: { justifyContent: "flex-start", textAlign: "left" },
  center: { justifyContent: "center", textAlign: "center" },
  right: { justifyContent: "flex-end", textAlign: "right" },
};

function customLayoutElement(data: RenderData, key: CustomLayoutElement["key"]): CustomLayoutElement {
  return (
    data.customLayoutElements?.find((item) => item.key === key) ??
    DEFAULT_CUSTOM_LAYOUT.find((item) => item.key === key)!
  );
}

function customElementText(data: RenderData, key: "guest_name" | "venue" | "datetime") {
  if (key === "guest_name") return data.guestName;
  if (key === "venue") return data.venue;
  return [data.date, data.eventTime].filter(Boolean).join(" · ");
}

function CustomInvitationCard({ data }: { data: RenderData }) {
  const width = CARD_WIDTH;
  const height = data.coverImageBannerHeight;

  const textKeys: Array<"guest_name" | "venue" | "datetime"> = ["guest_name", "venue", "datetime"];

  return (
    <div style={{ position: "relative", width, height, display: "flex", overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.coverImageDataUrl ?? undefined}
        alt=""
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, width, height, objectFit: "cover" }}
      />

      {textKeys.map((key) => {
        const element = customLayoutElement(data, key);
        const align = ELEMENT_ALIGN_STYLE[element.align ?? "left"];

        return (
          <div
            key={key}
            style={{
              position: "absolute",
              left: (element.xPct / 100) * width,
              top: (element.yPct / 100) * height,
              width: (element.widthPct / 100) * width,
              height: (element.heightPct / 100) * height,
              display: "flex",
              alignItems: "center",
              justifyContent: align.justifyContent,
              textAlign: align.textAlign,
              fontFamily: "Arial, sans-serif",
              fontSize: element.fontSize ?? 32,
              fontWeight: 700,
              color: element.color ?? "#FFFFFF",
              overflow: "hidden",
            }}
          >
            {customElementText(data, key)}
          </div>
        );
      })}

      {data.qrCodeDataUrl && (() => {
        const qrElement = customLayoutElement(data, "qr");

        return (
          <div
            style={{
              position: "absolute",
              left: (qrElement.xPct / 100) * width,
              top: (qrElement.yPct / 100) * height,
              width: (qrElement.widthPct / 100) * width,
              height: (qrElement.heightPct / 100) * height,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 8,
              padding: 6,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.qrCodeDataUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        );
      })()}
    </div>
  );
}

const ROSE_FOREST = "#1B4332";
const ROSE_BERRY = "#7A0C0C";
const ROSE_BLUSH = "#E8B4B8";
const ROSE_IVORY = "#FDF6F0";
const ROSE_SERIF = "Playfair Display";
const ROSE_SCRIPT = "Great Vibes";
const ROSE_SANS = "Inter";

// Common titles/honorifics to skip when picking out a "meaningful" name word
// -- same idea as pledgeMessageService.ts's NAME_TITLES, kept separate since
// this file doesn't otherwise depend on that module. Matters here because
// production event titles aren't always "Bride & Groom": a title with no
// "&" (e.g. a single organizer-entered name) must not have its honorific
// mistaken for one half of a couple.
const ROSE_NAME_HONORIFICS = new Set([
  "dr", "mr", "mrs", "ms", "miss", "prof", "rev", "hon", "sheikh", "imam", "pastor", "bwana", "bibi",
]);
function roseSignificantWord(word: string) {
  return !ROSE_NAME_HONORIFICS.has(word.replace(/\.$/, "").toLowerCase());
}
function roseFirstMeaningfulWord(part: string) {
  const words = part.trim().split(/\s+/).filter(Boolean);
  return words.find(roseSignificantWord) ?? words[0] ?? "";
}

/**
 * Full first names for the script hero line ("Samwel & Dionista") when the
 * title has a clear "X & Y" shape, otherwise just the one meaningful name
 * present -- deliberately does NOT invent a second name from a single
 * person's own middle/last name when there's no "&" in the title.
 */
function roseHeroNames(title: string) {
  const ampersandParts = title.split(/\s*&\s*/).filter(Boolean);

  if (ampersandParts.length >= 2) {
    const first = roseFirstMeaningfulWord(ampersandParts[0]);
    const second = roseFirstMeaningfulWord(ampersandParts[1]);

    if (first && second) {
      return `${first} & ${second}`;
    }
  }

  return roseFirstMeaningfulWord(title) || title;
}

/** Same shape as roseHeroNames, but single letters, for the no-photo monogram. */
function roseMonogram(title: string) {
  const ampersandParts = title.split(/\s*&\s*/).filter(Boolean);

  if (ampersandParts.length >= 2) {
    const first = roseFirstMeaningfulWord(ampersandParts[0])[0];
    const second = roseFirstMeaningfulWord(ampersandParts[1])[0];

    if (first && second) {
      return `${first.toUpperCase()} & ${second.toUpperCase()}`;
    }
  }

  const letter = roseFirstMeaningfulWord(title)[0] ?? title[0] ?? "";
  return letter.toUpperCase();
}

function roseYear(dateText: string) {
  return dateText.match(/\d{4}/)?.[0] ?? "";
}

function RoseCorner({
  corner,
  horizontal,
  vertical,
}: {
  corner: typeof ROSE_CORNER_TL;
  horizontal: "left" | "right";
  vertical: "top" | "bottom";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={corner.dataUrl}
      alt=""
      width={corner.width}
      height={corner.height}
      style={{
        position: "absolute",
        [horizontal]: 0,
        [vertical]: 0,
        width: corner.width,
        height: corner.height,
      }}
    />
  );
}

/** Small letterspaced label with flanking hairlines, reused for every
 * section heading so the card has one consistent label treatment instead
 * of the mix of bare labels / bordered boxes / side-rules the first pass
 * had (part of what read as "competing for attention"). */
function RoseEyebrow({ children }: { children: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 28, height: 1, display: "flex", backgroundColor: ROSE_BLUSH }} />
      <div style={{ display: "flex", fontFamily: ROSE_SANS, fontSize: 15, fontWeight: 700, letterSpacing: 4, color: ROSE_BERRY, whiteSpace: "pre" }}>
        {children}
      </div>
      <div style={{ width: 28, height: 1, display: "flex", backgroundColor: ROSE_BLUSH }} />
    </div>
  );
}

function DressChips({ dressCode }: { dressCode: string }) {
  const parts = dressCode
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (parts.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, maxWidth: 600 }}>
      {parts.map((part, index) => (
        <div
          key={`${part}-${index}`}
          style={{
            display: "flex",
            padding: "10px 22px",
            borderRadius: 999,
            backgroundColor: index % 2 === 0 ? ROSE_FOREST : ROSE_BERRY,
            color: "#FFFFFF",
            fontFamily: ROSE_SANS,
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          {part}
        </div>
      ))}
    </div>
  );
}

/**
 * "Rose Garden": reproduces the client's photographic reference design
 * (green silk drape, red/pink roses, pink ribbon in the four corners, on an
 * ivory card) using four bundled corner photo crops instead of the CSS/SVG
 * motifs the other 6 templates use -- see the ROSE_CORNER_* constants above.
 * Deliberately does NOT use data.primary/secondary/accent: those colours are
 * the organizer's free pick and would clash unpredictably against a fixed
 * photographic rose/silk backdrop (this is the same class of bug fixed for
 * garden_elegance, avoided here by never wiring the theme in for ink colour
 * in the first place). Flagged to the user as a deliberate scoping choice.
 *
 * Visual-quality revision: the first pass never registered any fonts with
 * ImageResponse, so every fontFamily here (Georgia, Arial, ...) was silently
 * ignored by Satori in favour of its generic default sans -- see
 * ROSE_GARDEN_FONTS above. That, more than any single layout number, is why
 * it read as "text on a background" instead of a designed invitation. This
 * pass also: rebalances the frame to a true tall arch instead of a wide
 * dome, drops the redundant second "Title" block (the script hero already
 * names the couple), and merges the date/time + venue into one bordered
 * details card instead of two separately-floating pieces.
 */
function RoseGardenCard({ data }: { data: RenderData }) {
  const text = copy(data.language);
  const heroNames = roseHeroNames(data.title);
  const monogram = roseMonogram(data.title);
  const year = roseYear(data.date);
  const passId = data.eventPassId ? formatPassIdForDisplay(data.eventPassId) : "—";
  const qrSize = 268;
  const dateTime = [data.date, data.eventTime].filter(Boolean).join(" · ");
  const frameWidth = 540;
  const frameHeight = 660;
  const frameRadius = frameWidth / 2;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        backgroundColor: ROSE_IVORY,
        color: ROSE_FOREST,
      }}
    >
      <RoseCorner corner={ROSE_CORNER_TL} horizontal="left" vertical="top" />
      <RoseCorner corner={ROSE_CORNER_TR} horizontal="right" vertical="top" />
      <RoseCorner corner={ROSE_CORNER_BL} horizontal="left" vertical="bottom" />
      <RoseCorner corner={ROSE_CORNER_BR} horizontal="right" vertical="bottom" />

      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 96px 52px" }}>
        <RoseEyebrow>{text.heading}</RoseEyebrow>

        <div style={{ display: "flex", marginTop: 22, maxWidth: 600, fontFamily: ROSE_SCRIPT, fontSize: 86, lineHeight: 1, color: ROSE_FOREST, textAlign: "center" }}>
          {heroNames}
        </div>
        {year ? (
          <div style={{ display: "flex", marginTop: 16, fontFamily: ROSE_SANS, fontSize: 15, fontWeight: 700, letterSpacing: 7, color: ROSE_BERRY }}>
            {year}
          </div>
        ) : null}

        <div
          style={{
            width: frameWidth,
            height: frameHeight,
            position: "relative",
            display: "flex",
            marginTop: 40,
            padding: 7,
            boxSizing: "border-box",
            borderRadius: `${frameRadius + 7}px ${frameRadius + 7}px 22px 22px`,
            border: `7px solid ${ROSE_FOREST}`,
            boxShadow: "0 22px 48px rgba(27,67,50,0.24)",
            backgroundColor: ROSE_IVORY,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              position: "relative",
              overflow: "hidden",
              borderRadius: `${frameRadius}px ${frameRadius}px 16px 16px`,
              backgroundColor: ROSE_BLUSH,
            }}
          >
            {data.coverImageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.coverImageDataUrl}
                alt=""
                width={frameWidth}
                height={frameHeight}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundImage: `linear-gradient(165deg, ${ROSE_BLUSH} 0%, ${ROSE_IVORY} 78%)`,
                }}
              >
                <div style={{ display: "flex", fontFamily: ROSE_SCRIPT, fontSize: 96, color: ROSE_FOREST }}>{monogram}</div>
                <div style={{ width: 64, height: 2, display: "flex", marginTop: 18, backgroundColor: ROSE_BERRY }} />
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 46,
            width: 620,
            padding: "30px 40px",
            borderRadius: 26,
            border: `2px solid ${ROSE_FOREST}`,
            backgroundColor: "#FFFFFF",
            boxShadow: "0 14px 30px rgba(27,67,50,0.1)",
          }}
        >
          <div style={{ display: "flex", fontFamily: ROSE_SERIF, fontSize: 30, fontWeight: 700, color: ROSE_FOREST, textAlign: "center" }}>
            {dateTime}
          </div>

          <div style={{ width: 72, height: 1, display: "flex", marginTop: 20, marginBottom: 20, backgroundColor: ROSE_BLUSH }} />

          <div style={{ display: "flex", fontFamily: ROSE_SANS, fontSize: 13, fontWeight: 700, letterSpacing: 3, color: ROSE_BERRY }}>{text.reception}</div>
          <div style={{ display: "flex", marginTop: 8, maxWidth: 520, whiteSpace: "pre-wrap", fontFamily: ROSE_SERIF, fontSize: 23, lineHeight: 1.25, fontWeight: 700, color: ROSE_FOREST, textAlign: "center" }}>
            {data.venue}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 48 }}>
          <RoseEyebrow>{text.weddingOf}</RoseEyebrow>
          <div style={{ display: "flex", marginTop: 16, maxWidth: 620, fontFamily: ROSE_SERIF, fontSize: 42, fontStyle: "italic", color: ROSE_FOREST, textAlign: "center" }}>
            {data.guestName}
          </div>
        </div>

        {data.dressCode ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 48 }}>
            <RoseEyebrow>{text.dress}</RoseEyebrow>
            <div style={{ display: "flex", marginTop: 20 }}>
              <DressChips dressCode={data.dressCode} />
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 52 }}>
          <div
            style={{
              width: qrSize + 36,
              height: qrSize + 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 18,
              borderRadius: 26,
              backgroundColor: "#FFFFFF",
              border: `3px solid ${ROSE_FOREST}`,
              boxShadow: "0 16px 34px rgba(27,67,50,0.2)",
            }}
          >
            {data.qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.qrCodeDataUrl} alt="" width={qrSize} height={qrSize} style={{ width: qrSize, height: qrSize, objectFit: "contain" }} />
            ) : (
              <div style={{ width: qrSize - 30, height: qrSize - 30, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${ROSE_FOREST}`, fontFamily: ROSE_SANS, fontSize: 24, fontWeight: 700, color: ROSE_FOREST }}>
                QR
              </div>
            )}
          </div>
          <div style={{ display: "flex", marginTop: 22, fontFamily: ROSE_SANS, fontSize: 26, fontWeight: 700, letterSpacing: 3, color: ROSE_FOREST }}>{passId}</div>
          <div style={{ display: "flex", marginTop: 8, maxWidth: 460, fontFamily: ROSE_SERIF, fontSize: 16, fontStyle: "italic", lineHeight: 1.3, color: ROSE_BERRY, textAlign: "center" }}>
            {text.instruction}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 46, padding: "18px 36px", borderRadius: 16, border: `1.5px dashed ${ROSE_BLUSH}`, maxWidth: 600 }}>
          <div style={{ display: "flex", fontFamily: ROSE_SERIF, fontSize: 18, fontStyle: "italic", lineHeight: 1.3, color: ROSE_FOREST, textAlign: "center" }}>
            {text.closing}
          </div>
        </div>
      </div>
    </div>
  );
}

async function createRoseGardenInvitationCard(data: WhatsAppCardData) {
  const cover = await fetchCoverImageDataUrl(data.coverImageUrl);
  const qrCodeDataUrl = await buildQrCodeDataUrl(data.qrToken);
  const normalizedData = renderData(
    data,
    cover?.dataUrl ?? null,
    cover?.bannerHeight ?? DEFAULT_BANNER_HEIGHT,
    qrCodeDataUrl
  );

  try {
    return jpegResponse(
      await materializeJpeg(<RoseGardenCard data={normalizedData} />, CARD_WIDTH, ROSE_GARDEN_CARD_HEIGHT, ROSE_GARDEN_FONTS)
    );
  } catch (error) {
    console.error("Rose Garden card render failed:", error);

    return jpegResponse(
      await materializeJpeg(<SafeFallbackCard data={normalizedData} />)
    );
  }
}

export async function createCompactWhatsAppInvitationCard(
  data: WhatsAppCardData
) {
  const qrCodeDataUrl = await buildQrCodeDataUrl(data.qrToken);
  const normalizedData = renderData(data, null, DEFAULT_BANNER_HEIGHT, qrCodeDataUrl);

  return jpegResponse(
    await materializeJpeg(
      <CompactHorizontalCard data={normalizedData} />,
      1080,
      520
    )
  );
}

function renderWhatsAppCard(
  template: Exclude<WhatsAppCardTemplate, "custom" | "rose_garden">,
  data: RenderData,
  sidePhotoBlendOverlayUrl?: string
): ReactElement {
  return (
    <PremiumWhatsAppCard
      data={{
        ...data,
        leafTopLeftUrl: LEAF_TOP_LEFT_URL,
        leafBottomLeftUrl: LEAF_BOTTOM_LEFT_URL,
        leafTopRightUrl: LEAF_TOP_RIGHT_URL,
        sidePhotoBlendOverlayUrl,
      }}
      template={template}
    />
  );
}

function CoverImage({
  data,
  borderRadius,
}: {
  data: RenderData;
  borderRadius?: string | number;
}) {
  if (!data.coverImageDataUrl) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: 22,
        backgroundColor: "rgba(15, 23, 42, 0.06)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.coverImageDataUrl}
        alt=""
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          filter: "blur(26px)",
          opacity: 0.58,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(15,23,42,0.16))",
        }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.coverImageDataUrl}
        alt=""
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          borderRadius,
          boxShadow: "0 18px 38px rgba(15,23,42,0.18)",
        }}
      />
    </div>
  );
}

function Brand({ color }: { color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        fontSize: 24,
        fontWeight: 700,
        color,
      }}
    >
      <div
        style={{
          width: 34,
          height: 3,
          display: "flex",
          marginRight: 14,
          backgroundColor: color,
        }}
      />
      Smart Event Pass
    </div>
  );
}

function Guest({
  data,
  color,
  centered = false,
}: {
  data: RenderData;
  color: string;
  centered?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: centered ? "center" : "flex-start",
        color,
        textAlign: centered ? "center" : "left",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Arial, sans-serif",
          fontSize: 19,
          fontWeight: 700,
          opacity: 0.72,
        }}
      >
        {data.language === "en" ? "Hello" : "Habari"}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 8,
          fontFamily: "Georgia, serif",
          fontSize: 36,
          lineHeight: 1.12,
          fontWeight: 700,
        }}
      >
        {data.guestName}
      </div>
    </div>
  );
}

function getPassStatusMeta(data: RenderData) {
  const count = Number.isFinite(data.allowedGuests)
    ? Math.max(1, Math.floor(data.allowedGuests))
    : 1;

  if (count === 1) {
    return {
      title: "SINGLE PASS",
      detail: data.language === "en" ? "1 Person" : "Mtu 1",
    };
  }

  if (count === 2) {
    return {
      title: "DOUBLE PASS",
      detail: data.language === "en" ? "2 People" : "Watu 2",
    };
  }

  return {
    title: "GROUP PASS",
    detail: data.language === "en" ? `${count} People` : `Watu ${count}`,
  };
}

function CompactPassStrip({
  data,
  color,
}: {
  data: RenderData;
  color: string;
}) {
  const status = getPassStatusMeta(data);
  const passId = cleanText(
    data.eventPassId,
    data.language === "en" ? "PENDING" : "INASUBIRI"
  );

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "stretch",
        marginTop: 18,
        borderRadius: 18,
        overflow: "hidden",
        border: `2px solid ${data.accent}`,
        backgroundColor: data.secondary,
        color,
      }}
    >
      <div
        style={{
          width: 132,
          minHeight: 132,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
          backgroundColor: "#FFFFFF",
          borderRight: `1px dashed ${data.accent}`,
        }}
      >
        {data.qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.qrCodeDataUrl}
            alt=""
            width={110}
            height={110}
            style={{
              width: 110,
              height: 110,
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              fontFamily: "Arial, sans-serif",
              fontSize: 14,
              fontWeight: 800,
              textAlign: "center",
              color: data.primary,
            }}
          >
            QR
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "15px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Arial, sans-serif",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 2.4,
            color: data.accent,
          }}
        >
          VERIFIED EVENT PASS
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 7,
            fontFamily: "Arial, sans-serif",
            fontSize: 23,
            fontWeight: 900,
          }}
        >
          {status.title}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 3,
            fontFamily: "Arial, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            opacity: 0.78,
          }}
        >
          {status.detail}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 9,
            fontFamily: "Arial, sans-serif",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1.8,
            opacity: 0.75,
          }}
        >
          {data.language === "en" ? "ENTRY PASS ID" : "PASS ID YA KUINGIA"}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 3,
            fontFamily: "Georgia, serif",
            fontSize: 27,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {passId}
        </div>
      </div>
    </div>
  );
}

function Details({
  data,
  color,
  centered = false,
}: {
  data: RenderData;
  color: string;
  centered?: boolean;
}) {
  const status = getPassStatusMeta(data);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: centered ? "center" : "flex-start",
        color,
        fontFamily: "Arial, sans-serif",
        textAlign: centered ? "center" : "left",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: centered ? "center" : "flex-start",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            padding: "9px 12px",
            borderRadius: 12,
            backgroundColor: `${data.accent}18`,
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          {data.date}
        </div>

        {data.eventTime ? (
          <div
            style={{
              display: "flex",
              padding: "9px 12px",
              borderRadius: 12,
              backgroundColor: `${data.accent}18`,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {data.eventTime}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 12,
          fontSize: 23,
          lineHeight: 1.25,
          fontWeight: 700,
          opacity: 0.9,
        }}
      >
        {data.venue}
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: centered ? "center" : "flex-start",
          gap: 10,
          marginTop: 12,
        }}
      >
        {data.dressCode ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 11px",
              borderRadius: 12,
              border: `1px solid ${data.accent}`,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Dress Code: {data.dressCode}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            padding: "8px 11px",
            borderRadius: 12,
            backgroundColor: data.primary,
            color: data.primaryText,
            fontSize: 15,
            fontWeight: 900,
          }}
        >
          {status.title}
        </div>
      </div>

      <CompactPassStrip data={data} color={color} />
    </div>
  );
}

function EmeraldBotanicalHaloCard({ data }: { data: RenderData }) {
  const initials = data.title.replace(/&/g, " ").split(/\s+/).filter(Boolean).map((part) => part[0]).filter(Boolean);
  const mark = `${initials[0] ?? "E"}${initials.at(-1) ?? "H"}`.toUpperCase();

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", padding: "54px 64px", background: `linear-gradient(155deg, ${data.primary}, #020806)`, color: "#FFFFFF" }}>
      <div style={{ position: "absolute", left: -100, top: 150, width: 360, height: 360, display: "flex", borderRadius: 180, border: `2px solid ${data.accent}`, opacity: 0.18 }} />
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}><Brand color={data.accent} /><div style={{ display: "flex", color: data.accent, fontFamily: "Arial, sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: 5 }}>BOTANICAL HALO</div></div>
      <div style={{ width: 480, height: 570, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 52, borderRadius: 250, border: `2px solid ${data.accent}`, boxShadow: `0 0 0 12px ${data.primary}, 0 0 0 14px ${data.accent}` }}>
        <div style={{ width: 430, height: 520, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 220, border: `7px solid ${data.accent}`, background: `radial-gradient(circle, ${data.secondary}, ${data.primary})` }}>
          {data.coverImageDataUrl ? <CoverImage data={data} borderRadius={220} /> : <div style={{ display: "flex", color: data.accent, fontFamily: "Georgia, serif", fontSize: 116, letterSpacing: 9 }}>{mark}</div>}
        </div>
        <div style={{ position: "absolute", left: -54, bottom: 46, width: 138, height: 138, display: "flex", borderRadius: "100% 0 100% 0", border: `4px solid ${data.accent}`, transform: "rotate(-28deg)" }} />
        <div style={{ position: "absolute", right: -38, top: 50, width: 100, height: 148, display: "flex", borderRadius: "100% 0 100% 0", border: `4px solid ${data.accent}`, transform: "rotate(34deg)" }} />
      </div>
      <div style={{ maxWidth: 900, display: "flex", marginTop: 54, color: "#FFFFFF", fontFamily: "Georgia, serif", fontSize: Math.min(76, data.titleSize + 3), lineHeight: 1, textAlign: "center" }}>{data.title}</div>
      <div style={{ width: 500, height: 2, display: "flex", marginTop: 30, backgroundColor: data.accent, opacity: 0.65 }} />
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 30 }}><Details data={data} color="#FFFFFF" /><Guest data={data} color={data.accent} /></div>
    </div>
  );
}

function HeritageMonogramCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 42, backgroundColor: data.secondary, color: data.secondaryText }}>
      <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "42px 56px", border: `8px double ${data.primary}`, boxShadow: `inset 0 0 0 10px ${data.secondary}, inset 0 0 0 12px ${data.accent}` }}>
        <Brand color={data.primary} />
        <div style={{ width: 330, height: 410, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 180, border: `9px double ${data.primary}`, boxShadow: `0 0 0 3px ${data.accent}`, color: data.primary }}>
          {hasImage ? <CoverImage data={data} borderRadius={180} /> : <><div style={{ position: "absolute", width: 240, height: 290, display: "flex", borderRadius: 130, border: `3px solid ${data.accent}` }} /><div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 92 }}>HM</div></>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ display: "flex", color: data.accent, fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 6 }}>HERITAGE MONOGRAM</div>
          <div style={{ display: "flex", maxWidth: 850, marginTop: 24, color: data.primary, fontFamily: "Georgia, serif", fontSize: Math.min(72, data.titleSize), lineHeight: 1, textAlign: "center" }}>{data.title}</div>
          <div style={{ width: 360, display: "flex", alignItems: "center", marginTop: 28 }}><div style={{ height: 2, flex: 1, display: "flex", backgroundColor: data.accent }} /><div style={{ width: 18, height: 18, display: "flex", margin: "0 18px", border: `2px solid ${data.accent}`, transform: "rotate(45deg)" }} /><div style={{ height: 2, flex: 1, display: "flex", backgroundColor: data.accent }} /></div>
        </div>
        <Details data={data} color={data.secondaryText} centered />
        <div style={{ display: "flex", color: data.primary, fontFamily: "Georgia, serif", fontSize: 42, fontWeight: 700, textAlign: "center" }}>{data.guestName}</div>
      </div>
    </div>
  );
}

function ChateauLetterpressCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 42, backgroundColor: data.secondary, color: data.secondaryText }}>
      <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "44px 58px", border: `3px solid ${data.primary}`, boxShadow: `inset 0 0 0 10px ${data.secondary}, inset 0 0 0 12px ${data.primary}` }}>
        <Brand color={data.primary} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ display: "flex", color: data.accent, fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 6 }}>CHÂTEAU LETTERPRESS</div>
          <div style={{ display: "flex", maxWidth: 850, marginTop: 22, color: data.primary, fontFamily: "Georgia, serif", fontSize: Math.min(70, data.titleSize), lineHeight: 1, textAlign: "center" }}>{data.title}</div>
        </div>
        <div style={{ width: 820, height: 455, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 12, border: `3px solid ${data.primary}`, backgroundColor: data.secondary, boxShadow: "0 18px 36px rgba(15,23,42,.14)" }}>
          <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px solid ${data.accent}`, color: data.primary }}>
            {hasImage ? <CoverImage data={data} /> : <><div style={{ width: 240, height: 170, position: "absolute", display: "flex", borderRadius: "50%", border: `3px solid ${data.accent}` }} /><div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 100, fontStyle: "italic", letterSpacing: -28 }}>CL</div></>}
          </div>
        </div>
        <Details data={data} color={data.secondaryText} centered />
        <div style={{ width: 430, display: "flex", alignItems: "center" }}><div style={{ height: 2, flex: 1, display: "flex", backgroundColor: data.accent }} /><div style={{ display: "flex", margin: "0 18px", color: data.primary, fontFamily: "Georgia, serif", fontSize: 20 }}>CL</div><div style={{ height: 2, flex: 1, display: "flex", backgroundColor: data.accent }} /></div>
        <div style={{ display: "flex", color: data.primary, fontFamily: "Georgia, serif", fontSize: 42, fontWeight: 700, textAlign: "center" }}>{data.guestName}</div>
      </div>
    </div>
  );
}

function AfricanRoyalCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", overflow: "hidden", backgroundColor: data.primary, color: "#FFFFFF" }}>
      <div style={{ width: 440, height: "100%", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", padding: "72px 54px 64px", background: `linear-gradient(160deg, ${data.primary}, #111827)` }}>
        <div style={{ position: "absolute", left: -100, top: 190, width: 330, height: 330, display: "flex", transform: "rotate(45deg)", border: `28px solid ${data.accent}`, opacity: 0.2 }} />
        <Brand color={data.accent} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: data.accent, fontFamily: "Arial, sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 4 }}>AFRICAN ROYAL</div>
          <div style={{ display: "flex", maxWidth: 340, marginTop: 28, fontFamily: "Georgia, serif", fontSize: Math.min(67, data.titleSize), lineHeight: 0.98 }}>{data.title}</div>
          <div style={{ width: 92, height: 7, display: "flex", marginTop: 34, backgroundColor: data.accent }} />
        </div>
        <Guest data={data} color="#FFFFFF" />
      </div>
      <div style={{ flex: 1, height: "100%", position: "relative", display: "flex", overflow: "hidden", background: hasImage ? data.secondary : `linear-gradient(145deg, ${data.secondary}, ${data.accent})` }}>
        {hasImage ? <CoverImage data={data} /> : null}
        {!hasImage ? (
          <>
            <div style={{ position: "absolute", left: 115, top: 180, width: 390, height: 390, display: "flex", border: `22px solid ${data.primary}`, transform: "rotate(45deg)", opacity: 0.5 }} />
            <div style={{ position: "absolute", left: 205, top: 315, display: "flex", color: data.primary, fontFamily: "Georgia, serif", fontSize: 120 }}>AR</div>
          </>
        ) : null}
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "flex", background: hasImage ? "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.72))" : "transparent" }} />
        <div style={{ position: "absolute", right: 48, top: 48, width: 145, height: 145, display: "flex", border: `12px solid ${data.accent}` }} />
        <div style={{ position: "absolute", left: 58, bottom: 64, width: 480, display: "flex", flexDirection: "column", padding: "28px 30px", borderLeft: `8px solid ${data.accent}`, backgroundColor: hasImage ? "rgba(0,0,0,0.66)" : data.primary, color: "#FFFFFF" }}>
          <Details data={data} color="#FFFFFF" />
        </div>
      </div>
    </div>
  );
}

function MidnightLuxeCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", overflow: "hidden", background: `linear-gradient(150deg, ${data.primary}, #05070D)`, color: "#FFFFFF" }}>
      {hasImage ? <CoverImage data={data} /> : null}
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "flex", background: hasImage ? "linear-gradient(180deg, rgba(2,6,23,.12), rgba(2,6,23,.16) 40%, rgba(2,6,23,.95))" : `radial-gradient(circle at 75% 18%, ${data.accent}, transparent 28%)`, opacity: hasImage ? 1 : 0.9 }} />
      <div style={{ position: "absolute", right: -70, top: 80, width: 410, height: 410, display: "flex", borderRadius: 205, border: `2px solid ${data.accent}`, boxShadow: `0 0 90px ${data.accent}`, opacity: 0.48 }} />
      <div style={{ position: "absolute", right: 30, top: 180, width: 210, height: 210, display: "flex", borderRadius: 105, border: `2px solid ${data.accent}`, opacity: 0.42 }} />
      {!hasImage ? <div style={{ position: "absolute", right: 155, top: 230, display: "flex", color: "#FFFFFF", fontFamily: "Georgia, serif", fontSize: 120, opacity: 0.78 }}>ML</div> : null}
      <div style={{ position: "absolute", left: 70, top: 66, width: 940, display: "flex", justifyContent: "space-between" }}><Brand color="#FFFFFF" /><div style={{ display: "flex", color: data.accent, fontFamily: "Arial, sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: 5 }}>MIDNIGHT LUXE</div></div>
      <div style={{ position: "absolute", left: 92, right: 120, bottom: 82, display: "flex", flexDirection: "column", padding: "44px 52px", borderLeft: `8px solid ${data.accent}`, backgroundColor: data.secondary, color: data.secondaryText, boxShadow: "0 25px 75px rgba(0,0,0,.42)" }}>
        <div style={{ display: "flex", color: data.primary, fontFamily: "Arial, sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: 4 }}>{data.date}</div>
        <div style={{ display: "flex", maxWidth: 780, marginTop: 22, color: data.primary, fontFamily: "Georgia, serif", fontSize: Math.min(82, data.titleSize + 5), lineHeight: 0.98 }}>{data.title}</div>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 32, paddingTop: 28, borderTop: `2px solid ${data.accent}` }}><Guest data={data} color={data.primary} /><div style={{ display: "flex", maxWidth: 330 }}><Details data={data} color={data.secondaryText} /></div></div>
      </div>
    </div>
  );
}

function ClassicPhotoCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        overflow: "hidden",
        backgroundColor: data.primary,
        color: "#FFFFFF",
      }}
    >
      {hasImage ? <CoverImage data={data} /> : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          background: hasImage
            ? "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.08) 35%, rgba(0,0,0,0.92))"
            : `linear-gradient(145deg, ${data.primary}, #111827)`,
        }}
      />
      {!hasImage ? (
        <div
          style={{
            position: "absolute",
            left: 150,
            top: 235,
            width: 780,
            height: 780,
            display: "flex",
            borderRadius: 390,
            border: `3px solid ${data.accent}`,
            opacity: 0.42,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 72,
          width: 936,
          height: 1206,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "24px 26px 30px",
          borderTop: `4px solid ${data.accent}`,
          borderBottom: `4px solid ${data.secondary}`,
        }}
      >
        <Brand color="#FFFFFF" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: hasImage ? "flex-start" : "center",
            textAlign: hasImage ? "left" : "center",
          }}
        >
          <div
            style={{
              width: 96,
              height: 8,
              display: "flex",
              marginBottom: 30,
              backgroundColor: data.accent,
            }}
          />
          <div
            style={{
              display: "flex",
              maxWidth: 850,
              fontFamily: "Georgia, serif",
              fontSize: hasImage ? data.titleSize : Math.min(88, data.titleSize + 10),
              lineHeight: 1.02,
              fontWeight: 700,
            }}
          >
            {data.title}
          </div>
          <div style={{ display: "flex", marginTop: 32 }}>
            <Details data={data} color="#FFFFFF" centered={!hasImage} />
          </div>
          <div
            style={{
              width: hasImage ? "100%" : 620,
              display: "flex",
              justifyContent: hasImage ? "flex-start" : "center",
              marginTop: 38,
              paddingTop: 30,
              borderTop: "1px solid rgba(255,255,255,0.45)",
            }}
          >
            <Guest data={data} color="#FFFFFF" centered={!hasImage} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ElegantGoldCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);
  const ink = data.secondaryText;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        padding: 54,
        backgroundColor: data.secondary,
        color: ink,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "48px 62px 44px",
          border: `4px solid ${data.accent}`,
          boxShadow: `inset 0 0 0 14px ${data.secondary}, inset 0 0 0 16px ${data.primary}`,
        }}
      >
        <Brand color={data.primary} />
        <div
          style={{
            width: hasImage ? 440 : 580,
            height: hasImage ? 440 : 400,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: hasImage ? 220 : 290,
            border: `9px solid ${data.accent}`,
            boxShadow: `0 0 0 3px ${data.primary}`,
            backgroundColor: data.primary,
            color: data.primaryText,
          }}
        >
          {hasImage ? (
            <CoverImage data={data} borderRadius={220} />
          ) : (
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                padding: "0 54px",
                fontFamily: "Georgia, serif",
                fontSize: Math.min(60, data.titleSize),
                lineHeight: 1.05,
                textAlign: "center",
              }}
            >
              {data.title}
            </div>
          )}
        </div>
        {hasImage ? (
          <div
            style={{
              display: "flex",
              maxWidth: 820,
              color: data.primary,
              fontFamily: "Georgia, serif",
              fontSize: Math.min(66, data.titleSize),
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            {data.title}
          </div>
        ) : null}
        <Details data={data} color={ink} centered />
        <div
          style={{
            width: 110,
            height: 3,
            display: "flex",
            backgroundColor: data.accent,
          }}
        />
        <Guest data={data} color={ink} centered />
      </div>
    </div>
  );
}

function Leaf({ color, rotation }: { color: string; rotation: number }) {
  return (
    <div
      style={{
        width: 92,
        height: 42,
        display: "flex",
        borderRadius: "92px 0 92px 0",
        backgroundColor: color,
        transform: `rotate(${rotation}deg)`,
      }}
    />
  );
}

function Botanical({
  color,
  right = false,
}: {
  color: string;
  right?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        ...(right
          ? {
              right: 28,
              bottom: 28,
            }
          : {
              left: 28,
              top: 28,
            }),
        ...(right
          ? {
              transform: "rotate(180deg)",
            }
          : {}),
      }}
    >
      <Leaf color={color} rotation={-28} />
      <div style={{ display: "flex", marginLeft: 55, marginTop: 2 }}>
        <Leaf color={color} rotation={24} />
      </div>
      <div style={{ display: "flex", marginLeft: 12, marginTop: 2 }}>
        <Leaf color={color} rotation={-15} />
      </div>
    </div>
  );
}

function ModernFloralCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);
  const ink = data.secondaryText;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        overflow: "hidden",
        padding: "72px 84px 64px",
        backgroundColor: data.secondary,
        color: ink,
      }}
    >
      <Botanical color={data.accent} />
      <Botanical color={data.primary} right />
      <Brand color={data.primary} />
      <div
        style={{
          width: 710,
          height: hasImage ? 570 : 535,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: "355px 355px 56px 56px",
          border: `8px solid ${data.primary}`,
          background: hasImage
            ? data.primary
            : `linear-gradient(160deg, ${data.primary}, ${data.accent})`,
          color: hasImage ? "#FFFFFF" : data.primaryText,
        }}
      >
        {hasImage ? (
          <CoverImage
            data={data}
            borderRadius="347px 347px 48px 48px"
          />
        ) : (
          <div
            style={{
              display: "flex",
              maxWidth: 570,
              fontFamily: "Georgia, serif",
              fontSize: Math.min(72, data.titleSize + 4),
              lineHeight: 1.02,
              textAlign: "center",
            }}
          >
            {data.title}
          </div>
        )}
      </div>
      {hasImage ? (
        <div
          style={{
            display: "flex",
            maxWidth: 850,
            color: data.primary,
            fontFamily: "Georgia, serif",
            fontSize: data.titleSize,
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {data.title}
        </div>
      ) : null}
      <Details data={data} color={ink} centered />
      <div
        style={{
          display: "flex",
          padding: "22px 54px",
          borderTop: `3px solid ${data.accent}`,
          borderBottom: `3px solid ${data.accent}`,
        }}
      >
        <Guest data={data} color={ink} centered />
      </div>
    </div>
  );
}

function LuxuryEnvelopeCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);
  const ink = data.secondaryText;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: 68,
        background: `linear-gradient(145deg, ${data.primary}, ${data.accent})`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "54px 58px 48px",
          backgroundColor: data.secondary,
          color: ink,
          border: `4px solid ${data.accent}`,
          boxShadow: "0 26px 70px rgba(0,0,0,0.28)",
        }}
      >
        <Brand color={data.primary} />
        <div
          style={{
            width: 700,
            height: hasImage ? 405 : 385,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            border: `5px solid ${data.accent}`,
            backgroundColor: data.primary,
            color: data.primaryText,
          }}
        >
          {hasImage ? (
            <CoverImage data={data} />
          ) : (
            <>
              <div
                style={{
                  position: "absolute",
                  left: -40,
                  top: -160,
                  width: 780,
                  height: 390,
                  display: "flex",
                  transform: "rotate(45deg)",
                  borderRight: `3px solid ${data.accent}`,
                  borderBottom: `3px solid ${data.accent}`,
                  opacity: 0.55,
                }}
              />
              <div
                style={{
                  display: "flex",
                  maxWidth: 570,
                  fontFamily: "Georgia, serif",
                  fontSize: Math.min(66, data.titleSize),
                  lineHeight: 1.04,
                  textAlign: "center",
                }}
              >
                {data.title}
              </div>
            </>
          )}
        </div>
        {hasImage ? (
          <div
            style={{
              display: "flex",
              maxWidth: 820,
              color: data.primary,
              fontFamily: "Georgia, serif",
              fontSize: data.titleSize,
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            {data.title}
          </div>
        ) : null}
        <Details data={data} color={ink} centered />
        <div
          style={{
            width: 142,
            height: 142,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 71,
            border: `5px solid ${data.accent}`,
            boxShadow: `inset 0 0 0 5px ${data.primary}`,
            backgroundColor: data.primary,
            color: data.primaryText,
            fontFamily: "Georgia, serif",
            fontSize: 50,
            fontWeight: 700,
          }}
        >
          S
        </div>
        <Guest data={data} color={ink} centered />
      </div>
    </div>
  );
}

function RoyalDarkCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
        backgroundColor: "#090C12",
        color: "#FFFFFF",
      }}
    >
      <div
        style={{
          width: 455,
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: hasImage
            ? data.primary
            : `linear-gradient(160deg, ${data.primary}, #090C12)`,
        }}
      >
        {hasImage ? <CoverImage data={data} /> : null}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            background: hasImage
              ? "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(9,12,18,0.82))"
              : "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(9,12,18,0.58))",
          }}
        />
        {!hasImage ? (
          <>
            <div
              style={{
                width: 300,
                height: 520,
                display: "flex",
                border: `3px solid ${data.accent}`,
                transform: "rotate(8deg)",
                opacity: 0.72,
              }}
            />
            <div
              style={{
                position: "absolute",
                display: "flex",
                color: data.accent,
                fontFamily: "Georgia, serif",
                fontSize: 150,
              }}
            >
              S
            </div>
          </>
        ) : null}
        <div
          style={{
            position: "absolute",
            left: 54,
            bottom: 68,
            width: 345,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: 60,
              height: 7,
              display: "flex",
              backgroundColor: data.accent,
            }}
          />
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontFamily: "Arial, sans-serif",
              fontSize: 27,
              lineHeight: 1.3,
            }}
          >
            {data.venue}
          </div>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "76px 66px 70px",
          borderLeft: `8px solid ${data.accent}`,
          background: `linear-gradient(145deg, #090C12 55%, ${data.primary} 170%)`,
        }}
      >
        <Brand color={data.accent} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: data.accent,
              fontFamily: "Arial, sans-serif",
              fontSize: 27,
              fontWeight: 700,
            }}
          >
            {data.date}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 475,
              marginTop: 34,
              fontFamily: "Georgia, serif",
              fontSize: Math.min(76, data.titleSize),
              lineHeight: 1,
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              width: 110,
              height: 3,
              display: "flex",
              marginTop: 40,
              backgroundColor: data.secondary,
            }}
          />
        </div>
        <Guest data={data} color="#FFFFFF" />
      </div>
    </div>
  );
}

function MinimalIvoryCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 42, backgroundColor: "#FBF7ED", color: "#27231D" }}>
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "44px 64px 48px", border: `3px solid ${data.accent}` }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", paddingBottom: 24, borderBottom: `2px solid ${data.accent}`, color: data.primary, fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 4 }}>
          <div style={{ display: "flex" }}>SMART EVENT PASS</div><div style={{ display: "flex" }}>INVITATION</div>
        </div>
        <div style={{ width: hasImage ? 190 : 154, height: hasImage ? 250 : 202, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "50%", border: `3px solid ${data.accent}`, color: data.primary, fontFamily: "Georgia, serif", fontSize: 66 }}>
          {hasImage ? <CoverImage data={data} borderRadius="50%" /> : "&"}
        </div>
        <div style={{ maxWidth: 850, display: "flex", color: data.primary, fontFamily: "Georgia, serif", fontSize: Math.min(82, data.titleSize + 6), lineHeight: 0.98, textAlign: "center" }}>{data.title}</div>
        <div style={{ width: 130, height: 2, display: "flex", backgroundColor: data.accent }} />
        <Details data={data} color="#514B43" centered />
        <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "28px 30px", borderTop: `2px solid ${data.accent}`, borderBottom: `2px solid ${data.accent}` }}><Guest data={data} color={data.primary} centered /></div>
      </div>
    </div>
  );
}

function SafeFallbackCard({ data }: { data: RenderData }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 90,
        backgroundColor: data.secondary,
        color: data.secondaryText,
        textAlign: "center",
      }}
    >
      <Brand color={data.primary} />
      <div
        style={{
          width: 820,
          height: 720,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 70,
          border: `5px solid ${data.accent}`,
        }}
      >
        <div
          style={{
            display: "flex",
            color: data.primary,
            fontFamily: "Georgia, serif",
            fontSize: data.titleSize,
            lineHeight: 1.05,
          }}
        >
          {data.title}
        </div>
        <div style={{ display: "flex", marginTop: 45 }}>
          <Details data={data} color={data.secondaryText} centered />
        </div>
      </div>
      <Guest data={data} color={data.secondaryText} centered />
    </div>
  );
}
