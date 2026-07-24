import type { ReactElement } from "react";

export type PremiumWhatsAppTemplate =
  | "african_royal"
  | "chateau_letterpress"
  | "classic_photo"
  | "elegant_gold"
  | "emerald_botanical_halo"
  | "heritage_monogram"
  | "modern_floral"
  | "luxury_envelope"
  | "minimal_ivory"
  | "midnight_luxe"
  | "royal_dark";

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
  qrCodeDataUrl: string | null;
  primary: string;
  secondary: string;
  accent: string;
};

type V3Skin =
  | "african"
  | "botanical"
  | "classic"
  | "envelope"
  | "floral"
  | "gold"
  | "heritage"
  | "letterpress"
  | "midnight"
  | "minimal"
  | "regal";

type V3Theme = {
  skin: V3Skin;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  ticket: string;
  ticketInk: string;
  frameWidth: number;
};

const V3_THEMES: Record<PremiumWhatsAppTemplate, V3Theme> = {
  emerald_botanical_halo: {
    skin: "botanical",
    paper: "#FBF6E8",
    ink: "#174C3B",
    muted: "#65776C",
    accent: "#B79245",
    accentSoft: "#DCCEA5",
    ticket: "#EEF2E7",
    ticketInk: "#153F32",
    frameWidth: 2,
  },
  modern_floral: {
    skin: "floral",
    paper: "#FFF6F2",
    ink: "#8A4655",
    muted: "#956F76",
    accent: "#BD806F",
    accentSoft: "#E7C7BE",
    ticket: "#FCEBE7",
    ticketInk: "#713B47",
    frameWidth: 1,
  },
  midnight_luxe: {
    skin: "midnight",
    paper: "#07162E",
    ink: "#FFF8E9",
    muted: "#C9C2B3",
    accent: "#D4AE62",
    accentSoft: "#806C42",
    ticket: "#102442",
    ticketInk: "#FFF9EC",
    frameWidth: 2,
  },
  royal_dark: {
    skin: "regal",
    paper: "#081D48",
    ink: "#FFF9E8",
    muted: "#D3CCBB",
    accent: "#D8B45E",
    accentSoft: "#796A43",
    ticket: "#102B5C",
    ticketInk: "#FFF9E8",
    frameWidth: 3,
  },
  elegant_gold: {
    skin: "gold",
    paper: "#FFF9ED",
    ink: "#43351F",
    muted: "#786B56",
    accent: "#B68A3D",
    accentSoft: "#DCC89D",
    ticket: "#F9EED8",
    ticketInk: "#43351F",
    frameWidth: 2,
  },
  chateau_letterpress: {
    skin: "letterpress",
    paper: "#F1E4CD",
    ink: "#463B2E",
    muted: "#756858",
    accent: "#92764C",
    accentSoft: "#CBB995",
    ticket: "#E8D5B6",
    ticketInk: "#463B2E",
    frameWidth: 4,
  },
  luxury_envelope: {
    skin: "envelope",
    paper: "#FFF8E9",
    ink: "#503B24",
    muted: "#806D55",
    accent: "#B58A48",
    accentSoft: "#DDC9A2",
    ticket: "#F7E7CC",
    ticketInk: "#503B24",
    frameWidth: 2,
  },
  heritage_monogram: {
    skin: "heritage",
    paper: "#FAF1DF",
    ink: "#722F3A",
    muted: "#816267",
    accent: "#AD8745",
    accentSoft: "#D5BE91",
    ticket: "#F1E0CF",
    ticketInk: "#602832",
    frameWidth: 2,
  },
  african_royal: {
    skin: "african",
    paper: "#F5E5C7",
    ink: "#633923",
    muted: "#7B604C",
    accent: "#B0782F",
    accentSoft: "#D1AA6B",
    ticket: "#EBD4AD",
    ticketInk: "#57311F",
    frameWidth: 3,
  },
  minimal_ivory: {
    skin: "minimal",
    paper: "#FFFCF5",
    ink: "#2E302E",
    muted: "#72736F",
    accent: "#B09762",
    accentSoft: "#D8CDB5",
    ticket: "#F4F0E7",
    ticketInk: "#2E302E",
    frameWidth: 1,
  },
  classic_photo: {
    skin: "classic",
    paper: "#FFFDF8",
    ink: "#173653",
    muted: "#64717D",
    accent: "#A98A4D",
    accentSoft: "#D4C49F",
    ticket: "#F0F1EE",
    ticketInk: "#173653",
    frameWidth: 3,
  },
};

function getV3Theme(template: PremiumWhatsAppTemplate) {
  return V3_THEMES[template] ?? V3_THEMES.classic_photo;
}

function v3Copy(language: "sw" | "en") {
  return language === "en"
    ? {
        heading: "WEDDING INVITATION",
        weddingOf: "TO THE WEDDING OF",
        date: "DATE",
        ceremony: "WEDDING CEREMONY",
        reception: "RECEPTION",
        dress: "DRESS CODE",
        status: "INVITATION STATUS",
        verified: "VERIFIED EVENT PASS",
        passId: "ENTRY PASS ID",
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
        verified: "VERIFIED EVENT PASS",
        passId: "PASS ID YA KUINGIA",
        instruction: "Onyesha QR au Pass ID hii mlangoni kwa uhakiki.",
        closing: "Uwepo wako utakamilisha furaha ya siku hii.",
      };
}

function v3StatusText(data: PremiumWhatsAppCardData) {
  const count = Number.isFinite(data.allowedGuests)
    ? Math.max(1, Math.floor(data.allowedGuests))
    : 1;

  if (data.language === "en") {
    if (count === 1) return "Single · 1 Person";
    if (count === 2) return "Double · 2 People";
    return `Group · ${count} People`;
  }

  if (count === 1) return "Single · Mtu 1";
  if (count === 2) return "Double · Watu 2";
  return `Group · Watu ${count}`;
}

function heroSize(value: string, short: number, medium: number, long: number) {
  if (value.length > 48) return long;
  if (value.length > 29) return medium;
  return short;
}

function invitationMessageSize(value: string) {
  if (value.length > 155) return 25;
  if (value.length > 90) return 28;
  return 31;
}

function V3Frame({ theme }: { theme: V3Theme }) {
  const doubleFrame =
    theme.skin === "letterpress" ||
    theme.skin === "regal" ||
    theme.skin === "classic";

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 24,
          display: "flex",
          border: `${theme.frameWidth}px solid ${theme.accent}`,
          opacity: theme.skin === "minimal" ? 0.56 : 0.9,
        }}
      />
      {doubleFrame && (
        <div
          style={{
            position: "absolute",
            inset: theme.skin === "letterpress" ? 36 : 34,
            display: "flex",
            border: `1px solid ${theme.accent}`,
            opacity: 0.55,
          }}
        />
      )}
    </>
  );
}

function V3CornerOrnaments({ theme }: { theme: V3Theme }) {
  if (theme.skin === "minimal") return null;

  if (theme.skin === "botanical") {
    return (
      <>
        {[0, 1, 2, 3].map((index) => (
          <div
            key={`leaf-left-${index}`}
            style={{
              position: "absolute",
              left: 30 + index * 18,
              top: 52 + index * 27,
              width: 28,
              height: 60,
              display: "flex",
              border: `2px solid ${theme.ink}`,
              borderRadius: "100% 0 100% 0",
              transform: `rotate(${-36 + index * 15}deg)`,
              opacity: 0.34,
            }}
          />
        ))}
        {[0, 1, 2].map((index) => (
          <div
            key={`leaf-right-${index}`}
            style={{
              position: "absolute",
              right: 34 + index * 20,
              bottom: 58 + index * 29,
              width: 30,
              height: 64,
              display: "flex",
              border: `2px solid ${theme.ink}`,
              borderRadius: "0 100% 0 100%",
              transform: `rotate(${-22 + index * 17}deg)`,
              opacity: 0.3,
            }}
          />
        ))}
      </>
    );
  }

  if (theme.skin === "floral") {
    return (
      <>
        {[0, 1, 2].map((index) => (
          <div
            key={`flower-${index}`}
            style={{
              position: "absolute",
              right: 32 + index * 27,
              top: 34 + index * 23,
              width: 50 - index * 7,
              height: 50 - index * 7,
              display: "flex",
              border: `2px solid ${theme.accent}`,
              borderRadius: 99,
              opacity: 0.4,
            }}
          />
        ))}
        <div style={{ position: "absolute", left: 28, bottom: 28, width: 130, height: 130, display: "flex", borderTop: `2px solid ${theme.accent}`, borderRadius: 99, transform: "rotate(32deg)", opacity: 0.3 }} />
      </>
    );
  }

  if (theme.skin === "envelope") {
    return (
      <>
        <div style={{ position: "absolute", left: 25, right: 540, top: 25, height: 205, display: "flex", borderBottom: `1px solid ${theme.accent}`, transform: "rotate(21deg)", opacity: 0.24 }} />
        <div style={{ position: "absolute", left: 540, right: 25, top: 25, height: 205, display: "flex", borderBottom: `1px solid ${theme.accent}`, transform: "rotate(-21deg)", opacity: 0.24 }} />
      </>
    );
  }

  if (theme.skin === "african") {
    return (
      <>
        {[0, 1, 2, 3].map((index) => (
          <div
            key={`african-${index}`}
            style={{
              position: "absolute",
              left: 31 + index * 27,
              top: 31,
              width: 19,
              height: 19,
              display: "flex",
              border: `2px solid ${theme.accent}`,
              transform: "rotate(45deg)",
              opacity: index % 2 === 0 ? 0.8 : 0.38,
            }}
          />
        ))}
        {[0, 1, 2, 3].map((index) => (
          <div
            key={`african-bottom-${index}`}
            style={{
              position: "absolute",
              right: 31 + index * 27,
              bottom: 31,
              width: 19,
              height: 19,
              display: "flex",
              border: `2px solid ${theme.accent}`,
              transform: "rotate(45deg)",
              opacity: index % 2 === 0 ? 0.8 : 0.38,
            }}
          />
        ))}
      </>
    );
  }

  if (theme.skin === "regal" || theme.skin === "midnight") {
    return (
      <>
        <div style={{ position: "absolute", left: 44, top: 44, width: 82, height: 82, display: "flex", borderTop: `3px solid ${theme.accent}`, borderLeft: `3px solid ${theme.accent}` }} />
        <div style={{ position: "absolute", right: 44, bottom: 44, width: 82, height: 82, display: "flex", borderRight: `3px solid ${theme.accent}`, borderBottom: `3px solid ${theme.accent}` }} />
      </>
    );
  }

  return (
    <>
      <div style={{ position: "absolute", left: 35, top: 35, width: 42, height: 42, display: "flex", border: `1px solid ${theme.accent}`, transform: "rotate(45deg)", opacity: 0.55 }} />
      <div style={{ position: "absolute", right: 35, bottom: 35, width: 42, height: 42, display: "flex", border: `1px solid ${theme.accent}`, transform: "rotate(45deg)", opacity: 0.55 }} />
    </>
  );
}

function V3Ornament({ theme, wide = false }: { theme: V3Theme; wide?: boolean }) {
  const lineWidth = wide ? 138 : 72;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: lineWidth, height: 1, display: "flex", backgroundColor: theme.accent }} />
      <div style={{ width: 9, height: 9, display: "flex", margin: "0 13px", border: `2px solid ${theme.accent}`, transform: "rotate(45deg)" }} />
      <div style={{ width: lineWidth, height: 1, display: "flex", backgroundColor: theme.accent }} />
    </div>
  );
}

function V3BrandHeader({ theme }: { theme: V3Theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", fontFamily: "Arial, sans-serif", fontSize: 20, fontWeight: 900, letterSpacing: 4.5, color: theme.ink }}>
      <div style={{ width: 40, height: 1, display: "flex", marginRight: 16, backgroundColor: theme.accent }} />
      SMART EVENT PASS
      <div style={{ width: 40, height: 1, display: "flex", marginLeft: 16, backgroundColor: theme.accent }} />
    </div>
  );
}

function V3InvitationIntro({ data, theme }: { data: PremiumWhatsAppCardData; theme: V3Theme }) {
  const copy = v3Copy(data.language);
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", marginTop: 13 }}>
        <V3Ornament theme={theme} />
      </div>
      <div style={{ display: "flex", marginTop: 19, fontFamily: "Arial, sans-serif", fontSize: 41, lineHeight: 1, fontWeight: 900, letterSpacing: 3.5, color: theme.ink, textAlign: "center" }}>{copy.heading}</div>
      <div style={{ maxWidth: 850, display: "flex", marginTop: 22, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", fontSize: invitationMessageSize(data.invitationMessage), lineHeight: 1.38, fontStyle: "italic", fontWeight: 400, color: theme.muted, textAlign: "center" }}>{data.invitationMessage}</div>
    </div>
  );
}

function V3GuestHero({ data, theme }: { data: PremiumWhatsAppCardData; theme: V3Theme }) {
  const guestName = data.guestName.trim() || (data.language === "en" ? "Guest" : "Mgeni");
  return (
    <div style={{ maxWidth: 880, display: "flex", marginTop: 21, fontFamily: "Georgia, serif", fontSize: heroSize(guestName, 70, 58, 50), lineHeight: 1.02, fontWeight: 700, fontStyle: "italic", letterSpacing: -1.2, color: theme.ink, textAlign: "center" }}>
      {guestName}
    </div>
  );
}

function V3CoupleHero({ data, theme }: { data: PremiumWhatsAppCardData; theme: V3Theme }) {
  const copy = v3Copy(data.language);
  const title = data.title.trim() || (data.language === "en" ? "Our Celebration" : "Sherehe Yetu");
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", marginTop: 25 }}>
      <V3Ornament theme={theme} wide />
      <div style={{ display: "flex", marginTop: 19, fontFamily: "Arial, sans-serif", fontSize: 16, fontWeight: 900, letterSpacing: 4.4, color: theme.accent }}>{copy.weddingOf}</div>
      <div style={{ maxWidth: 890, display: "flex", marginTop: 13, fontFamily: "Georgia, serif", fontSize: heroSize(title, 82, 70, 58), lineHeight: 0.98, fontWeight: 700, fontStyle: "italic", letterSpacing: -1.8, color: theme.ink, textAlign: "center" }}>{title}</div>
    </div>
  );
}

function V3EventSection({
  label,
  value,
  detail,
  theme,
  featured = false,
}: {
  label: string;
  value: string;
  detail?: string;
  theme: V3Theme;
  featured?: boolean;
}) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: featured ? "16px 0 14px" : "12px 0 11px", borderTop: `1px solid ${theme.accentSoft}`, textAlign: "center" }}>
      <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 900, letterSpacing: 3.3, color: theme.accent }}>{label}</div>
      <div style={{ maxWidth: 820, display: "flex", marginTop: featured ? 7 : 6, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", fontSize: featured ? 46 : 28, lineHeight: 1.12, fontWeight: 700, color: theme.ink, textAlign: "center" }}>{value}</div>
      {detail && <div style={{ maxWidth: 820, display: "flex", marginTop: 5, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", fontSize: 23, lineHeight: 1.18, color: theme.muted, textAlign: "center" }}>{detail}</div>}
    </div>
  );
}

function V3StatusBadge({
  data,
  theme,
  width,
}: {
  data: PremiumWhatsAppCardData;
  theme: V3Theme;
  width: string;
}) {
  const copy = v3Copy(data.language);
  return (
    <div style={{ width, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "9px 18px", textAlign: "center" }}>
      <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: 2.8, color: theme.accent }}>{copy.status}</div>
      <div style={{ display: "flex", marginTop: 6, fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 700, color: theme.ink }}>{v3StatusText(data)}</div>
    </div>
  );
}

function V3Details({ data, theme }: { data: PremiumWhatsAppCardData; theme: V3Theme }) {
  const copy = v3Copy(data.language);
  const ceremonyTime = data.ceremonyTime.trim() || data.eventTime.trim();
  const ceremonyVenue = data.ceremonyVenue.trim();
  const receptionVenue = data.receptionVenue.trim() || data.venue.trim();
  const hasCeremony = Boolean(ceremonyTime || ceremonyVenue);
  const hasReception = Boolean(receptionVenue && receptionVenue !== "-");
  const hasDressCode = Boolean(data.dressCode.trim());

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", marginTop: 23 }}>
      <V3EventSection label={copy.date} value={data.date || "-"} theme={theme} featured />
      {hasCeremony && (
        <V3EventSection
          label={data.ceremonyTitle.trim() || copy.ceremony}
          value={ceremonyTime || ceremonyVenue}
          detail={ceremonyTime ? ceremonyVenue : undefined}
          theme={theme}
        />
      )}
      {hasReception && <V3EventSection label={copy.reception} value={receptionVenue} theme={theme} />}
      <div style={{ width: "100%", display: "flex", borderTop: `1px solid ${theme.accentSoft}`, borderBottom: `1px solid ${theme.accentSoft}` }}>
        {hasDressCode && (
          <>
            <div style={{ width: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "9px 18px", textAlign: "center" }}>
              <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: 2.8, color: theme.accent }}>{copy.dress}</div>
              <div style={{ display: "flex", marginTop: 6, fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 700, color: theme.ink }}>{data.dressCode}</div>
            </div>
            <div style={{ width: 1, display: "flex", backgroundColor: theme.accentSoft }} />
          </>
        )}
        <V3StatusBadge data={data} theme={theme} width={hasDressCode ? "50%" : "100%"} />
      </div>
    </div>
  );
}

function V3PassTicket({ data, theme }: { data: PremiumWhatsAppCardData; theme: V3Theme }) {
  const copy = v3Copy(data.language);
  const passId = data.eventPassId.trim() || "—";
  const passSize = passId.length > 18 ? 34 : passId.length > 12 ? 40 : 47;

  return (
    <div style={{ width: "100%", minHeight: 270, display: "flex", marginTop: 22, border: `2px solid ${theme.accent}`, backgroundColor: theme.ticket, color: theme.ticketInk }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "25px 31px 23px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 16, height: 16, display: "flex", marginRight: 15, border: `3px solid ${theme.accent}`, transform: "rotate(45deg)" }} />
          <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 16, fontWeight: 900, letterSpacing: 2.8, color: theme.accent }}>{copy.verified}</div>
        </div>
        <div style={{ display: "flex", marginTop: 18, fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: 2.7, color: theme.muted }}>{copy.passId}</div>
        <div style={{ display: "flex", marginTop: 5, fontFamily: "Georgia, serif", fontSize: passSize, lineHeight: 1, fontWeight: 700, letterSpacing: 1, color: theme.ticketInk }}>{passId}</div>
        <div style={{ maxWidth: 515, display: "flex", marginTop: 15, fontFamily: "Georgia, serif", fontSize: 19, lineHeight: 1.24, fontStyle: "italic", color: theme.muted }}>{copy.instruction}</div>
      </div>
      <div style={{ width: 272, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, borderLeft: `2px dashed ${theme.accent}`, backgroundColor: "#FFFFFF" }}>
        {data.qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.qrCodeDataUrl} alt="" width={224} height={224} style={{ width: 224, height: 224, objectFit: "contain" }} />
        ) : (
          <div style={{ width: 216, height: 216, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.accent}`, color: theme.ticketInk, fontFamily: "Arial, sans-serif", fontSize: 24, fontWeight: 900 }}>QR</div>
        )}
      </div>
    </div>
  );
}

function V4FloralSprig({
  color,
  side,
}: {
  color: string;
  side: "left" | "right";
}) {
  return (
    <div
      style={{
        position: "absolute",
        [side]: -22,
        top: side === "left" ? 70 : 520,
        width: 150,
        height: 250,
        display: "flex",
        transform: side === "right" ? "scaleX(-1) rotate(-8deg)" : "rotate(-8deg)",
        opacity: 0.78,
      }}
    >
      <div style={{ position: "absolute", left: 73, top: 4, width: 2, height: 238, display: "flex", backgroundColor: color, transform: "rotate(-15deg)" }} />
      {[0, 1, 2, 3, 4].map((leaf) => (
        <div
          key={leaf}
          style={{
            position: "absolute",
            left: leaf % 2 === 0 ? 38 : 70,
            top: 25 + leaf * 41,
            width: 52,
            height: 27,
            display: "flex",
            border: `2px solid ${color}`,
            borderRadius: leaf % 2 === 0 ? "100% 0 100% 0" : "0 100% 0 100%",
            transform: `rotate(${leaf % 2 === 0 ? -24 : 30}deg)`,
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        />
      ))}
    </div>
  );
}

function V4Photo({
  data,
  theme,
}: {
  data: PremiumWhatsAppCardData;
  theme: V3Theme;
}) {
  const initials = data.title
    .split(/\s*&\s*|\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(" & ");

  return (
    <div style={{ width: 378, height: 1040, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: "28px 12px 22px 18px", display: "flex", border: `1px solid ${theme.accent}`, borderRadius: "190px 190px 42px 42px", transform: "rotate(-2deg)", opacity: 0.55 }} />
      <div style={{ position: "absolute", inset: "12px 28px 38px 4px", display: "flex", border: `2px solid ${theme.accentSoft}`, borderRadius: "190px 190px 38px 38px", transform: "rotate(2deg)" }} />
      <div style={{ width: 330, height: 970, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "165px 165px 34px 34px", backgroundColor: theme.ticket, border: `4px solid ${theme.accent}`, boxShadow: "0 26px 54px rgba(24,20,14,0.22)" }}>
        {data.coverImageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.coverImageDataUrl}
            alt=""
            width={330}
            height={970}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: theme.ink }}>
            <div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 66, lineHeight: 1, fontWeight: 700, fontStyle: "italic" }}>{initials || "S & E"}</div>
            <div style={{ width: 95, height: 1, display: "flex", marginTop: 25, backgroundColor: theme.accent }} />
            <div style={{ display: "flex", marginTop: 20, fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: 4, color: theme.accent }}>TOGETHER</div>
          </div>
        )}
      </div>
      <V4FloralSprig color={theme.accent} side="left" />
      <V4FloralSprig color={theme.accent} side="right" />
    </div>
  );
}

function V4Label({ children, theme }: { children: string; theme: V3Theme }) {
  return (
    <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 20, lineHeight: 1, fontWeight: 900, letterSpacing: 3.3, color: theme.accent, textAlign: "center" }}>
      {children}
    </div>
  );
}

function V4Detail({
  label,
  value,
  detail,
  theme,
}: {
  label: string;
  value: string;
  detail?: string;
  theme: V3Theme;
}) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 17, borderTop: `1px solid ${theme.accentSoft}` }}>
      <V4Label theme={theme}>{label}</V4Label>
      <div style={{ maxWidth: 530, display: "flex", marginTop: 9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", fontSize: 27, lineHeight: 1.18, fontWeight: 700, color: theme.ink, textAlign: "center" }}>{value}</div>
      {detail && <div style={{ maxWidth: 530, display: "flex", marginTop: 6, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", fontSize: 24, lineHeight: 1.18, color: theme.muted, textAlign: "center" }}>{detail}</div>}
    </div>
  );
}

function V4Hero({ data, theme }: { data: PremiumWhatsAppCardData; theme: V3Theme }) {
  const copy = v3Copy(data.language);
  const ceremonyTime = data.ceremonyTime.trim() || data.eventTime.trim();
  const ceremonyVenue = data.ceremonyVenue.trim();
  const receptionVenue = data.receptionVenue.trim() || data.venue.trim();
  const guestSize = heroSize(data.guestName, 58, 54, 50);
  const coupleSize = heroSize(data.title, 76, 70, 64);

  return (
    <div style={{ width: "100%", height: 1125, display: "flex", alignItems: "center", padding: "42px 52px 28px" }}>
      <div style={{ width: "40%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <V4Photo data={data} theme={theme} />
      </div>
      <div style={{ width: "60%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "4px 18px 4px 42px", borderLeft: `1px solid ${theme.accentSoft}` }}>
        <V3BrandHeader theme={theme} />
        <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 40, lineHeight: 1, fontWeight: 900, letterSpacing: 2.6, color: theme.ink, textAlign: "center" }}>{copy.heading}</div>
        <div style={{ maxWidth: 525, display: "flex", whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", fontSize: invitationMessageSize(data.invitationMessage), lineHeight: 1.42, fontStyle: "italic", color: theme.muted, textAlign: "center" }}>{data.invitationMessage}</div>
        <div style={{ maxWidth: 530, display: "flex", fontFamily: "Georgia, serif", fontSize: guestSize, lineHeight: 1.04, fontWeight: 700, color: theme.ink, textAlign: "center" }}>{data.guestName}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <V4Label theme={theme}>{copy.weddingOf}</V4Label>
          <div style={{ maxWidth: 540, display: "flex", marginTop: 12, fontFamily: "Georgia, serif", fontSize: coupleSize, lineHeight: 0.98, fontWeight: 700, fontStyle: "italic", letterSpacing: -1.4, color: theme.ink, textAlign: "center" }}>{data.title}</div>
        </div>
        <V4Detail label={copy.date} value={data.date || "—"} theme={theme} />
        {(ceremonyTime || ceremonyVenue) && <V4Detail label={data.ceremonyTitle.trim() || copy.ceremony} value={ceremonyTime || ceremonyVenue} detail={ceremonyTime ? ceremonyVenue : undefined} theme={theme} />}
        {receptionVenue && receptionVenue !== "-" && <V4Detail label={copy.reception} value={receptionVenue} theme={theme} />}
        <div style={{ width: "100%", display: "flex", paddingTop: 17, borderTop: `1px solid ${theme.accentSoft}` }}>
          <div style={{ width: "50%", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 10px", textAlign: "center" }}>
            <V4Label theme={theme}>{copy.dress}</V4Label>
            <div style={{ display: "flex", marginTop: 9, fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 700, color: theme.ink }}>{data.dressCode || "—"}</div>
          </div>
          <div style={{ width: 1, display: "flex", backgroundColor: theme.accentSoft }} />
          <div style={{ width: "50%", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 10px", textAlign: "center" }}>
            <V4Label theme={theme}>{copy.status}</V4Label>
            <div style={{ display: "flex", marginTop: 9, fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 700, color: theme.ink }}>{v3StatusText(data)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function V4Pass({ data, theme }: { data: PremiumWhatsAppCardData; theme: V3Theme }) {
  const copy = v3Copy(data.language);
  return (
    <div style={{ width: 956, height: 500, position: "relative", display: "flex", overflow: "hidden", border: `2px solid ${theme.accent}`, borderRadius: 28, backgroundColor: theme.ticket, color: theme.ticketInk, boxShadow: "0 18px 42px rgba(24,20,14,0.12)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, display: "flex", backgroundColor: theme.accent }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 48px 42px 62px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 20, height: 20, display: "flex", marginRight: 16, borderRadius: 99, backgroundColor: theme.accent }} />
          <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: 3.2, color: theme.accent }}>{copy.verified}</div>
        </div>
        <div style={{ display: "flex", marginTop: 38, fontFamily: "Arial, sans-serif", fontSize: 20, fontWeight: 900, letterSpacing: 3.2, color: theme.muted }}>{copy.passId}</div>
        <div style={{ display: "flex", marginTop: 10, fontFamily: "Georgia, serif", fontSize: data.eventPassId.length > 16 ? 46 : 58, lineHeight: 1, fontWeight: 700, letterSpacing: 1.5 }}>{data.eventPassId || "—"}</div>
        <div style={{ maxWidth: 540, display: "flex", marginTop: 30, fontFamily: "Georgia, serif", fontSize: 27, lineHeight: 1.35, fontStyle: "italic", color: theme.muted }}>{copy.instruction}</div>
      </div>
      <div style={{ width: 350, display: "flex", alignItems: "center", justifyContent: "center", borderLeft: `2px dashed ${theme.accent}`, backgroundColor: "#FFFFFF" }}>
        {data.qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.qrCodeDataUrl} alt="" width={270} height={270} style={{ width: 270, height: 270, objectFit: "contain" }} />
        ) : (
          <div style={{ width: 270, height: 270, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.accent}`, fontFamily: "Arial, sans-serif", fontSize: 30, fontWeight: 900 }}>QR</div>
        )}
      </div>
    </div>
  );
}

export default function PremiumWhatsAppCard({
  data,
  template,
}: {
  data: PremiumWhatsAppCardData;
  template: PremiumWhatsAppTemplate;
}): ReactElement {
  const theme = getV3Theme(template);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", backgroundColor: theme.paper, color: theme.ink }}>
      <V3Frame theme={theme} />
      <V3CornerOrnaments theme={theme} />
      <V4Hero data={data} theme={theme} />
      <V4Pass data={data} theme={theme} />
    </div>
  );
}

export function CompactHorizontalCard({ data }: { data: PremiumWhatsAppCardData }): ReactElement {
  const copy = v3Copy(data.language);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", padding: 26, backgroundColor: "#FFF9EC", color: "#183B32", border: "10px solid #174C3C" }}>
      <div style={{ width: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: "1px solid #B99752" }}>
        <V3Ornament theme={V3_THEMES.emerald_botanical_halo} />
        <div style={{ display: "flex", marginTop: 18, fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: 2.2 }}>SMART EVENT PASS</div>
        <div style={{ display: "flex", marginTop: 13, fontFamily: "Georgia, serif", fontSize: 20, fontStyle: "italic", color: "#715F43" }}>{copy.verified}</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px" }}>
        <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: 2.4, color: "#A17E3C" }}>{copy.weddingOf}</div>
        <div style={{ display: "flex", marginTop: 6, fontFamily: "Georgia, serif", fontSize: 38, lineHeight: 1, fontWeight: 700, fontStyle: "italic" }}>{data.title}</div>
        <div style={{ display: "flex", marginTop: 13, fontFamily: "Georgia, serif", fontSize: 23, color: "#715F43" }}>{data.guestName}</div>
        <div style={{ display: "flex", marginTop: 17, paddingTop: 13, borderTop: "1px solid #B99752", fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 700 }}>
          {data.date} · {data.eventTime || data.venue} · {v3StatusText(data)}
        </div>
        <div style={{ display: "flex", marginTop: 10, fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 700 }}>{data.eventPassId || "—"}</div>
      </div>
      <div style={{ width: 205, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderLeft: "2px dashed #B99752" }}>
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
