import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "dark"
  | "info"
  | "warning"
  | "caution"
  | "danger"
  | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-emerald-700 text-white hover:bg-emerald-800",
  secondary:
    "border border-[#ddd7cc] bg-white text-slate-700 hover:bg-[#faf8f4]",
  outline:
    "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50",
  dark: "bg-slate-900 text-white hover:bg-slate-800",
  info: "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  warning:
    "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  caution: "bg-amber-600 text-white hover:bg-amber-700",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  ghost: "bg-transparent text-slate-700 hover:bg-stone-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-11 px-4 text-[15px]",
  lg: "min-h-12 px-5 text-base",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type={props.type ?? "button"}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, className })}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
