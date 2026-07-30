"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function Dialog({
  titleId,
  onClose,
  children,
  className = "",
}: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-[20px] border border-[#e7e1d7] bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.22)] outline-none sm:max-h-[90vh] sm:rounded-[20px] sm:p-6 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
