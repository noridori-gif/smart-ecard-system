"use client";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";

export type ReminderSection =
  | "send"
  | "meetings"
  | "schedule"
  | "thank-you"
  | "activity"
  | "settings";

export const reminderSections: Array<{
  value: ReminderSection;
  label: string;
}> = [
  { value: "send", label: "Send" }, { value: "meetings", label: "Meeting Invitations" }, { value: "schedule", label: "Schedule" }, { value: "thank-you", label: "Thank You" }, { value: "activity", label: "History" }, { value: "settings", label: "Settings" },
];

const primarySections: Array<{ value: ReminderSection; label: string; matches: ReminderSection[] }> = [
  { value: "send", label: "Send", matches: ["send", "thank-you"] },
  { value: "schedule", label: "Schedule", matches: ["schedule"] },
  { value: "activity", label: "History", matches: ["activity"] },
];
const secondarySections: Array<{ value: ReminderSection; label: string }> = [
  { value: "meetings", label: "Meeting Invitations" },
  { value: "settings", label: "Settings" },
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
    <div className="flex flex-wrap items-center justify-between gap-3 overflow-x-auto pb-1">
      <div
        role="tablist"
        aria-label={t("reminders.navigation")}
        className="flex min-w-max gap-1 rounded-2xl border border-[#e7e1d7] bg-white p-1.5 shadow-sm"
      >
        {primarySections.map((section) => {
          const isActive = section.matches.includes(active);
          return (
            <button
              key={section.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(section.value)}
              className={`min-h-11 rounded-xl px-4 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-stone-100 hover:text-slate-950"
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>
      <div className="flex min-w-max gap-1 rounded-2xl border border-[#e7e1d7] bg-white p-1.5 shadow-sm">
        {secondarySections.map((section) => {
          const isActive = active === section.value;
          return (
            <button
              key={section.value}
              type="button"
              onClick={() => onChange(section.value)}
              className={`min-h-11 rounded-xl px-3 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-stone-100 hover:text-slate-950"
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
