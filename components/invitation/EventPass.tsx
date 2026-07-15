"use client";

import {
  QRCodeSVG,
} from "qrcode.react";

type Language = "sw" | "en";

type EventPassProps = {
  /*
   * Tunaiacha optional ili code ya zamani
   * inayotuma guestName isiwe na error.
   * Jina halitaonyeshwa tena kwenye pass.
   */
  guestName?: string;

  qrToken: string;
  eventPassId: string | null;
  allowedGuests: number;
  category: string | null;
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
          heading:
            "Digital Access Pass",

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
          heading:
            "Digital Access Pass",

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

  const allowedLabel =
    allowedGuests === 1
      ? translation.guest
      : translation.guests;

  return (
    <section
      className={`mt-5 overflow-hidden rounded-2xl border border-slate-200 shadow-sm ${boxClassName}`}
    >
      <div className="px-4 pb-5 pt-4 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
          {translation.heading}
        </p>

        <div className="mt-4 grid grid-cols-[128px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
            <QRCodeSVG
              value={qrToken}
              size={132}
              includeMargin
              level="M"
              className="h-auto w-full"
            />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {translation.passId}
            </p>

            <p
              className={`mt-1 break-words font-mono text-xl font-bold tracking-[0.08em] sm:text-2xl ${accentTextClass}`}
            >
              {eventPassId ??
                translation.unavailable}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/80 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  {translation.allowed}
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900 sm:text-base">
                  {allowedGuests}{" "}
                  {allowedLabel}
                </p>
              </div>

              <div className="rounded-xl bg-white/80 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  {translation.category}
                </p>

                <p className="mt-1 truncate text-sm font-bold text-slate-900 sm:text-base">
                  {category ?? "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500 sm:text-sm">
          {translation.scan}
        </p>
      </div>
    </section>
  );
}