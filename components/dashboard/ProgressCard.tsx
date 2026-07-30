type ProgressCardProps = {
  title: string;
  value: number;
  description?: string;
  barClassName?: string;
};

function clampPercentage(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

export default function ProgressCard({
  title,
  value,
  description,
  barClassName = "bg-emerald-700",
}: ProgressCardProps) {
  const safeValue = clampPercentage(value);

  return (
    <article className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900">
            {title}
          </h3>

          {description && (
            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>

        <span className="text-2xl font-bold tabular-nums text-slate-900">
          {safeValue}%
        </span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
          style={{
            width: `${safeValue}%`,
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>0%</span>
        <span>100%</span>
      </div>
    </article>
  );
}
