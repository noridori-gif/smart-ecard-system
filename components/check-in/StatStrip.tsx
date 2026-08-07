export default function StatStrip({
  checkedIn,
  invited,
  remaining,
  attendancePercentage,
}: {
  checkedIn: number;
  invited: number;
  remaining: number;
  attendancePercentage: number;
}) {
  const items = [
    ["Checked In", `${checkedIn.toLocaleString()} / ${invited.toLocaleString()}`],
    ["Remaining", remaining.toLocaleString()],
    ["Attendance", `${attendancePercentage.toFixed(1)}%`],
  ] as const;

  return (
    <div className="sep-card p-4 sm:p-5" role="group" aria-label="Live attendance summary">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-[7rem]">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          </div>
        ))}
        <div className="ml-auto hidden items-center gap-2 text-xs font-semibold text-emerald-700 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live session
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-label="Overall attendance" aria-valuemin={0} aria-valuemax={invited} aria-valuenow={checkedIn}>
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.min(attendancePercentage, 100)}%` }} />
      </div>
    </div>
  );
}
