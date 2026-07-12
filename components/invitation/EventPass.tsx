"use client";

import { QRCodeSVG } from "qrcode.react";

type Language = "sw" | "en";

type EventPassProps = {
  guestName: string;
  qrToken: string;
  allowedGuests: number;
  category: string | null;
  language?: Language;
  accentTextClass?: string;
  boxClassName?: string;
};

export default function EventPass({
  guestName,
  qrToken,
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
          scan: "Scan QR hii wakati wa kuingia.",
          guestWord: "Mgeni",
          guestsWord: "Wageni",
        }
      : {
          title: "Smart Event Pass",
          guest: "Guest",
          category: "Category",
          allowed: "Allowed Guests",
          scan: "Present this QR code during check-in.",
          guestWord: "Guest",
          guestsWord: "Guests",
        };

  return (
    <section
      className={`mt-8 rounded-3xl border border-slate-200 p-6 shadow-sm ${boxClassName}`}
    >
      <div className="text-center">
        <h3
          className={`text-2xl font-bold ${accentTextClass}`}
        >
          {t.title}
        </h3>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
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
          <div className="rounded-2xl bg-white p-4 shadow">
            <QRCodeSVG
              value={qrToken}
              size={180}
              includeMargin
            />
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            {t.scan}
          </p>
        </div>
      </div>
    </section>
  );
}