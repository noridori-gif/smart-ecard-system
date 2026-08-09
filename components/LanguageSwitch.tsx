"use client";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import type { AppLanguage } from "@/lib/i18n/types";
export default function LanguageSwitch() {
  const { language, setLanguage, t, supportedLanguages } = useAppLanguage();
  return <label><span className="sr-only">{t("language.label")}</span><select aria-label={t("language.label")} value={language} onChange={(event) => setLanguage(event.target.value as AppLanguage)} className="min-h-11 rounded-xl border border-[#e7e1d7] bg-white px-2.5 text-sm font-semibold text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-700 sm:px-3">{supportedLanguages.map((code) => <option key={code} value={code}>{t(`language.${code}`)}</option>)}</select></label>;
}
