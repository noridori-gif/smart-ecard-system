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
  const items = [
    ["Total Guests", totalGuests.toLocaleString()],
    ["Checked In", `${checkedIn.toLocaleString()} / ${totalGuests.toLocaleString()}`],
    ["Remaining", remaining.toLocaleString()],
    ["Attendance", `${attendancePercentage.toFixed(1)}%`],
  ] as const;

  return (
    <div className="sep-card p-3 sm:p-4" role="group" aria-label="Live attendance summary">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-[5.5rem]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
          </div>
        ))}
        <div className="ml-auto hidden items-center gap-2 text-xs font-semibold text-emerald-700 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live session
        </div>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-label="Overall attendance" aria-valuemin={0} aria-valuemax={totalGuests} aria-valuenow={checkedIn}>
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.min(attendancePercentage, 100)}%` }} />
      </div>
    </div>
  );
}
