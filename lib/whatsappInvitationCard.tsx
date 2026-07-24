import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import PremiumWhatsAppCard, {
  CompactHorizontalCard,
} from "./PremiumWhatsAppCard";

import type { PublicInvitation } from "@/services/invitationService";

export type WhatsAppCardTemplate =
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

export type WhatsAppCardData = {
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
  qrToken: string | null;
  language: "sw" | "en";
  invitationTemplate: WhatsAppCardTemplate;
  coverImageUrl: string | null;
  primary: string;
  secondary: string;
  accent: string;
};

type RenderData = WhatsAppCardData & {
  coverImageDataUrl: string | null;
  qrCodeDataUrl: string | null;
  primaryText: string;
  secondaryText: string;
  accentText: string;
  titleSize: number;
};

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1600;
const COVER_FETCH_TIMEOUT_MS = 6_000;
const MAX_COVER_BYTES = 8 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_FORMAT_SIGNATURE = [0x57, 0x45, 0x42, 0x50];

function cleanText(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function truncateInvitationMessage(value: string, maxLength = 210) {
  if (value.length <= maxLength) return value;

  const shortened = value.slice(0, maxLength + 1);
  const lastBreak = Math.max(
    shortened.lastIndexOf("\n"),
    shortened.lastIndexOf(". "),
    shortened.lastIndexOf(", "),
    shortened.lastIndexOf(" ")
  );
  const cutoff = lastBreak >= maxLength * 0.65 ? lastBreak : maxLength;

  return `${shortened.slice(0, cutoff).trim().replace(/[.,;:!?-]+$/, "")}…`;
}

function formatInvitationMessage(
  data: WhatsAppCardData
) {
  const fallback =
    data.language === "en"
      ? "The family and event hosts are delighted to invite"
      : "Familia na waandaaji wa hafla wana furaha kukualika";
  let message = data.invitationMessage.trim();

  if (!message) return fallback;

  message = message
    .replace(/\r\n?/g, "\n")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n");

  const duplicateValues = [
    data.guestName,
    data.title,
    data.eventPassId,
    data.date,
    data.ceremonyTime,
    data.eventTime,
    data.ceremonyVenue,
    data.receptionVenue,
    data.venue,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value && value !== "-"));

  for (const duplicate of duplicateValues) {
    message = message.replace(
      new RegExp(`(?:^|\\n)[^\\n]{0,28}${escapeRegExp(duplicate)}[^\\n]{0,28}(?=\\n|$)`, "gi"),
      "\n"
    );
  }

  message = message
    .split("\n")
    .filter((line) => {
      const normalized = line.trim().toLowerCase();
      if (!normalized) return false;

      return !(
        /\b(pass\s*id|qr(?:\s*code)?|scan|link|url|sms|whats\s*app|technical|ticket)\b/i.test(normalized) ||
        /\b(tarehe|date|venue|mahali|ukumbi|location|time|saa)\s*[:：-]/i.test(normalized)
      );
    })
    .join("\n");

  const guestName = data.guestName.trim();
  if (guestName) {
    message = message.replace(
      new RegExp(
        `^(?:(?:dear|hello|hi|habari|ndugu|mpendwa)\\s*[,!:-]?\\s*)?${escapeRegExp(guestName)}\\s*[,!:-]?\\s*`,
        "i"
      ),
      ""
    );
  }

  message = message
    .replace(
      new RegExp(`^${escapeRegExp(data.title)}\\s*[,!:-]?\\s*`, "i"),
      ""
    )
    .replace(/\n{2,}/g, "\n")
    .trim();

  if (message.length < 12 || !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(message)) {
    return fallback;
  }

  return truncateInvitationMessage(message);
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

function formatTime(timeValue: string | null, language: "sw" | "en") {
  if (!timeValue) {
    return "";
  }

  const [hoursValue, minutesValue] = timeValue.split(":");
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return timeValue;
  }

  const date = new Date(2000, 0, 1, hours, minutes);

  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", {
    hour: "2-digit",
    minute: "2-digit",
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
    template === "african_royal" ||
    template === "chateau_letterpress" ||
    template === "elegant_gold" ||
    template === "emerald_botanical_halo" ||
    template === "heritage_monogram" ||
    template === "modern_floral" ||
    template === "luxury_envelope" ||
    template === "minimal_ivory" ||
    template === "midnight_luxe" ||
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
  const title = cleanText(displayTitle(invitation), "Invitation");
  const invitationTemplate = normalizeWhatsAppCardTemplate(
    invitation.invitation_template
  );

  return {
    title,
    invitationMessage: invitation.invitation_message?.trim() || "",
    date: formatDate(invitation.event_date, language),
    eventTime: formatTime(invitation.event_time, language),
    venue: cleanText(invitation.venue, "-"),
    ceremonyTitle: cleanText(invitation.ceremony_title, ""),
    ceremonyTime: formatTime(invitation.ceremony_time, language),
    ceremonyVenue: cleanText(invitation.ceremony_venue, ""),
    receptionVenue: cleanText(invitation.venue, ""),
    guestName: cleanText(invitation.guest_name, "Guest"),
    dressCode: cleanText(invitation.dress_code, ""),
    allowedGuests: Number.isFinite(invitation.allowed_guests)
      ? Math.max(1, Math.floor(invitation.allowed_guests))
      : 1,
    eventPassId: cleanText(invitation.event_pass_id, ""),
    qrToken: invitation.qr_token?.trim() || null,
    language,
    invitationTemplate,
    coverImageUrl: invitation.cover_image_url?.trim() || null,
    primary: safeColor(invitation.theme_primary_color, "#145A46"),
    secondary: safeColor(invitation.theme_secondary_color, "#FFF8EC"),
    accent: safeColor(invitation.theme_accent_color, "#C9A962"),
  };
}

function isPng(bytes: Uint8Array) {
  return PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function isJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebP(bytes: Uint8Array) {
  const hasRiffHeader = WEBP_RIFF_SIGNATURE.every(
    (byte, index) => bytes[index] === byte
  );

  const hasWebPHeader = WEBP_FORMAT_SIGNATURE.every(
    (byte, index) => bytes[index + 8] === byte
  );

  return hasRiffHeader && hasWebPHeader;
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
        Accept: "image/png,image/jpeg,image/webp",
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
    : isWebP(bytes)
      ? "image/webp"
      : null;

    if (!mimeType) {
      throw new Error("Cover image is not a supported PNG, JPEG, or WebP file.");
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
  coverImageDataUrl: string | null,
  qrCodeDataUrl: string | null
): RenderData {
  const primary = safeColor(data.primary, "#145A46");
  const secondary = safeColor(data.secondary, "#FFF8EC");
  const accent = safeColor(data.accent, "#C9A962");
  const title = cleanText(data.title, "Invitation");

  return {
    ...data,
    title,
    invitationMessage: formatInvitationMessage(data),
    date: cleanText(data.date, "-"),
    eventTime: cleanText(data.eventTime, ""),
    venue: cleanText(data.venue, "-"),
    ceremonyTitle: cleanText(data.ceremonyTitle, ""),
    ceremonyTime: cleanText(data.ceremonyTime, ""),
    ceremonyVenue: cleanText(data.ceremonyVenue, ""),
    receptionVenue: cleanText(data.receptionVenue, ""),
    guestName: cleanText(data.guestName, "Guest"),
    dressCode: cleanText(data.dressCode, ""),
    eventPassId: cleanText(data.eventPassId, ""),
    allowedGuests: Number.isFinite(data.allowedGuests)
      ? Math.max(1, Math.floor(data.allowedGuests))
      : 1,
    primary,
    secondary,
    accent,
    coverImageDataUrl,
    qrCodeDataUrl,
    primaryText: readableText(primary),
    secondaryText: readableText(secondary),
    accentText: readableText(accent),
    titleSize: titleFontSize(title),
  };
}

async function materializePng(
  element: ReactElement,
  width = CARD_WIDTH,
  height = CARD_HEIGHT
) {
  const imageResponse = new ImageResponse(element, {
    width,
    height,
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

async function buildQrCodeDataUrl(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  try {
    return await QRCode.toDataURL(token, {
      margin: 1,
      width: 240,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    });
  } catch (error) {
    console.warn("WhatsApp card QR fallback:", error);
    return null;
  }
}

export async function createWhatsAppInvitationCard(
  template: WhatsAppCardTemplate,
  data: WhatsAppCardData
) {
  const coverImageDataUrl = await fetchCoverImageDataUrl(data.coverImageUrl);
  const qrCodeDataUrl = await buildQrCodeDataUrl(data.qrToken);
  let normalizedData = renderData(data, coverImageDataUrl, qrCodeDataUrl);

  try {
    return pngResponse(
      await materializePng(renderWhatsAppCard(template, normalizedData))
    );
  } catch (error) {
    if (normalizedData.coverImageDataUrl) {
      console.warn("WhatsApp card image decode fallback:", error);
      normalizedData = renderData(data, null, qrCodeDataUrl);

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

    return pngResponse(
      await materializePng(<SafeFallbackCard data={normalizedData} />)
    );
  }
}

export async function createCompactWhatsAppInvitationCard(
  data: WhatsAppCardData
) {
  const qrCodeDataUrl = await buildQrCodeDataUrl(data.qrToken);
  const normalizedData = renderData(data, null, qrCodeDataUrl);

  return pngResponse(
    await materializePng(
      <CompactHorizontalCard data={normalizedData} />,
      1080,
      520
    )
  );
}

function renderWhatsAppCard(
  template: WhatsAppCardTemplate,
  data: RenderData
): ReactElement {
  return <PremiumWhatsAppCard data={data} template={template} />;
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
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: 22,
        backgroundColor: "rgba(15, 23, 42, 0.06)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.coverImageDataUrl}
        alt=""
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          filter: "blur(26px)",
          opacity: 0.58,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(15,23,42,0.16))",
        }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={data.coverImageDataUrl}
        alt=""
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          borderRadius,
          boxShadow: "0 18px 38px rgba(15,23,42,0.18)",
        }}
      />
    </div>
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
          fontSize: 19,
          fontWeight: 700,
          opacity: 0.72,
        }}
      >
        {data.language === "en" ? "Hello" : "Habari"}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 8,
          fontFamily: "Georgia, serif",
          fontSize: 36,
          lineHeight: 1.12,
          fontWeight: 700,
        }}
      >
        {data.guestName}
      </div>
    </div>
  );
}

function getPassStatusMeta(data: RenderData) {
  const count = Number.isFinite(data.allowedGuests)
    ? Math.max(1, Math.floor(data.allowedGuests))
    : 1;

  if (count === 1) {
    return {
      title: "SINGLE PASS",
      detail: data.language === "en" ? "1 Person" : "Mtu 1",
    };
  }

  if (count === 2) {
    return {
      title: "DOUBLE PASS",
      detail: data.language === "en" ? "2 People" : "Watu 2",
    };
  }

  return {
    title: "GROUP PASS",
    detail: data.language === "en" ? `${count} People` : `Watu ${count}`,
  };
}

function CompactPassStrip({
  data,
  color,
}: {
  data: RenderData;
  color: string;
}) {
  const status = getPassStatusMeta(data);
  const passId = cleanText(
    data.eventPassId,
    data.language === "en" ? "PENDING" : "INASUBIRI"
  );

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        alignItems: "stretch",
        marginTop: 18,
        borderRadius: 18,
        overflow: "hidden",
        border: `2px solid ${data.accent}`,
        backgroundColor: data.secondary,
        color,
      }}
    >
      <div
        style={{
          width: 132,
          minHeight: 132,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
          backgroundColor: "#FFFFFF",
          borderRight: `1px dashed ${data.accent}`,
        }}
      >
        {data.qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.qrCodeDataUrl}
            alt=""
            width={110}
            height={110}
            style={{
              width: 110,
              height: 110,
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              fontFamily: "Arial, sans-serif",
              fontSize: 14,
              fontWeight: 800,
              textAlign: "center",
              color: data.primary,
            }}
          >
            QR
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "15px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Arial, sans-serif",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 2.4,
            color: data.accent,
          }}
        >
          VERIFIED EVENT PASS
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 7,
            fontFamily: "Arial, sans-serif",
            fontSize: 23,
            fontWeight: 900,
          }}
        >
          {status.title}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 3,
            fontFamily: "Arial, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            opacity: 0.78,
          }}
        >
          {status.detail}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 9,
            fontFamily: "Arial, sans-serif",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1.8,
            opacity: 0.75,
          }}
        >
          {data.language === "en" ? "ENTRY PASS ID" : "PASS ID YA KUINGIA"}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 3,
            fontFamily: "Georgia, serif",
            fontSize: 27,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {passId}
        </div>
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
  const status = getPassStatusMeta(data);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: centered ? "center" : "flex-start",
        color,
        fontFamily: "Arial, sans-serif",
        textAlign: centered ? "center" : "left",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: centered ? "center" : "flex-start",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            padding: "9px 12px",
            borderRadius: 12,
            backgroundColor: `${data.accent}18`,
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          {data.date}
        </div>

        {data.eventTime ? (
          <div
            style={{
              display: "flex",
              padding: "9px 12px",
              borderRadius: 12,
              backgroundColor: `${data.accent}18`,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {data.eventTime}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 12,
          fontSize: 23,
          lineHeight: 1.25,
          fontWeight: 700,
          opacity: 0.9,
        }}
      >
        {data.venue}
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: centered ? "center" : "flex-start",
          gap: 10,
          marginTop: 12,
        }}
      >
        {data.dressCode ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 11px",
              borderRadius: 12,
              border: `1px solid ${data.accent}`,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Dress Code: {data.dressCode}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            padding: "8px 11px",
            borderRadius: 12,
            backgroundColor: data.primary,
            color: data.primaryText,
            fontSize: 15,
            fontWeight: 900,
          }}
        >
          {status.title}
        </div>
      </div>

      <CompactPassStrip data={data} color={color} />
    </div>
  );
}

function EmeraldBotanicalHaloCard({ data }: { data: RenderData }) {
  const initials = data.title.replace(/&/g, " ").split(/\s+/).filter(Boolean).map((part) => part[0]).filter(Boolean);
  const mark = `${initials[0] ?? "E"}${initials.at(-1) ?? "H"}`.toUpperCase();

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", padding: "54px 64px", background: `linear-gradient(155deg, ${data.primary}, #020806)`, color: "#FFFFFF" }}>
      <div style={{ position: "absolute", left: -100, top: 150, width: 360, height: 360, display: "flex", borderRadius: 180, border: `2px solid ${data.accent}`, opacity: 0.18 }} />
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}><Brand color={data.accent} /><div style={{ display: "flex", color: data.accent, fontFamily: "Arial, sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: 5 }}>BOTANICAL HALO</div></div>
      <div style={{ width: 480, height: 570, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 52, borderRadius: 250, border: `2px solid ${data.accent}`, boxShadow: `0 0 0 12px ${data.primary}, 0 0 0 14px ${data.accent}` }}>
        <div style={{ width: 430, height: 520, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 220, border: `7px solid ${data.accent}`, background: `radial-gradient(circle, ${data.secondary}, ${data.primary})` }}>
          {data.coverImageDataUrl ? <CoverImage data={data} borderRadius={220} /> : <div style={{ display: "flex", color: data.accent, fontFamily: "Georgia, serif", fontSize: 116, letterSpacing: 9 }}>{mark}</div>}
        </div>
        <div style={{ position: "absolute", left: -54, bottom: 46, width: 138, height: 138, display: "flex", borderRadius: "100% 0 100% 0", border: `4px solid ${data.accent}`, transform: "rotate(-28deg)" }} />
        <div style={{ position: "absolute", right: -38, top: 50, width: 100, height: 148, display: "flex", borderRadius: "100% 0 100% 0", border: `4px solid ${data.accent}`, transform: "rotate(34deg)" }} />
      </div>
      <div style={{ maxWidth: 900, display: "flex", marginTop: 54, color: "#FFFFFF", fontFamily: "Georgia, serif", fontSize: Math.min(76, data.titleSize + 3), lineHeight: 1, textAlign: "center" }}>{data.title}</div>
      <div style={{ width: 500, height: 2, display: "flex", marginTop: 30, backgroundColor: data.accent, opacity: 0.65 }} />
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 30 }}><Details data={data} color="#FFFFFF" /><Guest data={data} color={data.accent} /></div>
    </div>
  );
}

function HeritageMonogramCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 42, backgroundColor: data.secondary, color: data.secondaryText }}>
      <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "42px 56px", border: `8px double ${data.primary}`, boxShadow: `inset 0 0 0 10px ${data.secondary}, inset 0 0 0 12px ${data.accent}` }}>
        <Brand color={data.primary} />
        <div style={{ width: 330, height: 410, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 180, border: `9px double ${data.primary}`, boxShadow: `0 0 0 3px ${data.accent}`, color: data.primary }}>
          {hasImage ? <CoverImage data={data} borderRadius={180} /> : <><div style={{ position: "absolute", width: 240, height: 290, display: "flex", borderRadius: 130, border: `3px solid ${data.accent}` }} /><div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 92 }}>HM</div></>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ display: "flex", color: data.accent, fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 6 }}>HERITAGE MONOGRAM</div>
          <div style={{ display: "flex", maxWidth: 850, marginTop: 24, color: data.primary, fontFamily: "Georgia, serif", fontSize: Math.min(72, data.titleSize), lineHeight: 1, textAlign: "center" }}>{data.title}</div>
          <div style={{ width: 360, display: "flex", alignItems: "center", marginTop: 28 }}><div style={{ height: 2, flex: 1, display: "flex", backgroundColor: data.accent }} /><div style={{ width: 18, height: 18, display: "flex", margin: "0 18px", border: `2px solid ${data.accent}`, transform: "rotate(45deg)" }} /><div style={{ height: 2, flex: 1, display: "flex", backgroundColor: data.accent }} /></div>
        </div>
        <Details data={data} color={data.secondaryText} centered />
        <div style={{ display: "flex", color: data.primary, fontFamily: "Georgia, serif", fontSize: 42, fontWeight: 700, textAlign: "center" }}>{data.guestName}</div>
      </div>
    </div>
  );
}

function ChateauLetterpressCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", padding: 42, backgroundColor: data.secondary, color: data.secondaryText }}>
      <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "44px 58px", border: `3px solid ${data.primary}`, boxShadow: `inset 0 0 0 10px ${data.secondary}, inset 0 0 0 12px ${data.primary}` }}>
        <Brand color={data.primary} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ display: "flex", color: data.accent, fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 6 }}>CHÂTEAU LETTERPRESS</div>
          <div style={{ display: "flex", maxWidth: 850, marginTop: 22, color: data.primary, fontFamily: "Georgia, serif", fontSize: Math.min(70, data.titleSize), lineHeight: 1, textAlign: "center" }}>{data.title}</div>
        </div>
        <div style={{ width: 820, height: 455, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 12, border: `3px solid ${data.primary}`, backgroundColor: data.secondary, boxShadow: "0 18px 36px rgba(15,23,42,.14)" }}>
          <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px solid ${data.accent}`, color: data.primary }}>
            {hasImage ? <CoverImage data={data} /> : <><div style={{ width: 240, height: 170, position: "absolute", display: "flex", borderRadius: "50%", border: `3px solid ${data.accent}` }} /><div style={{ display: "flex", fontFamily: "Georgia, serif", fontSize: 100, fontStyle: "italic", letterSpacing: -28 }}>CL</div></>}
          </div>
        </div>
        <Details data={data} color={data.secondaryText} centered />
        <div style={{ width: 430, display: "flex", alignItems: "center" }}><div style={{ height: 2, flex: 1, display: "flex", backgroundColor: data.accent }} /><div style={{ display: "flex", margin: "0 18px", color: data.primary, fontFamily: "Georgia, serif", fontSize: 20 }}>CL</div><div style={{ height: 2, flex: 1, display: "flex", backgroundColor: data.accent }} /></div>
        <div style={{ display: "flex", color: data.primary, fontFamily: "Georgia, serif", fontSize: 42, fontWeight: 700, textAlign: "center" }}>{data.guestName}</div>
      </div>
    </div>
  );
}

function AfricanRoyalCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", overflow: "hidden", backgroundColor: data.primary, color: "#FFFFFF" }}>
      <div style={{ width: 440, height: "100%", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", padding: "72px 54px 64px", background: `linear-gradient(160deg, ${data.primary}, #111827)` }}>
        <div style={{ position: "absolute", left: -100, top: 190, width: 330, height: 330, display: "flex", transform: "rotate(45deg)", border: `28px solid ${data.accent}`, opacity: 0.2 }} />
        <Brand color={data.accent} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: data.accent, fontFamily: "Arial, sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 4 }}>AFRICAN ROYAL</div>
          <div style={{ display: "flex", maxWidth: 340, marginTop: 28, fontFamily: "Georgia, serif", fontSize: Math.min(67, data.titleSize), lineHeight: 0.98 }}>{data.title}</div>
          <div style={{ width: 92, height: 7, display: "flex", marginTop: 34, backgroundColor: data.accent }} />
        </div>
        <Guest data={data} color="#FFFFFF" />
      </div>
      <div style={{ flex: 1, height: "100%", position: "relative", display: "flex", overflow: "hidden", background: hasImage ? data.secondary : `linear-gradient(145deg, ${data.secondary}, ${data.accent})` }}>
        {hasImage ? <CoverImage data={data} /> : null}
        {!hasImage ? (
          <>
            <div style={{ position: "absolute", left: 115, top: 180, width: 390, height: 390, display: "flex", border: `22px solid ${data.primary}`, transform: "rotate(45deg)", opacity: 0.5 }} />
            <div style={{ position: "absolute", left: 205, top: 315, display: "flex", color: data.primary, fontFamily: "Georgia, serif", fontSize: 120 }}>AR</div>
          </>
        ) : null}
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "flex", background: hasImage ? "linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.72))" : "transparent" }} />
        <div style={{ position: "absolute", right: 48, top: 48, width: 145, height: 145, display: "flex", border: `12px solid ${data.accent}` }} />
        <div style={{ position: "absolute", left: 58, bottom: 64, width: 480, display: "flex", flexDirection: "column", padding: "28px 30px", borderLeft: `8px solid ${data.accent}`, backgroundColor: hasImage ? "rgba(0,0,0,0.66)" : data.primary, color: "#FFFFFF" }}>
          <Details data={data} color="#FFFFFF" />
        </div>
      </div>
    </div>
  );
}

function MidnightLuxeCard({ data }: { data: RenderData }) {
  const hasImage = Boolean(data.coverImageDataUrl);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", overflow: "hidden", background: `linear-gradient(150deg, ${data.primary}, #05070D)`, color: "#FFFFFF" }}>
      {hasImage ? <CoverImage data={data} /> : null}
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "flex", background: hasImage ? "linear-gradient(180deg, rgba(2,6,23,.12), rgba(2,6,23,.16) 40%, rgba(2,6,23,.95))" : `radial-gradient(circle at 75% 18%, ${data.accent}, transparent 28%)`, opacity: hasImage ? 1 : 0.9 }} />
      <div style={{ position: "absolute", right: -70, top: 80, width: 410, height: 410, display: "flex", borderRadius: 205, border: `2px solid ${data.accent}`, boxShadow: `0 0 90px ${data.accent}`, opacity: 0.48 }} />
      <div style={{ position: "absolute", right: 30, top: 180, width: 210, height: 210, display: "flex", borderRadius: 105, border: `2px solid ${data.accent}`, opacity: 0.42 }} />
      {!hasImage ? <div style={{ position: "absolute", right: 155, top: 230, display: "flex", color: "#FFFFFF", fontFamily: "Georgia, serif", fontSize: 120, opacity: 0.78 }}>ML</div> : null}
      <div style={{ position: "absolute", left: 70, top: 66, width: 940, display: "flex", justifyContent: "space-between" }}><Brand color="#FFFFFF" /><div style={{ display: "flex", color: data.accent, fontFamily: "Arial, sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: 5 }}>MIDNIGHT LUXE</div></div>
      <div style={{ position: "absolute", left: 92, right: 120, bottom: 82, display: "flex", flexDirection: "column", padding: "44px 52px", borderLeft: `8px solid ${data.accent}`, backgroundColor: data.secondary, color: data.secondaryText, boxShadow: "0 25px 75px rgba(0,0,0,.42)" }}>
        <div style={{ display: "flex", color: data.primary, fontFamily: "Arial, sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: 4 }}>{data.date}</div>
        <div style={{ display: "flex", maxWidth: 780, marginTop: 22, color: data.primary, fontFamily: "Georgia, serif", fontSize: Math.min(82, data.titleSize + 5), lineHeight: 0.98 }}>{data.title}</div>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 32, paddingTop: 28, borderTop: `2px solid ${data.accent}` }}><Guest data={data} color={data.primary} /><div style={{ display: "flex", maxWidth: 330 }}><Details data={data} color={data.secondaryText} /></div></div>
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
