import type { ComponentType } from "react";

import type { InvitationTemplate } from "@/services/eventService";
import type { PublicInvitation } from "@/services/invitationService";

import BotanicalRomance from "./BotanicalRomance";
import Custom from "./Custom";
import GoldenElegance from "./GoldenElegance";
import HeritagePattern from "./HeritagePattern";
import ModernMinimalPhoto from "./ModernMinimalPhoto";
import RoyalPortrait from "./RoyalPortrait";

export type InvitationTemplateProps = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: "sw" | "en";
};

export const TEMPLATE_COMPONENTS: Record<InvitationTemplate, ComponentType<InvitationTemplateProps>> = {
  royal_portrait: RoyalPortrait,
  golden_elegance: GoldenElegance,
  botanical_romance: BotanicalRomance,
  modern_minimal_photo: ModernMinimalPhoto,
  heritage_pattern: HeritagePattern,
  // No bespoke web template built yet for this WhatsApp-card-only design --
  // reusing the closest thematic match (botanical/floral) so the public
  // /invite/[token] page and gallery thumbnail don't break. Flagged for the
  // user; a dedicated web template can follow if they want the web page to
  // match too.
  garden_elegance: BotanicalRomance,
  custom: Custom,
};
