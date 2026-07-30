export default function ProgressCards({ total, single, double }: { total: { current: number; maximum: number }; single: { current: number; maximum: number }; double: { current: number; maximum: number } }) {
  const cards = [["Overall Attendance", total], ["Single Pass Progress", single], ["Double Pass Progress", double]] as const;
  return <section aria-labelledby="attendance-progress-title">
    <h2 id="attendance-progress-title" className="sep-section-title">Attendance Progress</h2>
    <div className="mt-4 grid gap-3 lg:grid-cols-3">{cards.map(([label, value]) => {
      const percentage = value.maximum ? Math.min((value.current / value.maximum) * 100, 100) : 0;
      return <article key={label} className="sep-card p-5"><div className="flex items-baseline justify-between gap-3"><h3 className="font-bold text-slate-900">{label}</h3><span className="text-sm font-bold tabular-nums text-emerald-700">{percentage.toFixed(1)}%</span></div><p className="mt-3 text-sm text-slate-500"><b className="text-lg tabular-nums text-slate-900">{value.current}</b> / {value.maximum}</p><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={value.maximum} aria-valuenow={value.current}><div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percentage}%` }} /></div></article>;
    })}</div>
  </section>;
}
