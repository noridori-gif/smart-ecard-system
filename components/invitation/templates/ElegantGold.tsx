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

function GoldDivider() {
  return (
    <div className="mx-auto flex max-w-[230px] items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-[#c7a45a]" />
      <span className="rotate-45 border border-[#c7a45a] p-1">
        <span className="block h-1.5 w-1.5 bg-[#c7a45a]" />
      </span>
      <span className="h-px flex-1 bg-[#c7a45a]" />
    </div>
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
  return (
    <article className="relative border border-[#d8c38e] bg-white/65 px-5 pb-7 pt-10 text-center shadow-[0_14px_35px_rgba(78,58,23,0.06)]">
      <span className="absolute left-1/2 top-0 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#b9903e] bg-[#fbf7ed] font-serif text-sm text-[#8a6828]">
        {number}
      </span>

      <h3 className="font-serif text-3xl text-[#33250e]">{title}</h3>

      <div className="mx-auto mt-5 h-px w-12 bg-[#b9903e]" />

      <dl className="mt-5 space-y-4 text-sm text-[#5f533c]">
        <div>
          <dt className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#a27d34]">
            {language === "sw" ? "Tarehe" : "Date"}
          </dt>
          <dd className="mt-1 font-semibold">{formatDate(date, language)}</dd>
        </div>

        <div>
          <dt className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#a27d34]">
            {language === "sw" ? "Muda" : "Time"}
          </dt>
          <dd className="mt-1 font-semibold">{formatTime(time, language)}</dd>
        </div>

        <div>
          <dt className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#a27d34]">
            {language === "sw" ? "Mahali" : "Venue"}
          </dt>
          <dd className="mt-1 font-semibold">{venue || "—"}</dd>
        </div>
      </dl>

      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 border-b border-[#9b742c] pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#76551d]"
        >
          <span>⌖</span>
          {language === "sw" ? "Fungua Ramani" : "Open Map"}
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

  const t = language === "sw"
    ? {
        invitation: "Mwaliko wa Heshima",
        together: "Pamoja na familia zao",
        guest: "Mgeni wetu wa heshima",
        celebration: "Ratiba ya Sherehe",
        ceremony: "Ibada",
        reception: "Mapokezi / Sherehe",
        dress: "Mwongozo wa Mavazi",
        closing: "Uwepo wako utatupa furaha kubwa",
      }
    : {
        invitation: "An Invitation of Honour",
        together: "Together with their families",
        guest: "Our honoured guest",
        celebration: "Celebration Details",
        ceremony: "Ceremony",
        reception: "Reception",
        dress: "Dress Code",
        closing: "Your presence will bring us great joy",
      };

  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden border border-[#cdb374] bg-[#fbf7ed] text-[#33250e] shadow-[0_30px_90px_rgba(59,43,17,0.22)] sm:rounded-[2rem]">
      <div className="pointer-events-none absolute inset-3 z-10 border border-[#d7c38f] sm:inset-5" />
      <span className="pointer-events-none absolute left-3 top-3 z-20 h-16 w-16 border-l-2 border-t-2 border-[#a98235] sm:left-5 sm:top-5" />
      <span className="pointer-events-none absolute right-3 top-3 z-20 h-16 w-16 border-r-2 border-t-2 border-[#a98235] sm:right-5 sm:top-5" />

      <header className="relative px-8 pb-12 pt-16 text-center sm:px-14 sm:pb-14 sm:pt-20">
        <p className="text-[9px] font-black uppercase tracking-[0.42em] text-[#9b742c]">
          {t.invitation}
        </p>

        <p className="mt-5 font-serif text-sm italic text-[#7d6b49]">{t.together}</p>

        <h1 className="mx-auto mt-4 max-w-xl font-serif text-5xl leading-[1.05] sm:text-7xl">
          {heroTitle}
        </h1>

        <div className="my-7">
          <GoldDivider />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#8a6828]">
          {formatDate(invitation.event_date, language)}
        </p>

        {invitation.cover_image_url && (
          <div className="relative mx-auto mt-9 h-64 w-64 rounded-full border border-[#b9903e] p-2 sm:h-72 sm:w-72">
            <div className="h-full w-full overflow-hidden rounded-full border-4 border-white shadow-xl">
              <img
                src={invitation.cover_image_url}
                alt={heroTitle}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="absolute -bottom-3 left-1/2 h-7 w-20 -translate-x-1/2 bg-[#fbf7ed]" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 font-serif text-2xl text-[#a27d34]">✦</span>
          </div>
        )}
      </header>

      <section className="relative px-8 pb-14 sm:px-14">
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.34em] text-[#9b742c]">
            {t.guest}
          </p>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{invitation.guest_name}</h2>
          <p className="mx-auto mt-6 max-w-lg whitespace-pre-line font-serif text-lg leading-8 text-[#685a40] sm:text-xl">
            {displayedMessage}
          </p>
        </div>

        <div className="my-10">
          <GoldDivider />
          <p className="mt-5 text-center text-[9px] font-black uppercase tracking-[0.35em] text-[#9b742c]">
            {t.celebration}
          </p>
        </div>

        <div className={`grid gap-9 ${hasCeremony ? "sm:grid-cols-2" : "mx-auto max-w-md"}`}>
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
        </div>

        {invitation.dress_code && (
          <div className="mx-auto mt-10 max-w-md border-y border-[#d1bb83] py-5 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#9b742c]">{t.dress}</p>
            <p className="mt-2 font-serif text-xl">{invitation.dress_code}</p>
          </div>
        )}

        <div className="mt-8">
          <Countdown
            eventDate={invitation.event_date}
            eventTime={invitation.event_time}
            language={language}
            accentTextClass="text-[#8a6828]"
            boxClassName="bg-white/70"
          />

          <RsvpButtons
            invitationToken={invitation.invitation_token}
            currentStatus={invitation.rsvp_status}
            language={language}
            accentTextClass="text-[#8a6828]"
            variant="classic"
          />

          <EventPass
            guestName={invitation.guest_name}
            qrToken={invitation.qr_token}
            eventPassId={invitation.event_pass_id}
            allowedGuests={invitation.allowed_guests}
            category={invitation.category}
            language={language}
            accentTextClass="text-[#8a6828]"
            boxClassName="bg-white/70"
          />

          <WishForm
            invitationToken={invitation.invitation_token}
            guestName={invitation.guest_name}
            language={language}
          />
        </div>
      </section>

      <footer className="relative border-t border-[#d1bb83] bg-[#3b2d16] px-8 py-10 text-center text-[#f4e5b7]">
        <p className="font-serif text-xl">{t.closing}</p>
        <p className="mt-3 text-[8px] font-bold uppercase tracking-[0.35em] text-[#d2b86f]">Smart Event Pass</p>
      </footer>
    </div>
  );
}