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
  date: string;
  eventTime: string;
  venue: string;
  guestName: string;
  dressCode: string;
  allowedGuests: number;
  eventPassId: string;
  language: "sw" | "en";
  qrCodeDataUrl: string | null;
  primary: string;
  secondary: string;
  accent: string;
};

type ApprovedTemplate =
  | "royal_dark"
  | "elegant_gold"
  | "chateau_letterpress"
  | "luxury_envelope"
  | "classic_photo";

type Theme = {
  template: ApprovedTemplate;
  paper: string;
  ink: string;
  muted: string;
  gold: string;
  passPaper: string;
  passInk: string;
  frame: "royal" | "gold" | "letterpress" | "envelope" | "classic";
};

const approvedTemplates = new Set<PremiumWhatsAppTemplate>([
  "royal_dark",
  "elegant_gold",
  "chateau_letterpress",
  "luxury_envelope",
  "classic_photo",
]);

function getTheme(template: PremiumWhatsAppTemplate): Theme {
  const approved: ApprovedTemplate = approvedTemplates.has(template)
    ? (template as ApprovedTemplate)
    : "classic_photo";

  if (approved === "royal_dark") {
    return {
      template: approved,
      paper: "#071A3D",
      ink: "#FFF8E7",
      muted: "#D8D0B9",
      gold: "#D5AE56",
      passPaper: "#0B234D",
      passInk: "#FFF8E7",
      frame: "royal",
    };
  }

  if (approved === "elegant_gold") {
    return {
      template: approved,
      paper: "#FFF9EC",
      ink: "#44351D",
      muted: "#776B57",
      gold: "#B78B3D",
      passPaper: "#FFFCF5",
      passInk: "#44351D",
      frame: "gold",
    };
  }

  if (approved === "chateau_letterpress") {
    return {
      template: approved,
      paper: "#F3E8D1",
      ink: "#443B2E",
      muted: "#756B5B",
      gold: "#9B8052",
      passPaper: "#EFE0C2",
      passInk: "#443B2E",
      frame: "letterpress",
    };
  }

  if (approved === "luxury_envelope") {
    return {
      template: approved,
      paper: "#FFF8E9",
      ink: "#533B1F",
      muted: "#816E53",
      gold: "#B48A48",
      passPaper: "#FAEED8",
      passInk: "#533B1F",
      frame: "envelope",
    };
  }

  return {
    template: approved,
    paper: "#FFFDF8",
    ink: "#102D50",
    muted: "#5D6C7C",
    gold: "#B39252",
    passPaper: "#F8F7F2",
    passInk: "#102D50",
    frame: "classic",
  };
}

function labels(language: "sw" | "en") {
  return language === "en"
    ? {
        heading: "Invitation",
        hello: "Hello",
        invitation: "You are warmly invited to celebrate",
        date: "DATE",
        time: "TIME",
        venue: "VENUE",
        dress: "DRESS CODE",
        status: "INVITATION STATUS",
        passId: "ENTRY PASS ID",
        keep: "Keep this pass for entry",
        closing: "We look forward to celebrating with you",
      }
    : {
        heading: "Mwaliko",
        hello: "Habari",
        invitation: "Umealikwa kwa furaha kusherehekea",
        date: "TAREHE",
        time: "MUDA",
        venue: "MAHALI",
        dress: "DRESS CODE",
        status: "STATUS YA MWALIKO",
        passId: "PASS ID YA KUINGIA",
        keep: "Hifadhi pass hii kwa ajili ya kuingia",
        closing: "Tunatarajia kwa furaha kuungana nawe",
      };
}

function statusText(data: PremiumWhatsAppCardData) {
  const count = Number.isFinite(data.allowedGuests)
    ? Math.max(1, Math.floor(data.allowedGuests))
    : 1;

  if (count === 1) return data.language === "en" ? "Single (1 Person)" : "Single (Mtu 1)";
  if (count === 2) return data.language === "en" ? "Double (2 People)" : "Double (Watu 2)";
  return data.language === "en" ? `Group (${count} People)` : `Group (Watu ${count})`;
}

export function BrandHeader({ theme }: { theme: Theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", fontFamily: "Arial, sans-serif", fontSize: 20, fontWeight: 900, letterSpacing: 4, color: theme.ink }}>
      <div style={{ width: 52, height: 1, display: "flex", marginRight: 17, backgroundColor: theme.gold }} />
      SMART EVENT PASS
      <div style={{ width: 52, height: 1, display: "flex", marginLeft: 17, backgroundColor: theme.gold }} />
    </div>
  );
}

function Crown({ color }: { color: string }) {
  return (
    <div style={{ width: 72, height: 42, position: "relative", display: "flex", marginTop: 18 }}>
      <div style={{ position: "absolute", left: 6, bottom: 5, width: 60, height: 8, borderTop: `2px solid ${color}`, borderBottom: `3px solid ${color}` }} />
      {[9, 31, 53].map((left, index) => (
        <div key={left} style={{ position: "absolute", left, top: index === 1 ? 1 : 12, width: 13, height: 27, border: `2px solid ${color}`, transform: "rotate(45deg)" }} />
      ))}
    </div>
  );
}

export function RoyalFrame({ color }: { color: string }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 22, display: "flex", border: `3px solid ${color}` }} />
      <div style={{ position: "absolute", inset: 34, display: "flex", border: `1px solid ${color}`, opacity: 0.72 }} />
      <div style={{ position: "absolute", left: 380, top: 34, width: 260, height: 1, display: "flex", backgroundColor: color }} />
      <div style={{ position: "absolute", left: 380, bottom: 34, width: 260, height: 1, display: "flex", backgroundColor: color }} />
    </>
  );
}

export function GoldFrame({ color }: { color: string }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 24, display: "flex", border: `2px solid ${color}` }} />
      {[
        { left: 38, top: 38 },
        { right: 38, top: 38 },
        { left: 38, bottom: 38 },
        { right: 38, bottom: 38 },
      ].map((position, index) => (
        <div key={index} style={{ position: "absolute", width: 56, height: 56, display: "flex", border: `2px solid ${color}`, transform: "rotate(45deg)", opacity: 0.65, ...position }} />
      ))}
    </>
  );
}

export function LetterpressFrame({ color }: { color: string }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 21, display: "flex", border: `5px solid ${color}`, opacity: 0.82 }} />
      <div style={{ position: "absolute", inset: 33, display: "flex", border: `1px solid ${color}` }} />
      <div style={{ position: "absolute", inset: 43, display: "flex", border: `1px solid ${color}`, opacity: 0.42 }} />
    </>
  );
}

export function ClassicFrame({ color }: { color: string }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 22, display: "flex", border: `4px solid ${color}` }} />
      <div style={{ position: "absolute", inset: 33, display: "flex", border: `1px solid ${color}` }} />
    </>
  );
}

export function EnvelopeSeal({ color, paper }: { color: string; paper: string }) {
  return (
    <>
      <div style={{ position: "absolute", left: 34, top: 34, width: 455, height: 245, display: "flex", borderBottom: `2px solid ${color}`, transform: "rotate(19deg)", opacity: 0.28 }} />
      <div style={{ position: "absolute", right: 34, top: 34, width: 455, height: 245, display: "flex", borderBottom: `2px solid ${color}`, transform: "rotate(-19deg)", opacity: 0.28 }} />
      <div style={{ width: 92, height: 92, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 14, borderRadius: 99, border: `5px solid ${paper}`, backgroundColor: color, boxShadow: `0 0 0 2px ${color}`, color: "#FFF9EC", fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700 }}>
        S | D
      </div>
    </>
  );
}

function Frame({ theme }: { theme: Theme }) {
  if (theme.frame === "royal") return <RoyalFrame color={theme.gold} />;
  if (theme.frame === "gold") return <GoldFrame color={theme.gold} />;
  if (theme.frame === "letterpress") return <LetterpressFrame color={theme.gold} />;
  if (theme.frame === "classic") return <ClassicFrame color={theme.ink} />;
  return <div style={{ position: "absolute", inset: 24, display: "flex", border: `2px solid ${theme.gold}` }} />;
}

export function GuestSection({ data, theme }: { data: PremiumWhatsAppCardData; theme: Theme }) {
  const copy = labels(data.language);
  const guestWords = data.guestName.trim().split(/\s+/);
  const splitAt = Math.min(3, Math.max(1, guestWords.length - 2));

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 11, textAlign: "center" }}>
      <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 900, letterSpacing: 3, color: theme.muted }}>{copy.hello.toUpperCase()}</div>
      <div style={{ display: "flex", marginTop: 6, fontFamily: "Georgia, serif", fontSize: 31, lineHeight: 1.1, fontWeight: 700, color: theme.ink }}>{guestWords.slice(0, splitAt).join(" ")}</div>
      <div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 38, lineHeight: 1.08, fontWeight: 700, color: theme.ink }}>{guestWords.slice(splitAt).join(" ")}</div>
    </div>
  );
}

function Divider({ color, ornament = false }: { color: string; ornament?: boolean }) {
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 17 }}>
      <div style={{ width: ornament ? 170 : 290, height: 1, display: "flex", backgroundColor: color }} />
      {ornament && <div style={{ width: 13, height: 13, display: "flex", margin: "0 14px", border: `2px solid ${color}`, transform: "rotate(45deg)" }} />}
      {ornament && <div style={{ width: 170, height: 1, display: "flex", backgroundColor: color }} />}
    </div>
  );
}

export function EventDetails({ data, theme }: { data: PremiumWhatsAppCardData; theme: Theme }) {
  const copy = labels(data.language);
  return (
    <div style={{ width: "100%", display: "flex", marginTop: 20, padding: "0 25px" }}>
      <div style={{ width: "38%", display: "flex", flexDirection: "column", paddingRight: 25, borderRight: `1px solid ${theme.gold}` }}>
        <Info label={copy.date} value={data.date} theme={theme} />
        <Info label={copy.time} value={data.eventTime || "-"} theme={theme} top />
      </div>
      <div style={{ width: "62%", display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 30 }}>
        <Info label={copy.venue} value={data.venue} theme={theme} />
      </div>
    </div>
  );
}

function Info({ label, value, theme, top = false }: { label: string; value: string; theme: Theme; top?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginTop: top ? 18 : 0 }}>
      <div style={{ width: 10, height: 10, display: "flex", flexShrink: 0, marginTop: 4, marginRight: 15, border: `2px solid ${theme.gold}`, transform: "rotate(45deg)" }} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: 2.2, color: theme.gold }}>{label}</div>
        <div style={{ display: "flex", marginTop: 5, fontFamily: "Georgia, serif", fontSize: 21, lineHeight: 1.18, fontWeight: 700, color: theme.ink }}>{value}</div>
      </div>
    </div>
  );
}

export function DressStatusRow({ data, theme }: { data: PremiumWhatsAppCardData; theme: Theme }) {
  const copy = labels(data.language);
  return (
    <div style={{ width: "100%", display: "flex", marginTop: 19, padding: "15px 35px", borderTop: `1px solid ${theme.gold}`, borderBottom: `1px solid ${theme.gold}` }}>
      <SimpleMeta label={copy.dress} value={data.dressCode || "-"} theme={theme} width="50%" />
      <div style={{ width: 1, display: "flex", backgroundColor: theme.gold }} />
      <SimpleMeta label={copy.status} value={statusText(data)} theme={theme} width="50%" />
    </div>
  );
}

function SimpleMeta({ label, value, theme, width }: { label: string; value: string; theme: Theme; width: string }) {
  return (
    <div style={{ width, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 18px", textAlign: "center" }}>
      <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: 2, color: theme.gold }}>{label}</div>
      <div style={{ display: "flex", marginTop: 6, fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: theme.ink }}>{value}</div>
    </div>
  );
}

export function PassTicket({ data, theme }: { data: PremiumWhatsAppCardData; theme: Theme }) {
  const copy = labels(data.language);
  return (
    <div style={{ width: "100%", minHeight: 185, display: "flex", alignItems: "stretch", marginTop: 22, border: `2px solid ${theme.gold}`, backgroundColor: theme.passPaper, color: theme.passInk }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "22px 30px" }}>
        <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: 3, color: theme.gold }}>VERIFIED EVENT PASS</div>
        <div style={{ display: "flex", marginTop: 11, fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: 2, color: theme.muted }}>{copy.passId}</div>
        <div style={{ display: "flex", marginTop: 5, fontFamily: "Georgia, serif", fontSize: 43, lineHeight: 1, fontWeight: 700, letterSpacing: 1.5 }}>{data.eventPassId || "-"}</div>
        <div style={{ display: "flex", marginTop: 14, fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 700, color: theme.muted }}>{copy.keep}</div>
      </div>
      <div style={{ width: 205, display: "flex", alignItems: "center", justifyContent: "center", padding: 17, borderLeft: `2px dashed ${theme.gold}`, backgroundColor: "#FFFFFF" }}>
        {data.qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.qrCodeDataUrl} alt="" width={164} height={164} style={{ width: 164, height: 164, objectFit: "contain" }} />
        ) : (
          <div style={{ width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${theme.gold}`, color: theme.ink, fontFamily: "Arial, sans-serif", fontWeight: 900 }}>QR</div>
        )}
      </div>
    </div>
  );
}

function TopIdentity({ theme }: { theme: Theme }) {
  if (theme.frame === "envelope") return <EnvelopeSeal color={theme.gold} paper={theme.paper} />;
  if (theme.frame === "letterpress") {
    return (
      <div style={{ width: 78, height: 78, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 15, borderRadius: 99, border: `3px solid ${theme.gold}`, color: theme.gold, fontFamily: "Georgia, serif", fontSize: 23, fontWeight: 700 }}>
        S D
      </div>
    );
  }
  if (theme.frame === "royal" || theme.frame === "gold") return <Crown color={theme.gold} />;
  return <Divider color={theme.gold} ornament />;
}

export default function PremiumWhatsAppCard({ data, template }: { data: PremiumWhatsAppCardData; template: PremiumWhatsAppTemplate }): ReactElement {
  const theme = getTheme(template);
  const copy = labels(data.language);
  const titleSize = data.title.length > 30 ? 47 : 55;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", padding: "45px 76px 37px", backgroundColor: theme.paper, color: theme.ink }}>
      <Frame theme={theme} />
      <BrandHeader theme={theme} />
      <TopIdentity theme={theme} />
      <div style={{ display: "flex", marginTop: theme.frame === "classic" ? 10 : 4, fontFamily: "Georgia, serif", fontSize: 54, lineHeight: 1, fontWeight: 700, fontStyle: theme.frame === "royal" ? "normal" : "italic", color: theme.frame === "royal" ? theme.gold : theme.ink }}>{copy.heading}</div>
      <GuestSection data={data} theme={theme} />
      <Divider color={theme.gold} ornament={theme.frame === "royal" || theme.frame === "classic"} />
      <div style={{ display: "flex", marginTop: 14, fontFamily: "Arial, sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 0.3, color: theme.muted }}>{copy.invitation}</div>
      <div style={{ maxWidth: 820, display: "flex", marginTop: 7, fontFamily: "Georgia, serif", fontSize: titleSize, lineHeight: 1, fontWeight: 700, textAlign: "center", color: theme.ink }}>{data.title}</div>
      <EventDetails data={data} theme={theme} />
      <DressStatusRow data={data} theme={theme} />
      <PassTicket data={data} theme={theme} />
      <div style={{ display: "flex", marginTop: 17, fontFamily: "Georgia, serif", fontSize: 17, fontStyle: "italic", color: theme.muted, textAlign: "center" }}>{copy.closing}</div>
    </div>
  );
}

export function CompactHorizontalCard({ data }: { data: PremiumWhatsAppCardData }): ReactElement {
  const copy = labels(data.language);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", backgroundColor: "#FFF9EC", color: "#183B32", border: "10px solid #174C3C" }}>
      <div style={{ width: 230, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#1B5846", color: "#FFF7E5" }}>
        <div style={{ width: 112, height: 112, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 99, border: "2px solid #D2B36D", fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 700 }}>S | D</div>
        <div style={{ display: "flex", marginTop: 18, fontFamily: "Arial, sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: 2.4 }}>SMART EVENT PASS</div>
        <div style={{ display: "flex", marginTop: 9, fontFamily: "Georgia, serif", fontSize: 20, fontStyle: "italic", color: "#DCC47F" }}>Photo ready</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "31px 29px 50px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 39, lineHeight: 1, fontWeight: 700 }}>{data.title}</div>
          <div style={{ flex: 1, height: 1, display: "flex", marginLeft: 22, backgroundColor: "#B99752" }} />
        </div>
        <div style={{ display: "flex", marginTop: 9, fontFamily: "Georgia, serif", fontSize: 21, color: "#715F43" }}>{copy.hello} {data.guestName}</div>
        <div style={{ display: "flex", marginTop: 18 }}>
          <CompactMeta label={copy.date} value={data.date} width="34%" />
          <CompactMeta label={copy.time} value={data.eventTime || "-"} width="25%" border />
          <CompactMeta label={copy.venue} value={data.venue} width="41%" border />
        </div>
        <div style={{ display: "flex", marginTop: 21, paddingTop: 14, borderTop: "1px solid #B99752" }}>
          <CompactMeta label={copy.dress} value={data.dressCode || "-"} width="36%" />
          <CompactMeta label={copy.status} value={statusText(data)} width="34%" border />
          <CompactMeta label={copy.passId} value={data.eventPassId || "-"} width="30%" border />
        </div>
      </div>
      <div style={{ width: 190, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderLeft: "2px dashed #B99752" }}>
        {data.qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.qrCodeDataUrl} alt="" width={154} height={154} style={{ width: 154, height: 154, objectFit: "contain" }} />
        ) : <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontWeight: 900 }}>QR</div>}
      </div>
      <div style={{ position: "absolute", left: 230, right: 190, bottom: 0, height: 32, display: "flex", alignItems: "center", paddingLeft: 29, backgroundColor: "#174C3C", color: "#FFF7E5", fontFamily: "Arial, sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>HIFADHI PASS HII KWA AJILI YA KUINGIA</div>
    </div>
  );
}

function CompactMeta({ label, value, width, border = false }: { label: string; value: string; width: string; border?: boolean }) {
  return (
    <div style={{ width, display: "flex", flexDirection: "column", paddingLeft: border ? 17 : 0, paddingRight: 12, ...(border ? { borderLeft: "1px solid #B99752" } : {}) }}>
      <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 10, fontWeight: 900, letterSpacing: 1.8, color: "#A17E3C" }}>{label}</div>
      <div style={{ display: "flex", marginTop: 5, fontFamily: "Georgia, serif", fontSize: 17, lineHeight: 1.12, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
