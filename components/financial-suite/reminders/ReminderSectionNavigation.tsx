"use client";

export type ReminderSection =
  | "overview"
  | "send"
  | "thank-you"
  | "operations"
  | "settings";

export const reminderSections: Array<{
  value: ReminderSection;
  label: string;
}> = [
  { value: "overview", label: "Overview" },
  { value: "send", label: "Send Reminders" },
  { value: "thank-you", label: "Thank You" },
  { value: "operations", label: "Operations" },
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
  return (
    <div className="overflow-x-auto pb-1">
      <div
        role="tablist"
        aria-label="Reminder workspace sections"
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
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}
