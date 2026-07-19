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
import AfricanRoyal from "@/components/invitation/templates/AfricanRoyal";
import ChateauLetterpress from "@/components/invitation/templates/ChateauLetterpress";
import ClassicPhoto from "@/components/invitation/templates/ClassicPhoto";
import ElegantGold from "@/components/invitation/templates/ElegantGold";
import HeritageMonogram from "@/components/invitation/templates/HeritageMonogram";
import LuxuryEnvelope from "@/components/invitation/templates/LuxuryEnvelope";
import MinimalIvory from "@/components/invitation/templates/MinimalIvory";
import MidnightLuxe from "@/components/invitation/templates/MidnightLuxe";
import ModernFloral from "@/components/invitation/templates/ModernFloral";
import RoyalDark from "@/components/invitation/templates/RoyalDark";

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

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const {
    token,
  } = await params;

  try {
    const invitation =
      await getInvitationByToken(
        token
      );

    if (!invitation) {
      return {
        title:
          "Invitation Not Found",
      };
    }

    const title =
      `${invitation.event_title} | Smart Event Pass`;

    const description =
      invitation
        .invitation_message
        ?.trim() ||
      `A special invitation for ${invitation.guest_name}.`;

    return {
      title,
      description,

      openGraph: {
        title,
        description,

        images:
          invitation
            .cover_image_url
            ? [
                invitation
                  .cover_image_url,
              ]
            : undefined,
      },
    };
  } catch {
    return {
      title:
        "Invitation | Smart Event Pass",
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
    (
      language === "sw"
        ? "Pamoja na familia zao, wanayo furaha kukualika kushiriki katika siku yao maalumu."
        : "Together with their families, they warmly invite you to celebrate their special day."
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

  const eventType =
    invitation.event_type
      .trim()
      .toLowerCase();

  const isWedding =
    eventType === "wedding" ||
    eventType.includes(
      "harusi"
    );

  const isSendOff =
    eventType.includes(
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

  const templateProps = {
    invitation,
    heroTitle,
    displayedMessage,
    language,
  };

  return (
    <main
      style={{
        ...themeVariables,

        background:
          `linear-gradient(` +
          `135deg, ` +
          `${secondaryColor}, ` +
          `#ffffff, ` +
          `${accentColor}22` +
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
      "african_royal" ? (
        <AfricanRoyal
          {...templateProps}
        />
      ) : template ===
        "chateau_letterpress" ? (
        <ChateauLetterpress
          {...templateProps}
        />
      ) : template ===
        "heritage_monogram" ? (
        <HeritageMonogram
          {...templateProps}
        />
      ) : template ===
      "luxury_envelope" ? (
        <LuxuryEnvelope
          {...templateProps}
        />
      ) : template ===
        "midnight_luxe" ? (
        <MidnightLuxe
          {...templateProps}
        />
      ) : template ===
        "minimal_ivory" ? (
        <MinimalIvory
          {...templateProps}
        />
      ) : template ===
        "elegant_gold" ? (
        <ElegantGold
          {...templateProps}
        />
      ) : template ===
        "modern_floral" ? (
        <ModernFloral
          {...templateProps}
        />
      ) : template ===
        "royal_dark" ? (
        <RoyalDark
          {...templateProps}
        />
      ) : (
        <ClassicPhoto
          {...templateProps}
        />
      )}
    </main>
  );
}
