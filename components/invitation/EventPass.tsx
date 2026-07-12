"use client";

import { QRCodeSVG } from "qrcode.react";

type Language = "sw" | "en";

type EventPassProps = {
  guestName: string;
  qrToken: string;
  eventPassId: string | null;
  allowedGuests: number;
  category: string | null;
  language?: Language;
  accentTextClass?: string;
  boxClassName?: string;
};

export default function EventPass({
  guestName,
  qrToken,
  eventPassId,
  allowedGuests,
  category,
  language = "sw",
  accentTextClass = "text-blue-700",
  boxClassName = "bg-slate-50",
}: EventPassProps) {
  const t =
    language === "sw"
      ? {
          title: "Smart Event Pass",
          guest: "Mgeni",
          category: "Kundi",
          allowed: "Wageni Wanaruhusiwa",
          passId: "Namba ya Event Pass",
          scan: "Onyesha QR au namba hii wakati wa kuingia.",
          guestWord: "Mgeni",
          guestsWord: "Wageni",
          unavailable: "Haijapatikana",
        }
      : {
          title: "Smart Event Pass",
          guest: "Guest",
          category: "Category",
          allowed: "Allowed Guests",
          passId: "Event Pass ID",
          scan: "Present this QR code or Event Pass ID during check-in.",
          guestWord: "Guest",
          guestsWord: "Guests",
          unavailable: "Not available",
        };

  return (
    <section
      className={`mt-8 overflow-hidden rounded-3xl border border-slate-200 shadow-sm ${boxClassName}`}
    >
      <div className="border-b border-slate-200 bg-white/70 px-6 py-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
          Digital Access Pass
        </p>

        <h3
          className={`mt-2 text-2xl font-bold ${accentTextClass}`}
        >
          {t.title}
        </h3>
      </div>

      <div className="grid gap-7 p-6 md:grid-cols-2 md:p-8">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {t.guest}
            </p>

            <p className="mt-1 text-xl font-semibold text-slate-900">
              {guestName}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {t.passId}
            </p>

            <div className="mt-2 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm">
              <p
                className={`font-mono text-xl font-bold tracking-[0.12em] ${accentTextClass}`}
              >
                {eventPassId ?? t.unavailable}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {t.category}
            </p>

            <p className="mt-1 text-lg font-semibold text-slate-900">
              {category ?? "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {t.allowed}
            </p>

            <p className="mt-1 text-lg font-semibold text-slate-900">
              {allowedGuests}{" "}
              {allowedGuests === 1
                ? t.guestWord
                : t.guestsWord}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
            <QRCodeSVG
              value={qrToken}
              size={180}
              includeMargin
            />
          </div>

          <p className="mt-4 max-w-xs text-center text-sm leading-6 text-slate-500">
            {t.scan}
          </p>
        </div>
      </div>
    </section>
  );
}