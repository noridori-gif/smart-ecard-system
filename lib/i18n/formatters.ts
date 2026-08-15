import type { AppLanguage } from "./types";
export function appLocale(language: AppLanguage) { return language === "sw" ? "sw-TZ" : "en-TZ"; }
export function formatAppDate(value: Date | string | number, language: AppLanguage, options?: Intl.DateTimeFormatOptions) { return new Intl.DateTimeFormat(appLocale(language), options).format(new Date(value)); }
export function formatAppNumber(value: number, language: AppLanguage, options?: Intl.NumberFormatOptions) { return new Intl.NumberFormat(appLocale(language), options).format(value); }
export function formatAppTzs(value: number, language: AppLanguage) { return new Intl.NumberFormat(appLocale(language), { style: "currency", currency: "TZS", maximumFractionDigits: 0 }).format(value); }

export function formatAppRelativeTime(value: Date | string | number, language: AppLanguage) {
  const date = new Date(value);
  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(appLocale(language), { numeric: "auto" });
  const absMinutes = Math.abs(diffMinutes);
  if (absMinutes < 1) return rtf.format(0, "minute");
  if (absMinutes < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, "day");
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return formatAppDate(date, language, { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" });
}
