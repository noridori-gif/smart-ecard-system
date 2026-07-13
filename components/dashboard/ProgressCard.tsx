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
  barClassName = "bg-blue-600",
}: ProgressCardProps) {
  const safeValue = clampPercentage(value);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

        <span className="text-2xl font-bold text-slate-900">
          {safeValue}%
        </span>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200">
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
    </div>
  );
}