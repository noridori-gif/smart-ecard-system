"use client";

import {
  useRef,
  useState,
} from "react";

import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";

import type {
  PublicInvitation,
} from "@/services/invitationService";

type Language =
  | "sw"
  | "en";

type LuxuryEnvelopeProps = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: Language;
};

type LocationCardProps = {
  label: string;
  title: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapUrl: string | null;
  language: Language;
};

function formatDate(
  date: string | null,
  language: Language
) {
  if (!date) {
    return "-";
  }

  const parsedDate =
    new Date(
      `${date}T00:00:00`
    );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return date;
  }

  return new Intl.DateTimeFormat(
    language === "sw"
      ? "sw-TZ"
      : "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(parsedDate);
}

function formatTime(
  time: string | null,
  language: Language
) {
  if (!time) {
    return "-";
  }

  const [
    hours,
    minutes,
  ] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return time;
  }

  return new Intl.DateTimeFormat(
    language === "sw"
      ? "sw-TZ"
      : "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  ).format(
    new Date(
      2026,
      0,
      1,
      hours,
      minutes
    )
  );
}

function LocationCard({
  label,
  title,
  date,
  time,
  venue,
  mapUrl,
  language,
}: LocationCardProps) {
  const openMap =
    language === "sw"
      ? "Fungua Ramani"
      : "Open Map";

  return (
    <section className="rounded-[2rem] border border-[#d9d2bd] bg-white/70 p-5 shadow-[0_18px_45px_rgba(30,41,59,0.08)] backdrop-blur-sm sm:p-7">
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-[#9a8250]">
        {label}
      </p>

      <h3 className="mt-3 text-center font-serif text-3xl text-[#12213f]">
        {title}
      </h3>

      <div className="mt-6 divide-y divide-[#ded8c8] border-y border-[#ded8c8]">
        <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 py-4">
          <div className="text-xl">
            📅
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#9a8250]">
              {language === "sw"
                ? "Tarehe"
                : "Date"}
            </p>

            <p className="mt-1 font-serif text-lg text-[#12213f]">
              {formatDate(
                date,
                language
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 py-4">
          <div className="text-xl">
            🕒
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#9a8250]">
              {language === "sw"
                ? "Muda"
                : "Time"}
            </p>

            <p className="mt-1 font-serif text-lg text-[#12213f]">
              {formatTime(
                time,
                language
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 py-4">
          <div className="text-xl">
            📍
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#9a8250]">
              {language === "sw"
                ? "Mahali"
                : "Venue"}
            </p>

            <p className="mt-1 font-serif text-lg text-[#12213f]">
              {venue || "-"}
            </p>
          </div>
        </div>
      </div>

      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#12213f] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#1d3158]"
        >
          <span>⌖</span>

          <span>
            {openMap}
          </span>
        </a>
      )}
    </section>
  );
}

export default function LuxuryEnvelope({
  invitation,
  heroTitle,
  displayedMessage,
  language,
}: LuxuryEnvelopeProps) {
  const [
    isOpened,
    setIsOpened,
  ] = useState(false);

  const contentReference =
    useRef<HTMLDivElement | null>(
      null
    );

  const openInvitation =
    language === "sw"
      ? "Fungua Mwaliko"
      : "Open Invitation";

  const specialInvitation =
    language === "sw"
      ? "Mwaliko Maalumu Kwa"
      : "Special Invitation For";

  function handleOpenInvitation() {
    if (isOpened) {
      return;
    }

    setIsOpened(true);

    window.setTimeout(() => {
      contentReference.current
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 950);
  }

  const hasCeremony =
    Boolean(
      invitation.ceremony_date ||
      invitation.ceremony_time ||
      invitation.ceremony_venue
    );

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-[2.2rem] border border-[#d8d0ba] bg-[#f8f6ed] shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
      <section className="relative flex min-h-[680px] flex-col items-center justify-center overflow-hidden px-5 py-12 text-center">
        {invitation.cover_image_url ? (
          <>
            <img
              src={
                invitation.cover_image_url
              }
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-xl"
            />

            <img
              src={
                invitation.cover_image_url
              }
              alt={
                invitation.event_title
              }
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-[#07152a]/50 via-[#07152a]/35 to-[#07152a]/90" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f0ecdf_45%,#d9d1bd_100%)]" />
        )}

        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full border border-[#d6b96e]" />

          <div className="absolute -right-20 bottom-10 h-64 w-64 rounded-full border border-[#d6b96e]" />
        </div>

        <div className="relative z-10 w-full">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#e9d49a]">
            Smart Event Pass
          </p>

          <h1 className="mt-4 font-serif text-4xl leading-tight text-white drop-shadow-lg sm:text-5xl">
            {heroTitle}
          </h1>

          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
            {
              invitation.event_title
            }
          </p>

          <button
            type="button"
            onClick={
              handleOpenInvitation
            }
            aria-expanded={
              isOpened
            }
            className="group relative mx-auto mt-10 block h-64 w-full max-w-sm focus:outline-none"
          >
            <div
              className={`absolute inset-x-0 bottom-0 h-52 overflow-hidden rounded-2xl border border-[#d7bd78] bg-[#10264a] shadow-2xl transition duration-700 ${
                isOpened
                  ? "translate-y-8 opacity-0"
                  : "translate-y-0 opacity-100"
              }`}
            >
              <div
                className="absolute inset-0 bg-gradient-to-br from-[#183765] via-[#10264a] to-[#07152a]"
                style={{
                  clipPath:
                    "polygon(0 0, 50% 58%, 100% 0, 100% 100%, 0 100%)",
                }}
              />

              <div className="absolute inset-x-0 bottom-5 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#efd58e]">
                  {openInvitation}
                </p>

                <p className="mt-2 text-xl text-white">
                  ↓
                </p>
              </div>
            </div>

            <div
              className={`absolute inset-x-0 top-0 mx-auto h-36 w-full max-w-sm origin-top rounded-t-2xl bg-gradient-to-b from-[#1a3d70] to-[#10264a] shadow-xl transition duration-1000 ${
                isOpened
                  ? "[transform:perspective(900px)_rotateX(175deg)]"
                  : "[transform:perspective(900px)_rotateX(0deg)]"
              }`}
              style={{
                clipPath:
                  "polygon(0 0, 100% 0, 50% 100%)",
              }}
            />

            <div
              className={`absolute left-1/2 top-[92px] flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[#e4ca83] bg-[#bb8d31] font-serif text-lg font-bold text-white shadow-xl transition duration-500 ${
                isOpened
                  ? "scale-0 opacity-0"
                  : "scale-100 opacity-100"
              }`}
            >
              SEP
            </div>
          </button>
        </div>
      </section>

      <div
        ref={contentReference}
        className={`origin-top transition-all duration-1000 ${
          isOpened
            ? "max-h-[10000px] translate-y-0 opacity-100"
            : "pointer-events-none max-h-0 -translate-y-8 overflow-hidden opacity-0"
        }`}
      >
        <section className="px-5 py-12 text-center sm:px-9">
          <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#9a8250]">
            {specialInvitation}
          </p>

          <h2 className="mt-4 font-serif text-4xl leading-tight text-[#12213f]">
            {
              invitation.guest_name
            }
          </h2>

          <div className="mx-auto my-7 flex max-w-xs items-center gap-3">
            <span className="h-px flex-1 bg-[#d7cda9]" />

            <span className="text-[#b99542]">
              ✦
            </span>

            <span className="h-px flex-1 bg-[#d7cda9]" />
          </div>

          <p className="whitespace-pre-line font-serif text-lg leading-8 text-slate-600">
            {displayedMessage}
          </p>
        </section>

        <section className="border-y border-[#ded7c3] bg-white/55 px-5 py-10 sm:px-9">
          <Countdown
            eventDate={
              invitation.event_date
            }
            eventTime={
              invitation.event_time
            }
            language={language}
            accentTextClass="text-[#12213f]"
            boxClassName="bg-white/80"
          />
        </section>

        <div className="space-y-5 px-5 py-10 sm:px-9">
          {hasCeremony && (
            <LocationCard
              label={
                language === "sw"
                  ? "Ratiba ya Kwanza"
                  : "First Schedule"
              }
              title={
                invitation.ceremony_title ||
                (
                  language === "sw"
                    ? "Ibada"
                    : "Ceremony"
                )
              }
              date={
                invitation.ceremony_date
              }
              time={
                invitation.ceremony_time
              }
              venue={
                invitation.ceremony_venue
              }
              mapUrl={
                invitation.ceremony_map_url
              }
              language={language}
            />
          )}

          <LocationCard
            label={
              language === "sw"
                ? "Ratiba ya Sherehe"
                : "Celebration Schedule"
            }
            title={
              language === "sw"
                ? "Mapokezi / Sherehe"
                : "Reception"
            }
            date={
              invitation.event_date
            }
            time={
              invitation.event_time
            }
            venue={
              invitation.venue
            }
            mapUrl={
              invitation.reception_map_url
            }
            language={language}
          />
        </div>

        {invitation.dress_code && (
          <section className="mx-5 rounded-[2rem] bg-[#12213f] px-6 py-9 text-center text-white sm:mx-9">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#dec583]">
              {language === "sw"
                ? "Mavazi ya Sherehe"
                : "Dress Code"}
            </p>

            <h3 className="mt-4 font-serif text-3xl">
              {
                invitation.dress_code
              }
            </h3>

            <div className="mt-6 flex justify-center gap-3">
              {[
                invitation
                  .theme_primary_color ||
                  "#12213F",

                invitation
                  .theme_accent_color ||
                  "#D4AF37",

                invitation
                  .theme_secondary_color ||
                  "#F8F6ED",
              ].map(
                (color) => (
                  <span
                    key={color}
                    className="h-10 w-10 rounded-full border-2 border-white/70 shadow-lg"
                    style={{
                      backgroundColor:
                        color,
                    }}
                  />
                )
              )}
            </div>
          </section>
        )}

        <section className="border-t border-[#ded7c3] px-5 py-10 sm:px-9">
          <WishForm
            invitationToken={
              invitation
                .invitation_token
            }
            guestName={
              invitation.guest_name
            }
            language={language}
          />
        </section>

        <section className="px-5 py-10 sm:px-9">
          <RsvpButtons
            invitationToken={
              invitation
                .invitation_token
            }
            currentStatus={
              invitation.rsvp_status
            }
            language={language}
            accentTextClass="text-[#12213f]"
          />

          <EventPass
            guestName={
              invitation.guest_name
            }
            qrToken={
              invitation.qr_token
            }
            eventPassId={
              invitation.event_pass_id
            }
            allowedGuests={
              invitation.allowed_guests
            }
            category={
              invitation.category
            }
            language={language}
            accentTextClass="text-[#12213f]"
            boxClassName="bg-[#f1eee2]"
          />
        </section>

        <footer className="border-t border-[#ded7c3] px-5 py-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#9a8250]">
            Smart Event Pass
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {language === "sw"
              ? "Mwaliko wako maalumu"
              : "Your personal invitation"}
          </p>
        </footer>
      </div>
    </div>
  );
}