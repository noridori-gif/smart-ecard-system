import type {
  CSSProperties,
} from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getInvitationByToken,
} from "@/services/invitationService";

import Countdown from "@/components/invitation/Countdown";
import InvitationHero from "@/components/invitation/InvitationHero";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import InvitationViewedTracker from "@/components/invitation/InvitationViewedTracker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{
    token: string;
  }>;
};

type Language = "sw" | "en";

type InvitationContent = {
  icon: string;
  invitationLabel: string;
  eventLabel: string;
  message: string;
};

type Translation = {
  specialInvitationFor: string;
  ceremony: string;
  reception: string;
  date: string;
  time: string;
  venue: string;
  openMap: string;
  dressCode: string;
  invitationAdmits: string;
  guest: string;
  guests: string;
  footer: string;
  invitationDescription: string;
};

function getTranslation(
  language: Language
): Translation {
  if (language === "sw") {
    return {
      specialInvitationFor:
        "Mwaliko Maalumu Kwa",

      ceremony: "Ibada",
      reception: "Mapokezi / Sherehe",
      date: "Tarehe",
      time: "Muda",
      venue: "Mahali",
      openMap: "Fungua Ramani",
      dressCode: "Mavazi",

      invitationAdmits:
        "Mwaliko huu unaruhusu",

      guest: "Mgeni",
      guests: "Wageni",

      footer:
        "Mwaliko wako. Tukio lako.",

      invitationDescription:
        "Fungua mwaliko wako maalumu wa tukio.",
    };
  }

  return {
    specialInvitationFor:
      "Special Invitation For",

    ceremony: "Ceremony",
    reception: "Reception",
    date: "Date",
    time: "Time",
    venue: "Venue",
    openMap: "Open Google Maps",
    dressCode: "Dress Code",

    invitationAdmits:
      "This invitation admits",

    guest: "Guest",
    guests: "Guests",

    footer:
      "Your invitation. Your moment.",

    invitationDescription:
      "Open your personal event invitation.",
  };
}

function getInvitationContent(
  eventType: string,
  language: Language
): InvitationContent {
  const event =
    eventType.trim().toLowerCase();

  if (
    event === "wedding" ||
    event.includes("harusi")
  ) {
    return {
      icon: "💍",

      invitationLabel:
        language === "sw"
          ? "Unaalikwa"
          : "You Are Invited",

      eventLabel:
        language === "sw"
          ? "Sherehe ya Harusi"
          : "Wedding Celebration",

      message:
        language === "sw"
          ? "Pamoja na familia zao, wanakualika kushiriki katika siku yao maalumu."
          : "Together with their families, they warmly invite you to celebrate their special day.",
    };
  }

  if (
    event === "send-off" ||
    event === "sendoff" ||
    event.includes("send")
  ) {
    return {
      icon: "✨",

      invitationLabel:
        language === "sw"
          ? "Mwaliko Maalumu"
          : "Special Invitation",

      eventLabel:
        language === "sw"
          ? "Sherehe ya Send-Off"
          : "Send-Off Ceremony",

      message:
        language === "sw"
          ? "Tunayo furaha kukualika kushiriki nasi katika tukio hili maalumu."
          : "We warmly invite you to join us for this special occasion.",
    };
  }

  if (
    event === "birthday" ||
    event.includes("birthday")
  ) {
    return {
      icon: "🎂",

      invitationLabel:
        language === "sw"
          ? "Karibu Tusherehekee"
          : "Come Celebrate With Us",

      eventLabel:
        language === "sw"
          ? "Sherehe ya Kuzaliwa"
          : "Birthday Celebration",

      message:
        language === "sw"
          ? "Karibu tusherehekee pamoja siku hii yenye furaha na kumbukumbu nzuri."
          : "Join us for a joyful celebration filled with wonderful memories.",
    };
  }

  if (
    event === "graduation" ||
    event.includes("graduation")
  ) {
    return {
      icon: "🎓",

      invitationLabel:
        language === "sw"
          ? "Unaalikwa"
          : "You Are Invited",

      eventLabel:
        language === "sw"
          ? "Sherehe ya Mahafali"
          : "Graduation Celebration",

      message:
        language === "sw"
          ? "Karibu tusherehekee mafanikio haya na mwanzo wa hatua mpya."
          : "Join us as we celebrate this achievement and a new chapter.",
    };
  }

  if (
    event === "corporate" ||
    event.includes("conference") ||
    event.includes("seminar") ||
    event.includes("business")
  ) {
    return {
      icon: "💼",

      invitationLabel:
        language === "sw"
          ? "Mwaliko Rasmi"
          : "Official Invitation",

      eventLabel:
        language === "sw"
          ? "Tukio la Kikampuni"
          : "Corporate Event",

      message:
        language === "sw"
          ? "Unaalikwa rasmi kuhudhuria tukio hili muhimu."
          : "You are formally invited to attend this important event.",
    };
  }

  return {
    icon: "🎉",

    invitationLabel:
      language === "sw"
        ? "Unaalikwa"
        : "You Are Invited",

    eventLabel:
      language === "sw"
        ? "Tukio Maalumu"
        : "Special Event",

    message:
      language === "sw"
        ? "Tunayo furaha kukualika kushiriki nasi katika tukio hili maalumu."
        : "We warmly invite you to join us for this special occasion.",
  };
}

function formatEventDate(
  eventDate: string | null,
  language: Language
) {
  if (!eventDate) {
    return "";
  }

  return new Intl.DateTimeFormat(
    language === "sw"
      ? "sw-TZ"
      : "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${eventDate}T00:00:00`
    )
  );
}

function formatEventTime(
  eventTime: string | null,
  language: Language
) {
  if (!eventTime) {
    return "";
  }

  const [
    hourValue,
    minuteValue,
  ] = eventTime
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (language === "en") {
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    ).format(
      new Date(
        2026,
        0,
        1,
        hourValue,
        minuteValue
      )
    );
  }

  const swahiliHourValue =
    (hourValue + 6) % 12;

  const swahiliHour =
    swahiliHourValue === 0
      ? 12
      : swahiliHourValue;

  let period = "usiku";

  if (
    hourValue >= 5 &&
    hourValue < 12
  ) {
    period = "asubuhi";
  } else if (
    hourValue >= 12 &&
    hourValue < 16
  ) {
    period = "mchana";
  } else if (
    hourValue >= 16 &&
    hourValue < 19
  ) {
    period = "jioni";
  }

  const minute =
    String(minuteValue).padStart(
      2,
      "0"
    );

  return `Saa ${swahiliHour}:${minute} ${period}`;
}

type LocationSectionProps = {
  icon: string;
  title: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapUrl: string | null;
  language: Language;
};

function EventLocationSection({
  icon,
  title,
  date,
  time,
  venue,
  mapUrl,
  language,
}: LocationSectionProps) {
  const translation =
    getTranslation(language);

  const details = [
    date
      ? {
          icon: "📅",
          label: translation.date,
          value: formatEventDate(
            date,
            language
          ),
        }
      : null,

    time
      ? {
          icon: "🕒",
          label: translation.time,
          value: formatEventTime(
            time,
            language
          ),
        }
      : null,

    venue
      ? {
          icon: "📍",
          label: translation.venue,
          value: venue,
        }
      : null,
  ].filter(
    (
      item
    ): item is {
      icon: string;
      label: string;
      value: string;
    } => Boolean(item)
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-[var(--theme-secondary)] p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="text-2xl">
          {icon}
        </div>

        <h3 className="text-lg font-bold text-[var(--theme-primary)]">
          {title}
        </h3>
      </div>

      <div className="mt-4 divide-y divide-slate-200 rounded-xl bg-white/90 px-4">
        {details.map((detail) => (
          <div
            key={detail.label}
            className="flex items-start gap-3 py-3"
          >
            <span className="text-lg">
              {detail.icon}
            </span>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {detail.label}
              </p>

              <p className="mt-1 font-semibold leading-5 text-slate-900">
                {detail.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[var(--theme-primary)] shadow-sm"
        >
          <span>📍</span>
          <span>
            {translation.openMap}
          </span>
        </a>
      )}
    </section>
  );
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { token } = await params;

  if (!token) {
    return {
      title:
        "Invitation | Smart Event Pass",
    };
  }

  try {
    const invitation =
      await getInvitationByToken(token);

    if (!invitation) {
      return {
        title:
          "Invitation Not Found | Smart Event Pass",

        description:
          "This invitation could not be found.",
      };
    }

    const language: Language =
      invitation.language === "en"
        ? "en"
        : "sw";

    const translation =
      getTranslation(language);

    const formattedDate =
      formatEventDate(
        invitation.event_date,
        language
      );

    const formattedTime =
      formatEventTime(
        invitation.event_time,
        language
      );

    const title =
      `${invitation.event_title} | Smart Event Pass`;

    const description = [
      language === "sw"
        ? `Mwaliko maalumu kwa ${invitation.guest_name}.`
        : `A special invitation for ${invitation.guest_name}.`,

      formattedDate,
      formattedTime,
      invitation.venue,
    ]
      .filter(Boolean)
      .join(" • ");

    const imageUrl =
      invitation.cover_image_url ??
      undefined;

    return {
      title,

      description:
        description ||
        translation.invitationDescription,

      openGraph: {
        title,
        description,
        type: "website",

        images: imageUrl
          ? [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt:
                  invitation.event_title,
              },
            ]
          : undefined,
      },

      twitter: {
        card: imageUrl
          ? "summary_large_image"
          : "summary",

        title,
        description,

        images: imageUrl
          ? [imageUrl]
          : undefined,
      },
    };
  } catch {
    return {
      title:
        "Invitation | Smart Event Pass",

      description:
        "Open your personal event invitation.",
    };
  }
}

export default async function InvitationPage({
  params,
}: Props) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const invitation =
    await getInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  const language: Language =
    invitation.language === "en"
      ? "en"
      : "sw";

  const translation =
    getTranslation(language);

  const content =
    getInvitationContent(
      invitation.event_type,
      language
    );

  const primaryColor =
    invitation.theme_primary_color ||
    "#BE123C";

  const secondaryColor =
    invitation.theme_secondary_color ||
    "#FFF1F2";

  const accentColor =
    invitation.theme_accent_color ||
    "#D4AF37";

  const themeVariables = {
    "--theme-primary":
      primaryColor,

    "--theme-secondary":
      secondaryColor,

    "--theme-accent":
      accentColor,
  } as CSSProperties;

  const normalizedEventType =
    invitation.event_type
      .trim()
      .toLowerCase();

  const isWedding =
    normalizedEventType ===
      "wedding" ||
    normalizedEventType.includes(
      "harusi"
    );

  const isSendOff =
    normalizedEventType ===
      "send-off" ||
    normalizedEventType ===
      "sendoff" ||
    normalizedEventType.includes(
      "send"
    );

  const heroTitle =
    isWedding &&
    invitation.bride_name &&
    invitation.groom_name
      ? `${invitation.groom_name} & ${invitation.bride_name}`
      : isSendOff &&
          invitation.bride_name
        ? invitation.bride_name
        : invitation.event_title;

  const hasCeremonyDetails =
    Boolean(
      invitation.ceremony_date ||
        invitation.ceremony_time ||
        invitation.ceremony_venue
    );

  return (
    <main
      style={{
        ...themeVariables,

        background:
          `linear-gradient(135deg, ${secondaryColor} 0%, #ffffff 50%, ${accentColor}22 100%)`,
      }}
      className="min-h-screen px-3 py-5 sm:px-4 sm:py-10"
    >
      <InvitationViewedTracker
        invitationToken={
          invitation.invitation_token
        }
      />

      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <InvitationHero
          icon={content.icon}
          invitationLabel={
            content.invitationLabel
          }
          heroTitle={heroTitle}
          eventLabel={
            content.eventLabel
          }
          eventTitle={
            invitation.event_title
          }
          heroBackground="bg-[linear-gradient(135deg,var(--theme-primary),var(--theme-accent))]"
          coverImageUrl={
            invitation.cover_image_url
          }
        />

        <section className="px-4 py-6 sm:px-8 sm:py-8">
          <div className="rounded-2xl border border-slate-200 bg-[var(--theme-secondary)] px-4 py-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.23em] text-slate-500">
              {
                translation.specialInvitationFor
              }
            </p>

            <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--theme-primary)] sm:text-3xl">
              {invitation.guest_name}
            </h2>
          </div>

          <p className="mx-auto mt-5 max-w-lg text-center text-sm leading-6 text-slate-600">
            {content.message}
          </p>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />

            <span className="text-xl text-[var(--theme-accent)]">
              ✦
            </span>

            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-4">
            {hasCeremonyDetails && (
              <EventLocationSection
                icon="⛪"
                title={
                  invitation.ceremony_title ||
                  translation.ceremony
                }
                date={
                  invitation.ceremony_date
                }
                time={
                  invitation.ceremony_time
                }
                venue={
                  invitation.ceremony_venue
                }
                mapUrl={
                  invitation.ceremony_map_url
                }
                language={language}
              />
            )}

            <EventLocationSection
              icon="🥂"
              title={
                translation.reception
              }
              date={
                invitation.event_date
              }
              time={
                invitation.event_time
              }
              venue={
                invitation.venue
              }
              mapUrl={
                invitation.reception_map_url
              }
              language={language}
            />
          </div>

          {invitation.dress_code && (
            <section className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-200 bg-[var(--theme-secondary)] p-4 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                👔
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {translation.dressCode}
                </p>

                <p className="mt-1 text-lg font-bold text-[var(--theme-primary)]">
                  {invitation.dress_code}
                </p>
              </div>

              <div className="ml-auto hidden gap-1 sm:flex">
                <span
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{
                    backgroundColor:
                      primaryColor,
                  }}
                />

                <span
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{
                    backgroundColor:
                      accentColor,
                  }}
                />
              </div>
            </section>
          )}

          <Countdown
            eventDate={
              invitation.event_date
            }
            eventTime={
              invitation.event_time
            }
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
            boxClassName="bg-[var(--theme-secondary)]"
          />

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-[var(--theme-secondary)] px-5 py-4">
            <p className="text-sm text-slate-600">
              {
                translation.invitationAdmits
              }
            </p>

            <p className="ml-3 whitespace-nowrap text-xl font-bold text-[var(--theme-primary)]">
              {
                invitation.allowed_guests
              }{" "}
              {invitation.allowed_guests ===
              1
                ? translation.guest
                : translation.guests}
            </p>
          </div>

          <RsvpButtons
            invitationToken={
              invitation.invitation_token
            }
            currentStatus={
              invitation.rsvp_status
            }
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
          />

          <EventPass
            guestName={
              invitation.guest_name
            }
            qrToken={
              invitation.qr_token
            }
            eventPassId={
              invitation.event_pass_id
            }
            allowedGuests={
              invitation.allowed_guests
            }
            category={
              invitation.category
            }
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
            boxClassName="bg-[var(--theme-secondary)]"
          />

          <footer className="mt-8 border-t border-slate-100 pt-6 text-center">
            <p className="text-sm font-semibold text-[var(--theme-primary)]">
              Smart Event Pass
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {translation.footer}
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}