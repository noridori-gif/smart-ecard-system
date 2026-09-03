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
  custom: Custom,
};
