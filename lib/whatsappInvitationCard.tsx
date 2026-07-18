import type { ReactElement } from "react";
import { ImageResponse } from "next/og";

import type { PublicInvitation } from "@/services/invitationService";

export type WhatsAppCardTemplate =
  | "classic_photo"
  | "elegant_gold"
  | "modern_floral"
  | "luxury_envelope"
  | "minimal_ivory"
  | "royal_dark";

export type WhatsAppCardData = {
  title: string;
  date: string;
  venue: string;
  guestName: string;
  guestLabel: string;
  coverImageUrl: string | null;
  primary: string;
  secondary: string;
  accent: string;
};

type RenderData = WhatsAppCardData & {
  coverImageDataUrl: string | null;
  primaryText: string;
  secondaryText: string;
  accentText: string;
  titleSize: number;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const COVER_FETCH_TIMEOUT_MS = 6_000;
const MAX_COVER_BYTES = 8 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function cleanText(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function formatDate(dateValue: string | null, language: "sw" | "en") {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function safeColor(value: string | null, fallback: string) {
  const normalized = value?.trim();

  return normalized && /^#[0-9a-f]{6}$/i.test(normalized)
    ? normalized.toUpperCase()
    : fallback;
}

function readableText(background: string) {
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  const luminance =
    (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance > 0.56 ? "#111827" : "#FFFFFF";
}

function displayTitle(invitation: PublicInvitation) {
  const eventType = cleanText(invitation.event_type, "").toLowerCase();
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

function titleFontSize(title: string) {
  if (title.length > 55) return 52;
  if (title.length > 38) return 60;
  if (title.length > 25) return 68;
  return 78;
}

export function normalizeWhatsAppCardTemplate(
  template: string | null | undefined
): WhatsAppCardTemplate {
  if (
    template === "elegant_gold" ||
    template === "modern_floral" ||
    template === "luxury_envelope" ||
    template === "minimal_ivory" ||
    template === "royal_dark"
  ) {
    return template;
  }

  return "classic_photo";
}

export function getWhatsAppCardData(
  invitation: PublicInvitation
): WhatsAppCardData {
  const language = invitation.language === "en" ? "en" : "sw";

  return {
    title: cleanText(displayTitle(invitation), "Invitation"),
    date: formatDate(invitation.event_date, language),
    venue: cleanText(invitation.venue, "-"),
    guestName: cleanText(invitation.guest_name, "Guest"),
    guestLabel: language === "en" ? "PREPARED FOR" : "KWA HESHIMA YA",
    coverImageUrl: invitation.cover_image_url?.trim() || null,
    primary: safeColor(invitation.theme_primary_color, "#BE123C"),
    secondary: safeColor(invitation.theme_secondary_color, "#FFF1F2"),
    accent: safeColor(invitation.theme_accent_color, "#D4AF37"),
  };
}

function isPng(bytes: Uint8Array) {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function isJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

async function fetchCoverImageDataUrl(urlValue: string | null) {
  if (!urlValue) {
    return null;
  }

  try {
    const url = new URL(urlValue);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Cover image URL must use HTTP or HTTPS.");
    }

    const response = await fetch(url, {
      headers: {
        Accept: "image/png,image/jpeg",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(COVER_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Cover image returned HTTP ${response.status}.`);
    }

    const declaredLength = Number(response.headers.get("content-length"));

    if (declaredLength > MAX_COVER_BYTES) {
      throw new Error("Cover image is larger than 8 MB.");
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength === 0 || buffer.byteLength > MAX_COVER_BYTES) {
      throw new Error("Cover image is empty or larger than 8 MB.");
    }

    const bytes = new Uint8Array(buffer);
    const mimeType = isPng(bytes)
      ? "image/png"
      : isJpeg(bytes)
        ? "image/jpeg"
        : null;

    if (!mimeType) {
      throw new Error("Cover image is not a supported PNG or JPEG file.");
    }

    return `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch (error) {
    console.warn("WhatsApp card cover image fallback:", {
      urlHost: getUrlHost(urlValue),
      reason: error instanceof Error ? error.message : "Unknown image error",
    });

    return null;
  }
}

function getUrlHost(urlValue: string) {
  try {
    return new URL(urlValue).host;
  } catch {
    return "invalid-url";
  }
}

function renderData(
  data: WhatsAppCardData,
  coverImageDataUrl: string | null
): RenderData {
  const primary = safeColor(data.primary, "#BE123C");
  const secondary = safeColor(data.secondary, "#FFF1F2");
  const accent = safeColor(data.accent, "#D4AF37");
  const title = cleanText(data.title, "Invitation");

  return {
    ...data,
    title,
    date: cleanText(data.date, "-"),
    venue: cleanText(data.venue, "-"),
    guestName: cleanText(data.guestName, "Guest"),
    guestLabel: cleanText(data.guestLabel, "PREPARED FOR"),
    primary,
    secondary,
    accent,
    coverImageDataUrl,
    primaryText: readableText(primary),
    secondaryText: readableText(secondary),
    accentText: readableText(accent),
    titleSize: titleFontSize(title),
  };
}

async function materializePng(element: ReactElement) {
  const imageResponse = new ImageResponse(element, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });
  const buffer = await imageResponse.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (!isPng(bytes) || buffer.byteLength < 1_000) {
    throw new Error("ImageResponse did not produce a valid PNG.");
  }

  return buffer;
}

function pngResponse(buffer: ArrayBuffer) {
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "public, max-age=300, s-maxage=300, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function createWhatsAppInvitationCard(
  template: WhatsAppCardTemplate,
  data: WhatsAppCardData
) {
  const coverImageDataUrl = await fetchCoverImageDataUrl(data.coverImageUrl);
  let normalizedData = renderData(data, coverImageDataUrl);

  try {
    return pngResponse(
      await materializePng(renderWhatsAppCard(template, normalizedData))
    );
  } catch (error) {
    if (normalizedData.coverImageDataUrl) {
      console.warn("WhatsApp card image decode fallback:", error);
      normalizedData = renderData(data, null);

      try {
        return pngResponse(
          await materializePng(renderWhatsAppCard(template, normalizedData))
        );
      } catch (fallbackError) {
        console.error("WhatsApp card template fallback failed:", fallbackError);
      }
    } else {
      console.error("WhatsApp card template render failed:", error);
    }

    return pngResponse(await materializePng(<SafeFallbackCard data={normalizedData} />));
  }
}

function renderWhatsAppCard(
  template: WhatsAppCardTemplate,
  data: RenderData
): ReactElement {
  switch (template) {
    case "elegant_gold":
      return <ElegantGoldCard data={data} />;
    case "modern_floral":
      return <ModernFloralCard data={data} />;
    case "luxury_envelope":
      return <LuxuryEnvelopeCard data={data} />;
    case "minimal_ivory":
      return <MinimalIvoryCard data={data} />;
    case "royal_dark":
      return <RoyalDarkCard data={data} />;
    default:
      return <ClassicPhotoCard data={data} />;
  }
}

function CoverImage({
  data,
  borderRadius,
}: {
  data: RenderData;
  borderRadius?: string | number;
}) {
  if (!data.coverImageDataUrl) return null;

  return (
    // Satori requires a plain img element and receives validated embedded bytes.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={data.coverImageDataUrl}
      alt=""
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...(borderRadius
          ? {
              borderRadius,
            }
          : {}),
      }}
    />
  );
}

function Brand({ color }: { color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        fontSize: 24,
        fontWeight: 700,
        color,
      }}
    >
      <div
        style={{
          width: 34,
          height: 3,
          display: "flex",
          marginRight: 14,
          backgroundColor: color,
        }}
      />
      Smart Event Pass
    </div>
  );
}

function Guest({
  data,
  color,
  centered = false,
}: {
  data: RenderData;
  color: string;
  centered?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: centered ? "center" : "flex-start",
        color,
        textAlign: centered ? "center" : "left",
      }}
    >
      <div
        style={{
          display: "flex",
          fontFamily: "Arial, sans-serif",
          fontSize: 20,
          fontWeight: 700,
          opacity: 0.72,
        }}
      >
        {data.guestLabel}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 10,
          fontFamily: "Georgia, serif",
          fontSize: 38,
          lineHeight: 1.15,
          fontWeight: 700,
        }}
      >
        {data.guestName}
      </div>
    </div>
  );
}

function Details({
  data,
  color,
  centered = false,
}: {
  data: RenderData;
  color: string;
  centered?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: centered ? "center" : "flex-start",
        color,
        fontFamily: "Arial, sans-serif",
        textAlign: centered ? "center" : "left",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>
        {data.date}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 13,
          fontSize: 27,
          lineHeight: 1.3,
          opacity: 0.82,
        }}
      >
        {data.venue}
      </div>
    </div>
  );
}

function ClassicPhotoCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        overflow: "hidden",
        backgroundColor: data.primary,
        color: "#FFFFFF",
      }}
    >
      {hasImage ? <CoverImage data={data} /> : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          background: hasImage
            ? "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.08) 35%, rgba(0,0,0,0.92))"
            : `linear-gradient(145deg, ${data.primary}, #111827)`,
        }}
      />
      {!hasImage ? (
        <div
          style={{
            position: "absolute",
            left: 150,
            top: 235,
            width: 780,
            height: 780,
            display: "flex",
            borderRadius: 390,
            border: `3px solid ${data.accent}`,
            opacity: 0.42,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 72,
          width: 936,
          height: 1206,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "24px 26px 30px",
          borderTop: `4px solid ${data.accent}`,
          borderBottom: `4px solid ${data.secondary}`,
        }}
      >
        <Brand color="#FFFFFF" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: hasImage ? "flex-start" : "center",
            textAlign: hasImage ? "left" : "center",
          }}
        >
          <div
            style={{
              width: 96,
              height: 8,
              display: "flex",
              marginBottom: 30,
              backgroundColor: data.accent,
            }}
          />
          <div
            style={{
              display: "flex",
              maxWidth: 850,
              fontFamily: "Georgia, serif",
              fontSize: hasImage ? data.titleSize : Math.min(88, data.titleSize + 10),
              lineHeight: 1.02,
              fontWeight: 700,
            }}
          >
            {data.title}
          </div>
          <div style={{ display: "flex", marginTop: 32 }}>
            <Details data={data} color="#FFFFFF" centered={!hasImage} />
          </div>
          <div
            style={{
              width: hasImage ? "100%" : 620,
              display: "flex",
              justifyContent: hasImage ? "flex-start" : "center",
              marginTop: 38,
              paddingTop: 30,
              borderTop: "1px solid rgba(255,255,255,0.45)",
            }}
          >
            <Guest data={data} color="#FFFFFF" centered={!hasImage} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ElegantGoldCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);
  const ink = data.secondaryText;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        padding: 54,
        backgroundColor: data.secondary,
        color: ink,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "48px 62px 44px",
          border: `4px solid ${data.accent}`,
          boxShadow: `inset 0 0 0 14px ${data.secondary}, inset 0 0 0 16px ${data.primary}`,
        }}
      >
        <Brand color={data.primary} />
        <div
          style={{
            width: hasImage ? 440 : 580,
            height: hasImage ? 440 : 400,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: hasImage ? 220 : 290,
            border: `9px solid ${data.accent}`,
            boxShadow: `0 0 0 3px ${data.primary}`,
            backgroundColor: data.primary,
            color: data.primaryText,
          }}
        >
          {hasImage ? (
            <CoverImage data={data} borderRadius={220} />
          ) : (
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                padding: "0 54px",
                fontFamily: "Georgia, serif",
                fontSize: Math.min(60, data.titleSize),
                lineHeight: 1.05,
                textAlign: "center",
              }}
            >
              {data.title}
            </div>
          )}
        </div>
        {hasImage ? (
          <div
            style={{
              display: "flex",
              maxWidth: 820,
              color: data.primary,
              fontFamily: "Georgia, serif",
              fontSize: Math.min(66, data.titleSize),
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            {data.title}
          </div>
        ) : null}
        <Details data={data} color={ink} centered />
        <div
          style={{
            width: 110,
            height: 3,
            display: "flex",
            backgroundColor: data.accent,
          }}
        />
        <Guest data={data} color={ink} centered />
      </div>
    </div>
  );
}

function Leaf({ color, rotation }: { color: string; rotation: number }) {
  return (
    <div
      style={{
        width: 92,
        height: 42,
        display: "flex",
        borderRadius: "92px 0 92px 0",
        backgroundColor: color,
        transform: `rotate(${rotation}deg)`,
      }}
    />
  );
}

function Botanical({
  color,
  right = false,
}: {
  color: string;
  right?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        ...(right
          ? {
              right: 28,
              bottom: 28,
            }
          : {
              left: 28,
              top: 28,
            }),
        ...(right
          ? {
              transform: "rotate(180deg)",
            }
          : {}),
      }}
    >
      <Leaf color={color} rotation={-28} />
      <div style={{ display: "flex", marginLeft: 55, marginTop: 2 }}>
        <Leaf color={color} rotation={24} />
      </div>
      <div style={{ display: "flex", marginLeft: 12, marginTop: 2 }}>
        <Leaf color={color} rotation={-15} />
      </div>
    </div>
  );
}

function ModernFloralCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);
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
        justifyContent: "space-between",
        overflow: "hidden",
        padding: "72px 84px 64px",
        backgroundColor: data.secondary,
        color: ink,
      }}
    >
      <Botanical color={data.accent} />
      <Botanical color={data.primary} right />
      <Brand color={data.primary} />
      <div
        style={{
          width: 710,
          height: hasImage ? 570 : 535,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: "355px 355px 56px 56px",
          border: `8px solid ${data.primary}`,
          background: hasImage
            ? data.primary
            : `linear-gradient(160deg, ${data.primary}, ${data.accent})`,
          color: hasImage ? "#FFFFFF" : data.primaryText,
        }}
      >
        {hasImage ? (
          <CoverImage
            data={data}
            borderRadius="347px 347px 48px 48px"
          />
        ) : (
          <div
            style={{
              display: "flex",
              maxWidth: 570,
              fontFamily: "Georgia, serif",
              fontSize: Math.min(72, data.titleSize + 4),
              lineHeight: 1.02,
              textAlign: "center",
            }}
          >
            {data.title}
          </div>
        )}
      </div>
      {hasImage ? (
        <div
          style={{
            display: "flex",
            maxWidth: 850,
            color: data.primary,
            fontFamily: "Georgia, serif",
            fontSize: data.titleSize,
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {data.title}
        </div>
      ) : null}
      <Details data={data} color={ink} centered />
      <div
        style={{
          display: "flex",
          padding: "22px 54px",
          borderTop: `3px solid ${data.accent}`,
          borderBottom: `3px solid ${data.accent}`,
        }}
      >
        <Guest data={data} color={ink} centered />
      </div>
    </div>
  );
}

function LuxuryEnvelopeCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);
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
        background: `linear-gradient(145deg, ${data.primary}, ${data.accent})`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: "54px 58px 48px",
          backgroundColor: data.secondary,
          color: ink,
          border: `4px solid ${data.accent}`,
          boxShadow: "0 26px 70px rgba(0,0,0,0.28)",
        }}
      >
        <Brand color={data.primary} />
        <div
          style={{
            width: 700,
            height: hasImage ? 405 : 385,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            border: `5px solid ${data.accent}`,
            backgroundColor: data.primary,
            color: data.primaryText,
          }}
        >
          {hasImage ? (
            <CoverImage data={data} />
          ) : (
            <>
              <div
                style={{
                  position: "absolute",
                  left: -40,
                  top: -160,
                  width: 780,
                  height: 390,
                  display: "flex",
                  transform: "rotate(45deg)",
                  borderRight: `3px solid ${data.accent}`,
                  borderBottom: `3px solid ${data.accent}`,
                  opacity: 0.55,
                }}
              />
              <div
                style={{
                  display: "flex",
                  maxWidth: 570,
                  fontFamily: "Georgia, serif",
                  fontSize: Math.min(66, data.titleSize),
                  lineHeight: 1.04,
                  textAlign: "center",
                }}
              >
                {data.title}
              </div>
            </>
          )}
        </div>
        {hasImage ? (
          <div
            style={{
              display: "flex",
              maxWidth: 820,
              color: data.primary,
              fontFamily: "Georgia, serif",
              fontSize: data.titleSize,
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            {data.title}
          </div>
        ) : null}
        <Details data={data} color={ink} centered />
        <div
          style={{
            width: 142,
            height: 142,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 71,
            border: `5px solid ${data.accent}`,
            boxShadow: `inset 0 0 0 5px ${data.primary}`,
            backgroundColor: data.primary,
            color: data.primaryText,
            fontFamily: "Georgia, serif",
            fontSize: 50,
            fontWeight: 700,
          }}
        >
          S
        </div>
        <Guest data={data} color={ink} centered />
      </div>
    </div>
  );
}

function RoyalDarkCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        overflow: "hidden",
        backgroundColor: "#090C12",
        color: "#FFFFFF",
      }}
    >
      <div
        style={{
          width: 455,
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: hasImage
            ? data.primary
            : `linear-gradient(160deg, ${data.primary}, #090C12)`,
        }}
      >
        {hasImage ? <CoverImage data={data} /> : null}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            background: hasImage
              ? "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(9,12,18,0.82))"
              : "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(9,12,18,0.58))",
          }}
        />
        {!hasImage ? (
          <>
            <div
              style={{
                width: 300,
                height: 520,
                display: "flex",
                border: `3px solid ${data.accent}`,
                transform: "rotate(8deg)",
                opacity: 0.72,
              }}
            />
            <div
              style={{
                position: "absolute",
                display: "flex",
                color: data.accent,
                fontFamily: "Georgia, serif",
                fontSize: 150,
              }}
            >
              S
            </div>
          </>
        ) : null}
        <div
          style={{
            position: "absolute",
            left: 54,
            bottom: 68,
            width: 345,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              width: 60,
              height: 7,
              display: "flex",
              backgroundColor: data.accent,
            }}
          />
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontFamily: "Arial, sans-serif",
              fontSize: 27,
              lineHeight: 1.3,
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
          padding: "76px 66px 70px",
          borderLeft: `8px solid ${data.accent}`,
          background: `linear-gradient(145deg, #090C12 55%, ${data.primary} 170%)`,
        }}
      >
        <Brand color={data.accent} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              color: data.accent,
              fontFamily: "Arial, sans-serif",
              fontSize: 27,
              fontWeight: 700,
            }}
          >
            {data.date}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 475,
              marginTop: 34,
              fontFamily: "Georgia, serif",
              fontSize: Math.min(76, data.titleSize),
              lineHeight: 1,
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              width: 110,
              height: 3,
              display: "flex",
              marginTop: 40,
              backgroundColor: data.secondary,
            }}
          />
        </div>
        <Guest data={data} color="#FFFFFF" />
      </div>
    </div>
  );
}

function MinimalIvoryCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 42, backgroundColor: "#FBF7ED", color: "#27231D" }}>
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "44px 64px 48px", border: `3px solid ${data.accent}` }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", paddingBottom: 24, borderBottom: `2px solid ${data.accent}`, color: data.primary, fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 4 }}>
          <div style={{ display: "flex" }}>SMART EVENT PASS</div><div style={{ display: "flex" }}>INVITATION</div>
        </div>
        <div style={{ width: hasImage ? 190 : 154, height: hasImage ? 250 : 202, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "50%", border: `3px solid ${data.accent}`, color: data.primary, fontFamily: "Georgia, serif", fontSize: 66 }}>
          {hasImage ? <CoverImage data={data} borderRadius="50%" /> : "&"}
        </div>
        <div style={{ maxWidth: 850, display: "flex", color: data.primary, fontFamily: "Georgia, serif", fontSize: Math.min(82, data.titleSize + 6), lineHeight: 0.98, textAlign: "center" }}>{data.title}</div>
        <div style={{ width: 130, height: 2, display: "flex", backgroundColor: data.accent }} />
        <Details data={data} color="#514B43" centered />
        <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "28px 30px", borderTop: `2px solid ${data.accent}`, borderBottom: `2px solid ${data.accent}` }}><Guest data={data} color={data.primary} centered /></div>
      </div>
    </div>
  );
}

function SafeFallbackCard({ data }: { data: RenderData }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 90,
        backgroundColor: data.secondary,
        color: data.secondaryText,
        textAlign: "center",
      }}
    >
      <Brand color={data.primary} />
      <div
        style={{
          width: 820,
          height: 720,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 70,
          border: `5px solid ${data.accent}`,
        }}
      >
        <div
          style={{
            display: "flex",
            color: data.primary,
            fontFamily: "Georgia, serif",
            fontSize: data.titleSize,
            lineHeight: 1.05,
          }}
        >
          {data.title}
        </div>
        <div style={{ display: "flex", marginTop: 45 }}>
          <Details data={data} color={data.secondaryText} centered />
        </div>
      </div>
      <Guest data={data} color={data.secondaryText} centered />
    </div>
  );
}
