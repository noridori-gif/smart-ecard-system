"use client";

import { useState } from "react";

import {
  QRCodeSVG,
} from "qrcode.react";

import Dialog from "@/components/ui/Dialog";
import { formatPassIdForDisplay } from "@/lib/passId";

type Language =
  | "sw"
  | "en";

type EventPassProps = {
  /*
   * Imeachwa optional kwa compatibility
   * na pages zinazotuma guestName.
   * Jina halionyeshwi tena hapa.
   */
  guestName?: string;

  qrToken: string;

  eventPassId:
    | string
    | null;

  allowedGuests: number;

  category:
    | string
    | null;

  language?: Language;
};

export default function EventPass({
  qrToken,
  eventPassId,
  allowedGuests,
  category,
  language = "sw",
}: EventPassProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const translation =
    language === "sw"
      ? {
          entryPass:
            "Pass ya Kuingia",

          passId:
            "Event Pass ID",

          allowed:
            "Idadi",

          category:
            "Kundi",

          guest:
            "Mgeni",

          guests:
            "Wageni",

          scan:
            "Onyesha QR Code au Event Pass ID wakati wa kuingia.",

          unavailable:
            "Haijapatikana",

          zoomLabel:
            "Gusa kuikuza QR Code",

          close:
            "Funga",
        }
      : {
          entryPass:
            "Entry Pass",

          passId:
            "Event Pass ID",

          allowed:
            "Allowed",

          category:
            "Category",

          guest:
            "Guest",

          guests:
            "Guests",

          scan:
            "Present the QR Code or Event Pass ID during check-in.",

          unavailable:
            "Not available",

          zoomLabel:
            "Tap to enlarge QR Code",

          close:
            "Close",
        };

  const safeAllowedGuests =
    Number.isFinite(
      allowedGuests
    ) &&
    allowedGuests > 0
      ? allowedGuests
      : 1;

  const allowedLabel =
    safeAllowedGuests === 1
      ? translation.guest
      : translation.guests;

  const displayPassId =
    eventPassId?.trim()
      ? formatPassIdForDisplay(eventPassId)
      : translation.unavailable;

  const qrValue =
    qrToken?.trim() ||
    eventPassId?.trim() ||
    "invalid-event-pass";

  return (
    <section className="mt-12">
      <div
        className="flex items-center gap-5 rounded-[1.75rem] px-5 py-6 text-white sm:px-7 sm:py-7"
        style={{
          background:
            "linear-gradient(135deg, var(--theme-primary), color-mix(in srgb, var(--theme-primary) 62%, black))",
        }}
      >
        <button
          type="button"
          onClick={() => setIsZoomOpen(true)}
          aria-label={translation.zoomLabel}
          className="relative shrink-0 rounded-2xl bg-white p-2.5 shadow-inner transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <QRCodeSVG
            value={qrValue}
            size={130}
            includeMargin
            level="M"
            className="h-auto w-full"
            aria-hidden="true"
          />

          <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full border border-black/10 bg-white text-slate-600 shadow-sm">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
            </svg>
          </span>
        </button>

        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.24em]" style={{ color: "var(--theme-accent)" }}>
            {translation.entryPass}
          </p>

          <p className="mt-2 truncate font-mono text-xl font-black tracking-wide sm:text-2xl">
            {displayPassId}
          </p>

          <p className="mt-2 text-xs text-white/75">
            {safeAllowedGuests} {allowedLabel}
            {category?.trim() ? ` · ${category.trim()}` : ""}
          </p>
        </div>
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 px-2 text-center text-[11px] leading-5 text-slate-500 sm:text-xs">
        <span style={{ color: "var(--theme-accent)" }}>◉</span>
        {translation.scan}
      </p>

      {isZoomOpen && (
        <Dialog
          titleId="event-pass-zoom-title"
          onClose={() => setIsZoomOpen(false)}
          className="max-w-xs text-center"
        >
          <h2 id="event-pass-zoom-title" className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
            {translation.entryPass}
          </h2>

          <div className="mx-auto mt-4 w-full max-w-[260px] rounded-2xl bg-white p-4 shadow-inner ring-1 ring-slate-100">
            <QRCodeSVG
              value={qrValue}
              size={260}
              includeMargin
              level="M"
              className="h-auto w-full"
              aria-label="Guest QR Code"
            />
          </div>

          <p className="mt-4 font-mono text-2xl font-black tracking-wide text-slate-900">
            {displayPassId}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {translation.scan}
          </p>

          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            {translation.close}
          </button>
        </Dialog>
      )}
    </section>
  );
}
