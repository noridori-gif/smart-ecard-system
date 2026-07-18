import type { ReactElement } from "react";
import { ImageResponse } from "next/og";

import {
  getInvitationByToken,
  type PublicInvitation,
} from "@/services/invitationService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

type CardTemplate =
  | "classic_photo"
  | "elegant_gold"
  | "modern_floral"
  | "luxury_envelope"
  | "royal_dark";

type CardData = {
  title: string;
  date: string;
  venue: string;
  guestName: string;
  coverImageUrl: string | null;
  primary: string;
  secondary: string;
  accent: string;
  primaryText: string;
  secondaryText: string;
  guestLabel: string;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

function formatDate(
  dateValue: string | null,
  language: "sw" | "en"
) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(
    language === "en" ? "en-GB" : "sw-TZ",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(date);
}

function safeColor(value: string | null, fallback: string) {
  const normalized = value?.trim();

  return normalized && /^#[0-9a-f]{6}$/i.test(normalized)
    ? normalized
    : fallback;
}

function readableText(background: string) {
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  const luminance =
    (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance > 0.55 ? "#111827" : "#FFFFFF";
}

function normalizeTemplate(template: string | null | undefined): CardTemplate {
  if (
    template === "elegant_gold" ||
    template === "modern_floral" ||
    template === "luxury_envelope" ||
    template === "royal_dark"
  ) {
    return template;
  }

  return "classic_photo";
}

function getDisplayTitle(invitation: PublicInvitation) {
  const eventType = invitation.event_type.trim().toLowerCase();
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

function buildCardData(invitation: PublicInvitation): CardData {
  const language = invitation.language === "en" ? "en" : "sw";
  const primary = safeColor(invitation.theme_primary_color, "#BE123C");
  const secondary = safeColor(invitation.theme_secondary_color, "#FFF1F2");
  const accent = safeColor(invitation.theme_accent_color, "#D4AF37");

  return {
    title: getDisplayTitle(invitation),
    date: formatDate(invitation.event_date, language),
    venue: invitation.venue || "-",
    guestName: invitation.guest_name,
    coverImageUrl: invitation.cover_image_url,
    primary,
    secondary,
    accent,
    primaryText: readableText(primary),
    secondaryText: readableText(secondary),
    guestLabel: language === "en" ? "Prepared for" : "Kwa heshima ya",
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;

    if (!token) {
      return new Response("Invitation token is missing.", { status: 400 });
    }

    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return new Response("Invitation not found.", { status: 404 });
    }

    const data = buildCardData(invitation);
    const template = normalizeTemplate(invitation.invitation_template);

    return new ImageResponse(renderCard(template, data), {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("Invitation card generation error:", error);

    return new Response(
      error instanceof Error ? error.message : "Card generation failed.",
      { status: 500 }
    );
  }
}

function renderCard(template: CardTemplate, data: CardData): ReactElement {
  switch (template) {
    case "elegant_gold":
      return <ElegantGoldCard data={data} />;
    case "modern_floral":
      return <ModernFloralCard data={data} />;
    case "luxury_envelope":
      return <LuxuryEnvelopeCard data={data} />;
    case "royal_dark":
      return <RoyalDarkCard data={data} />;
    default:
      return <ClassicPhotoCard data={data} />;
  }
}

function CoverImage({
  data,
  style,
}: {
  data: CardData;
  style?: Record<string, string | number>;
}) {
  if (!data.coverImageUrl) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: `linear-gradient(145deg, ${data.primary}, ${data.accent})`,
          ...style,
        }}
      />
    );
  }

  return (
    // ImageResponse renders remote images through Satori, not next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={data.coverImageUrl}
      alt=""
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...style,
      }}
    />
  );
}

function PassMark({ color }: { color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 22,
        fontWeight: 700,
        color,
      }}
    >
      <div
        style={{
          width: 28,
          height: 2,
          display: "flex",
          backgroundColor: color,
        }}
      />
      Smart Event Pass
    </div>
  );
}

function GuestBlock({
  data,
  color,
  align = "left",
}: {
  data: CardData;
  color: string;
  align?: "left" | "center";
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
        color,
      }}
    >
      <div style={{ display: "flex", fontSize: 20, opacity: 0.72 }}>
        {data.guestLabel}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 7,
          fontSize: 34,
          lineHeight: 1.15,
          fontWeight: 700,
        }}
      >
        {data.guestName}
      </div>
    </div>
  );
}

function ClassicPhotoCard({ data }: { data: CardData }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        overflow: "hidden",
        fontFamily: "Arial, sans-serif",
        backgroundColor: data.primary,
        color: "#FFFFFF",
      }}
    >
      <CoverImage data={data} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.08) 34%, rgba(0,0,0,0.88) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 72,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderTop: `3px solid ${data.accent}`,
          borderBottom: `3px solid ${data.secondary}`,
          paddingTop: 22,
        }}
      >
        <PassMark color="#FFFFFF" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              width: 76,
              height: 8,
              marginBottom: 25,
              backgroundColor: data.accent,
            }}
          />
          <div
            style={{
              display: "flex",
              maxWidth: 880,
              fontFamily: "Georgia, serif",
              fontSize: 76,
              lineHeight: 1.02,
              fontWeight: 700,
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 30,
              lineHeight: 1.3,
            }}
          >
            {data.date} · {data.venue}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              paddingTop: 25,
              borderTop: "1px solid rgba(255,255,255,0.42)",
            }}
          >
            <GuestBlock data={data} color="#FFFFFF" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ElegantGoldCard({ data }: { data: CardData }) {
  const ink = data.secondaryText;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        padding: 54,
        backgroundColor: data.secondary,
        color: ink,
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "52px 64px 48px",
          border: `3px solid ${data.accent}`,
          boxShadow: `inset 0 0 0 14px ${data.secondary}, inset 0 0 0 15px ${data.primary}`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Arial, sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: data.primary,
          }}
        >
          Smart Event Pass
        </div>
        <div
          style={{
            width: 560,
            height: 560,
            position: "relative",
            display: "flex",
            overflow: "hidden",
            marginTop: 35,
            borderRadius: 280,
            border: `10px solid ${data.accent}`,
            boxShadow: `0 0 0 3px ${data.primary}`,
            backgroundColor: data.primary,
          }}
        >
          <CoverImage data={data} />
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 39,
            maxWidth: 790,
            textAlign: "center",
            fontSize: 63,
            lineHeight: 1.02,
            color: data.primary,
          }}
        >
          {data.title}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 27,
            textAlign: "center",
          }}
        >
          {data.date} · {data.venue}
        </div>
        <div
          style={{
            width: 90,
            height: 2,
            display: "flex",
            marginTop: 26,
            backgroundColor: data.accent,
          }}
        />
        <div style={{ display: "flex", marginTop: 20 }}>
          <GuestBlock data={data} color={ink} align="center" />
        </div>
      </div>
    </div>
  );
}

function Leaf({
  color,
  rotate,
}: {
  color: string;
  rotate: number;
}) {
  return (
    <div
      style={{
        width: 72,
        height: 32,
        display: "flex",
        borderRadius: "72px 0 72px 0",
        backgroundColor: color,
        transform: `rotate(${rotate}deg)`,
      }}
    />
  );
}

function BotanicalCorner({
  color,
  flipped = false,
}: {
  color: string;
  flipped?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: flipped ? "auto" : 34,
        right: flipped ? 34 : "auto",
        bottom: flipped ? 34 : "auto",
        left: flipped ? "auto" : 34,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        transform: flipped ? "rotate(180deg)" : "none",
      }}
    >
      <Leaf color={color} rotate={-28} />
      <div style={{ display: "flex", marginLeft: 39 }}>
        <Leaf color={color} rotate={24} />
      </div>
      <div style={{ display: "flex", marginLeft: 12 }}>
        <Leaf color={color} rotate={-18} />
      </div>
    </div>
  );
}

function ModernFloralCard({ data }: { data: CardData }) {
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
        overflow: "hidden",
        padding: "70px 82px 62px",
        backgroundColor: data.secondary,
        color: ink,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <BotanicalCorner color={data.accent} />
      <BotanicalCorner color={data.primary} flipped />
      <PassMark color={data.primary} />
      <div
        style={{
          width: 700,
          height: 610,
          position: "relative",
          display: "flex",
          overflow: "hidden",
          marginTop: 38,
          borderRadius: "350px 350px 56px 56px",
          border: `7px solid ${data.primary}`,
          backgroundColor: data.primary,
        }}
      >
        <CoverImage data={data} />
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: 850,
          marginTop: 42,
          color: data.primary,
          fontFamily: "Georgia, serif",
          fontSize: 66,
          lineHeight: 1,
          textAlign: "center",
        }}
      >
        {data.title}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 21,
          fontSize: 28,
          textAlign: "center",
        }}
      >
        {data.date} · {data.venue}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 28,
          padding: "19px 42px",
          borderTop: `2px solid ${data.accent}`,
          borderBottom: `2px solid ${data.accent}`,
        }}
      >
        <GuestBlock data={data} color={ink} align="center" />
      </div>
    </div>
  );
}

function LuxuryEnvelopeCard({ data }: { data: CardData }) {
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
        backgroundColor: data.primary,
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          opacity: 0.2,
          background:
            `linear-gradient(35deg, ${data.primary} 50%, ${data.accent} 50%)`,
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          overflow: "hidden",
          padding: "52px 58px",
          backgroundColor: data.secondary,
          color: ink,
          border: `3px solid ${data.accent}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        }}
      >
        <PassMark color={data.primary} />
        <div
          style={{
            width: 690,
            height: 430,
            position: "relative",
            display: "flex",
            overflow: "hidden",
            marginTop: 34,
            border: `5px solid ${data.accent}`,
            backgroundColor: data.primary,
          }}
        >
          <CoverImage data={data} />
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 820,
            marginTop: 42,
            color: data.primary,
            fontSize: 64,
            lineHeight: 1.03,
            textAlign: "center",
          }}
        >
          {data.title}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontFamily: "Arial, sans-serif",
            fontSize: 27,
            textAlign: "center",
          }}
        >
          {data.date} · {data.venue}
        </div>
        <div
          style={{
            width: 164,
            height: 164,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 28,
            borderRadius: 82,
            border: `5px double ${data.accent}`,
            backgroundColor: data.primary,
            color: data.primaryText,
            fontSize: 57,
          }}
        >
          S
        </div>
        <div style={{ display: "flex", marginTop: 22 }}>
          <GuestBlock data={data} color={ink} align="center" />
        </div>
        <div
          style={{
            position: "absolute",
            right: -120,
            bottom: -130,
            width: 430,
            height: 250,
            display: "flex",
            transform: "rotate(-32deg)",
            borderTop: `2px solid ${data.accent}`,
          }}
        />
      </div>
    </div>
  );
}

function RoyalDarkCard({ data }: { data: CardData }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
        backgroundColor: "#090C12",
        color: "#FFFFFF",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: 470,
          height: "100%",
          position: "relative",
          display: "flex",
          overflow: "hidden",
          backgroundColor: data.primary,
        }}
      >
        <CoverImage data={data} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.06), rgba(9,12,18,0.76))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 54,
            right: 54,
            bottom: 62,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: 52,
              height: 6,
              display: "flex",
              backgroundColor: data.accent,
            }}
          />
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 25,
              lineHeight: 1.35,
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
          padding: "74px 66px 68px",
          borderLeft: `7px solid ${data.accent}`,
          background:
            `linear-gradient(145deg, #090C12 55%, ${data.primary} 160%)`,
        }}
      >
        <PassMark color={data.accent} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: data.accent,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {data.date}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 470,
              marginTop: 32,
              fontFamily: "Georgia, serif",
              fontSize: 72,
              lineHeight: 1,
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              width: 100,
              height: 2,
              display: "flex",
              marginTop: 36,
              backgroundColor: data.secondary,
            }}
          />
        </div>
        <GuestBlock data={data} color="#FFFFFF" />
      </div>
    </div>
  );
}
