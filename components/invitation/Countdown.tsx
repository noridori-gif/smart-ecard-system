"use client";

import {
  useEffect,
  useState,
} from "react";

type Language = "sw" | "en";

type CountdownProps = {
  eventDate: string;
  eventTime: string;
  language?: Language;
  accentTextClass?: string;
  boxClassName?: string;
};

type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isFinished: boolean;
};

function calculateTimeRemaining(
  eventDate: string,
  eventTime: string
): TimeRemaining {
  const safeTime =
    eventTime || "00:00:00";

  const targetDate = new Date(
    `${eventDate}T${safeTime}`
  );

  const difference =
    targetDate.getTime() - Date.now();

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isFinished: true,
    };
  }

  return {
    days: Math.floor(
      difference /
        (1000 * 60 * 60 * 24)
    ),

    hours: Math.floor(
      (difference /
        (1000 * 60 * 60)) %
        24
    ),

    minutes: Math.floor(
      (difference /
        (1000 * 60)) %
        60
    ),

    seconds: Math.floor(
      (difference / 1000) % 60
    ),

    isFinished: false,
  };
}

export default function Countdown({
  eventDate,
  eventTime,
  language = "sw",
  accentTextClass = "text-blue-700",
  boxClassName = "bg-slate-50",
}: CountdownProps) {
  const [
    timeRemaining,
    setTimeRemaining,
  ] = useState<TimeRemaining | null>(
    null
  );

  useEffect(() => {
    function updateCountdown() {
      setTimeRemaining(
        calculateTimeRemaining(
          eventDate,
          eventTime
        )
      );
    }

    updateCountdown();

    const intervalId =
      window.setInterval(
        updateCountdown,
        1000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [eventDate, eventTime]);

  const translations =
    language === "sw"
      ? {
          loading:
            "Inapakia muda...",
          heading:
            "Tukio Linaanza Baada ya",
          days: "Siku",
          hours: "Saa",
          minutes: "Dak",
          seconds: "Sek",
          eventHere:
            "Tukio Limewadia",
          welcome:
            "Tunatarajia kukukaribisha.",
        }
      : {
          loading:
            "Loading countdown...",
          heading: "Event Starts In",
          days: "Days",
          hours: "Hrs",
          minutes: "Min",
          seconds: "Sec",
          eventHere:
            "The Event Is Here",
          welcome:
            "We look forward to welcoming you.",
        };

  if (!timeRemaining) {
    return (
      <div className="mt-4 text-center text-xs text-slate-400">
        {translations.loading}
      </div>
    );
  }

  if (timeRemaining.isFinished) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl">
          🎉
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {translations.eventHere}
          </p>

          <p className="mt-0.5 text-sm font-semibold text-emerald-900">
            {translations.welcome}
          </p>
        </div>
      </div>
    );
  }

  const countdownItems = [
    {
      label: translations.days,
      value: timeRemaining.days,
    },
    {
      label: translations.hours,
      value: timeRemaining.hours,
    },
    {
      label: translations.minutes,
      value: timeRemaining.minutes,
    },
    {
      label: translations.seconds,
      value: timeRemaining.seconds,
    },
  ];

  return (
    <section className="mt-4">
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        {translations.heading}
      </p>

      <div className="mt-2 grid grid-cols-4 gap-2">
        {countdownItems.map(
          (item) => (
            <div
              key={item.label}
              className={`min-w-0 rounded-xl border border-white/70 px-1 py-2.5 text-center shadow-sm ${boxClassName}`}
            >
              <p
                className={`text-xl font-bold tabular-nums sm:text-2xl ${accentTextClass}`}
              >
                {String(
                  item.value
                ).padStart(2, "0")}
              </p>

              <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:text-[10px]">
                {item.label}
              </p>
            </div>
          )
        )}
      </div>
    </section>
  );
}