import type {
  CSSProperties,
} from "react";

import type {
  Metadata,
} from "next";

import {
  notFound,
} from "next/navigation";

import InvitationViewedTracker from "@/components/invitation/InvitationViewedTracker";
import ClassicPhoto from "@/components/invitation/templates/ClassicPhoto";
import ElegantGold from "@/components/invitation/templates/ElegantGold";
import LuxuryEnvelope from "@/components/invitation/templates/LuxuryEnvelope";

import {
  getInvitationByToken,
} from "@/services/invitationService";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type Props = {
  params: Promise<{
    token: string;
  }>;
};

type Language =
  | "sw"
  | "en";

function formatEventDate(
  eventDate: string | null,
  language: Language
) {
  if (!eventDate) {
    return "";
  }

  const parsedDate = new Date(
    `${eventDate}T00:00:00`
  );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return eventDate;
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
  ).format(parsedDate);
}

function formatEventTime(
  eventTime: string | null,
  language: Language
) {
  if (!eventTime) {
    return "";
  }

  const [
    hours,
    minutes,
  ] = eventTime
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return eventTime;
  }

  return new Intl.DateTimeFormat(
    language === "sw"
      ? "sw-TZ"
      : "en-GB",
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
      hours,
      minutes
    )
  );
}

function getDefaultMessage(
  eventType: string,
  language: Language
) {
  const normalizedEventType =
    eventType
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

  const isBirthday =
    normalizedEventType ===
      "birthday" ||
    normalizedEventType.includes(
      "kuzaliwa"
    );

  const isGraduation =
    normalizedEventType ===
      "graduation" ||
    normalizedEventType.includes(
      "mahafali"
    );

  if (isWedding) {
    return language === "sw"
      ? "Pamoja na familia zao, wanayo furaha kukualika kushiriki katika siku yao maalumu."
      : "Together with their families, they warmly invite you to celebrate their special day.";
  }

  if (isSendOff) {
    return language === "sw"
      ? "Tunayo furaha kukualika kushiriki nasi katika sherehe hii maalumu ya send-off."
      : "We warmly invite you to join us for this special send-off celebration.";
  }

  if (isBirthday) {
    return language === "sw"
      ? "Karibu tusherehekee pamoja siku hii yenye furaha na kumbukumbu nzuri."
      : "Join us for a joyful celebration filled with wonderful memories.";
  }

  if (isGraduation) {
    return language === "sw"
      ? "Karibu tusherehekee mafanikio haya na mwanzo wa hatua mpya."
      : "Join us as we celebrate this achievement and a new chapter.";
  }

  return language === "sw"
    ? "Tunayo furaha kukualika kushiriki nasi katika tukio hili maalumu."
    : "We warmly invite you to join us for this special occasion.";
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const {
    token,
  } = await params;

  if (!token) {
    return {
      title:
        "Invitation | Smart Event Pass",
    };
  }

  try {
    const invitation =
      await getInvitationByToken(
        token
      );

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

    const defaultDescription = [
      language === "sw"
        ? `Mwaliko maalumu kwa ${invitation.guest_name}.`
        : `A special invitation for ${invitation.guest_name}.`,

      formattedDate,
      formattedTime,
      invitation.venue,
    ]
      .filter(Boolean)
      .join(" • ");

    const description =
      invitation
        .invitation_message
        ?.trim() ||
      defaultDescription;

    const imageUrl =
      invitation.cover_image_url ??
      undefined;

    return {
      title,
      description,

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
                  invitation
                    .event_title,
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
  const {
    token,
  } = await params;

  if (!token) {
    notFound();
  }

  const invitation =
    await getInvitationByToken(
      token
    );

  if (!invitation) {
    notFound();
  }

  const language: Language =
    invitation.language === "en"
      ? "en"
      : "sw";

  const displayedMessage =
    invitation
      .invitation_message
      ?.trim() ||
    getDefaultMessage(
      invitation.event_type,
      language
    );

  const primaryColor =
    invitation
      .theme_primary_color ||
    "#BE123C";

  const secondaryColor =
    invitation
      .theme_secondary_color ||
    "#FFF1F2";

  const accentColor =
    invitation
      .theme_accent_color ||
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

  const template =
    invitation
      .invitation_template ||
    "classic_photo";

  return (
    <main
      style={{
        ...themeVariables,

        background:
          `linear-gradient(` +
          `135deg, ` +
          `${secondaryColor} 0%, ` +
          `#ffffff 50%, ` +
          `${accentColor}22 100%` +
          `)`,
      }}
      className="min-h-screen px-3 py-4 sm:px-4 sm:py-8"
    >
      <InvitationViewedTracker
        invitationToken={
          invitation
            .invitation_token
        }
      />

      {template ===
      "luxury_envelope" ? (
        <LuxuryEnvelope
          invitation={
            invitation
          }
          heroTitle={
            heroTitle
          }
          displayedMessage={
            displayedMessage
          }
          language={
            language
          }
        />
      ) : template ===
        "elegant_gold" ? (
        <ElegantGold
          invitation={
            invitation
          }
          heroTitle={
            heroTitle
          }
          displayedMessage={
            displayedMessage
          }
          language={
            language
          }
        />
      ) : (
        <ClassicPhoto
          invitation={
            invitation
          }
          heroTitle={
            heroTitle
          }
          displayedMessage={
            displayedMessage
          }
          language={
            language
          }
        />
      )}
    </main>
  );
}