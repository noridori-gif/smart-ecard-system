"use client";

import type { CSSProperties } from "react";

import { TEMPLATE_COMPONENTS } from "@/components/invitation/templates";
import { buildSampleInvitation, deriveHeroTitle, type SampleInvitationInput } from "./sampleInvitation";

const FRAME_WIDTH = 300;
const VIEWPORT_HEIGHT = 600;

/**
 * Renders the actual selected template component (not a mockup) inside a
 * phone-frame chrome, using the organizer's real in-progress wizard data via
 * buildSampleInvitation - the same function that already powers the
 * template-picker thumbnails. The rendered card is inert (visually real,
 * not interactive) since RSVP/WishForm here would submit against a fake
 * "preview" token.
 */
export default function LiveInvitationPreview(sample: SampleInvitationInput) {
  const Template = TEMPLATE_COMPONENTS[sample.template];
  const invitation = buildSampleInvitation(sample);
  const heroTitle = deriveHeroTitle(invitation);

  const themeVariables = {
    "--theme-primary": invitation.theme_primary_color,
    "--theme-secondary": invitation.theme_secondary_color,
    "--theme-accent": invitation.theme_accent_color,
  } as CSSProperties;

  return (
    <div className="mx-auto rounded-[38px] bg-slate-950 p-2 shadow-2xl" style={{ width: FRAME_WIDTH + 16 }}>
      <div className="relative overflow-hidden rounded-[31px]" style={{ height: VIEWPORT_HEIGHT }}>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2">
          <div className="h-5 w-24 rounded-full bg-slate-950" />
        </div>

        <div
          className="h-full overflow-y-auto"
          style={{
            background: `linear-gradient(135deg, ${invitation.theme_secondary_color}, #ffffff, ${invitation.theme_accent_color}22)`,
          }}
        >
          <div inert aria-hidden="true" className="px-2 pb-4 pt-9" style={themeVariables}>
            <Template
              invitation={invitation}
              heroTitle={heroTitle}
              displayedMessage={invitation.invitation_message ?? ""}
              language={sample.language}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
