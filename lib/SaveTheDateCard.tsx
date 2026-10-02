import type { ReactElement, ReactNode } from "react";
import type { SaveTheDateVariant } from "./saveTheDateEligibility";

/**
 * "Save the Date": built to match the client's reference renderings
 * (docs/design-references/save-the-date/save-the-date-{cream,navy}.html, 900x1280) scaled x1.2 to
 * the production card width -- every position and size below is the reference value times 1.2,
 * the same convention as GildedBorderCard. The two variants share one layout; only the palette
 * differs, and every colour below is copied from the reference HTML.
 *
 * Deliberately has no QR, Pass ID, guest count, time, ceremony or family message: it is sent
 * before the formal invitation ("Mwaliko rasmi utafuata").
 *
 * Text sizes that depend on the guest/couple names are measured with the real fonts by
 * lib/saveTheDateCardImage.tsx and passed in, so this component is pure layout.
 */

const S = 1.2; // reference (900px wide) -> production (1080px wide)
export const SAVE_THE_DATE_CARD_WIDTH = 1080;
export const SAVE_THE_DATE_CARD_HEIGHT = 1536; // 1280 x 1.2

// Reference photo box (380x496 inside an 18px white frame), x1.2.
export const SAVE_THE_DATE_PHOTO_SIZE = { width: Math.round(380 * S), height: Math.round(496 * S) }; // 456 x 595

/** Widest a centred text line may be: the reference's 900px less the double frame and a margin. */
export const SAVE_THE_DATE_TEXT_MAX_WIDTH = 760 * S; // 912

export type SaveTheDateCardData = {
  language: "sw" | "en";
  guestName: string;
  /** Lato Black size for the guest name; 24..40.8. Wraps onto two lines only at 24. */
  guestNameSize: number;
  /** The name still doesn't fit one line at 24px, so the greeting takes two lines. */
  guestNameWraps: boolean;
  groomName: string;
  brideName: string;
  /** Used when the event has no bride/groom pair (e.g. not a wedding). */
  fallbackTitle: string;
  /** Kaushan Script size for the couple names; 76.8 (64 x 1.2) or smaller to stay on one line. */
  namesSize: number;
  dateParts: { weekday: string; day: string; monthYear: string } | null;
  fallbackDate: string;
  venue: string;
  /** Already cropped to SAVE_THE_DATE_PHOTO_SIZE (cover, top-anchored); null = empty frame. */
  photoDataUrl: string | null;
};

type Palette = {
  text: string;
  accent: string;
  leafStroke: string;
  leafFill: string;
  bloomStroke: string;
  bloomFill: string;
  photoShadow: string;
};

// Shared by both variants in the reference.
const HOT = "#d65a12"; // "&", the day number, header/sprig blooms, pin
const OUTER_BORDER = "#d97b4f"; // outer frame, date rules, tape
const INNER_BORDER = "#1d4a68";
const PRINT = "#fffdf8"; // photo frame
const BLOOM_CENTER = "#efe6d6";

const PALETTES: Record<SaveTheDateVariant, Palette> = {
  cream: {
    text: "#0c1f3d",
    accent: "#b2470b",
    leafStroke: "#1d4a68",
    leafFill: "rgba(29,74,104,0.25)",
    bloomStroke: "#1d4a68",
    bloomFill: "rgba(29,74,104,0.2)",
    photoShadow: "rgba(0,0,0,0.18)",
  },
  navy: {
    text: "#efe6d6",
    accent: "#e08a5c",
    leafStroke: "#5f8aa6",
    leafFill: "rgba(95,138,166,0.25)",
    bloomStroke: "#efe6d6",
    bloomFill: "rgba(239,230,214,0.2)",
    photoShadow: "rgba(0,0,0,0.45)",
  },
};

const SCRIPT = "Kaushan Script";
const SANS = "Lato";

export function saveTheDateCopy(language: "sw" | "en") {
  return language === "en"
    ? { dear: "Dear", ask: "please save this date for our wedding", follows: "Formal invitation to follow" }
    : { dear: "Mpendwa", ask: "tafadhali hifadhi tarehe hii kwa ajili ya harusi yetu", follows: "Mwaliko rasmi utafuata" };
}

/** A five-petal bloom. A plain function, not a component: Satori does not resolve components inside <svg>. */
function bloom({ rx, ry, stroke, fill, center }: { rx: number; ry: number; stroke: string; fill: string; center?: number }) {
  return (
    <g stroke={stroke} fill={fill}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} cx="0" cy={-ry} rx={rx} ry={ry} transform={`rotate(${angle})`} />
      ))}
      {center ? <circle cx="0" cy="0" r={center} fill={BLOOM_CENTER} stroke="none" /> : null}
    </g>
  );
}

function HeaderFloral({ p }: { p: Palette }) {
  return (
    <svg width={200 * S} height={72 * S} viewBox="0 0 240 90" fill="none" strokeWidth={1.4} strokeLinecap="round">
      <path d="M20 74 C60 66 90 58 120 48 C150 58 180 66 220 74" stroke={p.leafStroke} />
      <path d="M42 70 C36 58 42 48 54 46 C56 58 52 66 42 70Z" stroke={p.leafStroke} fill={p.leafFill} />
      <path d="M198 70 C204 58 198 48 186 46 C184 58 188 66 198 70Z" stroke={p.leafStroke} fill={p.leafFill} />
      <g transform="translate(120 40)">{bloom({ rx: 9, ry: 15, stroke: HOT, fill: "rgba(214,90,18,0.35)", center: 4 })}</g>
      <g transform="translate(86 56) scale(0.6)">{bloom({ rx: 8, ry: 14, stroke: OUTER_BORDER, fill: "rgba(217,123,79,0.3)" })}</g>
      <g transform="translate(156 56) scale(0.6)">{bloom({ rx: 8, ry: 14, stroke: p.bloomStroke, fill: p.bloomFill })}</g>
    </svg>
  );
}

function Sprig({ p, size, style }: { p: Palette; size: number; style?: Record<string, string | number> }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <g transform="translate(110 30)">
        <path d="M-90 90 C-60 60 -30 30 0 0" stroke={p.leafStroke} />
        <path d="M-46 52 C-56 36 -50 24 -34 22 C-32 38 -36 46 -46 52Z" stroke={p.leafStroke} fill={p.leafFill} />
        <path d="M-70 76 C-84 66 -82 52 -66 48 C-62 62 -62 70 -70 76Z" stroke={p.leafStroke} fill={p.leafFill} />
        {bloom({ rx: 10, ry: 17, stroke: HOT, fill: "rgba(214,90,18,0.35)", center: 4.5 })}
      </g>
    </svg>
  );
}

function Pin() {
  return (
    <svg width={20 * S} height={26 * S} viewBox="0 0 20 26">
      <path d="M10 1 C4.5 1 1 5 1 9.6 C1 16 10 25 10 25 C10 25 19 16 19 9.6 C19 5 15.5 1 10 1Z" fill="none" stroke={HOT} strokeWidth={1.8} />
      <circle cx="10" cy="9.6" r="3" fill={HOT} />
    </svg>
  );
}

function Box({ left, top, width, height, children, style }: { left: number; top: number; width?: number; height?: number; children?: ReactNode; style?: Record<string, string | number> }) {
  // Satori parses every style value it is given, so undefined keys are left out entirely.
  return <div style={{ position: "absolute", left, top, ...(width !== undefined ? { width } : {}), ...(height !== undefined ? { height } : {}), display: "flex", ...style }}>{children}</div>;
}

function Text({ children, size, weight = 400, color, family = SANS, style }: { children: ReactNode; size: number; weight?: 400 | 700 | 900; color: string; family?: string; style?: Record<string, string | number> }) {
  return <div style={{ display: "flex", fontFamily: family, fontSize: size, fontWeight: weight, color, textAlign: "center", ...style }}>{children}</div>;
}

/**
 * "Mpendwa {name}," as one centred line, word by word, so a name that still does not fit at the
 * minimum size wraps at a word boundary instead of being cut. Measured sizes keep every name that
 * fits at >= 24px on one line.
 */
function Greeting({ data, p, dear }: { data: SaveTheDateCardData; p: Palette; dear: string }) {
  const nameWords = data.guestName.split(/\s+/).filter(Boolean);
  const words: Array<{ text: string; name: boolean }> = [{ text: dear, name: false }, ...nameWords.map((text) => ({ text, name: true }))];
  const regular = 25 * S;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", columnGap: 0.26 * regular, maxWidth: SAVE_THE_DATE_TEXT_MAX_WIDTH, fontFamily: SANS, lineHeight: data.guestNameWraps ? 1.25 : 1.45 }}>
      {words.map((word, index) => {
        const last = index === words.length - 1;
        return (
          <div key={index} style={{ display: "flex", alignItems: "baseline" }}>
            <span style={word.name ? { fontSize: data.guestNameSize, fontWeight: 900, color: p.accent } : { fontSize: regular, color: p.text }}>{word.text}</span>
            {last ? <span style={{ fontSize: regular, color: p.text }}>,</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function CoupleNames({ data, p }: { data: SaveTheDateCardData; p: Palette }) {
  const style = { fontFamily: SCRIPT, lineHeight: 1.1, whiteSpace: "nowrap" as const };
  if (!data.groomName || !data.brideName) {
    return <Text size={data.namesSize} family={SCRIPT} color={p.text} style={{ lineHeight: 1.1, maxWidth: SAVE_THE_DATE_TEXT_MAX_WIDTH }}>{data.fallbackTitle}</Text>;
  }
  // Groom first, like Gilded Border (the reference HTML shows the bride first; the client chose groom first).
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 18 * S, color: p.text }}>
      <span style={{ ...style, fontSize: data.namesSize }}>{data.groomName}</span>
      <span style={{ ...style, fontSize: data.namesSize * (52 / 64), color: HOT }}>&amp;</span>
      <span style={{ ...style, fontSize: data.namesSize }}>{data.brideName}</span>
    </div>
  );
}

function DateRow({ data, p }: { data: SaveTheDateCardData; p: Palette }) {
  if (!data.dateParts) return <Text size={24 * S} weight={700} color={p.text}>{data.fallbackDate}</Text>;
  const ruled = (value: string) => (
    <div style={{ width: 124 * S, display: "flex", justifyContent: "center", padding: `${7 * S}px 0`, borderTop: `${1.5 * S}px solid ${OUTER_BORDER}`, borderBottom: `${1.5 * S}px solid ${OUTER_BORDER}` }}>
      <Text size={21 * S} weight={700} color={p.text}>{value}</Text>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
      {ruled(data.dateParts.weekday)}
      <Text size={60 * S} weight={900} color={HOT} style={{ lineHeight: 1 }}>{data.dateParts.day}</Text>
      {ruled(data.dateParts.monthYear)}
    </div>
  );
}

function PhotoPrint({ data, p }: { data: SaveTheDateCardData; p: Palette }) {
  const { width, height } = SAVE_THE_DATE_PHOTO_SIZE;
  const tape = { position: "absolute" as const, top: 6 * S, width: 120 * S, height: 30 * S, backgroundColor: "rgba(217,123,79,0.75)" };
  return (
    <Box left={242 * S} top={346 * S} width={416 * S} style={{ padding: 18 * S, backgroundColor: PRINT, borderRadius: 4 * S, transform: "rotate(-2deg)", boxShadow: `0 ${14 * S}px ${30 * S}px ${p.photoShadow}` }}>
      {data.photoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.photoDataUrl} alt="" width={width} height={height} style={{ width, height, objectFit: "cover", objectPosition: "center top" }} />
      ) : (
        // No photo: the print stays, empty, with a sprig in it (client's choice).
        <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f3ece0" }}>
          <Sprig p={PALETTES.cream} size={220 * S} />
        </div>
      )}
      <div style={{ ...tape, left: -26 * S, transform: "rotate(-38deg)" }} />
      <div style={{ ...tape, right: -26 * S, transform: "rotate(38deg)" }} />
    </Box>
  );
}

export default function SaveTheDateCard({ data, variant, texture }: { data: SaveTheDateCardData; variant: SaveTheDateVariant; texture: string }): ReactElement {
  const p = PALETTES[variant];
  const copy = saveTheDateCopy(data.language);
  const width = SAVE_THE_DATE_CARD_WIDTH;
  const height = SAVE_THE_DATE_CARD_HEIGHT;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", overflow: "hidden", color: p.text }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={texture} alt="" width={width} height={height} style={{ position: "absolute", left: 0, top: 0, width, height }} />

      {/* Double frame (reference: 16px / 24px insets), same as the invitation. */}
      <Box left={16 * S} top={16 * S} width={width - 32 * S} height={height - 32 * S} style={{ border: `${1.5 * S}px solid ${OUTER_BORDER}`, borderRadius: 18 * S }} />
      <Box left={24 * S} top={24 * S} width={width - 48 * S} height={height - 48 * S} style={{ border: `${1 * S}px solid ${INNER_BORDER}`, borderRadius: 14 * S }} />

      {/* Header. When the guest name wraps to a second line the block is tightened (starts higher,
          shorter line heights) so the extra line never reaches the photo's tape. */}
      <Box left={0} top={(data.guestNameWraps ? 36 : 52) * S} width={width} style={{ flexDirection: "column", alignItems: "center" }}>
        <HeaderFloral p={p} />
        <Text size={78 * S} family={SCRIPT} color={p.text} style={{ marginTop: 2 * S, lineHeight: data.guestNameWraps ? 0.95 : 1.05 }}>Save the Date</Text>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: (data.guestNameWraps ? 8 : 14) * S }}>
          <Greeting data={data} p={p} dear={copy.dear} />
          <Text size={25 * S} color={p.text} style={{ lineHeight: data.guestNameWraps ? 1.25 : 1.45 }}>{copy.ask}</Text>
        </div>
      </Box>

      <PhotoPrint data={data} p={p} />
      <Sprig p={p} size={140 * S} style={{ position: "absolute", left: 118 * S, top: 744 * S }} />

      {/* Names, date, place */}
      <Box left={0} top={912 * S} width={width} style={{ flexDirection: "column", alignItems: "center", gap: 18 * S }}>
        <CoupleNames data={data} p={p} />
        <DateRow data={data} p={p} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
          <Pin />
          <Text size={24 * S} weight={900} color={p.accent}>{data.venue}</Text>
        </div>
        <Text size={24 * S} family={SCRIPT} color={p.text} style={{ marginTop: 6 * S }}>{copy.follows}</Text>
      </Box>
    </div>
  );
}
