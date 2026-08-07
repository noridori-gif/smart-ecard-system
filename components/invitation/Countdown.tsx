"use client";

import {
  useEffect,
  useState,
} from "react";

type Language =
  | "sw"
  | "en";

type CountdownProps = {
  eventDate: string;
  eventTime: string;
  language?: Language;
};

type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isFinished: boolean;
  isValid: boolean;
};

function getEmptyTime(
  isFinished: boolean,
  isValid = true
): TimeRemaining {
  return {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isFinished,
    isValid,
  };
}

function calculateTimeRemaining(
  eventDate: string,
  eventTime: string
): TimeRemaining {
  if (!eventDate) {
    return getEmptyTime(
      false,
      false
    );
  }

  const safeTime =
    eventTime || "00:00:00";

  const targetDate =
    new Date(
      `${eventDate}T${safeTime}`
    );

  if (
    Number.isNaN(
      targetDate.getTime()
    )
  ) {
    return getEmptyTime(
      false,
      false
    );
  }

  const difference =
    targetDate.getTime() -
    Date.now();

  if (difference <= 0) {
    return getEmptyTime(
      true
    );
  }

  return {
    days: Math.floor(
      difference /
        (
          1000 *
          60 *
          60 *
          24
        )
    ),

    hours: Math.floor(
      (
        difference /
        (
          1000 *
          60 *
          60
        )
      ) % 24
    ),

    minutes: Math.floor(
      (
        difference /
        (
          1000 *
          60
        )
      ) % 60
    ),

    seconds: Math.floor(
      (
        difference /
        1000
      ) % 60
    ),

    isFinished: false,
    isValid: true,
  };
}

export default function Countdown({
  eventDate,
  eventTime,
  language = "sw",
}: CountdownProps) {
  const [
    timeRemaining,
    setTimeRemaining,
  ] = useState<
    TimeRemaining | null
  >(null);

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
  }, [
    eventDate,
    eventTime,
  ]);

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

          heading:
            "Event Starts In",

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
        {
          translations.loading
        }
      </div>
    );
  }

  if (
    !timeRemaining.isValid
  ) {
    return null;
  }

  if (
    timeRemaining.isFinished
  ) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl">
          🎉
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {
              translations
                .eventHere
            }
          </p>

          <p className="mt-0.5 text-sm font-semibold text-emerald-900">
            {
              translations
                .welcome
            }
          </p>
        </div>
      </div>
    );
  }

  const countdownItems = [
    {
      label:
        translations.days,

      value:
        timeRemaining.days,
    },
    {
      label:
        translations.hours,

      value:
        timeRemaining.hours,
    },
    {
      label:
        translations.minutes,

      value:
        timeRemaining.minutes,
    },
    {
      label:
        translations.seconds,

      value:
        timeRemaining.seconds,
    },
  ];

  return (
    <section className="mt-12 text-center">
      <div className="mb-5 flex items-center justify-center gap-3">
        <span className="h-px w-9" style={{ backgroundColor: "var(--theme-accent)" }} />

        <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--theme-accent)" }}>
          {translations.heading}
        </p>

        <span className="h-px w-9" style={{ backgroundColor: "var(--theme-accent)" }} />
      </div>

      <div className="flex items-start justify-center gap-3 sm:gap-5">
        {countdownItems.map((item, index) => (
          <div key={item.label} className="flex items-start gap-3 sm:gap-5">
            <div className="min-w-0 text-center">
              <p
                className="font-serif text-3xl font-black tabular-nums sm:text-4xl"
                style={{ color: "var(--theme-primary)" }}
              >
                {String(item.value).padStart(2, "0")}
              </p>

              <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:text-[10px]">
                {item.label}
              </p>
            </div>

            {index < countdownItems.length - 1 && (
              <span
                className="pt-0.5 font-serif text-2xl font-light sm:text-3xl"
                style={{ color: "var(--theme-accent)", opacity: 0.6 }}
              >
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}