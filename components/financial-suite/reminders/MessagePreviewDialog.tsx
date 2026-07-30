"use client";

import { useEffect } from "react";

export default function MessagePreviewDialog({
  open,
  title,
  channel,
  message,
  providerMessage,
  providerReady,
  confirmed,
  busy,
  canSend = true,
  confirmationLabel,
  sendLabel,
  onConfirmedChange,
  onClose,
  onSend,
}: {
  open: boolean;
  title: string;
  channel: string;
  message: string;
  providerMessage: string;
  providerReady: boolean;
  confirmed: boolean;
  busy: boolean;
  canSend?: boolean;
  confirmationLabel: string;
  sendLabel: string;
  onConfirmedChange: (confirmed: boolean) => void;
  onClose: () => void;
  onSend: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-preview-title"
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              {channel}
            </p>
            <h2 id="message-preview-title" className="mt-1 text-xl font-bold text-slate-950">
              {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-3 font-semibold text-slate-600 hover:bg-stone-100">
            Close
          </button>
        </div>
        <pre className="mt-5 whitespace-pre-wrap rounded-xl border border-stone-200 bg-stone-50 p-4 font-sans text-[15px] leading-6 text-slate-800">
          {message}
        </pre>
        <p className={`mt-4 rounded-xl p-3 text-sm ${providerReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          <b>Provider readiness:</b> {providerMessage}
        </p>
        <label className="mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 px-3 text-sm font-medium">
          <input type="checkbox" checked={confirmed} onChange={(event) => onConfirmedChange(event.target.checked)} />
          {confirmationLabel}
        </label>
        <button
          type="button"
          disabled={busy || !confirmed || !providerReady || !canSend}
          onClick={onSend}
          className="mt-4 min-h-11 w-full rounded-xl bg-emerald-600 px-4 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sendLabel}
        </button>
      </section>
    </div>
  );
}
