import type { HTMLAttributes, ReactNode } from "react";

type Tone = "success" | "warning" | "error" | "info";

const tones: Record<Tone, { shell: string; marker: string; role: "alert" | "status" }> = {
  success: {
    shell: "border-emerald-200 bg-emerald-50 text-emerald-800",
    marker: "bg-emerald-600",
    role: "status",
  },
  warning: {
    shell: "border-amber-200 bg-amber-50 text-amber-900",
    marker: "bg-amber-600",
    role: "status",
  },
  error: {
    shell: "border-red-200 bg-red-50 text-red-800",
    marker: "bg-red-600",
    role: "alert",
  },
  info: {
    shell: "border-blue-200 bg-blue-50 text-blue-800",
    marker: "bg-blue-600",
    role: "status",
  },
};

export default function FeedbackBanner({
  tone,
  children,
  className = "",
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "role"> & {
  tone: Tone;
  children: ReactNode;
}) {
  const style = tones[tone];
  return (
    <div
      {...props}
      role={style.role}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${style.shell} ${className}`}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.marker}`} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
