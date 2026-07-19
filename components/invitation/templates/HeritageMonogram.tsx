import Image from "next/image";
import type { CSSProperties } from "react";

import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";
type Props = { invitation: PublicInvitation; heroTitle: string; displayedMessage: string; language: Language };

function initials(value: string) {
  return value.split(/\s+|&/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "HM";
}

function dateText(value: string | null, language: Language) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function timeText(value: string | null, language: Language) {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value || "—";
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(2000, 0, 1, Number(match[1]), Number(match[2])));
}

function Crest({ letters, className = "" }: { letters: string; className?: string }) {
  return (
    <svg viewBox="0 0 180 210" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor">
        <path d="M90 8 105 23 125 17 132 38 153 42 148 63 166 75 153 93 162 113 142 122 143 144 121 147 111 168 90 159 69 168 59 147 37 144 38 122 18 113 27 93 14 75 32 63 27 42 48 38 55 17 75 23Z" strokeWidth="2" />
        <path d="M90 26c33 0 59 27 59 60 0 48-29 82-59 105-30-23-59-57-59-105 0-33 26-60 59-60Z" strokeWidth="3" />
        <path d="M45 91c16-8 28-23 33-42M135 91c-16-8-28-23-33-42M54 138c13 3 24 10 36 22 12-12 23-19 36-22" strokeWidth="1.5" />
        <path d="M69 16 90 2l21 14M62 184h56M71 194h38" strokeWidth="2" />
      </g>
      <text x="90" y="115" textAnchor="middle" fill="currentColor" fontFamily="Georgia, serif" fontSize="40" letterSpacing="-2">{letters}</text>
    </svg>
  );
}

function EngravedDivider({ letters }: { letters: string }) {
  return (
    <div className="flex items-center justify-center gap-3 text-[var(--theme-accent)]" aria-hidden="true">
      <svg viewBox="0 0 130 24" className="h-6 min-w-0 flex-1" preserveAspectRatio="none"><path d="M0 12h42c12 0 10-8 20-8 8 0 7 8 16 8H130M18 7c9 0 8 10 18 10" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
      <span className="flex h-10 w-10 rotate-45 items-center justify-center border border-current"><span className="-rotate-45 font-serif text-xs">{letters}</span></span>
      <svg viewBox="0 0 130 24" className="h-6 min-w-0 flex-1 -scale-x-100" preserveAspectRatio="none"><path d="M0 12h42c12 0 10-8 20-8 8 0 7 8 16 8H130M18 7c9 0 8 10 18 10" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
    </div>
  );
}

function Itinerary({ numeral, title, date, time, venue, mapUrl, language }: { numeral: string; title: string; date: string | null; time: string | null; venue: string | null; mapUrl: string | null; language: Language }) {
  return (
    <article className="grid border-t border-[var(--theme-accent)]/45 py-8 first:border-t-0 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:gap-6">
      <p className="font-serif text-4xl text-[var(--theme-accent)]">{numeral}</p>
      <div className="mt-3 min-w-0 sm:mt-0">
        <h3 className="break-words font-serif text-3xl text-[var(--theme-primary)]">{title}</h3>
        <dl className="mt-5 grid gap-4 text-sm text-[var(--heritage-ink)] sm:grid-cols-2">
          <div><dt className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Date" : "Tarehe"}</dt><dd className="mt-1">{dateText(date, language)}</dd></div>
          <div><dt className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Time" : "Muda"}</dt><dd className="mt-1">{timeText(time, language)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Venue" : "Mahali"}</dt><dd className="mt-1 break-words">{venue || "—"}</dd></div>
        </dl>
      </div>
      {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-6 h-fit border-b border-[var(--theme-primary)] pb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--theme-primary)] sm:mt-1">{language === "en" ? "View map ↗" : "Fungua ramani ↗"}</a>}
    </article>
  );
}

export default function HeritageMonogram({ invitation, heroTitle, displayedMessage, language }: Props) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);
  const monogram = initials(heroTitle);
  const t = language === "en" ? { invitation: "YOUR INVITATION", programme: "Order of the Day", ceremony: "Ceremony", reception: "Reception", attire: "Formal Attire", countdown: "Until the occasion", pass: "Formal Admission", wishes: "Messages for the hosts", closing: "With enduring gratitude" } : { invitation: "MWALIKO WAKO", programme: "Ratiba ya Siku", ceremony: "Ibada", reception: "Mapokezi / Sherehe", attire: "Mavazi Rasmi", countdown: "Hadi siku ya tukio", pass: "Ruhusa Rasmi ya Kuingia", wishes: "Ujumbe kwa wenye event", closing: "Kwa shukrani za dhati" };

  return (
    <article style={{ "--heritage-ink": "color-mix(in srgb, var(--theme-primary) 55%, #111827)" } as CSSProperties} className="mx-auto w-full max-w-5xl overflow-hidden bg-[var(--theme-secondary)] text-[var(--heritage-ink)] shadow-[0_35px_100px_rgba(15,23,42,.25)]">
      <div className="m-2 border-4 border-double border-[var(--theme-primary)] sm:m-4">
        <header className="relative overflow-hidden border border-[var(--theme-accent)]/55 px-5 py-10 sm:px-12 sm:py-14 lg:px-16">
          <div className="pointer-events-none absolute inset-3 border border-[var(--theme-accent)]/35" />
          <div className="relative grid items-center gap-9 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center gap-4 lg:justify-start"><span className="h-px w-12 bg-[var(--theme-accent)]" /><p className="text-[8px] font-bold uppercase tracking-[0.42em] text-[var(--theme-primary)]">Heritage Monogram</p><span className="h-px w-12 bg-[var(--theme-accent)]" /></div>
              <h1 className="mt-7 break-words font-serif text-5xl leading-[.95] text-[var(--theme-primary)] sm:text-7xl lg:text-8xl">{heroTitle}</h1>
              <div className="mt-7 flex flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--heritage-ink)] sm:flex-row sm:justify-center sm:gap-5 lg:justify-start"><span>{dateText(invitation.event_date, language)}</span><span className="hidden h-1 w-1 rotate-45 bg-[var(--theme-accent)] sm:block" /><span className="break-words">{invitation.venue}</span></div>
            </div>
            <div className="relative mx-auto h-80 w-60">
              <div className="absolute inset-0 rounded-[50%] border-4 border-double border-[var(--theme-primary)] p-2"><div className="relative h-full overflow-hidden rounded-[50%] border border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-secondary)_75%,white)]">
                {invitation.cover_image_url ? <Image src={invitation.cover_image_url} alt={heroTitle} fill unoptimized sizes="240px" className="object-cover" /> : <div className="flex h-full items-center justify-center"><Crest letters={monogram} className="h-52 w-44 text-[var(--theme-primary)]" /></div>}
              </div></div>
              <span className="absolute -left-3 top-1/2 h-px w-6 bg-[var(--theme-accent)]" /><span className="absolute -right-3 top-1/2 h-px w-6 bg-[var(--theme-accent)]" />
            </div>
          </div>
        </header>

        <section className="border-x border-b border-[var(--theme-accent)]/55 px-5 py-10 text-center sm:px-12 sm:py-14 lg:px-20">
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.invitation}</p>
          <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line font-serif text-lg leading-8 sm:text-xl sm:leading-9">{displayedMessage}</p>
          <div className="mx-auto my-5 max-w-md"><EngravedDivider letters={monogram} /></div>
          <h2 className="break-words font-serif text-4xl text-[var(--theme-primary)] sm:text-5xl">{invitation.guest_name}</h2>
        </section>

        <section className="border-x border-b border-[var(--theme-accent)]/55 bg-[color-mix(in_srgb,var(--theme-secondary)_88%,white)] px-5 py-10 sm:px-12 sm:py-14 lg:px-20">
          <div className="flex items-center gap-5"><span className="h-px flex-1 bg-[var(--theme-accent)]/55" /><p className="text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.programme}</p><span className="h-px flex-1 bg-[var(--theme-accent)]/55" /></div>
          <div className="mt-6">{hasCeremony && <Itinerary numeral="I" title={invitation.ceremony_title || t.ceremony} date={invitation.ceremony_date} time={invitation.ceremony_time} venue={invitation.ceremony_venue} mapUrl={invitation.ceremony_map_url} language={language} />}<Itinerary numeral={hasCeremony ? "II" : "I"} title={t.reception} date={invitation.event_date} time={invitation.event_time} venue={invitation.venue} mapUrl={invitation.reception_map_url} language={language} /></div>
        </section>

        {invitation.dress_code && <section className="grid border-x border-b border-[var(--theme-accent)]/55 sm:grid-cols-[1fr_auto]"><div className="px-6 py-9 sm:px-12"><p className="text-[9px] font-bold uppercase tracking-[0.38em] text-[var(--theme-primary)]">{t.attire}</p><p className="mt-3 break-words font-serif text-3xl text-[var(--theme-primary)]">{invitation.dress_code}</p></div><div className="flex items-center justify-center gap-3 border-t border-[var(--theme-accent)]/40 px-7 py-8 sm:border-l sm:border-t-0"><span className="h-12 w-9 border-4 border-double border-black/15 bg-[var(--theme-primary)]" /><span className="h-12 w-9 border-4 border-double border-black/15 bg-[var(--theme-secondary)]" /><span className="h-12 w-9 border-4 border-double border-black/15 bg-[var(--theme-accent)]" /></div></section>}

        <section className="border-x border-[var(--theme-accent)]/55 px-5 py-10 sm:px-12 sm:py-14 lg:px-20">
          <p className="text-center text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.countdown}</p>
          <Countdown eventDate={invitation.event_date} eventTime={invitation.event_time} language={language} accentTextClass="font-serif text-[var(--theme-accent)]" boxClassName="rounded-none border-4 border-double border-[var(--theme-primary)] bg-[var(--theme-secondary)] shadow-none" />
          <RsvpButtons invitationToken={invitation.invitation_token} currentStatus={invitation.rsvp_status} language={language} variant="heritage" />
          <p className="mt-12 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.pass}</p>
          <EventPass guestName={invitation.guest_name} qrToken={invitation.qr_token} eventPassId={invitation.event_pass_id} allowedGuests={invitation.allowed_guests} category={invitation.category} language={language} accentTextClass="font-serif text-[var(--theme-primary)]" boxClassName="rounded-none border-4 border-double border-[var(--theme-primary)] bg-[var(--theme-secondary)] shadow-none" />
          <div className="mt-12 border-t border-[var(--theme-accent)]/55 pt-10"><p className="mb-7 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.wishes}</p><WishForm invitationToken={invitation.invitation_token} guestName={invitation.guest_name} language={language} /></div>
        </section>

        <footer className="relative overflow-hidden border-x border-t-4 border-double border-[var(--theme-primary)] bg-[var(--theme-primary)] px-6 py-12 text-center text-[var(--theme-secondary)]"><Crest letters={monogram} className="absolute left-1/2 top-1/2 h-56 w-48 -translate-x-1/2 -translate-y-1/2 opacity-10" /><p className="relative font-serif text-3xl sm:text-4xl">{t.closing}</p><div className="relative mx-auto mt-5 h-px w-28 bg-[var(--theme-accent)]" /><p className="relative mt-5 text-[8px] font-bold uppercase tracking-[0.42em]">Smart Event Pass · Heritage Monogram</p></footer>
      </div>
    </article>
  );
}
