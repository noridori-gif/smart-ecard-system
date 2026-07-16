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

  accentTextClass?: string;

  boxClassName?: string;
};

export default function EventPass({
  qrToken,
  eventPassId,
  allowedGuests,
  category,
  language = "sw",
  accentTextClass =
    "text-blue-700",
  boxClassName =
    "bg-slate-50",
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
    <section
      className={`mt-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm ${boxClassName}`}
    >
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-[116px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm sm:grid-cols-[138px_minmax(0,1fr)] sm:gap-5 sm:p-4">
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5">
            <QRCodeSVG
              value={qrValue}
              size={128}
              includeMargin
              level="M"
              className="h-auto w-full"
              aria-label="Guest QR Code"
            />
          </div>

          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {
                translation
                  .entryPass
              }
            </p>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {
                translation.passId
              }
            </p>

            <p
              className={`mt-1 break-all font-mono text-lg font-bold tracking-[0.06em] sm:text-2xl ${accentTextClass}`}
            >
              {displayPassId}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                  {
                    translation
                      .allowed
                  }
                </p>

                <p className="mt-0.5 text-xs font-bold text-slate-900 sm:text-sm">
                  {
                    safeAllowedGuests
                  }{" "}
                  {allowedLabel}
                </p>
              </div>

              <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                  {
                    translation
                      .category
                  }
                </p>

                <p className="mt-0.5 max-w-24 truncate text-xs font-bold text-slate-900 sm:max-w-32 sm:text-sm">
                  {category?.trim() ||
                    "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 px-2 text-center">
          <span
            className={`text-sm ${accentTextClass}`}
          >
            ◉
          </span>

          <p className="text-[11px] leading-5 text-slate-500 sm:text-xs">
            {translation.scan}
          </p>
        </div>
      </div>
    </section>
  );
}