"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { TEMPLATE_COMPONENTS } from "@/components/invitation/templates";
import { buildSampleInvitation, deriveHeroTitle, type SampleInvitationInput } from "./sampleInvitation";

const SANDBOX_WIDTH = 400;

type Props = SampleInvitationInput & { className?: string };

export default function TemplateThumbnail({ className, ...sample }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const Template = TEMPLATE_COMPONENTS[sample.template];
  const invitation = buildSampleInvitation(sample);
  const heroTitle = deriveHeroTitle(invitation);

  const themeVariables = {
    "--theme-primary": invitation.theme_primary_color,
    "--theme-secondary": invitation.theme_secondary_color,
    "--theme-accent": invitation.theme_accent_color,
  } as CSSProperties;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setScale(el.clientWidth / SANDBOX_WIDTH);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={themeVariables}
      className={`relative aspect-[3/5] w-full overflow-hidden bg-stone-100 ${className ?? ""}`}
    >
      {scale > 0 && (
        <div
          inert
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ width: SANDBOX_WIDTH, transform: `scale(${scale})` }}
        >
          <Template
            invitation={invitation}
            heroTitle={heroTitle}
            displayedMessage={invitation.invitation_message ?? ""}
            language={sample.language}
          />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/15 to-transparent" />
    </div>
  );
}
