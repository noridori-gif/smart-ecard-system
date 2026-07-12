import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInvitationByToken } from "@/services/invitationService";
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

type InvitationTheme = {
  icon: string;
  invitationLabel: string;
  eventLabel: string;
  message: string;
  pageBackground: string;
  heroBackground: string;
  accentText: string;
  detailBackground: string;
  guestBoxStyle: string;
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

function getTranslation(language: Language): Translation {
  if (language === "sw") {
    return {
      specialInvitationFor: "Mwaliko Maalumu Kwa",
      ceremony: "Ibada",
      reception: "Mapokezi / Sherehe",
      date: "Tarehe",
      time: "Muda",
      venue: "Mahali",
      openMap: "Fungua Ramani",
      dressCode: "Mavazi",
      invitationAdmits: "Mwaliko huu unaruhusu",
      guest: "Mgeni",
      guests: "Wageni",
      footer: "Mwaliko wako. Tukio lako.",
      invitationDescription:
        "Fungua mwaliko wako maalumu wa tukio.",
    };
  }

  return {
    specialInvitationFor: "Special Invitation For",
    ceremony: "Ceremony",
    reception: "Reception",
    date: "Date",
    time: "Time",
    venue: "Venue",
    openMap: "Open Google Maps",
    dressCode: "Dress Code",
    invitationAdmits: "This invitation admits",
    guest: "Guest",
    guests: "Guests",
    footer: "Your invitation. Your moment.",
    invitationDescription:
      "Open your personal event invitation.",
  };
}

function getInvitationTheme(
  eventType: string,
  language: Language
): InvitationTheme {
  const normalizedType = eventType.trim().toLowerCase();

  if (
    normalizedType === "wedding" ||
    normalizedType.includes("harusi")
  ) {
    return {
      icon: "💍",
      invitationLabel:
        language === "sw" ? "Unaalikwa" : "You Are Invited",
      eventLabel:
        language === "sw"
          ? "Sherehe ya Harusi"
          : "Wedding Celebration",
      message:
        language === "sw"
          ? "Pamoja na familia zao, wanayo furaha kukualika kushiriki katika siku yao maalumu. Uwepo wako utaongeza furaha na kufanya tukio hili likumbukwe zaidi."
          : "Together with their families, they warmly invite you to celebrate their special day. Your presence will make this occasion truly memorable.",
      pageBackground:
        "bg-gradient-to-br from-rose-100 via-white to-amber-100",
      heroBackground:
        "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-400",
      accentText: "text-rose-700",
      detailBackground: "bg-rose-50",
      guestBoxStyle: "border-rose-200 bg-rose-50",
    };
  }

  if (
    normalizedType === "send-off" ||
    normalizedType === "sendoff" ||
    normalizedType.includes("send")
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
          ? "Tunayo furaha kukualika kushiriki nasi katika tukio hili zuri na muhimu. Uwepo wako utaongeza furaha na kufanya siku hii kuwa ya kipekee zaidi."
          : "We warmly invite you to join us as we celebrate this beautiful and important occasion. Your presence will bring joy and make the day even more special.",
      pageBackground:
        "bg-gradient-to-br from-orange-100 via-white to-yellow-100",
      heroBackground:
        "bg-gradient-to-r from-orange-600 via-rose-500 to-amber-400",
      accentText: "text-orange-700",
      detailBackground: "bg-orange-50",
      guestBoxStyle: "border-amber-300 bg-amber-50",
    };
  }

  if (
    normalizedType === "birthday" ||
    normalizedType.includes("birthday")
  ) {
    return {
      icon: "🎂",
      invitationLabel:
        language === "sw"
          ? "Karibu Tusherehekee"
          : "Come Celebrate With Us",
      eventLabel:
        language === "sw"
          ? "Sherehe ya Siku ya Kuzaliwa"
          : "Birthday Celebration",
      message:
        language === "sw"
          ? "Karibu tusherehekee pamoja katika siku hii yenye furaha, vicheko na kumbukumbu nzuri."
          : "Join us for a joyful birthday celebration filled with happiness, laughter and wonderful memories.",
      pageBackground:
        "bg-gradient-to-br from-purple-100 via-white to-pink-100",
      heroBackground:
        "bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500",
      accentText: "text-purple-700",
      detailBackground: "bg-purple-50",
      guestBoxStyle: "border-purple-200 bg-purple-50",
    };
  }

  if (
    normalizedType === "corporate" ||
    normalizedType.includes("conference") ||
    normalizedType.includes("seminar") ||
    normalizedType.includes("business")
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
          ? "Unaalikwa rasmi kuhudhuria tukio hili muhimu. Tunatarajia kukukaribisha na kushiriki nawe uzoefu wenye thamani."
          : "You are formally invited to attend this important event. We look forward to welcoming you.",
      pageBackground:
        "bg-gradient-to-br from-slate-200 via-white to-blue-100",
      heroBackground:
        "bg-gradient-to-r from-slate-900 via-blue-800 to-blue-600",
      accentText: "text-blue-800",
      detailBackground: "bg-blue-50",
      guestBoxStyle: "border-blue-200 bg-blue-50",
    };
  }

  if (
    normalizedType === "graduation" ||
    normalizedType.includes("graduation")
  ) {
    return {
      icon: "🎓",
      invitationLabel:
        language === "sw" ? "Unaalikwa" : "You Are Invited",
      eventLabel:
        language === "sw"
          ? "Sherehe ya Mahafali"
          : "Graduation Celebration",
      message:
        language === "sw"
          ? "Karibu tusherehekee mafanikio haya makubwa na mwanzo wa hatua mpya. Uwepo wako utaifanya siku hii kuwa ya maana zaidi."
          : "Join us as we celebrate this remarkable achievement and an exciting new chapter.",
      pageBackground:
        "bg-gradient-to-br from-indigo-100 via-white to-amber-100",
      heroBackground:
        "bg-gradient-to-r from-indigo-800 via-indigo-600 to-amber-500",
      accentText: "text-indigo-700",
      detailBackground: "bg-indigo-50",
      guestBoxStyle: "border-indigo-200 bg-indigo-50",
    };
  }

  return {
    icon: "🎉",
    invitationLabel:
      language === "sw" ? "Unaalikwa" : "You Are Invited",
    eventLabel:
      language === "sw" ? "Tukio Maalumu" : "Special Event",
    message:
      language === "sw"
        ? "Tunayo furaha kukualika kushiriki nasi katika tukio hili maalumu. Uwepo wako utaifanya siku hii kuwa ya maana zaidi."
        : "We warmly invite you to join us for this special occasion.",
    pageBackground:
      "bg-gradient-to-br from-slate-100 via-white to-blue-100",
    heroBackground:
      "bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500",
    accentText: "text-blue-700",
    detailBackground: "bg-slate-50",
    guestBoxStyle: "border-blue-200 bg-blue-50",
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
    language === "sw" ? "sw-TZ" : "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(`${eventDate}T00:00:00`));
}

function formatEventTime(
  eventTime: string | null,
  language: Language
) {
  if (!eventTime) {
    return "";
  }

  const [hourValue, minuteValue] = eventTime
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (language === "en") {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(
      new Date(2026, 0, 1, hourValue, minuteValue)
    );
  }

  const swahiliHourValue = (hourValue + 6) % 12;

  const swahiliHour =
    swahiliHourValue === 0 ? 12 : swahiliHourValue;

  let period = "usiku";

  if (hourValue >= 5 && hourValue < 12) {
    period = "asubuhi";
  } else if (hourValue >= 12 && hourValue < 16) {
    period = "mchana";
  } else if (hourValue >= 16 && hourValue < 19) {
    period = "jioni";
  }

  const minute = String(minuteValue).padStart(2, "0");

  return `Saa ${swahiliHour}:${minute} ${period}`;
}

function EventLocationSection({
  icon,
  title,
  date,
  time,
  venue,
  mapUrl,
  language,
  accentTextClass,
  detailBackgroundClass,
}: {
  icon: string;
  title: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapUrl: string | null;
  language: Language;
  accentTextClass: string;
  detailBackgroundClass: string;
}) {
  const translation = getTranslation(language);

  return (
    <section
      className={`rounded-3xl border border-slate-200 p-6 shadow-sm sm:p-8 ${detailBackgroundClass}`}
    >
      <div className="text-center">
        <div className="text-4xl">{icon}</div>

        <h3
          className={`mt-3 text-2xl font-bold ${accentTextClass}`}
        >
          {title}
        </h3>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {date && (
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
            <div className="text-2xl">📅</div>

            <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {translation.date}
            </p>

            <p className="mt-2 font-semibold leading-6 text-slate-900">
              {formatEventDate(date, language)}
            </p>
          </div>
        )}

        {time && (
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
            <div className="text-2xl">🕒</div>

            <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {translation.time}
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              {formatEventTime(time, language)}
            </p>
          </div>
        )}

        {venue && (
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm sm:col-span-2">
            <div className="text-2xl">📍</div>

            <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {translation.venue}
            </p>

            <p className="mt-2 text-lg font-semibold text-slate-900">
              {venue}
            </p>
          </div>
        )}
      </div>

      {mapUrl && (
        <div className="mt-6 text-center">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accentTextClass}`}
          >
            <span>📍</span>
            <span>{translation.openMap}</span>
          </a>
        </div>
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
      title: "Invitation | Smart Event Pass",
    };
  }

  try {
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return {
        title:
          "Invitation Not Found | Smart Event Pass",
        description:
          "This invitation could not be found.",
      };
    }

    const language: Language =
      invitation.language === "en" ? "en" : "sw";

    const translation = getTranslation(language);

    const formattedDate = formatEventDate(
      invitation.event_date,
      language
    );

    const formattedTime = formatEventTime(
      invitation.event_time,
      language
    );

    const title = `${invitation.event_title} | Smart Event Pass`;

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
      invitation.cover_image_url ?? undefined;

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
                alt: invitation.event_title,
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
        images: imageUrl ? [imageUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "Invitation | Smart Event Pass",
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
    invitation.language === "en" ? "en" : "sw";

  const translation = getTranslation(language);

  const theme = getInvitationTheme(
    invitation.event_type,
    language
  );

  const normalizedEventType =
    invitation.event_type.trim().toLowerCase();

  const isWedding =
    normalizedEventType === "wedding" ||
    normalizedEventType.includes("harusi");

  const isSendOff =
    normalizedEventType === "send-off" ||
    normalizedEventType === "sendoff" ||
    normalizedEventType.includes("send");

  const heroTitle =
    isWedding &&
    invitation.bride_name &&
    invitation.groom_name
      ? `${invitation.groom_name} & ${invitation.bride_name}`
      : isSendOff && invitation.bride_name
        ? invitation.bride_name
        : invitation.event_title;

  const hasCeremonyDetails = Boolean(
    invitation.ceremony_date ||
      invitation.ceremony_time ||
      invitation.ceremony_venue
  );

  return (
    <main
      className={`min-h-screen px-4 py-8 sm:py-12 ${theme.pageBackground}`}
    >
      <InvitationViewedTracker
        invitationToken={
          invitation.invitation_token
        }
      />

      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <InvitationHero
          icon={theme.icon}
          invitationLabel={theme.invitationLabel}
          heroTitle={heroTitle}
          eventLabel={theme.eventLabel}
          eventTitle={invitation.event_title}
          heroBackground={theme.heroBackground}
          coverImageUrl={
            invitation.cover_image_url
          }
        />

        <section className="px-5 py-9 sm:px-12 sm:py-12">
          <div
            className={`rounded-2xl border p-6 text-center ${theme.guestBoxStyle}`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              {translation.specialInvitationFor}
            </p>

            <h2
              className={`mt-3 text-3xl font-bold sm:text-4xl ${theme.accentText}`}
            >
              {invitation.guest_name}
            </h2>
          </div>

          <p className="mx-auto mt-7 max-w-lg text-center text-base leading-7 text-slate-600">
            {theme.message}
          </p>

          <div className="my-9 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />

            <span
              className={`text-2xl ${theme.accentText}`}
            >
              ✦
            </span>

            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-6">
            {hasCeremonyDetails && (
              <EventLocationSection
                icon="⛪"
                title={
                  invitation.ceremony_title ||
                  translation.ceremony
                }
                date={invitation.ceremony_date}
                time={invitation.ceremony_time}
                venue={invitation.ceremony_venue}
                mapUrl={
                  invitation.ceremony_map_url
                }
                language={language}
                accentTextClass={
                  theme.accentText
                }
                detailBackgroundClass={
                  theme.detailBackground
                }
              />
            )}

            <EventLocationSection
              icon="🥂"
              title={translation.reception}
              date={invitation.event_date}
              time={invitation.event_time}
              venue={invitation.venue}
              mapUrl={
                invitation.reception_map_url
              }
              language={language}
              accentTextClass={theme.accentText}
              detailBackgroundClass={
                theme.detailBackground
              }
            />
          </div>

          {invitation.dress_code && (
            <section
              className={`mt-6 rounded-3xl border border-slate-200 p-6 text-center shadow-sm ${theme.detailBackground}`}
            >
              <div className="text-4xl">👔</div>

              <p className="mt-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                {translation.dressCode}
              </p>

              <p
                className={`mt-3 text-2xl font-bold ${theme.accentText}`}
              >
                {invitation.dress_code}
              </p>
            </section>
          )}

          <Countdown
            eventDate={invitation.event_date}
            eventTime={invitation.event_time}
            language={language}
            accentTextClass={theme.accentText}
            boxClassName={
              theme.detailBackground
            }
          />

          <div
            className={`mt-7 rounded-2xl border p-6 text-center ${theme.guestBoxStyle}`}
          >
            <p className="text-sm text-slate-600">
              {translation.invitationAdmits}
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${theme.accentText}`}
            >
              {invitation.allowed_guests}{" "}
              {invitation.allowed_guests === 1
                ? translation.guest
                : translation.guests}
            </p>
          </div>

          <EventPass
            guestName={invitation.guest_name}
            qrToken={invitation.qr_token}
            eventPassId={invitation.event_pass_id}
            allowedGuests={
              invitation.allowed_guests
            }
            category={invitation.category}
            language={language}
            accentTextClass={theme.accentText}
            boxClassName={
              theme.detailBackground
            }
          />

          <RsvpButtons
            invitationToken={
              invitation.invitation_token
            }
            currentStatus={
              invitation.rsvp_status
            }
            language={language}
            accentTextClass={theme.accentText}
          />

          <div className="mt-10 border-t border-slate-100 pt-7 text-center">
            <p className="text-sm font-semibold text-slate-500">
              Smart Event Pass
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {translation.footer}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}