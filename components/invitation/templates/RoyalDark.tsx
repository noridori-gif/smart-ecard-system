import type { CSSProperties } from "react";

import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";

type Props = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: Language;
};

type DetailProps = {
  title: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapUrl: string | null;
  language: Language;
};

function formatDate(
  value: string | null,
  language: Language
) {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    language === "sw" ? "sw-TZ" : "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(date);
}

function Detail({
  title,
  date,
  time,
  venue,
  mapUrl,
  language,
}: DetailProps) {
  return (
    <article className="border-l border-[var(--theme-accent)] bg-white/[0.04] p-6">
      <h3 className="font-serif text-3xl text-white">
        {title}
      </h3>

      <div className="mt-6 grid gap-5 text-sm text-white/70">
        <p>
          <b className="mb-1 block text-[9px] uppercase tracking-[0.24em] text-[var(--theme-accent)]">
            {language === "sw" ? "Tarehe" : "Date"}
          </b>

          {formatDate(date, language)}
        </p>

        <p>
          <b className="mb-1 block text-[9px] uppercase tracking-[0.24em] text-[var(--theme-accent)]">
            {language === "sw" ? "Muda" : "Time"}
          </b>

          {time?.slice(0, 5) || "—"}
        </p>

        <p>
          <b className="mb-1 block text-[9px] uppercase tracking-[0.24em] text-[var(--theme-accent)]">
            {language === "sw" ? "Mahali" : "Venue"}
          </b>

          {venue || "—"}
        </p>
      </div>

      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex border-b border-[var(--theme-accent)] pb-1 text-[10px] font-black uppercase tracking-wider text-[var(--theme-accent)]"
        >
          ⌖{" "}
          {language === "sw"
            ? "Fungua Ramani"
            : "Open Map"}
        </a>
      )}
    </article>
  );
}

export default function RoyalDark({
  invitation,
  heroTitle,
  displayedMessage,
  language,
}: Props) {
  const hasCeremony = Boolean(
    invitation.ceremony_date ||
      invitation.ceremony_time ||
      invitation.ceremony_venue
  );

  const translations =
    language === "sw"
      ? {
          invite: "Mwaliko wa Kifalme",
          guest: "Mgeni wetu wa heshima",
          ceremony: "Ibada ya Ndoa",
          reception: "Mapokezi / Sherehe",
          dress: "Rangi za Mavazi",
          close: "Uwepo wako ni heshima kwetu",
        }
      : {
          invite: "A Royal Invitation",
          guest: "Our Honoured Guest",
          ceremony: "Ceremony",
          reception: "Reception",
          dress: "Dress Code",
          close: "Your presence is our honour",
        };

  const darkTheme = {
    "--theme-primary":
      invitation.theme_primary_color || "#111827",

    "--theme-secondary": "#11151F",

    "--theme-accent":
      invitation.theme_accent_color || "#D4AF37",
  } as CSSProperties;

  return (
    <div
      style={darkTheme}
      className="mx-auto w-full max-w-5xl overflow-hidden bg-[#080b12] text-white shadow-2xl sm:rounded-[2rem]"
    >
      <header className="grid min-h-[680px] lg:grid-cols-2">
        <div className="relative min-h-[440px] overflow-hidden">
          {invitation.cover_image_url ? (
            <img
              src={invitation.cover_image_url}
              alt={heroTitle}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[#11151F]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#080b12] via-transparent to-black/20" />
        </div>

        <div className="relative flex flex-col justify-center px-8 py-14 sm:px-12">
          <span className="absolute right-8 top-8 text-6xl text-[var(--theme-accent)] opacity-30">
            ♛
          </span>

          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--theme-accent)]">
            {translations.invite}
          </p>

          <h1 className="mt-7 font-serif text-5xl leading-none text-white sm:text-7xl">
            {heroTitle}
          </h1>

          <p className="mt-8 border-l border-[var(--theme-accent)] pl-5 text-sm uppercase tracking-widest text-white/65">
            {formatDate(invitation.event_date, language)}
          </p>
        </div>
      </header>

      <main className="px-6 py-12 sm:px-12">
        <section className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--theme-accent)]">
            {translations.guest}
          </p>

          <h2 className="mt-4 font-serif text-3xl text-white sm:text-4xl">
            {invitation.guest_name}
          </h2>

          <p className="mx-auto mt-5 max-w-xl whitespace-pre-line leading-8 text-white/65">
            {displayedMessage}
          </p>
        </section>

        <section
          className={`mt-12 grid gap-6 ${
            hasCeremony
              ? "md:grid-cols-2"
              : "mx-auto max-w-md"
          }`}
        >
          {hasCeremony && (
            <Detail
              title={
                invitation.ceremony_title ||
                translations.ceremony
              }
              date={invitation.ceremony_date}
              time={invitation.ceremony_time}
              venue={invitation.ceremony_venue}
              mapUrl={invitation.ceremony_map_url}
              language={language}
            />
          )}

          <Detail
            title={translations.reception}
            date={invitation.event_date}
            time={invitation.event_time}
            venue={invitation.venue}
            mapUrl={invitation.reception_map_url}
            language={language}
          />
        </section>

        {invitation.dress_code && (
          <section className="mt-10 border-y border-[var(--theme-accent)] py-7 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--theme-accent)]">
              {translations.dress}
            </p>

            <p className="mt-3 font-serif text-2xl text-white">
              {invitation.dress_code}
            </p>
          </section>
        )}

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-[#11151F] p-4 text-white shadow-2xl sm:p-8">
          <Countdown
            eventDate={invitation.event_date}
            eventTime={invitation.event_time}
            language={language}
            accentTextClass="text-[var(--theme-accent)]"
            boxClassName="bg-white"
          />

          <RsvpButtons
            invitationToken={invitation.invitation_token}
            currentStatus={invitation.rsvp_status}
            language={language}
            accentTextClass="text-[var(--theme-accent)]"
            variant="dark"
          />

          <div className="mt-10 rounded-[2rem] bg-white p-3 text-slate-900 sm:p-5">
            <EventPass
              qrToken={invitation.qr_token}
              eventPassId={invitation.event_pass_id}
              allowedGuests={invitation.allowed_guests}
              category={invitation.category}
              language={language}
              accentTextClass="text-[var(--theme-primary)]"
              boxClassName="bg-white"
            />
          </div>

          <div className="mt-10 overflow-hidden rounded-[2rem] border border-[var(--theme-accent)] bg-[#0b0f18]">
            <WishForm
              invitationToken={invitation.invitation_token}
              guestName={invitation.guest_name}
              language={language}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--theme-accent)] bg-[#0b0f18] px-8 py-12 text-center">
        <p className="font-serif text-2xl text-white">
          {translations.close}
        </p>

        <p className="mt-4 text-[8px] font-black uppercase tracking-[0.35em] text-[var(--theme-accent)]">
          Smart Event Pass
        </p>
      </footer>
    </div>
  );
}