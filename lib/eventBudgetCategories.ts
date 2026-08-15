export type EventBudgetCategoryKey =
  | "venue" | "catering" | "entertainment" | "decorations"
  | "drinks" | "transport" | "mc" | "photography";

export const DEFAULT_EVENT_BUDGET_CATEGORIES: { key: EventBudgetCategoryKey; en: string; sw: string }[] = [
  { key: "venue", en: "Venue", sw: "Ukumbi" },
  { key: "catering", en: "Catering", sw: "Chakula" },
  { key: "entertainment", en: "Entertainment", sw: "Burudani" },
  { key: "decorations", en: "Decorations", sw: "Mapambo" },
  { key: "drinks", en: "Drinks", sw: "Vinywaji" },
  { key: "transport", en: "Transport", sw: "Usafiri" },
  { key: "mc", en: "Emcee (MC)", sw: "MC" },
  { key: "photography", en: "Photography", sw: "Upigaji Picha" },
];
