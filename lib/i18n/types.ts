export const SUPPORTED_LANGUAGES = ["sw", "en"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type TranslationParams = Record<string, string | number>;
export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}
