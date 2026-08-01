import type { InvitationTemplate } from "@/services/eventService";

export type EventTemplateOption = {
  value: InvitationTemplate;
  name: string;
  description: { en: string; sw: string };
  icon: string;
  category: "Classic" | "Luxury" | "Modern" | "Minimal" | "Premium";
};

export const EVENT_TEMPLATE_OPTIONS: EventTemplateOption[] = [
  { value: "classic_photo", name: "Classic Photo", icon: "CP", category: "Classic", description: { en: "A photo-led invitation with event details, RSVP and Event Pass.", sw: "Mwaliko wenye picha, taarifa za event, RSVP na Event Pass." } },
  { value: "elegant_gold", name: "Elegant Gold", icon: "EG", category: "Classic", description: { en: "Formal stationery with refined gold details.", sw: "Kadi rasmi yenye mapambo maridadi ya dhahabu." } },
  { value: "luxury_envelope", name: "Luxury Envelope", icon: "LE", category: "Luxury", description: { en: "An opening-envelope experience with complete event details.", sw: "Bahasha inayofunguka yenye taarifa zote za event." } },
  { value: "modern_floral", name: "Modern Floral", icon: "MF", category: "Modern", description: { en: "A light contemporary design with soft florals.", sw: "Design ya kisasa yenye maua na rangi laini." } },
  { value: "royal_dark", name: "Royal Dark", icon: "RD", category: "Luxury", description: { en: "Dark luxury with metallic accents and a regal finish.", sw: "Dark luxury yenye metallic accents na muonekano wa kifalme." } },
  { value: "minimal_ivory", name: "Minimal Ivory", icon: "MI", category: "Minimal", description: { en: "Clean ivory editorial stationery and refined typography.", sw: "Editorial ivory yenye typography safi na ya kifahari." } },
  { value: "african_royal", name: "African Royal", icon: "AR", category: "Premium", description: { en: "Premium African editorial with geometric details.", sw: "Premium African editorial yenye geometric patterns." } },
  { value: "midnight_luxe", name: "Midnight Luxe", icon: "ML", category: "Premium", description: { en: "A cinematic evening design with fine-line glow.", sw: "Design ya usiku yenye mwonekano wa cinematic na fine-line glow." } },
  { value: "heritage_monogram", name: "Heritage Monogram", icon: "HM", category: "Classic", description: { en: "Formal heritage stationery with a monogram crest.", sw: "Kadi rasmi ya heritage yenye monogram crest." } },
  { value: "chateau_letterpress", name: "Château Letterpress", icon: "CL", category: "Luxury", description: { en: "European letterpress styling with fine frames.", sw: "European letterpress yenye fine frames na initials seal." } },
  { value: "emerald_botanical_halo", name: "Emerald Botanical Halo", icon: "EH", category: "Premium", description: { en: "Botanical emerald luxury with a metallic halo.", sw: "Botanical luxury ya emerald yenye metallic-gold halo." } },
];

export const EVENT_WIZARD_STEP_COUNT = 5;
