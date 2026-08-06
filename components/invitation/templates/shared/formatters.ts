type Language = "sw" | "en";

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
