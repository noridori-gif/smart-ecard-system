"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";

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
  previewDetails,
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
  previewDetails?: ReactNode;
  confirmationLabel: string;
  sendLabel: string;
  onConfirmedChange: (confirmed: boolean) => void;
  onClose: () => void;
  onSend: () => void;
}) {
  if (!open) return null;
  return (
    <Dialog titleId="message-preview-title" onClose={onClose} className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {channel}
          </p>
          <h2 id="message-preview-title" className="mt-1 text-xl font-bold text-slate-950">
            {title}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <pre className="mt-5 whitespace-pre-wrap rounded-xl border border-stone-200 bg-stone-50 p-4 font-sans text-[15px] leading-6 text-slate-800">
        {message}
      </pre>
      {previewDetails}
      <p className={`mt-4 rounded-xl p-3 text-sm ${providerReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
        <b>Provider readiness:</b> {providerMessage}
      </p>
      <label className="mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 px-3 text-sm font-medium">
        <input type="checkbox" checked={confirmed} onChange={(event) => onConfirmedChange(event.target.checked)} />
        {confirmationLabel}
      </label>
      <Button
        type="button"
        variant="primary"
        className="mt-4 w-full"
        loading={busy}
        disabled={busy || !confirmed || !providerReady || !canSend}
        onClick={onSend}
      >
        {sendLabel}
      </Button>
    </Dialog>
  );
}
