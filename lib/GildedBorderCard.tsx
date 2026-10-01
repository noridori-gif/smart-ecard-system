import type { ReactElement } from "react";
import { dressCodeSwatch, splitDressCode, statusText } from "./PremiumWhatsAppCard";
import { formatPassIdForDisplay } from "./passId";
import { formatSwahiliTime } from "./swahiliTime";

/**
 * "Gilded Border": a navy full-bleed card (subtle diagonal texture). The
 * couple photo sits top-right (~55% of the card's height) and melts into the
 * navy through a wavy bottom edge; the text column runs down the left; a
 * hexagon monogram with floral accents and the dress-code swatches sit under
 * the photo; the QR/pass card sits bottom-left. Without a photo the
 * monogram moves up into the photo's place.
 *
 * Like rose_garden, the palette is fixed for this template and deliberately
 * ignores the organizer's primary/secondary/accent picks: the floral art is
 * baked into PNGs (scripts/build-gilded-border-assets.mjs) in exactly these
 * colours, so theme colours would clash with it rather than restyle it.
 *
 * Rendered only through createGildedBorderInvitationCard in
 * whatsappInvitationCard.tsx (Satori -> sharp JPEG). Satori only composites
 * <img> over <img> reliably (see buildSidePhotoBlendOverlayUrl there), so
 * the texture, the photo's wavy edge and the hexagon are SVGs from this file
 * rasterised once by that module and passed in as `assets`.
 */

export const GILDED_BORDER_CARD_HEIGHT = 1800;
const CARD_WIDTH = 1080;

export type GildedBorderCardData = {
  title: string;
  invitationMessage: string;
  date: string;
  eventDateIso: string;
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
  contactPhone: string;
  language: "sw" | "en";
  coverImageDataUrl: string | null;
  qrCodeDataUrl: string | null;
};

export type GildedBorderAssets = {
  flourish: string;
  hexAccentTopLeft: string;
  hexAccentBottomRight: string;
  texture: string;
  photoOverlay: string;
  hexagon: string;
};

const NAVY = "#16223D";
const NAVY_LINE = "#2C3D63";
const ORANGE = "#D9692A";
const CREAM = "#F1E2C6";
const CREAM_SOFT = "#E9DCC3";
const WHITE = "#FFFFFF";
const INK = "#1F2E4D";
const SERIF = "Playfair Display";
const SCRIPT = "Great Vibes";
const SANS = "Inter";

// Photo block, top-right.
const PHOTO_LEFT = 470;
const PHOTO_WIDTH = CARD_WIDTH - PHOTO_LEFT;
const PHOTO_HEIGHT = 990;

// Hexagon monogram (pointy-top), under the photo -- or in the photo's place.
const HEX_WIDTH = 260;
const HEX_HEIGHT = 300;
const HEX_LEFT = 680;
const HEX_TOP_WITH_PHOTO = 1010;
const HEX_TOP_NO_PHOTO = 360;

function gildedCopy(language: "sw" | "en") {
  return language === "en"
    ? {
        weddingOf: "to the wedding of",
        groom: "GROOM",
        bride: "BRIDE",
        ceremony: "CEREMONY",
        reception: "RECEPTION",
        scan: "Scan this QR",
        scanHelp: "Present this QR code or Pass ID at the entrance.",
        passId: "Pass ID",
        status: "Invitation",
        contact: "Contact",
        dress: "DRESS CODE",
        closing: "Your presence will make this celebration complete.",
      }
    : {
        weddingOf: "katika harusi ya",
        groom: "BWANA HARUSI",
        bride: "BIBI HARUSI",
        ceremony: "IBADA YA NDOA",
        reception: "SHEREHE",
        scan: "Changanua QR hii",
        scanHelp: "Onyesha QR hii au Pass ID mlangoni kwa uhakiki.",
        passId: "Pass ID",
        status: "Mwaliko",
        contact: "Mawasiliano",
        dress: "RANGI ZA SHEREHE",
        closing: "Uwepo wako utakamilisha furaha ya siku hii.",
      };
}

type Copy = ReturnType<typeof gildedCopy>;

const WEEKDAYS = {
  sw: ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};
const MONTHS = {
  sw: ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ago", "Sep", "Okt", "Nov", "Des"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

/** "2026-10-17" -> { weekday: "Jumamosi", day: "17", monthYear: "Okt 2026" }. */
function dateParts(iso: string, language: "sw" | "en") {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== day) return null;
  return {
    weekday: WEEKDAYS[language][date.getUTCDay()],
    day: String(day),
    monthYear: `${MONTHS[language][month - 1]} ${year}`,
  };
}

// Honorifics skipped when picking a monogram letter, so "Dr. Elia" -> "E".
const HONORIFICS = new Set(["dr", "mr", "mrs", "ms", "miss", "prof", "rev", "hon", "sheikh", "imam", "pastor", "bwana", "bibi"]);
function monogramLetter(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const word = words.find((w) => !HONORIFICS.has(w.replace(/\.$/, "").toLowerCase())) ?? words[0] ?? "";
  return word.replace(/^[^\p{L}]+/u, "")[0]?.toUpperCase() ?? "";
}

/**
 * The title is "groom & bride" whenever the event has both names set (see
 * displayTitle in whatsappInvitationCard.tsx), otherwise the organizer's own
 * title, which for a wedding is conventionally written the same way -- so
 * the first part is shown as the groom and the second as the bride.
 */
function coupleNames(title: string) {
  const parts = title.split(/\s*&\s*/).map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? { groom: parts[0], bride: parts.slice(1).join(" & ") } : null;
}

// ---------------------------------------------------------------------------
// SVG backdrops, rasterised once by whatsappInvitationCard.tsx.

/** Navy full-bleed background with a faint diagonal line texture. */
export function gildedTextureSvg() {
  const lines: string[] = [];
  for (let x = -GILDED_BORDER_CARD_HEIGHT; x < CARD_WIDTH; x += 16) {
    lines.push(`<line x1="${x}" y1="0" x2="${x + GILDED_BORDER_CARD_HEIGHT}" y2="${GILDED_BORDER_CARD_HEIGHT}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${GILDED_BORDER_CARD_HEIGHT}">
    <rect width="100%" height="100%" fill="${NAVY}"/>
    <g stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1.2">${lines.join("")}</g>
  </svg>`;
}

/**
 * Laid over the photo: a soft navy fade on the left edge (into the text
 * column) and an organic wavy bottom edge that melts into the navy, traced
 * by a thin burnt-orange line and a cream hairline. Deterministic (seeded
 * jitter), so every card gets the same edge.
 */
export function gildedPhotoOverlaySvg() {
  const width = PHOTO_WIDTH;
  const height = PHOTO_HEIGHT;
  let seed = 11;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const points: Array<[number, number]> = [];
  for (let x = 0; x <= width + 8; x += 8) {
    const y = height - 92 + 26 * Math.sin(x / 105 + 0.6) + 11 * Math.sin(x / 41) + (random() - 0.5) * 5;
    points.push([Math.min(x, width), Math.round(y * 10) / 10]);
  }
  const line = (dy: number) => points.map(([x, y]) => `${x},${y + dy}`).join(" ");
  const shape = (dy: number) => `${line(dy)} ${width},${height} 0,${height}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="left" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${NAVY}" stop-opacity="1"/>
        <stop offset="0.08" stop-color="${NAVY}" stop-opacity="0"/>
      </linearGradient>
      <filter id="feather" x="0" y="-50%" width="100%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#left)"/>
    <polygon points="${shape(-26)}" fill="${NAVY}" opacity="0.6" filter="url(#feather)"/>
    <polygon points="${shape(0)}" fill="${NAVY}"/>
    <polyline points="${line(-2)}" fill="none" stroke="${ORANGE}" stroke-width="2.4" stroke-linejoin="round"/>
    <polyline points="${line(9)}" fill="none" stroke="${CREAM}" stroke-width="1.2" stroke-linejoin="round" opacity="0.7"/>
  </svg>`;
}

/** Hexagon frame: cream face, navy outer outline, orange inner outline. */
export function gildedHexagonSvg() {
  const w = HEX_WIDTH;
  const h = HEX_HEIGHT;
  const hex = (inset: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const r = h / 2 - inset;
    return Array.from({ length: 6 }, (_, i) => {
      const a = ((60 * i - 90) * Math.PI) / 180;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <polygon points="${hex(4)}" fill="${CREAM}" stroke="${NAVY_LINE}" stroke-width="7" stroke-linejoin="round"/>
    <polygon points="${hex(18)}" fill="none" stroke="${ORANGE}" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
// Pieces.

function Img({ src, left, top, width, height }: { src: string; left: number; top: number; width: number; height: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={width} height={height} style={{ position: "absolute", left, top, width, height }} />;
}

function Label({ children, color = ORANGE, size = 13, spacing = 3 }: { children: string; color?: string; size?: number; spacing?: number }) {
  return <div style={{ display: "flex", fontFamily: SANS, fontSize: size, fontWeight: 700, letterSpacing: spacing, color }}>{children}</div>;
}

/** Short orange rule with a diamond, between the text column's sections. */
function Separator() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ width: 60, height: 1, display: "flex", backgroundColor: ORANGE, opacity: 0.7 }} />
      <div style={{ width: 8, height: 8, display: "flex", margin: "0 10px", border: `1.5px solid ${ORANGE}`, transform: "rotate(45deg)" }} />
      <div style={{ width: 60, height: 1, display: "flex", backgroundColor: ORANGE, opacity: 0.7 }} />
    </div>
  );
}

function VRule({ height }: { height: number | string }) {
  return <div style={{ width: 1, height, display: "flex", backgroundColor: CREAM, opacity: 0.35 }} />;
}

function CoupleNames({ title, text }: { title: string; text: Copy }) {
  const names = coupleNames(title);
  if (!names) {
    return <div style={{ display: "flex", maxWidth: 420, fontFamily: SERIF, fontSize: title.length > 22 ? 30 : 38, fontWeight: 700, color: WHITE, textAlign: "center" }}>{title}</div>;
  }
  const longest = Math.max(names.groom.length, names.bride.length);
  const size = longest > 14 ? 28 : longest > 9 ? 36 : 44;
  const block = (name: string, label: string) => (
    <div style={{ width: 175, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ display: "flex", fontFamily: SERIF, fontSize: size, fontWeight: 700, lineHeight: 1.1, color: WHITE, textAlign: "center" }}>{name}</div>
      <div style={{ display: "flex", marginTop: 8 }}>
        <Label size={12} spacing={2.4}>{label}</Label>
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
      {block(names.groom, text.groom)}
      <div style={{ display: "flex", margin: "-8px 6px 0", fontFamily: SCRIPT, fontSize: 62, lineHeight: 1, color: ORANGE }}>&amp;</div>
      {block(names.bride, text.bride)}
    </div>
  );
}

function DateRow({ data }: { data: GildedBorderCardData }) {
  const parts = dateParts(data.eventDateIso, data.language);
  if (!parts) {
    return <div style={{ display: "flex", fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: WHITE }}>{data.date}</div>;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 130, display: "flex", justifyContent: "flex-end", fontFamily: SANS, fontSize: 17, fontWeight: 700, letterSpacing: 2.4, color: WHITE }}>{parts.weekday.toUpperCase()}</div>
      <div style={{ display: "flex", margin: "0 18px" }}>
        <VRule height={84} />
      </div>
      <div style={{ display: "flex", fontFamily: SERIF, fontSize: 112, fontWeight: 700, lineHeight: 1, color: ORANGE }}>{parts.day}</div>
      <div style={{ display: "flex", margin: "0 18px" }}>
        <VRule height={84} />
      </div>
      <div style={{ width: 130, display: "flex", fontFamily: SERIF, fontSize: 28, color: WHITE }}>{parts.monthYear}</div>
    </div>
  );
}

function ScheduleColumn({ heading, first, second }: { heading: string; first: string; second: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 12px", textAlign: "center" }}>
      <Label size={15} spacing={2.6}>{heading}</Label>
      {first ? <div style={{ display: "flex", marginTop: 12, fontFamily: SERIF, fontSize: 24, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", color: WHITE, textAlign: "center" }}>{first}</div> : null}
      {second ? <div style={{ display: "flex", marginTop: 6, fontFamily: SERIF, fontSize: 21, fontStyle: "italic", lineHeight: 1.25, color: CREAM_SOFT, textAlign: "center" }}>{second}</div> : null}
    </div>
  );
}

/**
 * events.ceremony_title defaults to "Ibada ya Ndoa" in the database, so an
 * English event that never touched the field would otherwise show a
 * Swahili heading next to "RECEPTION". That default is swapped for the
 * English label; any title the organizer actually typed is kept as-is.
 */
function ceremonyHeading(ceremonyTitle: string, language: "sw" | "en", fallback: string) {
  const title = ceremonyTitle.trim();
  if (!title) return fallback;
  if (language === "en" && title.toLowerCase().replace(/\s+/g, " ") === "ibada ya ndoa") return fallback;
  return title.toUpperCase();
}

function Schedule({ data, text }: { data: GildedBorderCardData; text: Copy }) {
  const sw = data.language === "sw";
  const ceremonyTime = sw ? formatSwahiliTime(data.ceremonyTime) ?? data.ceremonyTime : data.ceremonyTime;
  const receptionTime = sw ? formatSwahiliTime(data.eventTime) ?? data.eventTime : data.eventTime;
  const hasCeremony = Boolean(data.ceremonyTime || data.ceremonyVenue);
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "stretch" }}>
      {hasCeremony ? <ScheduleColumn heading={ceremonyHeading(data.ceremonyTitle, data.language, text.ceremony)} first={ceremonyTime} second={data.ceremonyVenue} /> : null}
      {hasCeremony ? <VRule height="100%" /> : null}
      <ScheduleColumn heading={text.reception} first={receptionTime} second={data.receptionVenue || data.venue} />
    </div>
  );
}

function guestNameSize(name: string) {
  return name.length > 34 ? 32 : name.length > 22 ? 40 : 52;
}

function TextColumn({ data, assets, text }: { data: GildedBorderCardData; assets: GildedBorderAssets; text: Copy }) {
  const message = data.invitationMessage.trim();
  return (
    <div style={{ position: "absolute", left: 30, top: 40, width: 440, height: 1385, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", textAlign: "center" }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assets.flourish} alt="" width={420} height={158} style={{ width: 420, height: 158 }} />
        {message ? (
          <div style={{ display: "flex", marginTop: 30, fontFamily: SERIF, fontSize: message.length > 140 ? 20 : 24, lineHeight: 1.45, color: WHITE, textAlign: "center" }}>{message}</div>
        ) : null}
        <div style={{ display: "flex", marginTop: 36, fontFamily: SERIF, fontSize: guestNameSize(data.guestName), fontWeight: 700, lineHeight: 1.15, color: ORANGE, textAlign: "center" }}>{data.guestName}</div>
        <div style={{ display: "flex", marginTop: 22, fontFamily: SERIF, fontSize: 25, fontStyle: "italic", color: WHITE }}>{text.weddingOf}</div>
        <div style={{ display: "flex", marginTop: 32 }}>
          <CoupleNames title={data.title} text={text} />
        </div>
      </div>

      <Separator />

      <DateRow data={data} />

      <Separator />

      <Schedule data={data} text={text} />

      <Separator />

      <div style={{ display: "flex", maxWidth: 420, fontFamily: SERIF, fontSize: 23, fontStyle: "italic", lineHeight: 1.35, color: CREAM, textAlign: "center" }}>{text.closing}</div>
    </div>
  );
}

function Monogram({ title, assets, top }: { title: string; assets: GildedBorderAssets; top: number }) {
  const names = coupleNames(title);
  const letters = names ? [monogramLetter(names.groom), monogramLetter(names.bride)] : [monogramLetter(title)];
  return (
    <div style={{ position: "absolute", left: HEX_LEFT - 90, top: top - 80, width: HEX_WIDTH + 180, height: HEX_HEIGHT + 160, display: "flex" }}>
      <Img src={assets.hexAccentTopLeft} left={0} top={0} width={200} height={200} />
      <Img src={assets.hexagon} left={90} top={80} width={HEX_WIDTH} height={HEX_HEIGHT} />
      <Img src={assets.hexAccentBottomRight} left={HEX_WIDTH - 20} top={HEX_HEIGHT - 40} width={200} height={200} />
      <div style={{ position: "absolute", left: 90, top: 80, width: HEX_WIDTH, height: HEX_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", fontFamily: SERIF, fontSize: 64, fontWeight: 700, color: INK }}>{letters[0]}</div>
        {letters[1] ? <div style={{ display: "flex", margin: "0 8px", fontFamily: SCRIPT, fontSize: 60, color: ORANGE }}>&amp;</div> : null}
        {letters[1] ? <div style={{ display: "flex", fontFamily: SERIF, fontSize: 64, fontWeight: 700, color: INK }}>{letters[1]}</div> : null}
      </div>
    </div>
  );
}

function DressCode({ dressCode, text }: { dressCode: string; text: Copy }) {
  const parts = splitDressCode(dressCode).slice(0, 5);
  if (parts.length === 0) return null;
  return (
    <div style={{ position: "absolute", left: 610, top: 1478, width: 450, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <Label color={WHITE} size={15} spacing={4}>{text.dress}</Label>
      <div style={{ display: "flex", marginTop: 18, gap: 14 }}>
        {parts.map((part, index) => (
          <div key={`${part}-${index}`} style={{ width: 40, height: 40, display: "flex", borderRadius: 999, backgroundColor: dressCodeSwatch(part), border: `3px solid ${CREAM}` }} />
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 16, maxWidth: 420, fontFamily: SERIF, fontSize: 22, fontStyle: "italic", lineHeight: 1.3, color: ORANGE, textAlign: "center" }}>{dressCode}</div>
    </div>
  );
}

function PassCard({ data, text }: { data: GildedBorderCardData; text: Copy }) {
  const passId = data.eventPassId ? formatPassIdForDisplay(data.eventPassId) : "—";
  const qrSize = 214;
  const row = (label: string, value: string) => (
    <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
      <div style={{ display: "flex", fontFamily: SANS, fontSize: 14, fontWeight: 700, color: INK, opacity: 0.7 }}>{label}</div>
      <div style={{ width: 1, height: 18, display: "flex", margin: "0 10px", backgroundColor: ORANGE }} />
      <div style={{ display: "flex", fontFamily: SERIF, fontSize: 19, fontWeight: 700, color: INK }}>{value}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 30, top: 1470, width: 560, height: 300, display: "flex", alignItems: "center", padding: "0 22px", borderRadius: 20, backgroundColor: CREAM }}>
      <div style={{ width: qrSize + 16, height: qrSize + 16, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: WHITE }}>
        {data.qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.qrCodeDataUrl} alt="" width={qrSize} height={qrSize} style={{ width: qrSize, height: qrSize, objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", fontFamily: SANS, fontSize: 22, fontWeight: 700, color: INK }}>QR</div>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", marginLeft: 20 }}>
        <div style={{ display: "flex", fontFamily: SERIF, fontSize: 25, fontWeight: 700, color: ORANGE }}>{text.scan}</div>
        <div style={{ display: "flex", marginTop: 6, marginBottom: 6, fontFamily: SERIF, fontSize: 15, fontStyle: "italic", lineHeight: 1.3, color: INK }}>{text.scanHelp}</div>
        {row(text.passId, passId)}
        {row(text.status, statusText(data))}
        {data.contactPhone ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 10 }}>
            <div style={{ display: "flex", fontFamily: SANS, fontSize: 13, fontWeight: 700, color: INK, opacity: 0.7 }}>{text.contact}</div>
            <div style={{ display: "flex", marginTop: 3, fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: INK }}>{data.contactPhone}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function GildedBorderCard({ data, assets }: { data: GildedBorderCardData; assets: GildedBorderAssets }): ReactElement {
  const text = gildedCopy(data.language);
  const hasPhoto = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", overflow: "hidden", backgroundColor: NAVY }}>
      <Img src={assets.texture} left={0} top={0} width={CARD_WIDTH} height={GILDED_BORDER_CARD_HEIGHT} />

      {hasPhoto ? (
        <div style={{ position: "absolute", left: PHOTO_LEFT, top: 0, width: PHOTO_WIDTH, height: PHOTO_HEIGHT, display: "flex", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.coverImageDataUrl ?? ""} alt="" width={PHOTO_WIDTH} height={PHOTO_HEIGHT} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
          <Img src={assets.photoOverlay} left={0} top={0} width={PHOTO_WIDTH} height={PHOTO_HEIGHT} />
        </div>
      ) : null}

      <TextColumn data={data} assets={assets} text={text} />
      <Monogram title={data.title} assets={assets} top={hasPhoto ? HEX_TOP_WITH_PHOTO : HEX_TOP_NO_PHOTO} />
      <DressCode dressCode={data.dressCode} text={text} />
      {/* Same flourish as the top of the text column, repeated in the
          bottom-right corner so the lower half of the card is balanced
          (otherwise ~230px of bare navy sits under the dress-code block). */}
      <Img src={assets.flourish} left={665} top={1648} width={340} height={128} />
      <PassCard data={data} text={text} />
    </div>
  );
}
