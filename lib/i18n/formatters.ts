import type { AppLanguage } from "./types";
export function appLocale(language: AppLanguage) { return language === "sw" ? "sw-TZ" : "en-TZ"; }
export function formatAppDate(value: Date | string | number, language: AppLanguage, options?: Intl.DateTimeFormatOptions) { return new Intl.DateTimeFormat(appLocale(language), options).format(new Date(value)); }
export function formatAppNumber(value: number, language: AppLanguage, options?: Intl.NumberFormatOptions) { return new Intl.NumberFormat(appLocale(language), options).format(value); }
export function formatAppTzs(value: number, language: AppLanguage) { return new Intl.NumberFormat(appLocale(language), { style: "currency", currency: "TZS", maximumFractionDigits: 0 }).format(value); }
