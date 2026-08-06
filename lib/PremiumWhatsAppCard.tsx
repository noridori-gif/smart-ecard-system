import type { ReactElement, ReactNode } from "react";

export type PremiumWhatsAppTemplate =
  | "royal_portrait"
  | "golden_elegance"
  | "botanical_romance"
  | "modern_minimal_photo"
  | "heritage_pattern";

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

type Skin =
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

const THEMES: Record<PremiumWhatsAppTemplate, Theme> = {
  royal_portrait: {
    skin: "classic",
    paper: "#FFFCF5",
    paperAlt: "#EEF0EC",
    ink: "#18364D",
    muted: "#66737C",
    accent: "#AA8B50",
    accentSoft: "#D7C7A3",
    ticket: "#EFF1EC",
    shadow: "rgba(24,54,77,0.18)",
  },
  golden_elegance: {
    skin: "gold",
    paper: "#FFF9EC",
    paperAlt: "#F2E4C7",
    ink: "#3F3322",
    muted: "#776A57",
    accent: "#B58A3C",
    accentSoft: "#DCC89B",
    ticket: "#F4E7CE",
    shadow: "rgba(63,51,34,0.18)",
  },
  botanical_romance: {
    skin: "botanical",
    paper: "#F7F2E6",
    paperAlt: "#E8EEE3",
    ink: "#173F32",
    muted: "#637267",
    accent: "#B18D4C",
    accentSoft: "#CFC7A8",
    ticket: "#E6EDDF",
    shadow: "rgba(28,62,48,0.18)",
  },
  modern_minimal_photo: {
    skin: "minimal",
    paper: "#FFFCF5",
    paperAlt: "#F5F1E8",
    ink: "#292D2B",
    muted: "#71736F",
    accent: "#A98F5C",
    accentSoft: "#D9D0BC",
    ticket: "#F4F0E7",
    shadow: "rgba(41,45,43,0.11)",
  },
  heritage_pattern: {
    skin: "heritage",
    paper: "#F8EEDC",
    paperAlt: "#EBDAC2",
    ink: "#682E38",
    muted: "#806269",
    accent: "#A9854B",
    accentSoft: "#D1B98D",
    ticket: "#EFDDC8",
    shadow: "rgba(104,46,56,0.18)",
  },
};

function copy(language: "sw" | "en") {
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

function TemplateAtmosphere({ theme, title }: { theme: Theme; title: string }) {
  if (theme.skin === "botanical") return <BotanicalLeaves theme={theme} />;
  if (theme.skin === "floral") return <FloralCorners theme={theme} />;
  if (theme.skin === "african") return <AfricanBands theme={theme} />;

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
        <div style={{ position: "absolute", left: 330, top: -250, width: 420, height: 540, display: "flex", border: `2px solid ${theme.accent}`, borderRadius: "210px 210px 0 0", opacity: 0.34 }} />
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

function InvitationTop({ data, theme }: { data: PremiumWhatsAppCardData; theme: Theme }) {
  const text = copy(data.language);

  return (
    <div style={{ width: "100%", minHeight: 210, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 90px 10px", textAlign: "center" }}>
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
  return (
    <div style={{ width: 1080, height: 620, position: "relative", display: "flex", overflow: "hidden" }}>
      {data.coverImageDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.coverImageDataUrl} alt="" width={1080} height={620} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
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

function GuestAndTitle({ data, theme }: { data: PremiumWhatsAppCardData; theme: Theme }) {
  const text = copy(data.language);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 70px 6px", textAlign: "center" }}>
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

function EventDetails({ data, theme }: { data: PremiumWhatsAppCardData; theme: Theme }) {
  const text = copy(data.language);
  const ceremonyTime = data.ceremonyTime || data.eventTime;
  const ceremonyVenue = data.ceremonyVenue;
  const receptionVenue = data.receptionVenue || data.venue;

  return (
    <div style={{ width: 920, height: 350, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 16px", borderTop: `1px solid ${theme.accentSoft}`, borderBottom: `1px solid ${theme.accentSoft}` }}>
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

function PassTicket({ data, theme }: { data: PremiumWhatsAppCardData; theme: Theme }) {
  const text = copy(data.language);
  const passId = data.eventPassId || "—";

  return (
    <div style={{ width: 930, height: 300, position: "relative", display: "flex", overflow: "hidden", marginTop: 18, border: `2px solid ${theme.accent}`, borderRadius: theme.skin === "letterpress" ? 4 : 26, backgroundColor: theme.ticket, color: theme.ink, boxShadow: `0 20px 42px ${theme.shadow}` }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, display: "flex", backgroundColor: theme.accent }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "22px 38px 18px 50px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 13, height: 13, display: "flex", marginRight: 14, border: `3px solid ${theme.accent}`, transform: "rotate(45deg)" }} />
          <Label theme={theme}>{text.pass}</Label>
        </div>
        <div style={{ display: "flex", marginTop: 18 }}>
          <Label theme={theme}>{text.passId}</Label>
        </div>
        <div style={{ display: "flex", marginTop: 6, fontFamily: "Georgia, serif", fontSize: passId.length > 16 ? 40 : 50, lineHeight: 1, fontWeight: 700, letterSpacing: 1, color: theme.ink }}>
          {passId}
        </div>
        <div style={{ maxWidth: 520, display: "flex", marginTop: 16, fontFamily: "Georgia, serif", fontSize: 19, lineHeight: 1.25, fontStyle: "italic", color: theme.muted }}>
          {text.instruction}
        </div>
      </div>
      <div style={{ width: 280, display: "flex", alignItems: "center", justifyContent: "center", borderLeft: `2px dashed ${theme.accent}`, backgroundColor: "#FFFFFF" }}>
        {data.qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.qrCodeDataUrl} alt="" width={220} height={220} style={{ width: 220, height: 220, objectFit: "contain" }} />
        ) : (
          <div style={{ width: 195, height: 195, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.accent}`, fontFamily: "Arial, sans-serif", fontSize: 26, fontWeight: 900, color: theme.ink }}>
            QR
          </div>
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
  const theme = THEMES[template] ?? THEMES.royal_portrait;
  const text = copy(data.language);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", backgroundColor: theme.paper, color: theme.ink }}>
      <PhotoBanner data={data} theme={theme} />
      <div style={{ width: "100%", height: 1180, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" }}>
        <TemplateAtmosphere theme={theme} title={data.title} />
        <InvitationTop data={data} theme={theme} />
        <GuestAndTitle data={data} theme={theme} />
        <EventDetails data={data} theme={theme} />
        <PassTicket data={data} theme={theme} />
        <div style={{ width: 620, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 14 }}>
          <div style={{ flex: 1, height: 1, display: "flex", backgroundColor: theme.accentSoft }} />
          <div style={{ maxWidth: 430, display: "flex", margin: "0 22px", fontFamily: "Georgia, serif", fontSize: 16, lineHeight: 1.2, fontStyle: "italic", color: theme.muted, textAlign: "center" }}>
            {text.closing}
          </div>
          <div style={{ flex: 1, height: 1, display: "flex", backgroundColor: theme.accentSoft }} />
        </div>
      </div>
    </div>
  );
}

export function CompactHorizontalCard({ data }: { data: PremiumWhatsAppCardData }): ReactElement {
  const theme = THEMES.botanical_romance;
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
        <div style={{ display: "flex", marginTop: 10, fontFamily: "Georgia, serif", fontSize: 25, fontWeight: 700 }}>{data.eventPassId || "—"}</div>
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
