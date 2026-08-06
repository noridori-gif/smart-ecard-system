import { formatEventDate, formatEventTime } from "./formatters";

type Language = "sw" | "en";

export type ScheduleEntry = {
  eyebrow: string;
  title: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapUrl?: string | null;
};

type ScheduleGridProps = {
  entries: ScheduleEntry[];
  language: Language;
  primaryColor: string;
  accentColor: string;
};

function ScheduleRow({
  entry,
  language,
  primaryColor,
  accentColor,
}: {
  entry: ScheduleEntry;
  language: Language;
  primaryColor: string;
  accentColor: string;
}) {
  return (
    <article className="border-t border-black/10 py-6 first:border-t-0 sm:grid sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-6">
      <p
        className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] sm:mb-0"
        style={{ color: primaryColor }}
      >
        {entry.eyebrow}
      </p>

      <div>
        <h3 className="font-serif text-2xl leading-tight text-slate-950 sm:text-3xl">
          {entry.title}
        </h3>

        <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {language === "sw" ? "Tarehe" : "Date"}
            </span>
            <span className="mt-1 block font-semibold">{formatEventDate(entry.date, language)}</span>
          </p>

          <p>
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {language === "sw" ? "Muda" : "Time"}
            </span>
            <span className="mt-1 block font-semibold">{formatEventTime(entry.time, language)}</span>
          </p>

          <p className="sm:col-span-2">
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {language === "sw" ? "Mahali" : "Venue"}
            </span>
            <span className="mt-1 block font-semibold">{entry.venue || "—"}</span>
          </p>
        </div>

        {entry.mapUrl && (
          <a
            href={entry.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 border-b-2 pb-1 text-xs font-black uppercase tracking-[0.14em]"
            style={{ borderColor: accentColor, color: primaryColor }}
          >
            <span>⌖</span>
            {language === "sw" ? "Fungua Ramani" : "Open Map"}
          </a>
        )}
      </div>
    </article>
  );
}

export default function ScheduleGrid({ entries, language, primaryColor, accentColor }: ScheduleGridProps) {
  return (
    <div>
      {entries.map(entry => (
        <ScheduleRow
          key={entry.eyebrow}
          entry={entry}
          language={language}
          primaryColor={primaryColor}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}
