import { formatDayNumber, formatMonthAbbrev, formatYear } from "./formatters";

type Language = "sw" | "en";

type DateBadgeProps = {
  date: string | null;
  language: Language;
  shape?: "circle" | "square";
  primaryColor: string;
  accentColor: string;
  className?: string;
};

export default function DateBadge({
  date,
  language,
  shape = "circle",
  primaryColor,
  accentColor,
  className = "",
}: DateBadgeProps) {
  return (
    <div
      className={`flex h-20 w-20 flex-col items-center justify-center border-2 sm:h-24 sm:w-24 ${
        shape === "circle" ? "rounded-full" : "rounded-xl"
      } ${className}`}
      style={{ borderColor: accentColor, color: primaryColor }}
    >
      <span className="font-serif text-2xl font-bold leading-none sm:text-3xl">
        {formatDayNumber(date)}
      </span>

      <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] sm:text-[10px]">
        {formatMonthAbbrev(date, language)}
      </span>

      <span className="text-[8px] font-semibold opacity-70 sm:text-[9px]">
        {formatYear(date)}
      </span>
    </div>
  );
}
