"use client";

import {
  QRCodeSVG,
} from "qrcode.react";

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
    eventPassId?.trim() ||
    translation.unavailable;

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
        <div className="shrink-0 rounded-2xl bg-white p-2.5 shadow-inner">
          <QRCodeSVG
            value={qrValue}
            size={104}
            includeMargin
            level="M"
            className="h-auto w-full"
            aria-label="Guest QR Code"
          />
        </div>

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
    </section>
  );
}
