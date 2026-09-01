export type CardTypeBucket = { passCount: number; capacity: number; checkedIn: number };

function CardTypeRow({
  label,
  bucket,
  unit,
  showCapacityNote,
}: {
  label: string;
  bucket: CardTypeBucket;
  unit: string;
  showCapacityNote: boolean;
}) {
  const percentage = bucket.capacity ? Math.min((bucket.checkedIn / bucket.capacity) * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-bold uppercase tracking-wide text-slate-500">
          {label}
          <span className="ml-1.5 font-semibold normal-case tracking-normal text-slate-700">
            {bucket.passCount.toLocaleString()} passes{showCapacityNote ? ` = ${bucket.capacity.toLocaleString()} guests` : ""}
          </span>
        </span>
        <span className="shrink-0 font-bold tabular-nums text-emerald-700">{percentage.toFixed(0)}%</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-100"
          role="progressbar"
          aria-label={`${label} checked in`}
          aria-valuemin={0}
          aria-valuemax={bucket.capacity}
          aria-valuenow={bucket.checkedIn}
        >
          <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percentage}%` }} />
        </div>
        <span className="shrink-0 whitespace-nowrap text-[11px] text-slate-500">
          {bucket.checkedIn.toLocaleString()} of {bucket.capacity.toLocaleString()} {unit} checked in
        </span>
      </div>
    </div>
  );
}

export default function CardTypeBreakdown({ single, double }: { single: CardTypeBucket; double: CardTypeBucket }) {
  return (
    <div className="sep-card space-y-2.5 p-3 sm:p-4" role="group" aria-label="Single vs Double card breakdown">
      <CardTypeRow label="Single" bucket={single} unit="passes" showCapacityNote={false} />
      <CardTypeRow label="Double" bucket={double} unit="guests" showCapacityNote />
    </div>
  );
}
