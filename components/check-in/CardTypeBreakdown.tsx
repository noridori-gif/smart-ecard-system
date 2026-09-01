export type CardTypeBucket = { passCount: number; capacity: number; checkedIn: number };

function CardTypeRow({ label, bucket, unit }: { label: string; bucket: CardTypeBucket; unit: string }) {
  const percentage = bucket.capacity ? Math.min((bucket.checkedIn / bucket.capacity) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-14 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
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
      <span className="shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-slate-700">
        {bucket.checkedIn.toLocaleString()}/{bucket.capacity.toLocaleString()} {unit}
      </span>
      <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums text-emerald-700">{percentage.toFixed(0)}%</span>
    </div>
  );
}

export default function CardTypeBreakdown({ single, double }: { single: CardTypeBucket; double: CardTypeBucket }) {
  return (
    <div className="sep-card space-y-2 p-3 sm:p-4" role="group" aria-label="Single vs Double card breakdown">
      <CardTypeRow label="Single" bucket={single} unit="passes" />
      <CardTypeRow label="Double" bucket={double} unit="guests" />
    </div>
  );
}
