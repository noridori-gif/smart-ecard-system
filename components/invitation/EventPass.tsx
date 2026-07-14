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
          accessPass:
            "Digital Access Pass",
          title: "Smart Event Pass",
          guest: "Mgeni",
          category: "Kundi",
          allowed: "Idadi",
          passId: "Event Pass ID",
          scan:
            "Onyesha QR Code au Event Pass ID wakati wa kuingia.",
          guestWord: "Mgeni",
          guestsWord: "Wageni",
          unavailable:
            "Haijapatikana",
        }
      : {
          accessPass:
            "Digital Access Pass",
          title: "Smart Event Pass",
          guest: "Guest",
          category: "Category",
          allowed: "Seats",
          passId: "Event Pass ID",
          scan:
            "Present this QR Code or Event Pass ID during check-in.",
          guestWord: "Guest",
          guestsWord: "Guests",
          unavailable:
            "Not available",
        };

  return (
    <section
      className={`mt-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm ${boxClassName}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/70 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {t.accessPass}
          </p>

          <h3
            className={`mt-0.5 text-lg font-bold ${accentTextClass}`}
          >
            {t.title}
          </h3>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
          🎟️
        </div>
      </div>

      <div className="p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {t.passId}
          </p>

          <div className="mt-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-center shadow-sm">
            <p
              className={`break-all font-mono text-xl font-bold tracking-[0.12em] ${accentTextClass}`}
            >
              {eventPassId ??
                t.unavailable}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-white/80 bg-white/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {t.guest}
          </p>

          <p className="mt-0.5 break-words text-base font-bold text-slate-900">
            {guestName}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                {t.category}
              </p>

              <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                {category ?? "-"}
              </p>
            </div>

            <div className="rounded-lg bg-white px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                {t.allowed}
              </p>

              <p className="mt-0.5 text-sm font-semibold text-slate-800">
                {allowedGuests}{" "}
                {allowedGuests === 1
                  ? t.guestWord
                  : t.guestsWord}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
            <QRCodeSVG
              value={qrToken}
              size={164}
              includeMargin
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          <p className="mt-2 max-w-sm text-center text-xs leading-5 text-slate-500">
            {t.scan}
          </p>
        </div>
      </div>
    </section>
  );
}