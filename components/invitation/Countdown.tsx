"use client";

import { useEffect, useState } from "react";

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
  const safeTime = eventTime || "00:00:00";
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
      difference / (1000 * 60 * 60 * 24)
    ),

    hours: Math.floor(
      (difference / (1000 * 60 * 60)) % 24
    ),

    minutes: Math.floor(
      (difference / (1000 * 60)) % 60
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
  const [timeRemaining, setTimeRemaining] =
    useState<TimeRemaining | null>(null);

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

    const intervalId = window.setInterval(
      updateCountdown,
      1000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [eventDate, eventTime]);

  const translations =
    language === "sw"
      ? {
          loading: "Inapakia muda uliobaki...",
          heading: "Tukio Linaanza Baada ya",
          days: "Siku",
          hours: "Saa",
          minutes: "Dakika",
          seconds: "Sekunde",
          eventHere: "Tukio Limewadia",
          welcome:
            "Tunatarajia kukukaribisha.",
        }
      : {
          loading: "Loading countdown...",
          heading: "Event Starts In",
          days: "Days",
          hours: "Hours",
          minutes: "Minutes",
          seconds: "Seconds",
          eventHere: "The Event Is Here",
          welcome:
            "We look forward to welcoming you.",
        };

  if (!timeRemaining) {
    return (
      <div className="mt-9 text-center text-sm text-slate-400">
        {translations.loading}
      </div>
    );
  }

  if (timeRemaining.isFinished) {
    return (
      <div className="mt-9 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
          {translations.eventHere}
        </p>

        <p className="mt-2 text-lg font-semibold text-emerald-900">
          {translations.welcome}
        </p>
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

  const indicatorClass =
    accentTextClass.startsWith("text-")
      ? accentTextClass.replace(
          "text-",
          "bg-"
        )
      : "bg-blue-700";

  return (
    <section className="mt-9">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
          {translations.heading}
        </p>

        <div
          className={`mx-auto mt-3 h-1 w-12 rounded-full ${indicatorClass}`}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {countdownItems.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl p-4 text-center shadow-sm ${boxClassName}`}
          >
            <p
              className={`text-3xl font-bold tabular-nums ${accentTextClass}`}
            >
              {String(item.value).padStart(
                2,
                "0"
              )}
            </p>

            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}