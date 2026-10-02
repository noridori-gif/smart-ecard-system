import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { create as createFont, type Font } from "fontkit";
import sharp from "sharp";
import SaveTheDateCard, {
  SAVE_THE_DATE_CARD_HEIGHT,
  SAVE_THE_DATE_CARD_WIDTH,
  SAVE_THE_DATE_PHOTO_SIZE,
  SAVE_THE_DATE_TEXT_MAX_WIDTH,
  saveTheDateCopy,
  type SaveTheDateCardData,
} from "./SaveTheDateCard";
import { dateParts, gildedTextureSvg } from "./GildedBorderCard";
import { fetchCoverImageDataUrl, GILDED_BORDER_FONTS, jpegResponse, materializeJpeg } from "./whatsappInvitationCard";
import type { SaveTheDateVariant } from "./saveTheDateEligibility";

/**
 * Renders the Save the Date card to a JPEG Response (1080x1536, the same size and pipeline as the
 * Gilded Border invitation card: Satori -> PNG -> sharp JPEG, fonts embedded from bundled WOFFs so
 * nothing is fetched during render).
 */

export type SaveTheDateCardInput = {
  variant: SaveTheDateVariant;
  language: "sw" | "en";
  guestName: string;
  groomName: string | null;
  brideName: string | null;
  eventTitle: string;
  eventDateIso: string | null;
  venue: string | null;
  coverImageUrl: string | null;
};

// Same font files the card is rendered with, so measurements match the render.
const FONT_DIR = join(process.cwd(), "public", "invitation-assets", "fonts");
let fonts: { regular: Font; black: Font; script: Font } | null = null;
function measuringFonts() {
  fonts ??= {
    regular: createFont(readFileSync(join(FONT_DIR, "Lato-Regular.woff"))),
    black: createFont(readFileSync(join(FONT_DIR, "Lato-Black.woff"))),
    script: createFont(readFileSync(join(FONT_DIR, "KaushanScript-Regular.woff"))),
  };
  return fonts;
}

function textWidth(font: Font, text: string, size: number) {
  return (font.layout(text).advanceWidth / font.unitsPerEm) * size;
}

const S = 1.2;
const GREETING_SIZE = 25 * S;
export const GUEST_NAME_MAX_SIZE = 34 * S; // 40.8, the reference size
export const GUEST_NAME_MIN_SIZE = 24; // below this the name wraps instead (client's choice)
const NAMES_MAX_SIZE = 64 * S; // 76.8
const NAMES_MIN_SIZE = 36;
const STEP = 2;

/**
 * Largest guest-name size (stepping down from 40.8 to 24) at which "Mpendwa {name}," fits one line.
 * Mirrors the Greeting layout in SaveTheDateCard: one flex item per word, a 0.26em gap between them.
 */
export function fitGuestNameSize(guestName: string, dear: string) {
  const { regular, black } = measuringFonts();
  const words = guestName.split(/\s+/).filter(Boolean);
  const gap = 0.26 * GREETING_SIZE;
  const fixed = textWidth(regular, dear, GREETING_SIZE) + textWidth(regular, ",", GREETING_SIZE) + gap * words.length;
  for (let size = GUEST_NAME_MAX_SIZE; size >= GUEST_NAME_MIN_SIZE; size -= STEP) {
    const width = fixed + words.reduce((sum, word) => sum + textWidth(black, word, size), 0);
    if (width <= SAVE_THE_DATE_TEXT_MAX_WIDTH) return { size, wraps: false };
  }
  return { size: GUEST_NAME_MIN_SIZE, wraps: true };
}

function fitNamesSize(groom: string, bride: string, fallback: string) {
  const { script } = measuringFonts();
  for (let size = NAMES_MAX_SIZE; size >= NAMES_MIN_SIZE; size -= STEP) {
    const width = groom && bride
      ? textWidth(script, groom, size) + textWidth(script, bride, size) + textWidth(script, "&", size * (52 / 64)) + 2 * 18 * S
      : textWidth(script, fallback, size);
    if (width <= SAVE_THE_DATE_TEXT_MAX_WIDTH) return size;
  }
  return NAMES_MIN_SIZE;
}

const textures = new Map<SaveTheDateVariant, Promise<string>>();
function texture(variant: SaveTheDateVariant) {
  // The reference's stripes and background are identical to Gilded Border's per variant.
  let pending = textures.get(variant);
  if (!pending) {
    pending = sharp(Buffer.from(gildedTextureSvg(variant)))
      .png()
      .toBuffer()
      .then((png) => `data:image/png;base64,${png.toString("base64")}`)
      .catch((error) => {
        textures.delete(variant);
        throw error;
      });
    textures.set(variant, pending);
  }
  return pending;
}

/**
 * Crops the event photo to the print's 456x595 box: cover, anchored at the top so faces in a
 * portrait photo are kept (the reference's object-position: center top). A landscape photo is
 * scaled to the box height and loses its sides.
 */
async function photo(coverImageUrl: string | null) {
  const cover = await fetchCoverImageDataUrl(coverImageUrl);
  if (!cover) return null;
  try {
    const source = Buffer.from(cover.dataUrl.split(",")[1], "base64");
    const cropped = await sharp(source)
      .resize(SAVE_THE_DATE_PHOTO_SIZE.width, SAVE_THE_DATE_PHOTO_SIZE.height, { fit: "cover", position: "top" })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${cropped.toString("base64")}`;
  } catch (error) {
    console.warn("Save the Date photo crop fallback:", error);
    return cover.dataUrl;
  }
}

export function buildSaveTheDateCardData(input: SaveTheDateCardInput, photoDataUrl: string | null): SaveTheDateCardData {
  const copy = saveTheDateCopy(input.language);
  const guestName = input.guestName.trim() || (input.language === "en" ? "Guest" : "Mgeni");
  const groomName = input.groomName?.trim() ?? "";
  const brideName = input.brideName?.trim() ?? "";
  const fallbackTitle = input.eventTitle.trim();
  const guestNameFit = fitGuestNameSize(guestName, copy.dear);
  return {
    language: input.language,
    guestName,
    guestNameSize: guestNameFit.size,
    guestNameWraps: guestNameFit.wraps,
    groomName,
    brideName,
    fallbackTitle,
    namesSize: fitNamesSize(groomName, brideName, fallbackTitle),
    dateParts: input.eventDateIso ? dateParts(input.eventDateIso, input.language) : null,
    fallbackDate: input.eventDateIso ?? "",
    venue: input.venue?.trim() || "-",
    photoDataUrl,
  };
}

export async function createSaveTheDateCard(input: SaveTheDateCardInput) {
  const [backdrop, photoDataUrl] = await Promise.all([texture(input.variant), photo(input.coverImageUrl)]);
  const data = buildSaveTheDateCardData(input, photoDataUrl);
  return jpegResponse(
    await materializeJpeg(
      <SaveTheDateCard data={data} variant={input.variant} texture={backdrop} />,
      SAVE_THE_DATE_CARD_WIDTH,
      SAVE_THE_DATE_CARD_HEIGHT,
      GILDED_BORDER_FONTS
    )
  );
}
