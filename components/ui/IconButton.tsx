import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClassName, type ButtonVariant } from "./Button";

export default function IconButton({
  label,
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <button
      type={props.type ?? "button"}
      {...props}
      title={label}
      aria-label={label}
      className={buttonClassName({
        variant,
        size: "sm",
        className: `h-11 w-11 shrink-0 px-0 ${className}`,
      })}
    >
      {children}
    </button>
  );
}
