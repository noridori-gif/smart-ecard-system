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

function formatDate(value: string | null, language: Language) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string | null, language: Language) {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value || "—";
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2000, 0, 1, Number(match[1]), Number(match[2])));
}

function Pattern({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="7">
        <path d="M0 40h40V0h40v40h40V0h40v40h40V0h40v80h-40v40h40v40h-40v80h-40v-40h-40v40H80v-40H40v40H0v-80h40v-40H0z" />
        <path d="M80 80h80v80H80zM100 100l20-20 20 20-20 20z" />
      </g>
    </svg>
  );
}

function Schedule({ number, title, date, time, venue, mapUrl, language }: {
  number: string;
  title: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapUrl: string | null;
  language: Language;
}) {
  return (
    <article className="relative border-t border-[var(--theme-accent)]/35 py-8 first:border-t-0 sm:grid sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-8">
      <div className="mb-4 flex items-center gap-3 sm:mb-0 sm:block">
        <span className="font-serif text-4xl text-[var(--theme-accent)] sm:text-5xl">{number}</span>
        <span className="h-px flex-1 bg-[var(--theme-accent)]/40 sm:mt-4 sm:block sm:w-14" />
      </div>
      <div className="min-w-0">
        <h3 className="break-words font-serif text-3xl leading-tight text-[var(--theme-primary)] sm:text-4xl">{title}</h3>
        <dl className="mt-5 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
          <div><dt className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Date" : "Tarehe"}</dt><dd className="mt-1 font-medium">{formatDate(date, language)}</dd></div>
          <div><dt className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Time" : "Muda"}</dt><dd className="mt-1 font-medium">{formatTime(time, language)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-[9px] font-black uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Venue" : "Mahali"}</dt><dd className="mt-1 break-words font-medium">{venue || "—"}</dd></div>
        </dl>
        {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-3 border-2 border-[var(--theme-primary)] px-5 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary)] hover:text-white"><span>◇</span>{language === "en" ? "Open Map" : "Fungua Ramani"}</a>}
      </div>
    </article>
  );
}

export default function AfricanRoyal({ invitation, heroTitle, displayedMessage, language }: Props) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);
  const t = language === "en" ? {
    invitation: "Royal Invitation", prepared: "Prepared in honour of", letter: "A personal invitation", programme: "Order of Celebration", ceremony: "Ceremony", reception: "Reception", attire: "Celebration Attire", countdown: "Until we gather", pass: "Your royal entry", wishes: "Words for the hosts", closing: "Come with joy. Leave with memories.", welcome: "Together with their families, the hosts request the pleasure of your company.",
  } : {
    invitation: "Mwaliko wa Kifalme", prepared: "Imeandaliwa kwa heshima ya", letter: "Mwaliko wako binafsi", programme: "Ratiba ya Sherehe", ceremony: "Ibada", reception: "Mapokezi / Sherehe", attire: "Mavazi ya Sherehe", countdown: "Hadi tutakapokusanyika", pass: "Pass yako ya kifalme", wishes: "Maneno kwa wenye event", closing: "Njoo kwa furaha. Ondoka na kumbukumbu.", welcome: "Pamoja na familia zao, wenye event wanaomba heshima ya uwepo wako.",
  };

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden bg-[color-mix(in_srgb,var(--theme-secondary)_82%,white)] shadow-[0_30px_100px_rgba(15,23,42,0.28)]">
      <header className="grid min-h-[680px] bg-[color-mix(in_srgb,var(--theme-primary)_72%,#111827)] text-white lg:grid-cols-[43%_57%]">
        <div className="relative order-2 flex min-h-[370px] flex-col justify-between overflow-hidden px-6 py-9 sm:px-10 lg:order-1 lg:min-h-full lg:px-12 lg:py-12">
          <Pattern className="absolute -left-20 top-14 h-72 w-72 rotate-12 text-[var(--theme-accent)] opacity-20" />
          <div className="relative flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.36em] text-[var(--theme-accent)]"><span className="h-2 w-2 rotate-45 bg-[var(--theme-accent)]" />{t.invitation}</div>
          <div className="relative my-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-white/65">{invitation.event_title}</p>
            <h1 className="mt-5 break-words font-serif text-5xl leading-[0.92] sm:text-7xl lg:text-6xl xl:text-7xl">{heroTitle}</h1>
            <div className="mt-8 flex items-center gap-5"><span className="h-1 w-20 bg-[var(--theme-accent)]" /><span className="text-xs font-bold uppercase tracking-[0.24em]">{formatDate(invitation.event_date, language)}</span></div>
          </div>
          <p className="relative max-w-xs text-xs uppercase tracking-[0.22em] text-white/65">Smart Event Pass · {invitation.venue}</p>
        </div>
        <div className="relative order-1 min-h-[430px] overflow-hidden lg:order-2 lg:min-h-full">
          {invitation.cover_image_url ? <img src={invitation.cover_image_url} alt={heroTitle} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-[linear-gradient(145deg,var(--theme-secondary),var(--theme-accent))]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
          {!invitation.cover_image_url && <><Pattern className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 text-[var(--theme-primary)] opacity-45" /><div className="absolute inset-0 flex items-center justify-center font-serif text-8xl text-[var(--theme-primary)]/80">AR</div></>}
          <div className="absolute bottom-0 left-0 h-28 w-2/3 bg-[var(--theme-accent)] [clip-path:polygon(0_55%,100%_0,100%_100%,0_100%)]" />
          <div className="absolute right-5 top-5 h-28 w-28 border-8 border-[var(--theme-accent)]/75 sm:right-8 sm:top-8" />
        </div>
      </header>

      <section className="relative px-5 py-12 sm:px-12 sm:py-16 lg:grid lg:grid-cols-[0.8fr_1.6fr] lg:gap-16 lg:px-16">
        <Pattern className="absolute -right-16 bottom-2 h-52 w-52 text-[var(--theme-accent)] opacity-[0.08]" />
        <div><p className="text-[9px] font-black uppercase tracking-[0.36em] text-[var(--theme-primary)]">{t.prepared}</p><h2 className="mt-4 break-words font-serif text-4xl leading-tight text-[var(--theme-primary)] sm:text-5xl">{invitation.guest_name}</h2></div>
        <div className="relative mt-10 border-l-4 border-[var(--theme-accent)] pl-6 lg:mt-0 lg:pl-9"><p className="text-[9px] font-black uppercase tracking-[0.36em] text-[var(--theme-primary)]">{t.letter}</p><p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-700 sm:text-lg">{displayedMessage || t.welcome}</p></div>
      </section>

      <section className="border-y-4 border-[var(--theme-primary)] bg-white/80 px-5 py-12 sm:px-12 sm:py-16 lg:px-16">
        <div className="flex items-center gap-5"><p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.programme}</p><div className="h-px flex-1 bg-[var(--theme-accent)]/50" /></div>
        <div className="mt-7">
          {hasCeremony && <Schedule number="01" title={invitation.ceremony_title || t.ceremony} date={invitation.ceremony_date} time={invitation.ceremony_time} venue={invitation.ceremony_venue} mapUrl={invitation.ceremony_map_url} language={language} />}
          <Schedule number={hasCeremony ? "02" : "01"} title={t.reception} date={invitation.event_date} time={invitation.event_time} venue={invitation.venue} mapUrl={invitation.reception_map_url} language={language} />
        </div>
      </section>

      {invitation.dress_code && <section className="grid bg-[color-mix(in_srgb,var(--theme-accent)_72%,#111827)] text-white sm:grid-cols-[1fr_auto]"><div className="px-6 py-9 sm:px-12"><p className="text-[9px] font-black uppercase tracking-[0.38em] text-white/70">{t.attire}</p><p className="mt-3 break-words font-serif text-3xl">{invitation.dress_code}</p></div><div className="flex items-center gap-3 border-t border-white/20 px-6 py-8 sm:border-l sm:border-t-0 sm:px-10"><span className="h-12 w-12 rotate-45 border-2 border-white/50 bg-[var(--theme-primary)]" /><span className="h-12 w-12 rotate-45 border-2 border-white/50 bg-[var(--theme-secondary)]" /><span className="h-12 w-12 rotate-45 border-2 border-white/50 bg-[var(--theme-accent)]" /></div></section>}

      <section className="px-5 py-12 sm:px-12 sm:py-16 lg:px-16">
        <p className="text-center text-[9px] font-black uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.countdown}</p>
        <Countdown eventDate={invitation.event_date} eventTime={invitation.event_time} language={language} accentTextClass="font-serif text-[var(--theme-primary)]" boxClassName="rounded-none border-2 border-[var(--theme-accent)] bg-white shadow-none" />
        <RsvpButtons invitationToken={invitation.invitation_token} currentStatus={invitation.rsvp_status} language={language} variant="african" />
        <p className="mt-12 text-center text-[9px] font-black uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.pass}</p>
        <EventPass guestName={invitation.guest_name} qrToken={invitation.qr_token} eventPassId={invitation.event_pass_id} allowedGuests={invitation.allowed_guests} category={invitation.category} language={language} accentTextClass="text-[var(--theme-primary)]" boxClassName="rounded-none border-2 border-[var(--theme-accent)] bg-[var(--theme-secondary)] shadow-none" />
        <div className="mt-12 border-t-4 border-[var(--theme-primary)] pt-10"><p className="mb-7 text-center text-[9px] font-black uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.wishes}</p><WishForm invitationToken={invitation.invitation_token} guestName={invitation.guest_name} language={language} /></div>
      </section>

      <footer className="relative overflow-hidden bg-[color-mix(in_srgb,var(--theme-primary)_75%,#111827)] px-6 py-14 text-center text-white sm:px-12"><Pattern className="absolute -bottom-24 -left-14 h-56 w-56 text-[var(--theme-accent)] opacity-20" /><p className="relative font-serif text-3xl sm:text-4xl">{t.closing}</p><div className="relative mx-auto mt-7 h-2 w-2 rotate-45 bg-[var(--theme-accent)]" /><p className="relative mt-6 text-[8px] font-bold uppercase tracking-[0.4em] text-white/60">Smart Event Pass · African Royal</p></footer>
    </div>
  );
}
