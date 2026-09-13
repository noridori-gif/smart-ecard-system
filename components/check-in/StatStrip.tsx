import CheckInIcon, { type CheckInIconName } from "./CheckInIcons";

export default function StatStrip({
  totalGuests,
  checkedIn,
  remaining,
  attendancePercentage,
}: {
  totalGuests: number;
  checkedIn: number;
  remaining: number;
  attendancePercentage: number;
}) {
  const cards: Array<{ label: string; value: number; icon: CheckInIconName; tone: string; sub?: string }> = [
    { label: "Total Guests", value: totalGuests, icon: "users", tone: "bg-sky-50 text-sky-700" },
    { label: "Checked In", value: checkedIn, icon: "success", tone: "bg-emerald-50 text-emerald-700", sub: `${attendancePercentage.toFixed(0)}% of total` },
    { label: "Remaining", value: remaining, icon: "clock", tone: "bg-sky-50 text-sky-700" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label="Live attendance summary">
      {cards.map((card) => (
        <div key={card.label} className="sep-card flex items-center gap-3 p-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${card.tone}`}>
            <CheckInIcon name={card.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">{card.value.toLocaleString()}</p>
            {card.sub && <p className="text-xs font-bold text-emerald-700">{card.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
