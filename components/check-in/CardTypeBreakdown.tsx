export type CardTypeBucket = { passCount: number; capacity: number; checkedIn: number };

function CardTypeCard({
  label,
  bucket,
  unitLabel,
  showCapacityNote,
}: {
  label: string;
  bucket: CardTypeBucket;
  unitLabel: string;
  showCapacityNote: boolean;
}) {
  const percentage = bucket.capacity ? Math.min((bucket.checkedIn / bucket.capacity) * 100, 100) : 0;

  return (
    <article className="sep-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-bold text-slate-900">{label}</h3>
        <span className="text-sm font-bold tabular-nums text-emerald-700">{percentage.toFixed(1)}%</span>
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-bold tabular-nums text-slate-900">{bucket.passCount.toLocaleString()}</span>
        <span className="text-sm text-slate-500">
          passes{showCapacityNote ? ` = ${bucket.capacity.toLocaleString()} guests` : ""}
        </span>
      </p>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-stone-100"
        role="progressbar"
        aria-label={`${label} checked in`}
        aria-valuemin={0}
        aria-valuemax={bucket.capacity}
        aria-valuenow={bucket.checkedIn}
      >
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 text-sm text-slate-500">
        <b className="text-slate-900">{bucket.checkedIn.toLocaleString()}</b> / {bucket.capacity.toLocaleString()} {unitLabel} checked in
      </p>
    </article>
  );
}

export default function CardTypeBreakdown({ single, double }: { single: CardTypeBucket; double: CardTypeBucket }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CardTypeCard label="Single Cards" bucket={single} unitLabel="passes" showCapacityNote={false} />
      <CardTypeCard label="Double Cards" bucket={double} unitLabel="guests" showCapacityNote />
    </div>
  );
}
