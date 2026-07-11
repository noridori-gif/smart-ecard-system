"use client";

import { QRCodeSVG } from "qrcode.react";

type EventPassProps = {
  guestName: string;
  qrToken: string;
  allowedGuests: number;
  category: string | null;
  accentTextClass?: string;
  boxClassName?: string;
};

export default function EventPass({
  guestName,
  qrToken,
  allowedGuests,
  category,
  accentTextClass = "text-blue-700",
  boxClassName = "bg-slate-50",
}: EventPassProps) {
  return (
    <section className="mt-9">
      <div
        className={`rounded-3xl border border-slate-200 p-6 text-center shadow-sm ${boxClassName}`}
      >
        <div className="text-4xl">🎟️</div>

        <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
          Event Pass
        </p>

        <h3 className={`mt-2 text-2xl font-bold ${accentTextClass}`}>
          {guestName}
        </h3>

        <div className="mt-6 flex justify-center rounded-2xl bg-white p-5">
          <QRCodeSVG
            value={qrToken}
            size={240}
            level="H"
            includeMargin
          />
        </div>

        <p className="mt-5 text-sm font-medium text-slate-700">
          Present this QR code at the entrance.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white p-3">
            <p className="text-slate-500">Category</p>
            <p className="mt-1 font-semibold text-slate-900">
              {category ?? "Normal"}
            </p>
          </div>

          <div className="rounded-xl bg-white p-3">
            <p className="text-slate-500">Admits</p>
            <p className="mt-1 font-semibold text-slate-900">
              {allowedGuests}{" "}
              {allowedGuests === 1 ? "Guest" : "Guests"}
            </p>
          </div>
        </div>

        <p className="mt-5 text-xs text-slate-400">
          This pass is unique to the invited guest.
        </p>
      </div>
    </section>
  );
}