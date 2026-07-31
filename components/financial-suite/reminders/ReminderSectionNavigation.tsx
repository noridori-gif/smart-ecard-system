"use client";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import type { TranslationKey } from "@/lib/i18n/translations";

export type ReminderSection =
  | "overview"
  | "send"
  | "thank-you"
  | "operations"
  | "settings";

export const reminderSections: Array<{
  value: ReminderSection;
  label: TranslationKey;
}> = [
  { value: "overview", label: "reminders.overview" }, { value: "send", label: "reminders.send" }, { value: "thank-you", label: "reminders.thankYou" }, { value: "operations", label: "reminders.operations" }, { value: "settings", label: "reminders.settings" },
];

export function isReminderSection(value: string | null): value is ReminderSection {
  return reminderSections.some((section) => section.value === value);
}

export default function ReminderSectionNavigation({
  active,
  onChange,
}: {
  active: ReminderSection;
  onChange: (section: ReminderSection) => void;
}) {
  const { t } = useAppLanguage();
  return (
    <div className="overflow-x-auto pb-1">
      <div
        role="tablist"
        aria-label={t("reminders.navigation")}
        className="flex min-w-max gap-1 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm"
      >
        {reminderSections.map((section) => (
          <button
            key={section.value}
            type="button"
            role="tab"
            aria-selected={active === section.value}
            onClick={() => onChange(section.value)}
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 motion-reduce:transition-none ${
              active === section.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-stone-100 hover:text-slate-950"
            }`}
          >
            {t(section.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
