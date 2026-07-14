import { ImageResponse } from "next/og";
import QRCode from "qrcode";

import {
  getInvitationByToken,
} from "@/services/invitationService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function formatDate(
  dateValue: string | null,
  language: "sw" | "en"
) {
  if (!dateValue) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    language === "en"
      ? "en-GB"
      : "sw-TZ",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${dateValue}T00:00:00`
    )
  );
}

function formatTime(
  timeValue: string | null,
  language: "sw" | "en"
) {
  if (!timeValue) {
    return "-";
  }

  const [hour, minute] =
    timeValue
      .slice(0, 5)
      .split(":")
      .map(Number);

  const displayHour =
    hour % 12 || 12;

  const safeHour =
    String(displayHour).padStart(
      2,
      "0"
    );

  const safeMinute =
    String(minute).padStart(
      2,
      "0"
    );

  if (language === "en") {
    return `${safeHour}:${safeMinute} ${
      hour >= 12 ? "PM" : "AM"
    }`;
  }

  let period = "Usiku";

  if (
    hour >= 5 &&
    hour < 12
  ) {
    period = "Asubuhi";
  } else if (
    hour >= 12 &&
    hour < 16
  ) {
    period = "Mchana";
  } else if (
    hour >= 16 &&
    hour < 19
  ) {
    period = "Jioni";
  }

  return `${safeHour}:${safeMinute} ${period}`;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { token } =
      await context.params;

    if (!token) {
      return new Response(
        "Invitation token is missing.",
        {
          status: 400,
        }
      );
    }

    const invitation =
      await getInvitationByToken(
        token
      );

    if (!invitation) {
      return new Response(
        "Invitation not found.",
        {
          status: 404,
        }
      );
    }

    const language:
      | "sw"
      | "en" =
      invitation.language === "en"
        ? "en"
        : "sw";

    const primaryColor =
      invitation.theme_primary_color ||
      "#BE123C";

    const secondaryColor =
      invitation.theme_secondary_color ||
      "#FFF1F2";

    const accentColor =
      invitation.theme_accent_color ||
      "#D4AF37";

    const appOrigin =
      process.env
        .NEXT_PUBLIC_APP_URL ||
      new URL(request.url).origin;

    const invitationUrl =
      `${appOrigin.replace(
        /\/$/,
        ""
      )}/invite/${token}`;

    const qrCodeDataUrl =
      await QRCode.toDataURL(
        invitation.qr_token,
        {
          width: 270,
          margin: 1,
          errorCorrectionLevel:
            "M",

          color: {
            dark: "#111827",
            light: "#FFFFFF",
          },
        }
      );

    const eventDate =
      formatDate(
        invitation.event_date,
        language
      );

    const eventTime =
      formatTime(
        invitation.event_time,
        language
      );

    const translations =
      language === "sw"
        ? {
            invitation:
              "MWALIKO MAALUMU",

            specialFor:
              "Mwaliko maalumu kwa",

            date: "TAREHE",
            time: "MUDA",
            venue: "MAHALI",
            dressCode: "MAVAZI",

            allowedGuests:
              "WAGENI WANAORUHUSIWA",

            passId:
              "EVENT PASS ID",

            scan:
              "Scan QR au fungua invitation link",

            footer:
              "Smart Event Pass",
          }
        : {
            invitation:
              "SPECIAL INVITATION",

            specialFor:
              "Special invitation for",

            date: "DATE",
            time: "TIME",
            venue: "VENUE",
            dressCode: "DRESS CODE",

            allowedGuests:
              "ALLOWED GUESTS",

            passId:
              "EVENT PASS ID",

            scan:
              "Scan QR or open the invitation link",

            footer:
              "Smart Event Pass",
          };

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor:
              secondaryColor,
            color: "#0F172A",
            fontFamily:
              "Arial, sans-serif",
          }}
        >
          <div
            style={{
              height: "410px",
              display: "flex",
              position: "relative",
              overflow: "hidden",
              background:
                `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            }}
          >
            {invitation.cover_image_url ? (
              <img
                src={
                  invitation.cover_image_url
                }
                alt=""
                width="1080"
                height="410"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  position: "absolute",
                  inset: 0,
                }}
              />
            ) : null}

            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                background:
                  invitation.cover_image_url
                    ? "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.82))"
                    : "linear-gradient(135deg, rgba(0,0,0,0.05), rgba(0,0,0,0.35))",
              }}
            />

            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection:
                  "column",
                alignItems: "center",
                justifyContent:
                  "flex-end",
                position: "relative",
                padding:
                  "50px 70px",
                color: "white",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: 8,
                }}
              >
                {
                  translations.invitation
                }
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 18,
                  fontSize: 58,
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {
                  invitation.event_title
                }
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 14,
                  fontSize: 27,
                  opacity: 0.92,
                }}
              >
                {
                  invitation.event_type
                }
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding:
                "38px 58px 34px",
              background:
                `linear-gradient(180deg, #FFFFFF 0%, ${secondaryColor} 100%)`,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: 5,
                  color: "#64748B",
                }}
              >
                {
                  translations.specialFor
                }
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 10,
                  fontSize: 43,
                  fontWeight: 800,
                  color: primaryColor,
                }}
              >
                {
                  invitation.guest_name
                }
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 18,
                marginTop: 30,
              }}
            >
              <DetailBox
                label={
                  translations.date
                }
                value={eventDate}
                primaryColor={
                  primaryColor
                }
              />

              <DetailBox
                label={
                  translations.time
                }
                value={eventTime}
                primaryColor={
                  primaryColor
                }
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 18,
                marginTop: 18,
              }}
            >
              <DetailBox
                label={
                  translations.venue
                }
                value={
                  invitation.venue
                }
                primaryColor={
                  primaryColor
                }
              />

              <DetailBox
                label={
                  translations.dressCode
                }
                value={
                  invitation.dress_code ||
                  "-"
                }
                primaryColor={
                  primaryColor
                }
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 28,
                marginTop: 28,
                padding: 24,
                borderRadius: 28,
                backgroundColor:
                  "#FFFFFF",
                border:
                  `2px solid ${primaryColor}30`,
                boxShadow:
                  "0 12px 35px rgba(15, 23, 42, 0.10)",
              }}
            >
              <div
                style={{
                  width: 245,
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  borderRadius: 22,
                  backgroundColor:
                    "#FFFFFF",
                }}
              >
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code"
                  width="215"
                  height="215"
                  style={{
                    width: 215,
                    height: 215,
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection:
                    "column",
                  justifyContent:
                    "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: 3,
                    color: "#64748B",
                  }}
                >
                  {
                    translations.passId
                  }
                </div>

                <div
                  style={{
                    display: "flex",
                    marginTop: 8,
                    fontSize: 34,
                    fontWeight: 800,
                    color: primaryColor,
                    letterSpacing: 2,
                  }}
                >
                  {invitation.event_pass_id ||
                    "-"}
                </div>

                <div
                  style={{
                    display: "flex",
                    marginTop: 22,
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: 2,
                    color: "#64748B",
                  }}
                >
                  {
                    translations.allowedGuests
                  }
                </div>

                <div
                  style={{
                    display: "flex",
                    marginTop: 7,
                    fontSize: 29,
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  {
                    invitation.allowed_guests
                  }
                </div>

                <div
                  style={{
                    display: "flex",
                    marginTop: 18,
                    fontSize: 18,
                    color: "#64748B",
                  }}
                >
                  {translations.scan}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginTop: "auto",
                paddingTop: 24,
                borderTop:
                  "1px solid #E2E8F0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 800,
                  color: primaryColor,
                }}
              >
                {translations.footer}
              </div>

              <div
                style={{
                  display: "flex",
                  maxWidth: 590,
                  overflow: "hidden",
                  fontSize: 16,
                  color: "#64748B",
                  whiteSpace: "nowrap",
                }}
              >
                {invitationUrl}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1350,

        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=300",
        },
      }
    );
  } catch (error) {
    console.error(
      "Invitation card generation error:",
      error
    );

    return new Response(
      error instanceof Error
        ? error.message
        : "Card generation failed.",
      {
        status: 500,
      }
    );
  }
}

function DetailBox({
  label,
  value,
  primaryColor,
}: {
  label: string;
  value: string;
  primaryColor: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 116,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "20px 24px",
        borderRadius: 22,
        backgroundColor:
          "#FFFFFF",
        border:
          "1px solid #E2E8F0",
        boxShadow:
          "0 7px 20px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 3,
          color: primaryColor,
        }}
      >
        {label}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 8,
          fontSize: 24,
          fontWeight: 700,
          lineHeight: 1.25,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}