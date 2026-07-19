import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";

type ElegantGoldProps = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: Language;
};

type EventDetailsProps = {
  number: string;
  title: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapUrl: string | null;
  language: Language;
};

function formatDate(date: string | null, language: Language) {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatTime(time: string | null, language: Language) {
  if (!time) return "—";

  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2026, 0, 1, hours, minutes));
}

function OrnamentalDivider({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`mx-auto flex items-center justify-center ${
        compact ? "max-w-44 gap-2.5" : "max-w-xs gap-4"
      }`}
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-[var(--theme-accent)] opacity-70" />
      <span className="h-1.5 w-1.5 rotate-45 border border-[var(--theme-primary)]" />
      <span className="h-px w-5 bg-[var(--theme-primary)]" />
      <span className="h-1.5 w-1.5 rotate-45 border border-[var(--theme-primary)]" />
      <span className="h-px flex-1 bg-[var(--theme-accent)] opacity-70" />
    </div>
  );
}

function CornerOrnament({ position }: { position: "left" | "right" }) {
  return (
    <span
      className={`pointer-events-none absolute top-0 h-12 w-12 border-[var(--theme-accent)] sm:h-16 sm:w-16 ${
        position === "left"
          ? "left-0 border-l border-t"
          : "right-0 border-r border-t"
      }`}
      aria-hidden="true"
    >
      <span
        className={`absolute top-2 h-6 w-6 border-[var(--theme-primary)] sm:h-8 sm:w-8 ${
          position === "left"
            ? "left-2 border-l border-t"
            : "right-2 border-r border-t"
        }`}
      />
    </span>
  );
}

function EventDetails({
  number,
  title,
  date,
  time,
  venue,
  mapUrl,
  language,
}: EventDetailsProps) {
  const details = [
    {
      label: language === "sw" ? "Tarehe" : "Date",
      value: formatDate(date, language),
    },
    {
      label: language === "sw" ? "Muda" : "Time",
      value: formatTime(time, language),
    },
    {
      label: language === "sw" ? "Mahali" : "Venue",
      value: venue || "—",
    },
  ];

  return (
    <article className="relative min-w-0 border border-[var(--theme-accent)] bg-white/90 px-5 pb-7 pt-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-7 sm:pb-9 sm:pt-12">
      <div className="absolute left-1/2 top-0 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center border border-[var(--theme-primary)] bg-[var(--theme-secondary)]">
        <span className="-rotate-45 font-serif text-sm text-[var(--theme-primary)]">
          {number}
        </span>
      </div>

      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--theme-accent)]">
        {language === "sw" ? "Ratiba" : "Schedule"}
      </p>
      <h3 className="mt-2 break-words font-serif text-2xl leading-tight text-[var(--theme-primary)] sm:text-3xl">
        {title}
      </h3>

      <div className="mx-auto my-5 h-px w-10 bg-[var(--theme-accent)]" />

      <dl className="space-y-4">
        {details.map((detail) => (
          <div key={detail.label}>
            <dt className="text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--theme-accent)]">
              {detail.label}
            </dt>
            <dd className="mt-1 break-words text-sm font-semibold leading-6 text-slate-700">
              {detail.value}
            </dd>
          </div>
        ))}
      </dl>

      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex max-w-full items-center justify-center gap-2 border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-white transition hover:opacity-85"
        >
          <span aria-hidden="true">⌖</span>
          <span>{language === "sw" ? "Fungua Ramani" : "Open Map"}</span>
        </a>
      )}
    </article>
  );
}

export default function ElegantGold({
  invitation,
  heroTitle,
  displayedMessage,
  language,
}: ElegantGoldProps) {
  const hasCeremony = Boolean(
    invitation.ceremony_date ||
      invitation.ceremony_time ||
      invitation.ceremony_venue
  );

  const t =
    language === "sw"
      ? {
          invitation: "Mwaliko wa Heshima",
          invitationHeading: "MWALIKO WAKO",
          celebration: "Ratiba ya Sherehe",
          ceremony: "Ibada",
          reception: "Mapokezi / Sherehe",
          dress: "Mwongozo wa Mavazi",
          closing: "Uwepo wako utatupa furaha kubwa",
        }
      : {
          invitation: "An Invitation of Honour",
          invitationHeading: "YOUR INVITATION",
          celebration: "Celebration Details",
          ceremony: "Ceremony",
          reception: "Reception",
          dress: "Dress Code",
          closing: "Your presence will bring us great joy",
        };

  return (
    <article className="relative mx-auto w-full max-w-4xl overflow-hidden border border-[var(--theme-accent)] bg-[var(--theme-secondary)] text-slate-800 shadow-[0_32px_100px_rgba(15,23,42,0.22)] sm:rounded-[2.25rem]">
      <div className="pointer-events-none absolute inset-2 border border-[var(--theme-primary)] opacity-25 sm:inset-4 sm:rounded-[1.6rem]" />

      <header className="relative px-4 pb-12 pt-4 sm:px-8 sm:pb-16 sm:pt-8 lg:px-12">
        <div className="relative border border-[var(--theme-accent)] bg-white/90 px-5 py-12 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:px-10 sm:py-16 lg:px-16">
          <CornerOrnament position="left" />
          <CornerOrnament position="right" />

          <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--theme-accent)] sm:text-[10px] sm:tracking-[0.45em]">
            {t.invitation}
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl break-words font-serif text-4xl leading-[1.05] text-[var(--theme-primary)] sm:text-6xl lg:text-7xl">
            {heroTitle}
          </h1>

          <div className="my-7 sm:my-9">
            <OrnamentalDivider />
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-primary)] sm:tracking-[0.3em]">
            {formatDate(invitation.event_date, language)}
          </p>

          {invitation.cover_image_url && (
            <div className="relative mx-auto mt-9 w-full max-w-[17rem] sm:mt-11 sm:max-w-[21rem]">
              <div className="aspect-[4/5] overflow-hidden rounded-[50%] border border-[var(--theme-primary)] bg-[var(--theme-secondary)] p-2 shadow-[0_20px_55px_rgba(15,23,42,0.16)]">
                <div className="h-full w-full overflow-hidden rounded-[50%] border-4 border-white bg-white">
                  <img
                    src={invitation.cover_image_url}
                    alt={heroTitle}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute left-1/2 top-1/2 -z-0 h-[calc(100%+1.5rem)] w-px -translate-x-1/2 -translate-y-1/2 bg-[var(--theme-accent)] opacity-50" />
            </div>
          )}
        </div>
      </header>

      <div className="relative px-5 pb-14 sm:px-12 sm:pb-20 lg:px-20">
        <section className="mx-auto max-w-2xl text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--theme-accent)] sm:tracking-[0.4em]">
            {t.invitationHeading}
          </p>
          <p className="mx-auto mt-3 whitespace-pre-line font-serif text-lg leading-8 text-slate-600 sm:mt-4 sm:text-xl sm:leading-9">
            {displayedMessage}
          </p>
          <div className="my-4 sm:my-5">
            <OrnamentalDivider compact />
          </div>
          <h2 className="break-words font-serif text-3xl text-[var(--theme-primary)] sm:text-5xl">
            {invitation.guest_name}
          </h2>
        </section>

        <div className="my-11 sm:my-14">
          <OrnamentalDivider />
          <p className="mt-6 text-center text-[9px] font-black uppercase tracking-[0.3em] text-[var(--theme-primary)] sm:tracking-[0.4em]">
            {t.celebration}
          </p>
        </div>

        <section
          className={`grid min-w-0 gap-10 ${
            hasCeremony ? "md:grid-cols-2" : "mx-auto max-w-lg"
          }`}
        >
          {hasCeremony && (
            <EventDetails
              number="I"
              title={invitation.ceremony_title || t.ceremony}
              date={invitation.ceremony_date}
              time={invitation.ceremony_time}
              venue={invitation.ceremony_venue}
              mapUrl={invitation.ceremony_map_url}
              language={language}
            />
          )}

          <EventDetails
            number={hasCeremony ? "II" : "I"}
            title={t.reception}
            date={invitation.event_date}
            time={invitation.event_time}
            venue={invitation.venue}
            mapUrl={invitation.reception_map_url}
            language={language}
          />
        </section>

        {invitation.dress_code && (
          <section className="mx-auto mt-12 max-w-2xl border-y border-[var(--theme-accent)] bg-white/75 px-5 py-8 text-center sm:px-8">
            <OrnamentalDivider compact />
            <p className="mt-5 text-[9px] font-black uppercase tracking-[0.32em] text-[var(--theme-accent)]">
              {t.dress}
            </p>
            <p className="mt-3 break-words font-serif text-2xl text-[var(--theme-primary)] sm:text-3xl">
              {invitation.dress_code}
            </p>
          </section>
        )}

        <section className="mx-auto mt-12 max-w-2xl border-t border-[var(--theme-accent)] pt-8">
          <Countdown
            eventDate={invitation.event_date}
            eventTime={invitation.event_time}
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
            boxClassName="bg-white/90"
          />

          <RsvpButtons
            invitationToken={invitation.invitation_token}
            currentStatus={invitation.rsvp_status}
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
            variant="classic"
          />

          <EventPass
            guestName={invitation.guest_name}
            qrToken={invitation.qr_token}
            eventPassId={invitation.event_pass_id}
            allowedGuests={invitation.allowed_guests}
            category={invitation.category}
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
            boxClassName="bg-white/90"
          />

          <div className="mt-8">
            <WishForm
              invitationToken={invitation.invitation_token}
              guestName={invitation.guest_name}
              language={language}
            />
          </div>
        </section>
      </div>

      <footer className="relative border-t border-[var(--theme-accent)] bg-[var(--theme-primary)] px-6 py-12 text-center text-white sm:px-10 sm:py-14">
        <OrnamentalDivider compact />
        <p className="mt-6 font-serif text-xl leading-8 sm:text-2xl">
          {t.closing}
        </p>
        <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.35em] text-[var(--theme-secondary)]">
          Smart Event Pass
        </p>
      </footer>
    </article>
  );
}
