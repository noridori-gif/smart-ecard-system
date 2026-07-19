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

type DetailsProps = {
  number: string;
  title: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapUrl: string | null;
  language: Language;
};

function formatDate(value: string | null, language: Language) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string | null, language: Language) {
  if (!value) return "—";

  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2026, 0, 1, hours, minutes));
}

function BotanicalSprig({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 180 240"
      className={`h-full w-full ${flip ? "-scale-x-100" : ""}`}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M28 232C44 167 73 106 147 22"
        stroke="var(--theme-primary)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M61 169C33 164 18 143 15 118C43 120 62 137 61 169Z"
        fill="var(--theme-accent)"
      />
      <path
        d="M78 134C99 107 126 104 148 114C134 139 109 150 78 134Z"
        fill="var(--theme-primary)"
        opacity="0.82"
      />
      <path
        d="M101 96C79 82 72 58 79 37C102 49 114 70 101 96Z"
        fill="var(--theme-accent)"
        opacity="0.75"
      />
      <path
        d="M123 61C142 38 164 37 178 44C168 66 149 75 123 61Z"
        fill="var(--theme-primary)"
        opacity="0.68"
      />
      <circle cx="47" cy="190" r="5" fill="var(--theme-accent)" />
      <circle cx="66" cy="150" r="3" fill="var(--theme-primary)" />
      <circle cx="111" cy="79" r="4" fill="var(--theme-accent)" />
    </svg>
  );
}

function SectionMarker() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-[var(--theme-accent)] opacity-60" />
      <span className="h-2 w-2 rounded-full border border-[var(--theme-primary)]" />
      <span className="h-px w-8 bg-[var(--theme-primary)]" />
    </div>
  );
}

function Details({
  number,
  title,
  date,
  time,
  venue,
  mapUrl,
  language,
}: DetailsProps) {
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
    <article className="group relative min-w-0 overflow-hidden border border-[var(--theme-accent)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-8">
      <span className="absolute right-0 top-0 h-20 w-20 rounded-bl-[100%] bg-[var(--theme-accent)] opacity-15" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--theme-accent)]">
              {language === "sw" ? "Sehemu" : "Part"} {number}
            </p>
            <h3 className="mt-2 break-words font-serif text-3xl leading-tight text-[var(--theme-primary)]">
              {title}
            </h3>
          </div>
          <span className="mt-1 h-8 w-8 shrink-0 rounded-full border border-[var(--theme-primary)] bg-[var(--theme-secondary)]" />
        </div>

        <dl className="mt-7 grid gap-5 border-l border-[var(--theme-accent)] pl-5">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--theme-primary)]">
                {detail.label}
              </dt>
              <dd className="mt-1 break-words text-sm font-medium leading-6 text-slate-700">
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
            className="mt-7 inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-5 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-white transition hover:opacity-85"
          >
            <span aria-hidden="true">⌖</span>
            <span>{language === "sw" ? "Fungua Ramani" : "Open Map"}</span>
          </a>
        )}
      </div>
    </article>
  );
}

export default function ModernFloral({
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

  const t =
    language === "sw"
      ? {
          invitationHeading: "MWALIKO WAKO",
          story: "Sherehe Yetu",
          ceremony: "Ibada",
          reception: "Mapokezi / Sherehe",
          dress: "Rangi za Mavazi",
          close: "Karibu tusherehekee pamoja",
        }
      : {
          invitationHeading: "YOUR INVITATION",
          story: "Our Celebration",
          ceremony: "Ceremony",
          reception: "Reception",
          dress: "Dress Colours",
          close: "Come celebrate with us",
        };

  return (
    <article className="relative mx-auto w-full max-w-4xl overflow-hidden border border-[var(--theme-accent)] bg-[var(--theme-secondary)] text-slate-800 shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:rounded-[2.5rem]">
      <div className="pointer-events-none absolute -left-12 -top-20 h-64 w-48 opacity-60 sm:-left-6 sm:h-80 sm:w-60">
        <BotanicalSprig />
      </div>
      <div className="pointer-events-none absolute -right-16 top-[36rem] h-72 w-52 opacity-35 sm:top-[42rem] sm:h-96 sm:w-72">
        <BotanicalSprig flip />
      </div>

      <header className="relative px-5 pb-14 pt-14 sm:px-10 sm:pb-20 sm:pt-20 lg:px-16">
        <div className="relative z-10 grid items-center gap-10 md:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] md:gap-12">
          <div className="min-w-0 pt-8 md:pt-0">
            <h1 className="break-words font-serif text-5xl leading-[0.96] text-[var(--theme-primary)] sm:text-6xl lg:text-7xl">
              {heroTitle}
            </h1>
            <div className="mt-8 max-w-52">
              <SectionMarker />
            </div>
            <p className="mt-6 max-w-xs text-[10px] font-black uppercase leading-6 tracking-[0.18em] text-slate-700">
              {formatDate(invitation.event_date, language)}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md md:ml-auto">
            <span className="absolute -bottom-5 -left-5 h-full w-full rounded-t-[50%] rounded-br-[38%] border border-[var(--theme-accent)] sm:-bottom-7 sm:-left-7" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[50%] rounded-br-[38%] border-8 border-white bg-white shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
              {invitation.cover_image_url ? (
                <img
                  src={invitation.cover_image_url}
                  alt={heroTitle}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full bg-[linear-gradient(145deg,var(--theme-primary),var(--theme-accent))]" />
              )}
            </div>
            <span className="absolute -bottom-8 right-4 h-24 w-16 rotate-12 rounded-[100%_0_100%_0] bg-[var(--theme-primary)] opacity-75 sm:h-32 sm:w-20" />
            <span className="absolute -bottom-5 right-16 h-16 w-10 -rotate-12 rounded-[100%_0_100%_0] bg-[var(--theme-accent)] opacity-80 sm:h-24 sm:w-14" />
          </div>
        </div>
      </header>

      <div className="relative z-10 px-5 pb-16 sm:px-10 sm:pb-20 lg:px-16">
        <section className="relative ml-auto max-w-2xl border-l border-[var(--theme-accent)] bg-white/80 px-6 py-8 shadow-[0_20px_55px_rgba(15,23,42,0.06)] sm:px-10 sm:py-12">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--theme-accent)]">
            {t.invitationHeading}
          </p>
          <p className="mt-3 max-w-xl whitespace-pre-line font-serif text-lg leading-8 text-slate-600 sm:mt-4 sm:text-xl sm:leading-9">
            {displayedMessage}
          </p>
          <div className="my-4 max-w-52 sm:my-5">
            <SectionMarker />
          </div>
          <h2 className="break-words font-serif text-3xl leading-tight text-[var(--theme-primary)] sm:text-5xl">
            {invitation.guest_name}
          </h2>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="grid items-end gap-5 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.34em] text-[var(--theme-accent)]">
                {t.story}
              </p>
              <h2 className="mt-2 font-serif text-4xl text-[var(--theme-primary)] sm:text-5xl">
                {language === "sw" ? "Ratiba ya Siku" : "The Day's Details"}
              </h2>
            </div>
            <div className="w-full sm:w-40">
              <SectionMarker />
            </div>
          </div>

          <div
            className={`mt-10 grid min-w-0 gap-6 ${
              hasCeremony ? "md:grid-cols-2" : "mx-auto max-w-xl"
            }`}
          >
            {hasCeremony && (
              <Details
                number="01"
                title={invitation.ceremony_title || t.ceremony}
                date={invitation.ceremony_date}
                time={invitation.ceremony_time}
                venue={invitation.ceremony_venue}
                mapUrl={invitation.ceremony_map_url}
                language={language}
              />
            )}
            <Details
              number={hasCeremony ? "02" : "01"}
              title={t.reception}
              date={invitation.event_date}
              time={invitation.event_time}
              venue={invitation.venue}
              mapUrl={invitation.reception_map_url}
              language={language}
            />
          </div>
        </section>

        {invitation.dress_code && (
          <section className="relative mt-12 overflow-hidden border border-[var(--theme-primary)] bg-[var(--theme-primary)] px-6 py-10 text-center text-white sm:px-10 sm:py-12">
            <span className="absolute -left-8 -top-12 h-36 w-24 rotate-12 rounded-[100%_0_100%_0] bg-[var(--theme-accent)] opacity-35" />
            <span className="absolute -bottom-12 -right-8 h-36 w-24 -rotate-12 rounded-[100%_0_100%_0] bg-[var(--theme-secondary)] opacity-25" />
            <div className="relative">
              <p className="text-[9px] font-black uppercase tracking-[0.34em] text-[var(--theme-secondary)]">
                {t.dress}
              </p>
              <p className="mx-auto mt-3 max-w-xl break-words font-serif text-2xl sm:text-3xl">
                {invitation.dress_code}
              </p>
            </div>
          </section>
        )}

        <section className="mx-auto mt-14 max-w-2xl border-t border-[var(--theme-accent)] pt-8">
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

      <footer className="relative overflow-hidden border-t border-[var(--theme-accent)] bg-[var(--theme-primary)] px-6 py-12 text-center text-white sm:px-10 sm:py-14">
        <span className="absolute -left-8 -top-14 h-40 w-28 rotate-12 rounded-[100%_0_100%_0] bg-[var(--theme-accent)] opacity-30" />
        <span className="absolute -bottom-16 -right-8 h-40 w-28 -rotate-12 rounded-[100%_0_100%_0] bg-[var(--theme-secondary)] opacity-20" />
        <div className="relative">
          <p className="font-serif text-2xl sm:text-3xl">{t.close}</p>
          <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.35em] text-[var(--theme-secondary)]">
            Smart Event Pass
          </p>
        </div>
      </footer>
    </article>
  );
}
