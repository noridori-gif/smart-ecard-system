import type { InvitationTemplate } from "@/services/eventService";

export type EventTemplateOption = {
  value: InvitationTemplate;
  name: string;
  description: { en: string; sw: string };
  icon: string;
  category: "Classic" | "Luxury" | "Modern" | "Minimal" | "Premium" | "Custom";
};

export const EVENT_TEMPLATE_OPTIONS: EventTemplateOption[] = [
  { value: "royal_portrait", name: "Royal Portrait", icon: "RP", category: "Luxury", description: { en: "A large couple portrait hero with gold serif names, formal and elegant.", sw: "Picha kubwa ya wapenzi yenye majina ya dhahabu, muonekano rasmi na wa kifahari." } },
  { value: "golden_elegance", name: "Golden Elegance", icon: "GE", category: "Premium", description: { en: "A duotone editorial portrait with warm gold text overlay.", sw: "Picha ya editorial yenye rangi mbili na maandishi ya dhahabu juu yake." } },
  { value: "botanical_romance", name: "Botanical Romance", icon: "BR", category: "Modern", description: { en: "Floral corner ornaments, cream background and a romantic script signature.", sw: "Mapambo ya maua pembeni, background ya cream na jina la kimapenzi la script." } },
  { value: "modern_minimal_photo", name: "Modern Minimal Photo", icon: "MP", category: "Minimal", description: { en: "A clean single portrait with generous whitespace and minimal ornamentation.", sw: "Picha safi moja yenye nafasi nyingi na mapambo machache." } },
  { value: "heritage_pattern", name: "Heritage Pattern", icon: "HP", category: "Classic", description: { en: "A bold cultural design with a geometric border pattern.", sw: "Design ya kitamaduni yenye mpaka wa geometric pattern." } },
  { value: "garden_elegance", name: "Garden Elegance", icon: "GA", category: "Modern", description: { en: "Forest green leaf sprays, deep red berries and blush pink blooms in an ivory frame.", sw: "Matawi ya kijani ya msituni, matunda mekundu na maua ya waridi ndani ya mpaka wa ivory." } },
  { value: "custom", name: "Custom Design", icon: "CD", category: "Custom", description: { en: "Upload your own fully-designed invitation image and position guest name, venue, date/time and QR code on it.", sw: "Pakia muundo wako mwenyewe wa mwaliko na weka jina la mgeni, eneo, tarehe/muda na QR code juu yake." } },
];

export const EVENT_WIZARD_STEP_COUNT = 5;
