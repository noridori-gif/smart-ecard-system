import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant =
  | "success"
  | "warning"
  | "neutral"
  | "info"
  | "danger"
  | "archived";

const variants: Record<BadgeVariant, string> = {
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-blue-100 text-blue-800",
  danger: "bg-red-100 text-red-700",
  archived: "bg-slate-800 text-white",
};

export default function Badge({
  variant = "neutral",
  dot = false,
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold ${variants[variant]} ${className}`}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
