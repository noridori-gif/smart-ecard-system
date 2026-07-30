import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="sep-card flex min-h-48 items-center justify-center border-dashed p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-stone-100 text-slate-600" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M4 6h16v12H4zM8 10h8m-8 4h5" />
          </svg>
        </span>
        <h2 className="sep-card-title mt-3">{title}</h2>
        <p className="sep-secondary mt-1">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
