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

type OrnamentKind =
  | "botanical"
  | "floral"
  | "artdeco"
  | "letterpress"
  | "heritage"
  | "african"
  | "minimal";

type Preset = {
  outer: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  soft: string;
  darkPass: boolean;
  ornament: OrnamentKind;
};

function presetFor(template: PremiumWhatsAppTemplate, data: PremiumWhatsAppCardData): Preset {
  switch (template) {
    case "emerald_botanical_halo":
      return { outer: "#0C4C3A", paper: "#FFF9ED", ink: "#173D32", muted: "#68766F", accent: "#C7A75F", soft: "#F2E9DA", darkPass: false,ornament: "botanical", };
    case "modern_floral":
      return { outer: "#E8C7CF", paper: "#FFF9FA", ink: "#753347", muted: "#8D7078", accent: "#C78B9B", soft: "#F8E8EC", darkPass: false,ornament: "floral", };
    case "midnight_luxe":
    case "royal_dark":
      return { outer: "#09172C", paper: "#10213C", ink: "#F8F3E8", muted: "#BBC5D7", accent: "#D4B466", soft: "#172C4B", darkPass: true, ornament: "artdeco", };
    case "elegant_gold":
    case "chateau_letterpress":
    case "luxury_envelope":
      return { outer: "#775521", paper: "#FFF9EC", ink: "#513815", muted: "#806D51", accent: "#C9A55A", soft: "#F3E7CF", darkPass: false, ornament: "letterpress", };
    case "heritage_monogram":
      return { outer: "#562632", paper: "#FFF9F2", ink: "#4A2630", muted: "#7B6268", accent: "#C7A66A", soft: "#F2E7DD", darkPass: false,ornament: "heritage", };
    case "african_royal":
      return { outer: "#28170E", paper: "#FBF1DD", ink: "#2D1D13", muted: "#796354", accent: "#C9903C", soft: "#F0DDBD", darkPass: false,ornament: "african", };
    case "minimal_ivory":
      return { outer: "#DED5C4", paper: "#FFFDF8", ink: "#2D2A24", muted: "#777167", accent: "#B7A078", soft: "#F4EFE6", darkPass: false,ornament: "minimal", };
    default:
      return { outer: data.primary, paper: data.secondary, ink: "#172033", muted: "#6B7280", accent: data.accent, soft: data.secondary, darkPass: false,ornament: "minimal", };
  }
}

function passStatus(data: PremiumWhatsAppCardData) {
  const count = Number.isFinite(data.allowedGuests) ? Math.max(1, Math.floor(data.allowedGuests)) : 1;
  if (count === 1) return { title: "SINGLE PASS", detail: data.language === "en" ? "1 Person" : "Mtu 1" };
  if (count === 2) return { title: "DOUBLE PASS", detail: data.language === "en" ? "2 People" : "Watu 2" };
  return { title: "GROUP PASS", detail: data.language === "en" ? `${count} People` : `Watu ${count}` };
}

function CornerDecoration({
  preset,
  right = false,
  bottom = false,
}: {
  preset: Preset;
  right?: boolean;
  bottom?: boolean;
}) {
  const positionStyle = {
    position: "absolute" as const,
    width: 160,
    height: 160,
    display: "flex",
    ...(right ? { right: -18 } : { left: -18 }),
    ...(bottom ? { bottom: -18 } : { top: -18 }),
    transform: `${right ? "scaleX(-1)" : ""} ${
      bottom ? "scaleY(-1)" : ""
    }`.trim(),
    opacity: 0.42,
  };

  if (preset.ornament === "botanical" || preset.ornament === "floral") {
    return (
      <div style={positionStyle}>
        <div
          style={{
            position: "absolute",
            left: 34,
            top: 12,
            width: 15,
            height: 140,
            borderRadius: 999,
            backgroundColor: preset.accent,
            transform: "rotate(-35deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 24,
            top: 30,
            width: 76,
            height: 34,
            borderRadius: "80px 0 80px 0",
            backgroundColor: preset.accent,
            transform: "rotate(-18deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 58,
            top: 78,
            width: 82,
            height: 36,
            borderRadius: "80px 0 80px 0",
            backgroundColor: preset.accent,
            transform: "rotate(12deg)",
          }}
        />
      </div>
    );
  }

  if (preset.ornament === "african") {
    return (
      <div style={positionStyle}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: 18 + index * 18,
              top: 18 + index * 18,
              width: 84,
              height: 84,
              border: `5px solid ${preset.accent}`,
              transform: "rotate(45deg)",
            }}
          />
        ))}
      </div>
    );
  }

  if (
    preset.ornament === "artdeco" ||
    preset.ornament === "heritage"
  ) {
    return (
      <div style={positionStyle}>
        <div
          style={{
            position: "absolute",
            left: 20,
            top: 20,
            width: 105,
            height: 105,
            borderTop: `5px solid ${preset.accent}`,
            borderLeft: `5px solid ${preset.accent}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 42,
            top: 42,
            width: 65,
            height: 65,
            borderTop: `3px solid ${preset.accent}`,
            borderLeft: `3px solid ${preset.accent}`,
          }}
        />
      </div>
    );
  }

  if (preset.ornament === "letterpress") {
    return (
      <div style={positionStyle}>
        <div
          style={{
            position: "absolute",
            left: 20,
            top: 20,
            width: 108,
            height: 108,
            borderRadius: 999,
            border: `3px double ${preset.accent}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 52,
            top: 52,
            width: 44,
            height: 44,
            borderRadius: 999,
            backgroundColor: preset.accent,
          }}
        />
      </div>
    );
  }

  return (
    <div style={positionStyle}>
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 20,
          width: 76,
          height: 2,
          backgroundColor: preset.accent,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 20,
          width: 2,
          height: 76,
          backgroundColor: preset.accent,
        }}
      />
    </div>
  );
}

function DetailBox({
  label,
  value,
  preset,
  wide = false,
}: {
  label: string;
  value: string;
  preset: Preset;
  wide?: boolean;
}) {
  return (
    <div
      style={{
        width: wide ? "100%" : "48.8%",
        minHeight: wide ? 82 : 92,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "13px 17px",
        borderRadius: 15,
        border: `1px solid ${preset.accent}`,
        backgroundColor: preset.soft,
      }}
    >
      <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: 2, color: preset.accent }}>
        {label}
      </div>
      <div style={{ display: "flex", marginTop: 7, fontFamily: "Arial, sans-serif", fontSize: wide ? 21 : 20, lineHeight: 1.18, fontWeight: 800, color: preset.ink }}>
        {value}
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
  const preset = presetFor(template, data);
  const status = passStatus(data);
  const passId = data.eventPassId?.trim() || (data.language === "en" ? "PENDING" : "INASUBIRI");

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 34, background: `linear-gradient(150deg, ${preset.outer}, #07110E)` }}>
      <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", padding: "32px 42px 28px", borderRadius: 28, border: `3px solid ${preset.accent}`, backgroundColor: preset.paper, boxShadow: "0 28px 76px rgba(0,0,0,0.34)", color: preset.ink }}>
<CornerDecoration preset={preset} />
<CornerDecoration preset={preset} right />
<CornerDecoration preset={preset} bottom />
<CornerDecoration preset={preset} right bottom />
        <div style={{ position: "absolute", left: -55, top: -55, width: 190, height: 190, display: "flex", borderRadius: 999, border: `18px solid ${preset.accent}`, opacity: 0.18 }} />
        <div style={{ position: "absolute", right: -60, bottom: -60, width: 210, height: 210, display: "flex", borderRadius: 999, border: `18px solid ${preset.accent}`, opacity: 0.18 }} />

        <div style={{ display: "flex", alignItems: "center", fontFamily: "Arial, sans-serif", fontSize: 23, fontWeight: 800, color: preset.ink }}>
          <div style={{ width: 34, height: 3, display: "flex", marginRight: 14, backgroundColor: preset.accent }} />
          Smart Event Pass
        </div>

        <div style={{ display: "flex", marginTop: 8, fontFamily: "Georgia, serif", fontSize: 54, fontStyle: "italic", color: preset.ink }}>
          {data.language === "en" ? "Invitation" : "Mwaliko"}
        </div>

        <div style={{ display: "flex", marginTop: 4, fontFamily: "Arial, sans-serif", fontSize: 15, fontWeight: 800, color: preset.muted }}>
          {data.language === "en" ? "Hello" : "Habari"}
        </div>

        <div style={{ maxWidth: 850, display: "flex", marginTop: 4, fontFamily: "Georgia, serif", fontSize: 36, lineHeight: 1.1, fontWeight: 700, textAlign: "center", color: preset.ink }}>
          {data.guestName}
        </div>

        <div style={{ width: 330, height: 2, display: "flex", marginTop: 15, backgroundColor: preset.accent }} />

        <div style={{ display: "flex", marginTop: 14, fontFamily: "Arial, sans-serif", fontSize: 16, fontWeight: 700, color: preset.muted }}>
          {data.language === "en" ? "You are warmly invited to celebrate" : "Umealikwa kwa furaha kusherehekea"}
        </div>

        <div style={{ maxWidth: 850, display: "flex", marginTop: 8, fontFamily: "Georgia, serif", fontSize: 54, lineHeight: 1.02, fontWeight: 700, textAlign: "center", color: preset.ink }}>
          {data.title}
        </div>

        <div style={{ width: "100%", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginTop: 22 }}>
          <DetailBox label={data.language === "en" ? "DATE" : "TAREHE"} value={data.date} preset={preset} />
          <DetailBox label={data.language === "en" ? "TIME" : "MUDA"} value={data.eventTime || "-"} preset={preset} />
          <DetailBox label={data.language === "en" ? "VENUE" : "MAHALI"} value={data.venue} preset={preset} wide />
        </div>

        <div style={{ width: "100%", display: "flex", gap: 12, marginTop: 12 }}>
          <div style={{ width: "50%", minHeight: 94, display: "flex", flexDirection: "column", justifyContent: "center", padding: "14px 18px", borderRadius: 15, border: `1px solid ${preset.accent}`, backgroundColor: preset.soft }}>
            <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: 2, color: preset.accent }}>DRESS CODE</div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
              <div style={{ width: 22, height: 22, display: "flex", flexShrink: 0, marginRight: 10, borderRadius: 999, border: `3px solid ${preset.accent}`, backgroundColor: preset.outer }} />
              <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 17, lineHeight: 1.18, fontWeight: 800, color: preset.ink }}>
                {data.dressCode || (data.language === "en" ? "Not specified" : "Haijaainishwa")}
              </div>
            </div>
          </div>

          <div style={{ width: "50%", minHeight: 94, display: "flex", flexDirection: "column", justifyContent: "center", padding: "14px 18px", borderRadius: 15, border: `1px solid ${preset.accent}`, backgroundColor: preset.soft }}>
            <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: 2, color: preset.accent }}>
              {data.language === "en" ? "STATUS" : "STATUS YA MWALIKO"}
            </div>
            <div style={{ display: "flex", marginTop: 7, fontFamily: "Arial, sans-serif", fontSize: 20, fontWeight: 900, color: preset.ink }}>{status.title}</div>
            <div style={{ display: "flex", marginTop: 2, fontFamily: "Arial, sans-serif", fontSize: 15, fontWeight: 700, color: preset.muted }}>{status.detail}</div>
          </div>
        </div>

        <div style={{ width: "100%", minHeight: 180, display: "flex", alignItems: "stretch", marginTop: 14, overflow: "hidden", borderRadius: 18, border: `2px solid ${preset.accent}`, backgroundColor: preset.darkPass ? preset.outer : "#FFFDF8", color: preset.darkPass ? "#FFFFFF" : preset.ink }}>
          <div style={{ width: 176, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#FFFFFF", borderRight: `2px dashed ${preset.accent}` }}>
            {data.qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.qrCodeDataUrl} alt="" width={140} height={140} style={{ width: 140, height: 140, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 134, height: 134, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, border: `2px dashed ${preset.accent}`, color: preset.ink, fontFamily: "Arial, sans-serif", fontSize: 15, fontWeight: 900 }}>QR</div>
            )}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "18px 24px" }}>
            <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: 2.5, color: preset.accent }}>VERIFIED EVENT PASS</div>
            <div style={{ display: "flex", marginTop: 9, fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: 1.8, opacity: 0.76 }}>
              {data.language === "en" ? "ENTRY PASS ID" : "PASS ID YA KUINGIA"}
            </div>
            <div style={{ display: "flex", marginTop: 4, fontFamily: "Georgia, serif", fontSize: 40, lineHeight: 1, fontWeight: 700, letterSpacing: 1.2 }}>{passId}</div>
            <div style={{ display: "flex", marginTop: 12, fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 800, opacity: 0.76 }}>
              {data.language === "en" ? "Keep this pass for entry" : "Hifadhi pass hii kwa ajili ya kuingia"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 14, fontFamily: "Georgia, serif", fontSize: 17, fontStyle: "italic", color: preset.muted, textAlign: "center" }}>
          {data.language === "en" ? "We look forward to celebrating with you" : "Tunatarajia kwa furaha kuungana nawe"}
        </div>
      </div>
    </div>
  );
}