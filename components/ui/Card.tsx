import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section {...props} className={`sep-card ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div>
        <h2 className="sep-card-title">{title}</h2>
        {description && <p className="sep-secondary mt-1">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <article className={`sep-card p-5 ${className}`}>
      <p className="sep-label uppercase tracking-wide text-slate-500">{label}</p>
      <p className="sep-metric mt-2">{value}</p>
    </article>
  );
}
