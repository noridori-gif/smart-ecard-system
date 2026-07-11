"use client";

import { useEffect, useState } from "react";

type CountdownProps = {
  eventDate: string;
  eventTime: string;
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
  const targetDate = new Date(`${eventDate}T${safeTime}`);

  const difference = targetDate.getTime() - Date.now();

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
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
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
  accentTextClass = "text-blue-700",
  boxClassName = "bg-slate-50",
}: CountdownProps) {
  const [timeRemaining, setTimeRemaining] =
    useState<TimeRemaining | null>(null);

  useEffect(() => {
    function updateCountdown() {
      setTimeRemaining(
        calculateTimeRemaining(eventDate, eventTime)
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

  if (!timeRemaining) {
    return (
      <div className="mt-9 text-center text-sm text-slate-400">
        Loading countdown...
      </div>
    );
  }

  if (timeRemaining.isFinished) {
    return (
      <div className="mt-9 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
          The Event Is Here
        </p>

        <p className="mt-2 text-lg font-semibold text-emerald-900">
          We look forward to welcoming you.
        </p>
      </div>
    );
  }

  const countdownItems = [
    {
      label: "Days",
      value: timeRemaining.days,
    },
    {
      label: "Hours",
      value: timeRemaining.hours,
    },
    {
      label: "Minutes",
      value: timeRemaining.minutes,
    },
    {
      label: "Seconds",
      value: timeRemaining.seconds,
    },
  ];

  return (
    <section className="mt-9">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
          Event Starts In
        </p>

        <div
          className={`mx-auto mt-3 h-1 w-12 rounded-full ${accentTextClass.replace(
            "text-",
            "bg-"
          )}`}
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
              {String(item.value).padStart(2, "0")}
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