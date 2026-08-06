import type { ReactNode } from "react";

type CardShellProps = {
  backgroundColor: string;
  className?: string;
  children: ReactNode;
};

export default function CardShell({ backgroundColor, className = "", children }: CardShellProps) {
  return (
    <div
      className={`mx-auto w-full max-w-2xl overflow-hidden shadow-[0_28px_90px_rgba(15,23,42,0.25)] sm:rounded-[2rem] ${className}`}
      style={{ backgroundColor }}
    >
      {children}
    </div>
  );
}
