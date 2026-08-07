type Language = "sw" | "en";

export type PhotoLayout = "top_banner" | "side_by_side" | "text_only";

export function formatEventDate(date: string | null, language: Language): string {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

export function formatEventTime(time: string | null, language: Language): string {
  if (!time) return "—";

  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2026, 0, 1, hours, minutes));
}

export function formatDayNumber(date: string | null): string {
  if (!date) return "--";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "--";

  return String(parsed.getDate()).padStart(2, "0");
}

export function formatMonthAbbrev(date: string | null, language: Language): string {
  if (!date) return "";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", {
    month: "short",
  }).format(parsed).toUpperCase().replace(".", "");
}

export function formatYear(date: string | null): string {
  if (!date) return "";

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";

  return String(parsed.getFullYear());
}

export function coupleInitials(brideName: string | null, groomName: string | null, fallback: string): string {
  const parts = [groomName, brideName].filter(Boolean) as string[];
  if (parts.length === 0) return fallback;

  return parts.map(name => name.trim().charAt(0).toUpperCase()).join(" & ");
}

const HERO_NAME_SIZE_TIERS: Array<{ maxLength: number; min: number; vw: number; max: number }> = [
  { maxLength: 16, min: 40, vw: 9.5, max: 76 },
  { maxLength: 26, min: 34, vw: 8.5, max: 62 },
  { maxLength: 40, min: 28, vw: 7, max: 48 },
  { maxLength: Infinity, min: 24, vw: 6, max: 38 },
];

/**
 * Fluid, length-aware font size for hero couple names: longer names get a
 * lower ceiling so they stay to 1-2 lines instead of wrapping to 3+ at a
 * fixed large size. Returns a CSS `clamp()` value for direct use in `style`.
 */
export function heroNameFontSize(value: string): string {
  const length = value.trim().length;
  const tier = HERO_NAME_SIZE_TIERS.find(candidate => length <= candidate.maxLength) ?? HERO_NAME_SIZE_TIERS.at(-1)!;

  return `clamp(${tier.min}px, ${tier.vw}vw, ${tier.max}px)`;
}
