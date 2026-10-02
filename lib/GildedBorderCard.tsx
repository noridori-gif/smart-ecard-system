import type { ReactElement, ReactNode } from "react";
import { dressCodeSwatch, splitDressCode, statusText } from "./PremiumWhatsAppCard";
import { formatPassIdForDisplay } from "./passId";
import { formatSwahiliTime } from "./swahiliTime";

/**
 * "Gilded Border": built to match the client's reference renderings
 * (mwaliko-navy.html / mwaliko-cream.html, 900x1280) scaled x1.2 to the
 * production card width -- every position and size below is the reference
 * value times 1.2. Two colour variants share one layout: "navy" (dark card,
 * cream QR panel) and "cream" (light card, navy QR panel).
 *
 * Couple photo top-right with a torn-paper edge (real alpha, applied to each
 * event's own photo by whatsappInvitationCard.tsx -- see
 * gildedPhotoTornMaskSvg); text column on the left; QR pass card
 * bottom-left; hexagon monogram and dress-code swatches bottom-right. The
 * flourish, hexagon and its florals are the reference's own inline SVG.
 *
 * The palette is fixed per variant and ignores the organizer's theme
 * colours, like rose_garden.
 */

const S = 1.2; // reference (900px wide) -> production (1080px wide)
const CARD_WIDTH = 1080;
export const GILDED_BORDER_CARD_HEIGHT = 1536; // 1280 x 1.2

export type GildedBorderVariant = "navy" | "cream";

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
  /** Diagonal-stripe background for the variant (see gildedTextureSvg). */
  texture: string;
  /** The event photo already cut to the torn-paper shape (PNG with alpha);
   * falls back to the plain photo when absent (browser preview). */
  tornPhoto?: string;
};

type Palette = {
  background: string;
  stripe: string;
  text: string;
  accent: string;
  hot: string; // the "17" and "&"
  outerBorder: string;
  innerBorder: string;
  leafStroke: string;
  leafFill: string;
  bloomStroke: string;
  bloomFill: string;
  qrPanel: string;
  qrText: string;
  qrAccent: string;
  hexInner: string;
  dotBorder: string;
};

const PALETTES: Record<GildedBorderVariant, Palette> = {
  navy: {
    background: "#0c1f3d",
    stripe: "rgba(239,230,214,0.04)",
    text: "#efe6d6",
    accent: "#e08a5c",
    hot: "#d65a12",
    outerBorder: "#d97b4f",
    innerBorder: "#1d4a68",
    leafStroke: "#5f8aa6",
    leafFill: "rgba(95,138,166,0.25)",
    bloomStroke: "#efe6d6",
    bloomFill: "rgba(239,230,214,0.2)",
    qrPanel: "#efe6d6",
    qrText: "#0c1f3d",
    qrAccent: "#b2470b",
    hexInner: "#5f8aa6",
    dotBorder: `${3 * S}px solid #efe6d6`,
  },
  cream: {
    background: "#f5eee2",
    stripe: "rgba(12,31,61,0.04)",
    text: "#0c1f3d",
    accent: "#b2470b",
    hot: "#d65a12",
    outerBorder: "#d97b4f",
    innerBorder: "#1d4a68",
    leafStroke: "#1d4a68",
    leafFill: "rgba(29,74,104,0.25)",
    bloomStroke: "#1d4a68",
    bloomFill: "rgba(29,74,104,0.2)",
    qrPanel: "#0c1f3d",
    qrText: "#efe6d6",
    qrAccent: "#e08a5c",
    hexInner: "#1d4a68",
    dotBorder: `${2 * S}px solid #0c1f3d`,
  },
};

/**
 * Theme colours for the public /invite web page of a gilded_border event, so
 * it tells the same colour story as the card (the card ignores the event's
 * theme_* colours). Mapped by the role the web templates give each variable,
 * not by the card's own fields: --theme-primary is the dark colour (headings,
 * and the footer background under white text), --theme-secondary the light
 * card background, --theme-accent the small accents. The web page is light in
 * both variants, so navy uses its brighter "hot" orange for contrast on cream.
 */
export function gildedWebTheme(variant: GildedBorderVariant) {
  const p = PALETTES[variant];
  return variant === "navy"
    ? { primary: p.background, secondary: p.text, accent: p.hot }
    : { primary: p.text, secondary: p.background, accent: p.accent };
}

/** QR colours used for gilded_border (navy modules on the reference's cream). */
export const GILDED_QR_COLORS = { dark: "#0c1f3d", light: "#efe6d6" };

const SCRIPT = "Kaushan Script";
const SANS = "Lato";

// Reference geometry (x1.2).
const PHOTO_WIDTH = 470 * S; // 564
const PHOTO_HEIGHT = 700 * S; // 840
const PHOTO_LEFT = CARD_WIDTH - PHOTO_WIDTH;

function gildedCopy(language: "sw" | "en") {
  return language === "en"
    ? {
        weddingOf: "to the wedding of",
        groom: "GROOM",
        bride: "BRIDE",
        ceremony: "CEREMONY",
        reception: "RECEPTION",
        passId: "Pass ID",
        status: "Invitation",
        contact: "Contact",
        dress: "Dress code",
        closing: "Your presence will make this celebration complete.",
      }
    : {
        weddingOf: "katika harusi ya",
        groom: "BWANA HARUSI",
        bride: "BIBI HARUSI",
        ceremony: "IBADA YA NDOA",
        reception: "SHEREHE",
        passId: "Pass ID",
        status: "Mwaliko",
        contact: "Mawasiliano",
        dress: "Rangi za sherehe",
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
export function dateParts(iso: string, language: "sw" | "en") {
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

// ---------------------------------------------------------------------------
// Raster backdrops, built once by whatsappInvitationCard.tsx with sharp.

/** Full-bleed background with the reference's 135deg 1px-every-7px stripes. */
export function gildedTextureSvg(variant: GildedBorderVariant) {
  const palette = PALETTES[variant];
  const height = GILDED_BORDER_CARD_HEIGHT;
  // repeating-linear-gradient(135deg, ...) draws "/" stripes 7px apart along
  // the gradient axis, i.e. 7*sqrt(2) apart horizontally.
  const step = 7 * S * Math.SQRT2;
  const lines: string[] = [];
  for (let x = -height; x < CARD_WIDTH + height; x += step) {
    lines.push(`<line x1="${x.toFixed(1)}" y1="${height}" x2="${(x + height).toFixed(1)}" y2="0"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}">
    <rect width="100%" height="100%" fill="${palette.background}"/>
    <g stroke="${palette.stripe}" stroke-width="${(1 * S).toFixed(1)}">${lines.join("")}</g>
  </svg>`;
}

/**
 * Alpha mask (white = keep) for the photo: a torn-paper cut along its left
 * and bottom edges -- straight jagged segments with sharp teeth over a slow
 * drift, measured off the reference couple.png (left edge 3-14% in, bottom
 * edge at 90-95% of the height). Deterministic (seeded), so every card gets
 * the same edge.
 */
export function gildedPhotoTornMaskSvg(width = PHOTO_WIDTH, height = PHOTO_HEIGHT) {
  let seed = 23;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const tooth = () => (random() - 0.5) * 2;
  // Left edge, top -> bottom: drifts inward toward the bottom like the reference.
  const left: Array<[number, number]> = [];
  for (let y = 0; y < height * 0.9; y += 12 + random() * 22) {
    const drift = width * (0.04 + 0.05 * (0.5 + 0.5 * Math.sin(y / 170)) + 0.06 * (y / height));
    left.push([drift + tooth() * 9, y]);
  }
  // Bottom edge, left -> right.
  const bottomStartX = left[left.length - 1][0];
  const bottom: Array<[number, number]> = [];
  for (let x = bottomStartX; x <= width + 30; x += 12 + random() * 24) {
    const drift = height * (0.905 + 0.035 * (0.5 + 0.5 * Math.sin(x / 120 + 1.1)) + 0.015 * (x / width));
    bottom.push([Math.min(x, width + 2), drift + tooth() * 10]);
  }
  const points = [[left[0][0], -2], ...left, ...bottom, [width + 2, height + 2], [width + 2, -2]]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><polygon points="${points}" fill="#fff"/></svg>`;
}

export const GILDED_PHOTO_SIZE = { width: PHOTO_WIDTH, height: PHOTO_HEIGHT };

// ---------------------------------------------------------------------------
// The reference's inline SVG pieces, with variant colours.

/**
 * A five-petal bloom (the reference's ellipse flower). A plain function
 * returning SVG elements, not a component: Satori serialises <svg> children
 * as-is and does not resolve components inside them.
 */
function bloom({ rx, ry, stroke, fill, center }: { rx: number; ry: number; stroke: string; fill: string; center?: { r: number; color: string } }) {
  return (
    <g stroke={stroke} fill={fill}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} cx="0" cy={-ry} rx={rx} ry={ry} transform={`rotate(${angle})`} />
      ))}
      {center ? <circle cx="0" cy="0" r={center.r} fill={center.color} stroke="none" /> : null}
    </g>
  );
}

function Flourish({ p }: { p: Palette }) {
  return (
    <svg width={220 * S} height={80 * S} viewBox="0 0 240 90" fill="none" strokeWidth={1.4} strokeLinecap="round">
      <path d="M20 74 C60 66 90 58 120 48 C150 58 180 66 220 74" stroke={p.leafStroke} />
      <path d="M42 70 C36 58 42 48 54 46 C56 58 52 66 42 70Z" stroke={p.leafStroke} fill={p.leafFill} />
      <path d="M198 70 C204 58 198 48 186 46 C184 58 188 66 198 70Z" stroke={p.leafStroke} fill={p.leafFill} />
      <g transform="translate(120 40)">
        {bloom({ rx: 9, ry: 15, stroke: "#d65a12", fill: "rgba(214,90,18,0.35)", center: { r: 4, color: "#efe6d6" } })}
      </g>
      <g transform="translate(86 56) scale(0.6)">
        {bloom({ rx: 8, ry: 14, stroke: "#d97b4f", fill: "rgba(217,123,79,0.3)" })}
      </g>
      <g transform="translate(156 56) scale(0.6)">
        {bloom({ rx: 8, ry: 14, stroke: p.bloomStroke, fill: p.bloomFill })}
      </g>
    </svg>
  );
}

function HexagonArt({ p }: { p: Palette }) {
  return (
    <svg width={340 * S} height={320 * S} viewBox="0 0 340 320" fill="none" strokeLinejoin="round" style={{ position: "absolute", left: 0, top: 0 }}>
      <polygon points="170,20 296,88 296,226 170,294 44,226 44,88" stroke="#d65a12" strokeWidth={2.5} />
      <polygon points="182,28 304,106 292,242 158,292 36,216 48,80" stroke={p.hexInner} strokeWidth={1.5} />
      <g strokeWidth={1.4} transform="translate(266 232)">
        <path d="M-60 40 C-30 20 -10 10 20 -10" stroke={p.leafStroke} strokeLinecap="round" />
        <path d="M-20 22 C-28 8 -22 -2 -8 -4 C-6 10 -10 18 -20 22Z" stroke={p.leafStroke} fill={p.leafFill} />
        <path d="M-44 34 C-56 24 -54 12 -40 8 C-36 20 -36 28 -44 34Z" stroke={p.leafStroke} fill={p.leafFill} />
        <g transform="translate(18 -14)">
          {bloom({ rx: 10, ry: 17, stroke: "#d65a12", fill: "rgba(214,90,18,0.35)", center: { r: 4.5, color: "#efe6d6" } })}
        </g>
      </g>
      <g strokeWidth={1.4} transform="translate(72 70) rotate(180) scale(0.7)">
        <path d="M-50 34 C-26 18 -8 8 18 -8" stroke={p.leafStroke} strokeLinecap="round" />
        <g transform="translate(18 -12)">
          {bloom({ rx: 9, ry: 15, stroke: "#d97b4f", fill: "rgba(217,123,79,0.3)" })}
        </g>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Layout pieces.

function Box({ left, top, width, height, children, style }: { left: number; top: number; width?: number; height?: number; children?: ReactNode; style?: Record<string, string | number> }) {
  // Satori parses every style value it is given, so undefined keys are left
  // out entirely rather than passed through.
  return <div style={{ position: "absolute", left, top, ...(width !== undefined ? { width } : {}), ...(height !== undefined ? { height } : {}), display: "flex", ...style }}>{children}</div>;
}

function Text({ children, size, weight = 400, color, family = SANS, style }: { children: ReactNode; size: number; weight?: 400 | 700 | 900; color: string; family?: string; style?: Record<string, string | number> }) {
  return <div style={{ display: "flex", fontFamily: family, fontSize: size, fontWeight: weight, color, textAlign: "center", ...style }}>{children}</div>;
}

function CoupleNames({ title, text, p }: { title: string; text: Copy; p: Palette }) {
  const names = coupleNames(title);
  if (!names) {
    return <Text size={title.length > 18 ? 46 : 58 * S} family={SCRIPT} color={p.text} style={{ lineHeight: 1.1 }}>{title}</Text>;
  }
  // Both names stay on one line like the reference ("Frida & Dr. Elia" at
  // 58px in a 436px column); longer pairs step the size down instead of wrapping.
  const combined = names.groom.length + names.bride.length;
  const size = combined > 22 ? 40 : combined > 16 ? 52 : 58 * S;
  const block = (name: string, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Text size={size} family={SCRIPT} color={p.text} style={{ lineHeight: 1.1, whiteSpace: "nowrap" }}>{name}</Text>
      <Text size={14 * S} weight={700} color={p.accent} style={{ marginTop: 2 * S, letterSpacing: 2 * S }}>{label}</Text>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 16 * S }}>
      {block(names.groom, text.groom)}
      <Text size={50 * S} family={SCRIPT} color={p.hot} style={{ lineHeight: 1.25 }}>&amp;</Text>
      {block(names.bride, text.bride)}
    </div>
  );
}

function DateRow({ data, p }: { data: GildedBorderCardData; p: Palette }) {
  const parts = dateParts(data.eventDateIso, data.language);
  if (!parts) return <Text size={24 * S} weight={700} color={p.text}>{data.date}</Text>;
  const ruled = (value: string) => (
    <div style={{ width: 110 * S, display: "flex", justifyContent: "center", padding: `${6 * S}px 0`, borderTop: `${1.5 * S}px solid ${p.outerBorder}`, borderBottom: `${1.5 * S}px solid ${p.outerBorder}` }}>
      <Text size={20 * S} weight={700} color={p.text}>{value}</Text>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginTop: 6 * S }}>
      {ruled(parts.weekday)}
      <Text size={54 * S} weight={900} color={p.hot} style={{ lineHeight: 1 }}>{parts.day}</Text>
      {ruled(parts.monthYear)}
    </div>
  );
}

function ScheduleColumn({ heading, first, second, p, divider }: { heading: string; first: string; second: string; p: Palette; divider: boolean }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S, padding: `${4 * S}px ${10 * S}px`, ...(divider ? { borderRight: `${1 * S}px solid ${p.innerBorder}` } : {}) }}>
      <Text size={22 * S} weight={900} color={p.accent}>{heading}</Text>
      {first ? <Text size={20 * S} weight={700} color={p.text} style={{ whiteSpace: "nowrap" }}>{first}</Text> : null}
      {second ? <Text size={17 * S} color={p.text} style={{ lineHeight: 1.25 }}>{second}</Text> : null}
    </div>
  );
}

function Schedule({ data, text, p }: { data: GildedBorderCardData; text: Copy; p: Palette }) {
  const sw = data.language === "sw";
  const ceremonyTime = sw ? formatSwahiliTime(data.ceremonyTime) ?? data.ceremonyTime : data.ceremonyTime;
  const receptionTime = sw ? formatSwahiliTime(data.eventTime) ?? data.eventTime : data.eventTime;
  const hasCeremony = Boolean(data.ceremonyTime || data.ceremonyVenue);
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "stretch", marginTop: 6 * S }}>
      {hasCeremony ? <ScheduleColumn heading={ceremonyHeading(data.ceremonyTitle, data.language, text.ceremony)} first={ceremonyTime} second={data.ceremonyVenue} p={p} divider /> : null}
      <ScheduleColumn heading={text.reception} first={receptionTime} second={data.receptionVenue || data.venue} p={p} divider={false} />
    </div>
  );
}

function TextColumn({ data, text, p }: { data: GildedBorderCardData; text: Copy; p: Palette }) {
  const message = data.invitationMessage.trim();
  const guestSize = data.guestName.length > 30 ? 22 * S : data.guestName.length > 20 ? 24 * S : 26 * S;
  return (
    <Box left={44 * S} top={50 * S} width={436 * S} style={{ flexDirection: "column", alignItems: "center", gap: 16 * S }}>
      <Flourish p={p} />
      {message ? <Text size={20 * S} color={p.text} style={{ lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{message}</Text> : null}
      <Text size={guestSize} weight={900} color={p.accent} style={{ lineHeight: 1.2 }}>{data.guestName}</Text>
      <Text size={20 * S} color={p.text}>{text.weddingOf}</Text>
      <CoupleNames title={data.title} text={text} p={p} />
      <DateRow data={data} p={p} />
      <Schedule data={data} text={text} p={p} />
      <Text size={26 * S} family={SCRIPT} color={p.text} style={{ marginTop: 10 * S, maxWidth: 330 * S, lineHeight: 1.35 }}>{text.closing}</Text>
    </Box>
  );
}

function PassCard({ data, text, p }: { data: GildedBorderCardData; text: Copy; p: Palette }) {
  const passId = data.eventPassId ? formatPassIdForDisplay(data.eventPassId) : "—";
  const qrSize = 340 * S;
  // Status and MAWASILIANO aren't in the reference card (it shows the Pass ID
  // only); kept as one small line under it so no existing field is dropped.
  const extras = [`${text.status}: ${statusText(data)}`, data.contactPhone ? `${text.contact}: ${data.contactPhone}` : ""].filter(Boolean);

  return (
    <Box left={70 * S} top={750 * S} width={400 * S} style={{ flexDirection: "column", alignItems: "center", gap: 14 * S, padding: 24 * S, borderRadius: 18 * S, backgroundColor: p.qrPanel }}>
      {data.qrCodeDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.qrCodeDataUrl} alt="" width={qrSize} height={qrSize} style={{ width: qrSize, height: qrSize, borderRadius: 8 * S }} />
      ) : (
        <div style={{ width: qrSize, height: qrSize, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 * S, backgroundColor: GILDED_QR_COLORS.light }}>
          <Text size={30} weight={900} color={GILDED_QR_COLORS.dark}>QR</Text>
        </div>
      )}
      <div style={{ display: "flex", fontFamily: SANS, fontSize: 22 * S, fontWeight: 900, letterSpacing: 1 * S, color: p.qrText }}>
        {`${text.passId} | `}
        <span style={{ color: p.qrAccent, marginLeft: 6 }}>{passId}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S, marginTop: -6 * S }}>
        {extras.map((line) => (
          <Text key={line} size={15 * S} weight={700} color={p.qrText} style={{ opacity: 0.85 }}>{line}</Text>
        ))}
      </div>
    </Box>
  );
}

function Monogram({ title, p, top }: { title: string; p: Palette; top: number }) {
  const names = coupleNames(title);
  const letters = names ? [monogramLetter(names.groom), monogramLetter(names.bride)] : [monogramLetter(title)];
  return (
    <Box left={530 * S} top={top} width={340 * S} height={320 * S}>
      <HexagonArt p={p} />
      <Box left={0} top={0} width={340 * S} height={314 * S} style={{ alignItems: "center", justifyContent: "center", gap: 6 * S }}>
        <Text size={116 * S} family={SCRIPT} color={p.text} style={{ lineHeight: 1 }}>{letters[0]}</Text>
        {letters[1] ? <Text size={46 * S} family={SCRIPT} color={p.hot} style={{ lineHeight: 1, marginTop: 30 * S }}>&amp;</Text> : null}
        {letters[1] ? <Text size={116 * S} family={SCRIPT} color={p.text} style={{ lineHeight: 1 }}>{letters[1]}</Text> : null}
      </Box>
    </Box>
  );
}

function DressCode({ dressCode, text, p, top }: { dressCode: string; text: Copy; p: Palette; top: number }) {
  const parts = splitDressCode(dressCode).slice(0, 5);
  if (parts.length === 0) return null;
  return (
    <Box left={540 * S} top={top} width={320 * S} style={{ flexDirection: "column", alignItems: "center", gap: 14 * S }}>
      <Text size={18 * S} weight={700} color={p.text}>{text.dress}</Text>
      <div style={{ display: "flex", gap: 10 * S }}>
        {parts.map((part, index) => (
          <div key={`${part}-${index}`} style={{ width: 44 * S, height: 44 * S, display: "flex", borderRadius: 999, backgroundColor: dressCodeSwatch(part), border: p.dotBorder }} />
        ))}
      </div>
      <Text size={20 * S} weight={900} color={p.accent} style={{ lineHeight: 1.25 }}>{dressCode}</Text>
    </Box>
  );
}

export default function GildedBorderCard({ data, assets, variant = "navy" }: { data: GildedBorderCardData; assets: GildedBorderAssets; variant?: GildedBorderVariant }): ReactElement {
  const p = PALETTES[variant];
  const text = gildedCopy(data.language);
  const photo = assets.tornPhoto ?? data.coverImageDataUrl;
  const height = GILDED_BORDER_CARD_HEIGHT;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", overflow: "hidden", backgroundColor: p.background, color: p.text }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={assets.texture} alt="" width={CARD_WIDTH} height={height} style={{ position: "absolute", left: 0, top: 0, width: CARD_WIDTH, height }} />

      {/* Double frame (reference: 16px / 24px insets). */}
      <Box left={16 * S} top={16 * S} width={CARD_WIDTH - 32 * S} height={height - 32 * S} style={{ border: `${1.5 * S}px solid ${p.outerBorder}`, borderRadius: 18 * S }} />
      <Box left={24 * S} top={24 * S} width={CARD_WIDTH - 48 * S} height={height - 48 * S} style={{ border: `${1 * S}px solid ${p.innerBorder}`, borderRadius: 14 * S }} />

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" width={PHOTO_WIDTH} height={PHOTO_HEIGHT} style={{ position: "absolute", left: PHOTO_LEFT, top: 0, width: PHOTO_WIDTH, height: PHOTO_HEIGHT, objectFit: "cover" }} />
      ) : null}

      <TextColumn data={data} text={text} p={p} />
      <PassCard data={data} text={text} p={p} />
      {/* Without a photo the monogram moves up into the photo's place. */}
      <Monogram title={data.title} p={p} top={(photo ? 640 : 230) * S} />
      <DressCode dressCode={data.dressCode} text={text} p={p} top={(photo ? 1000 : 900) * S} />
    </div>
  );
}
