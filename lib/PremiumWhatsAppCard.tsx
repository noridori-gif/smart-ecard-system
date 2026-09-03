import type { ReactElement, ReactNode } from "react";

import { formatPassIdForDisplay } from "./passId";

export type PremiumWhatsAppTemplate =
  | "royal_portrait"
  | "golden_elegance"
  | "botanical_romance"
  | "modern_minimal_photo"
  | "heritage_pattern"
  | "garden_elegance";

export type PremiumWhatsAppCardData = {
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
  language: "sw" | "en";
  coverImageDataUrl: string | null;
  coverImageBannerHeight?: number;
  qrCodeDataUrl: string | null;
  primary: string;
  secondary: string;
  accent: string;
  photoLayout?: "top_banner" | "side_by_side" | "text_only";
};

const DEFAULT_BANNER_HEIGHT = 620;

type Skin =
  | "african"
  | "botanical"
  | "classic"
  | "envelope"
  | "floral"
  | "garden"
  | "gold"
  | "heritage"
  | "letterpress"
  | "midnight"
  | "minimal"
  | "regal";

type Theme = {
  skin: Skin;
  paper: string;
  paperAlt: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  ticket: string;
  shadow: string;
};

const SKIN_BY_TEMPLATE: Record<PremiumWhatsAppTemplate, Skin> = {
  royal_portrait: "classic",
  golden_elegance: "gold",
  botanical_romance: "botanical",
  modern_minimal_photo: "minimal",
  heritage_pattern: "heritage",
  garden_elegance: "garden",
};

const FALLBACK_COLORS = {
  primary: "#145A46",
  secondary: "#FFF8EC",
  accent: "#C9A962",
};

function safeColor(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && /^#[0-9a-f]{6}$/i.test(normalized) ? normalized.toUpperCase() : fallback;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([r, g, b]: [number, number, number]) {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[r, g, b].map(channel => clamp(channel).toString(16).padStart(2, "0")).join("")}`;
}

/** Linear-blends two hex colors; weight is the proportion of colorB (0-1). Satori doesn't support CSS color-mix(), so this is done in plain JS. */
function mixHex(colorA: string, colorB: string, weight: number) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  if (!a || !b) return colorA;

  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex([
    a[0] + (b[0] - a[0]) * w,
    a[1] + (b[1] - a[1]) * w,
    a[2] + (b[2] - a[2]) * w,
  ]);
}

/** Builds the card's colour theme from the organizer's chosen primary/secondary/accent, keeping only the decorative "skin" (shape/layout) tied to the template. */
function buildTheme(data: PremiumWhatsAppCardData, template: PremiumWhatsAppTemplate): Theme {
  const primary = safeColor(data.primary, FALLBACK_COLORS.primary);
  const secondary = safeColor(data.secondary, FALLBACK_COLORS.secondary);
  const accent = safeColor(data.accent, FALLBACK_COLORS.accent);

  return {
    skin: SKIN_BY_TEMPLATE[template] ?? "classic",
    paper: secondary,
    paperAlt: mixHex(secondary, primary, 0.08),
    ink: primary,
    muted: mixHex(primary, secondary, 0.45),
    accent,
    accentSoft: mixHex(accent, secondary, 0.55),
    ticket: mixHex(secondary, primary, 0.05),
    shadow: "rgba(15,23,42,0.18)",
  };
}

export function copy(language: "sw" | "en") {
  return language === "en"
    ? {
        heading: "WEDDING INVITATION",
        weddingOf: "TO THE WEDDING OF",
        date: "DATE",
        ceremony: "CEREMONY",
        reception: "RECEPTION",
        dress: "DRESS CODE",
        status: "STATUS",
        pass: "PREMIUM EVENT PASS",
        passId: "PASS ID",
        instruction: "Present this QR code or Pass ID at the entrance.",
        closing: "Your presence will make this celebration complete.",
      }
    : {
        heading: "MWALIKO WA HARUSI",
        weddingOf: "KATIKA HARUSI YA",
        date: "TAREHE",
        ceremony: "IBADA YA NDOA",
        reception: "UKUMBI WA SHEREHE",
        dress: "RANGI ZA SHEREHE",
        status: "STATUS YA MWALIKO",
        pass: "PREMIUM EVENT PASS",
        passId: "PASS ID",
        instruction: "Onyesha QR au Pass ID hii mlangoni kwa uhakiki.",
        closing: "Uwepo wako utakamilisha furaha ya siku hii.",
      };
}

function statusText(data: PremiumWhatsAppCardData) {
  const count = Number.isFinite(data.allowedGuests)
    ? Math.max(1, Math.floor(data.allowedGuests))
    : 1;

  if (data.language === "en") {
    return count === 1 ? "Single · 1 Person" : count === 2 ? "Double · 2 People" : `Group · ${count} People`;
  }

  return count === 1 ? "Single · Mtu 1" : count === 2 ? "Double · Watu 2" : `Group · Watu ${count}`;
}

function responsiveSize(value: string, large: number, medium: number, small: number) {
  if (value.length > 48) return small;
  if (value.length > 28) return medium;
  return large;
}

function messageSize(value: string) {
  if (value.length > 420) return 17;
  if (value.length > 300) return 20;
  if (value.length > 200) return 23;
  if (value.length > 120) return 26;
  return 29;
}

function initials(value: string) {
  return value
    .split(/\s*&\s*|\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(" & ");
}

function Label({ children, theme }: { children: ReactNode; theme: Theme }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Arial, sans-serif",
        fontSize: 15,
        fontWeight: 800,
        letterSpacing: 4,
        color: theme.accent,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function DiamondOrnament({ theme, width = 105 }: { theme: Theme; width?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ width, height: 1, display: "flex", backgroundColor: theme.accent }} />
      <div
        style={{
          width: 10,
          height: 10,
          display: "flex",
          margin: "0 14px",
          border: `2px solid ${theme.accent}`,
          transform: "rotate(45deg)",
        }}
      />
      <div style={{ width, height: 1, display: "flex", backgroundColor: theme.accent }} />
    </div>
  );
}

function BotanicalLeaves({ theme }: { theme: Theme }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((leaf) => (
        <div
          key={`botanical-left-${leaf}`}
          style={{
            position: "absolute",
            left: -18 + leaf * 22,
            top: 150 + leaf * 45,
            width: 76,
            height: 34,
            display: "flex",
            borderRadius: leaf % 2 ? "0 100% 0 100%" : "100% 0 100% 0",
            backgroundColor: leaf % 2 ? "#B9C8AD" : "#D5DECA",
            border: `1px solid ${theme.ink}`,
            transform: `rotate(${-35 + leaf * 12}deg)`,
            opacity: 0.32,
          }}
        />
      ))}
      {[0, 1, 2, 3].map((leaf) => (
        <div
          key={`botanical-right-${leaf}`}
          style={{
            position: "absolute",
            right: -10 + leaf * 23,
            bottom: 115 + leaf * 48,
            width: 82,
            height: 36,
            display: "flex",
            borderRadius: leaf % 2 ? "100% 0 100% 0" : "0 100% 0 100%",
            backgroundColor: leaf % 2 ? "#CDD9C2" : "#AFC0A3",
            border: `1px solid ${theme.ink}`,
            transform: `rotate(${20 - leaf * 11}deg)`,
            opacity: 0.3,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          right: -180,
          top: 490,
          width: 480,
          height: 480,
          display: "flex",
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(183,200,171,0.34), rgba(183,200,171,0))",
        }}
      />
    </>
  );
}

function FloralCorners({ theme }: { theme: Theme }) {
  return (
    <>
      {[
        { left: -55, top: -45, size: 230, color: "#EBC9C2" },
        { left: 70, top: 8, size: 135, color: "#F1DAD5" },
        { right: -65, bottom: -65, size: 250, color: "#E5B9B2" },
        { right: 90, bottom: 25, size: 125, color: "#F2D6D1" },
      ].map((flower, index) => (
        <div
          key={`flower-${index}`}
          style={{
            position: "absolute",
            ...flower,
            width: flower.size,
            height: flower.size,
            display: "flex",
            borderRadius: 999,
            backgroundColor: flower.color,
            border: `1px solid ${theme.accentSoft}`,
            boxShadow: `inset 0 0 0 ${Math.round(flower.size / 4)}px rgba(255,255,255,0.3)`,
            opacity: 0.28,
          }}
        />
      ))}
    </>
  );
}

function AfricanBands({ theme }: { theme: Theme }) {
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 20, height: 32, display: "flex", backgroundColor: theme.ink, opacity: 0.94 }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, height: 32, display: "flex", backgroundColor: theme.ink, opacity: 0.94 }} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((item) => (
        <div
          key={`african-${item}`}
          style={{
            position: "absolute",
            left: 33 + item * 88,
            top: 25,
            width: 20,
            height: 20,
            display: "flex",
            border: `3px solid ${theme.accent}`,
            transform: "rotate(45deg)",
          }}
        />
      ))}
    </>
  );
}

// Garden Elegance's fixed decorative palette (deep forest green leaves, deep
// red berry accents, blush pink blooms) -- independent of the organizer's
// chosen theme.primary/secondary/accent, same as BotanicalLeaves/FloralCorners
// hardcode their own decorative shades regardless of theme.
const GARDEN_FOREST_DARK = "#1B4332";
const GARDEN_FOREST_MID = "#2D6A4F";
const GARDEN_FOREST_LIGHT = "#74C69D";
const GARDEN_BERRY = "#7A0C0C";
const GARDEN_BLUSH_DEEP = "#E8B4B8";

// Satori bug discovered while building this motif, out of scope to fix at
// the shared-code level here (flagged separately to the user): inside this
// card's nested position:relative structure (PhotoBanner -> content, both
// relative, content is a flexDirection:column/alignItems:center flex child),
// an absolutely-positioned element's horizontal (left/right) offset is
// silently ignored -- it always renders flex-centered regardless of the
// value given, while its vertical (top) offset IS respected. Confirmed via
// isolated rendering that this ALSO already breaks BotanicalLeaves (used by
// the live botanical_romance template) whenever it has no cover photo of a
// height that pushes leaves out of the affected region -- not something new
// introduced here. Corner-anchored asymmetric shapes (leaf sprays, off-center
// blooms) are therefore not reliably achievable via position:absolute in
// this container, so this motif uses only: (a) centered position:absolute
// frames via the single-number `inset` shorthand, which IS reliably
// respected (proven by every other skin's border frames), and (b) a normal
// document-flow sprig row, which needs no absolute positioning at all.
function GardenSprig() {
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 22 }}>
      <div style={{ width: 46, height: 20, display: "flex", borderRadius: "100% 0% 100% 0%", backgroundColor: GARDEN_FOREST_LIGHT, border: `1px solid ${GARDEN_FOREST_DARK}` }} />
      <div style={{ width: 30, height: 26, display: "flex", margin: "0 6px", borderRadius: "0% 100% 0% 100%", backgroundColor: GARDEN_FOREST_MID, border: `1px solid ${GARDEN_FOREST_DARK}` }} />
      <div style={{ width: 12, height: 12, display: "flex", margin: "0 8px", borderRadius: 999, backgroundColor: GARDEN_BERRY }} />
      <div style={{ width: 30, height: 26, display: "flex", margin: "0 6px", borderRadius: "100% 0% 100% 0%", backgroundColor: GARDEN_FOREST_MID, border: `1px solid ${GARDEN_FOREST_DARK}` }} />
      <div style={{ width: 46, height: 20, display: "flex", borderRadius: "0% 100% 0% 100%", backgroundColor: GARDEN_FOREST_LIGHT, border: `1px solid ${GARDEN_FOREST_DARK}` }} />
    </div>
  );
}

function GardenMotif() {
  return (
    <>
      <div style={{ position: "absolute", inset: 26, display: "flex", border: `2px solid ${GARDEN_FOREST_DARK}` }} />
      <div style={{ position: "absolute", inset: 38, display: "flex", border: `1px solid ${GARDEN_BLUSH_DEEP}` }} />
      <GardenSprig />
    </>
  );
}

function TemplateAtmosphere({ theme, title, hasBanner = true }: { theme: Theme; title: string; hasBanner?: boolean }) {
  if (theme.skin === "botanical") return <BotanicalLeaves theme={theme} />;
  if (theme.skin === "floral") return <FloralCorners theme={theme} />;
  if (theme.skin === "african") return <AfricanBands theme={theme} />;
  if (theme.skin === "garden") return <GardenMotif />;

  if (theme.skin === "envelope") {
    return (
      <>
        <div style={{ position: "absolute", left: -100, right: 540, top: -180, height: 510, display: "flex", borderBottom: `2px solid ${theme.accentSoft}`, backgroundColor: theme.paperAlt, transform: "rotate(19deg)", opacity: 0.52 }} />
        <div style={{ position: "absolute", left: 540, right: -100, top: -180, height: 510, display: "flex", borderBottom: `2px solid ${theme.accentSoft}`, backgroundColor: theme.paperAlt, transform: "rotate(-19deg)", opacity: 0.52 }} />
        <div style={{ position: "absolute", left: 487, top: 106, width: 106, height: 106, display: "flex", borderRadius: 999, backgroundColor: theme.accent, border: `8px solid ${theme.paper}`, boxShadow: `0 12px 24px ${theme.shadow}` }} />
      </>
    );
  }

  if (theme.skin === "heritage") {
    return (
      <>
        <div style={{ position: "absolute", right: -10, top: 290, display: "flex", fontFamily: "Georgia, serif", fontSize: 340, lineHeight: 1, fontWeight: 700, fontStyle: "italic", color: theme.accent, opacity: 0.075 }}>
          {initials(title) || "S E"}
        </div>
        <div style={{ position: "absolute", inset: 34, display: "flex", border: `2px solid ${theme.accent}` }} />
        <div style={{ position: "absolute", inset: 46, display: "flex", border: `1px solid ${theme.accentSoft}` }} />
      </>
    );
  }

  if (theme.skin === "letterpress") {
    return (
      <>
        <div style={{ position: "absolute", inset: 27, display: "flex", border: `5px solid ${theme.ink}`, opacity: 0.78 }} />
        <div style={{ position: "absolute", inset: 43, display: "flex", border: `1px solid ${theme.accent}` }} />
        {[0, 1, 2, 3, 4, 5].map((dot) => (
          <div key={dot} style={{ position: "absolute", left: 90 + dot * 178, bottom: 74, width: 5, height: 5, display: "flex", borderRadius: 9, backgroundColor: theme.ink, opacity: 0.35 }} />
        ))}
      </>
    );
  }

  if (theme.skin === "gold") {
    return (
      <>
        <div style={{ position: "absolute", inset: 24, display: "flex", border: `4px solid ${theme.accent}` }} />
        <div style={{ position: "absolute", inset: 38, display: "flex", border: `1px solid ${theme.accent}` }} />
        {hasBanner && (
          <div style={{ position: "absolute", left: 330, top: -250, width: 420, height: 540, display: "flex", border: `2px solid ${theme.accent}`, borderRadius: "210px 210px 0 0", opacity: 0.34 }} />
        )}
      </>
    );
  }

  if (theme.skin === "midnight" || theme.skin === "regal") {
    return (
      <>
        <div style={{ position: "absolute", inset: 30, display: "flex", border: `1px solid ${theme.accent}` }} />
        <div style={{ position: "absolute", left: 45, top: 45, width: 110, height: 110, display: "flex", borderTop: `4px solid ${theme.accent}`, borderLeft: `4px solid ${theme.accent}` }} />
        <div style={{ position: "absolute", right: 45, bottom: 45, width: 110, height: 110, display: "flex", borderRight: `4px solid ${theme.accent}`, borderBottom: `4px solid ${theme.accent}` }} />
        <div style={{ position: "absolute", right: -210, top: 300, width: 620, height: 620, display: "flex", borderRadius: 999, border: `1px solid ${theme.accent}`, opacity: 0.12 }} />
        <div style={{ position: "absolute", right: -140, top: 370, width: 480, height: 480, display: "flex", borderRadius: 999, border: `1px solid ${theme.accent}`, opacity: 0.09 }} />
      </>
    );
  }

  if (theme.skin === "classic") {
    return (
      <>
        <div style={{ position: "absolute", inset: 27, display: "flex", border: `3px solid ${theme.accent}` }} />
        <div style={{ position: "absolute", inset: 39, display: "flex", border: `1px solid ${theme.accentSoft}` }} />
      </>
    );
  }

  return (
    <>
      <div style={{ position: "absolute", left: 54, right: 54, top: 44, height: 1, display: "flex", backgroundColor: theme.accentSoft }} />
      <div style={{ position: "absolute", left: 54, right: 54, bottom: 44, height: 1, display: "flex", backgroundColor: theme.accentSoft }} />
    </>
  );
}

function InvitationTop({ data, theme, compact = false }: { data: PremiumWhatsAppCardData; theme: Theme; compact?: boolean }) {
  const text = copy(data.language);

  return (
    <div style={{ width: "100%", minHeight: 210, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: compact ? "24px 7% 10px" : "24px 90px 10px", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 5, color: theme.muted }}>
        <div style={{ width: 34, height: 1, display: "flex", marginRight: 14, backgroundColor: theme.accent }} />
        SMART EVENT PASS
        <div style={{ width: 34, height: 1, display: "flex", marginLeft: 14, backgroundColor: theme.accent }} />
      </div>
      <div style={{ display: "flex", marginTop: 14 }}>
        <DiamondOrnament theme={theme} width={50} />
      </div>
      <div style={{ display: "flex", marginTop: 14, fontFamily: "Georgia, serif", fontSize: 52, lineHeight: 1, fontWeight: 700, letterSpacing: 1.2, color: theme.ink }}>
        {text.heading}
      </div>
      <div
        style={{
          maxWidth: 865,
          display: "flex",
          marginTop: 16,
          whiteSpace: "pre-wrap",
          fontFamily: "Georgia, serif",
          fontSize: messageSize(data.invitationMessage),
          lineHeight: 1.34,
          fontStyle: "italic",
          color: theme.muted,
          textAlign: "center",
        }}
      >
        {data.invitationMessage}
      </div>
    </div>
  );
}

function PhotoBanner({ data, theme }: { data: PremiumWhatsAppCardData; theme: Theme }) {
  const bannerHeight = data.coverImageBannerHeight ?? DEFAULT_BANNER_HEIGHT;

  return (
    <div style={{ width: 1080, height: bannerHeight, position: "relative", display: "flex", overflow: "hidden" }}>
      {data.coverImageDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.coverImageDataUrl} alt="" width={1080} height={bannerHeight} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: theme.paperAlt, color: theme.ink }}>
          <div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 84, lineHeight: 1, fontWeight: 700, fontStyle: "italic" }}>
            {initials(data.title) || "S & E"}
          </div>
          <div style={{ width: 130, height: 1, display: "flex", marginTop: 26, backgroundColor: theme.accent }} />
          <div style={{ display: "flex", marginTop: 20, fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 5, color: theme.accent }}>
            TOGETHER
          </div>
        </div>
      )}
    </div>
  );
}

function GuestAndTitle({ data, theme, compact = false }: { data: PremiumWhatsAppCardData; theme: Theme; compact?: boolean }) {
  const text = copy(data.language);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: compact ? "12px 6% 6px" : "12px 70px 6px", textAlign: "center" }}>
      <div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: responsiveSize(data.guestName, 46, 40, 34), lineHeight: 1.04, fontWeight: 700, color: theme.ink, textAlign: "center" }}>
        {data.guestName}
      </div>
      <div style={{ width: 180, height: 1, display: "flex", marginTop: 14, backgroundColor: theme.accent }} />
      <div style={{ display: "flex", marginTop: 14 }}>
        <Label theme={theme}>{text.weddingOf}</Label>
      </div>
      <div style={{ maxWidth: 780, display: "flex", marginTop: 8, fontFamily: "Georgia, serif", fontSize: responsiveSize(data.title, 40, 36, 30), lineHeight: 1.06, fontWeight: 700, fontStyle: "italic", color: theme.ink, textAlign: "center" }}>
        {data.title}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  secondary,
  theme,
  featured = false,
}: {
  label: string;
  value: string;
  secondary?: string;
  theme: Theme;
  featured?: boolean;
}) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4px 18px", textAlign: "center" }}>
      <Label theme={theme}>{label}</Label>
      <div style={{ maxWidth: 420, display: "flex", marginTop: 7, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", fontSize: featured ? 40 : 25, lineHeight: 1.12, fontWeight: 700, color: theme.ink, textAlign: "center" }}>
        {value || "—"}
      </div>
      {secondary && (
        <div style={{ maxWidth: 420, display: "flex", marginTop: 4, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", fontSize: 19, lineHeight: 1.15, color: theme.muted, textAlign: "center" }}>
          {secondary}
        </div>
      )}
    </div>
  );
}

function EventDetails({ data, theme, compact = false }: { data: PremiumWhatsAppCardData; theme: Theme; compact?: boolean }) {
  const text = copy(data.language);
  const ceremonyTime = data.ceremonyTime || data.eventTime;
  const ceremonyVenue = data.ceremonyVenue;
  const receptionVenue = data.receptionVenue || data.venue;

  return (
    <div style={{ width: compact ? "94%" : 920, height: compact ? 410 : 350, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 16px", borderTop: `1px solid ${theme.accentSoft}`, borderBottom: `1px solid ${theme.accentSoft}` }}>
      <Detail label={text.date} value={data.date} theme={theme} featured />
      <div style={{ width: "100%", display: "flex", alignItems: "stretch" }}>
        <div style={{ width: "50%", display: "flex" }}>
          <Detail label={data.ceremonyTitle || text.ceremony} value={ceremonyTime} secondary={ceremonyVenue} theme={theme} />
        </div>
        <div style={{ width: 1, display: "flex", backgroundColor: theme.accentSoft }} />
        <div style={{ width: "50%", display: "flex" }}>
          <Detail label={text.reception} value={receptionVenue} theme={theme} />
        </div>
      </div>
      <div style={{ width: "72%", display: "flex", paddingTop: 10, borderTop: `1px solid ${theme.accentSoft}` }}>
        <div style={{ width: "50%", display: "flex" }}>
          <Detail label={text.dress} value={data.dressCode || "—"} theme={theme} />
        </div>
        <div style={{ width: 1, display: "flex", backgroundColor: theme.accentSoft }} />
        <div style={{ width: "50%", display: "flex" }}>
          <Detail label={text.status} value={statusText(data)} theme={theme} />
        </div>
      </div>
    </div>
  );
}

function PassTicket({ data, theme, compact = false }: { data: PremiumWhatsAppCardData; theme: Theme; compact?: boolean }) {
  const text = copy(data.language);
  const passId = data.eventPassId ? formatPassIdForDisplay(data.eventPassId) : "—";
  const qrSize = compact ? 175 : 225;

  return (
    <div style={{ width: compact ? "94%" : 920, display: "flex", alignItems: "center", marginTop: 14, paddingTop: 18, borderTop: `1px solid ${theme.accentSoft}` }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: compact ? 18 : 34 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 11, height: 11, display: "flex", marginRight: 14, border: `3px solid ${theme.accent}`, transform: "rotate(45deg)" }} />
          <Label theme={theme}>{text.pass}</Label>
        </div>
        <div style={{ display: "flex", marginTop: 16 }}>
          <Label theme={theme}>{text.passId}</Label>
        </div>
        <div style={{ display: "flex", marginTop: 6, fontFamily: "Georgia, serif", fontSize: passId.length > 16 ? (compact ? 30 : 38) : (compact ? 38 : 48), lineHeight: 1, fontWeight: 700, letterSpacing: 1, color: theme.ink }}>
          {passId}
        </div>
        <div style={{ maxWidth: compact ? 320 : 480, display: "flex", marginTop: 14, fontFamily: "Georgia, serif", fontSize: compact ? 15 : 18, lineHeight: 1.25, fontStyle: "italic", color: theme.muted }}>
          {text.instruction}
        </div>
      </div>
      <div style={{ width: 1, height: 240, display: "flex", backgroundColor: theme.accentSoft }} />
      <div style={{ width: qrSize + (compact ? 36 : 74), display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: compact ? 18 : 34 }}>
        {data.qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.qrCodeDataUrl} alt="" width={qrSize} height={qrSize} style={{ width: qrSize, height: qrSize, objectFit: "contain" }} />
        ) : (
          <div style={{ width: qrSize - 20, height: qrSize - 20, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${theme.accentSoft}`, fontFamily: "Arial, sans-serif", fontSize: 24, fontWeight: 900, color: theme.ink }}>
            QR
          </div>
        )}
      </div>
    </div>
  );
}

function ClosingDivider({ theme, text, compact = false }: { theme: Theme; text: string; compact?: boolean }) {
  return (
    <div style={{ width: compact ? "88%" : 620, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 14 }}>
      <div style={{ flex: 1, height: 1, display: "flex", backgroundColor: theme.accentSoft }} />
      <div style={{ maxWidth: compact ? 320 : 430, display: "flex", margin: compact ? "0 14px" : "0 22px", fontFamily: "Georgia, serif", fontSize: compact ? 14 : 16, lineHeight: 1.2, fontStyle: "italic", color: theme.muted, textAlign: "center" }}>
        {text}
      </div>
      <div style={{ flex: 1, height: 1, display: "flex", backgroundColor: theme.accentSoft }} />
    </div>
  );
}

function SidePhoto({ data, theme, width }: { data: PremiumWhatsAppCardData; theme: Theme; width: number }) {
  return (
    <div style={{ width, height: "100%", position: "relative", display: "flex", overflow: "hidden" }}>
      {data.coverImageDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.coverImageDataUrl} alt="" width={width} height={1180} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: theme.paperAlt, color: theme.ink }}>
          <div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 56, lineHeight: 1, fontWeight: 700, fontStyle: "italic" }}>
            {initials(data.title) || "S & E"}
          </div>
          <div style={{ width: 90, height: 1, display: "flex", marginTop: 20, backgroundColor: theme.accent }} />
        </div>
      )}
    </div>
  );
}

const SIDE_PHOTO_WIDTH = 400;
const SIDE_BY_SIDE_HEIGHT = 1500;
const TEXT_ONLY_HEIGHT = 1180;

export default function PremiumWhatsAppCard({
  data,
  template,
}: {
  data: PremiumWhatsAppCardData;
  template: PremiumWhatsAppTemplate;
}): ReactElement {
  const theme = buildTheme(data, template);
  const text = copy(data.language);
  const photoLayout = data.photoLayout ?? "top_banner";

  if (photoLayout === "side_by_side") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", overflow: "hidden", backgroundColor: theme.paper, color: theme.ink }}>
        <SidePhoto data={data} theme={theme} width={SIDE_PHOTO_WIDTH} />
        <div style={{ width: 1080 - SIDE_PHOTO_WIDTH, height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" }}>
          <TemplateAtmosphere theme={theme} title={data.title} hasBanner={false} />
          <InvitationTop data={data} theme={theme} compact />
          <GuestAndTitle data={data} theme={theme} compact />
          <EventDetails data={data} theme={theme} compact />
          <PassTicket data={data} theme={theme} compact />
          <ClosingDivider theme={theme} text={text.closing} compact />
        </div>
      </div>
    );
  }

  if (photoLayout === "text_only") {
    return (
      <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", backgroundColor: theme.paper, color: theme.ink }}>
        <TemplateAtmosphere theme={theme} title={data.title} hasBanner={false} />
        <InvitationTop data={data} theme={theme} />
        <GuestAndTitle data={data} theme={theme} />
        <EventDetails data={data} theme={theme} />
        <PassTicket data={data} theme={theme} />
        <ClosingDivider theme={theme} text={text.closing} />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", backgroundColor: theme.paper, color: theme.ink }}>
      <PhotoBanner data={data} theme={theme} />
      <div style={{ width: "100%", height: 1180, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" }}>
        <TemplateAtmosphere theme={theme} title={data.title} />
        <InvitationTop data={data} theme={theme} />
        <GuestAndTitle data={data} theme={theme} />
        <EventDetails data={data} theme={theme} />
        <PassTicket data={data} theme={theme} />
        <ClosingDivider theme={theme} text={text.closing} />
      </div>
    </div>
  );
}

export function whatsAppCardTotalHeight(photoLayout: PremiumWhatsAppCardData["photoLayout"], bannerHeight: number) {
  if (photoLayout === "side_by_side") return SIDE_BY_SIDE_HEIGHT;
  if (photoLayout === "text_only") return TEXT_ONLY_HEIGHT;
  return bannerHeight + TEXT_ONLY_HEIGHT;
}

export function CompactHorizontalCard({ data }: { data: PremiumWhatsAppCardData }): ReactElement {
  const theme = buildTheme(data, "botanical_romance");
  const text = copy(data.language);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", padding: 26, backgroundColor: theme.paper, color: theme.ink, border: `10px solid ${theme.ink}` }}>
      <div style={{ width: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: `1px solid ${theme.accent}` }}>
        <DiamondOrnament theme={theme} width={38} />
        <div style={{ display: "flex", marginTop: 18, fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: 2.2 }}>SMART EVENT PASS</div>
        <div style={{ display: "flex", marginTop: 13, fontFamily: "Georgia, serif", fontSize: 20, fontStyle: "italic", color: theme.muted }}>{text.pass}</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px" }}>
        <Label theme={theme}>{text.weddingOf}</Label>
        <div style={{ display: "flex", marginTop: 6, fontFamily: "Georgia, serif", fontSize: 38, lineHeight: 1, fontWeight: 700, fontStyle: "italic" }}>{data.title}</div>
        <div style={{ display: "flex", marginTop: 13, fontFamily: "Georgia, serif", fontSize: 23, color: theme.muted }}>{data.guestName}</div>
        <div style={{ display: "flex", marginTop: 17, paddingTop: 13, borderTop: `1px solid ${theme.accent}`, fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 700 }}>
          {data.date} · {data.eventTime || data.venue} · {statusText(data)}
        </div>
        <div style={{ display: "flex", marginTop: 10, fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 700 }}>{data.eventPassId ? formatPassIdForDisplay(data.eventPassId) : "—"}</div>
      </div>
      <div style={{ width: 205, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderLeft: `2px dashed ${theme.accent}` }}>
        {data.qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.qrCodeDataUrl} alt="" width={166} height={166} style={{ width: 166, height: 166, objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontWeight: 900 }}>QR</div>
        )}
      </div>
    </div>
  );
}
