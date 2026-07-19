import Image from "next/image";
import type { CSSProperties } from "react";

import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";
type Props = { invitation: PublicInvitation; heroTitle: string; displayedMessage: string; language: Language };

function readableText(color: string | null | undefined) {
  const value = color?.trim();
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) return "#111827";
  const red = Number.parseInt(value.slice(1, 3), 16);
  const green = Number.parseInt(value.slice(3, 5), 16);
  const blue = Number.parseInt(value.slice(5, 7), 16);
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 > 0.56 ? "#111827" : "#FFFFFF";
}

function initials(value: string) {
  const parts = value.split(/\s+|&/).filter(Boolean);
  return [parts[0]?.[0], parts[1]?.[0] || parts[0]?.[1]].filter(Boolean).join("").toUpperCase() || "CL";
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

function CornerOrnament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 150" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M8 142V42C8 23 23 8 42 8h100M22 128V51c0-16 13-29 29-29h77" strokeWidth="1.5" />
        <path d="M17 77c25 0 39-14 39-39 0 25 14 39 39 39-25 0-39 14-39 39 0-25-14-39-39-39Z" />
        <path d="M62 18c0 16 9 25 25 25M18 62c16 0 25 9 25 25" />
        <circle cx="56" cy="77" r="5" />
      </g>
    </svg>
  );
}

function InitialsSeal({ letters }: { letters: string }) {
  const first = letters[0] || "C";
  const second = letters[1] || "L";
  return (
    <svg viewBox="0 0 240 180" className="h-full w-full text-[var(--theme-primary)]" aria-label={`${letters} initials seal`}>
      <g fill="none" stroke="currentColor"><ellipse cx="120" cy="90" rx="82" ry="62" strokeWidth="2" /><ellipse cx="120" cy="90" rx="72" ry="52" stroke="var(--theme-accent)" /><path d="M30 90h28M182 90h28M120 16v20M120 144v20" strokeWidth="1" /></g>
      <text x="99" y="119" textAnchor="middle" fill="currentColor" fontFamily="Georgia, serif" fontSize="78" fontStyle="italic">{first}</text>
      <text x="143" y="119" textAnchor="middle" fill="currentColor" fontFamily="Georgia, serif" fontSize="78" fontStyle="italic" opacity=".76">{second}</text>
    </svg>
  );
}

function LetterpressDivider({ letters }: { letters: string }) {
  return (
    <div className="flex items-center gap-3 text-[var(--theme-accent)]" aria-hidden="true">
      <span className="h-px flex-1 bg-current" />
      <svg viewBox="0 0 76 36" className="h-9 w-20"><path d="M2 18h17c7 0 8-11 16-11s9 11 16 11h23M19 18c7 0 8 11 16 11s9-11 16-11" fill="none" stroke="currentColor" /><text x="38" y="22" textAnchor="middle" fill="var(--theme-primary)" fontFamily="Georgia, serif" fontSize="10">{letters}</text></svg>
      <span className="h-px flex-1 bg-current" />
    </div>
  );
}

function ItineraryCard({ numeral, title, date, time, venue, mapUrl, language }: { numeral: string; title: string; date: string | null; time: string | null; venue: string | null; mapUrl: string | null; language: Language }) {
  return (
    <article className="relative flex min-w-0 flex-col items-center border-4 border-double border-[var(--theme-primary)] px-5 py-8 text-center sm:px-8">
      <span className="absolute inset-2 border border-[var(--theme-accent)]/45" />
      <p className="relative font-serif text-4xl text-[var(--theme-accent)]">{numeral}</p>
      <h3 className="relative mt-3 break-words font-serif text-3xl text-[var(--theme-primary)]">{title}</h3>
      <dl className="relative mt-6 space-y-4 text-sm text-[var(--letterpress-ink)]">
        <div><dt className="text-[8px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Date & time" : "Tarehe na muda"}</dt><dd className="mt-1">{dateText(date, language)} · {timeText(time, language)}</dd></div>
        <div><dt className="text-[8px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Venue" : "Mahali"}</dt><dd className="mt-1 break-words">{venue || "—"}</dd></div>
      </dl>
      {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="relative mt-6 border-b border-[var(--theme-primary)] pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--theme-primary)]">{language === "en" ? "View map ↗" : "Fungua ramani ↗"}</a>}
    </article>
  );
}

export default function ChateauLetterpress({ invitation, heroTitle, displayedMessage, language }: Props) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);
  const seal = initials(heroTitle);
  const primaryContrast = readableText(invitation.theme_primary_color);
  const secondaryContrast = readableText(invitation.theme_secondary_color);
  const t = language === "en" ? { invitation: "YOUR INVITATION", programme: "The Order of Events", ceremony: "Ceremony", reception: "Reception", attire: "Attire Guidance", countdown: "Until the celebration", rsvp: "Répondez s’il vous plaît", admission: "Detachable Admission", wishes: "Notes for the hosts", closing: "A celebration to be remembered" } : { invitation: "MWALIKO WAKO", programme: "Ratiba ya Matukio", ceremony: "Ibada", reception: "Mapokezi / Sherehe", attire: "Mwongozo wa Mavazi", countdown: "Hadi siku ya sherehe", rsvp: "Thibitisha ushiriki", admission: "Tiketi ya Kuingia", wishes: "Ujumbe kwa wenye event", closing: "Sherehe ya kukumbukwa" };
  const paperTexture = { backgroundColor: "var(--theme-secondary)", backgroundImage: "radial-gradient(circle at 18% 22%, color-mix(in srgb, var(--theme-accent) 10%, transparent) 0 1px, transparent 1.5px), radial-gradient(circle at 76% 68%, color-mix(in srgb, var(--theme-primary) 7%, transparent) 0 1px, transparent 1.5px)", backgroundSize: "19px 19px, 23px 23px" };

  return (
    <article style={{ ...paperTexture, "--letterpress-ink": secondaryContrast, "--letterpress-primary-contrast": primaryContrast } as CSSProperties} className="mx-auto w-full max-w-5xl overflow-hidden text-[var(--letterpress-ink)] shadow-[0_35px_100px_rgba(15,23,42,.22)]">
      <div className="relative m-2 border border-[var(--theme-primary)] p-1.5 sm:m-4"><div className="border border-[var(--theme-primary)]">
        <header className="relative px-5 py-10 text-center sm:px-12 sm:py-14 lg:px-20">
          <CornerOrnament className="absolute left-2 top-2 h-24 w-24 text-[var(--theme-accent)] sm:h-32 sm:w-32" />
          <CornerOrnament className="absolute right-2 top-2 h-24 w-24 -scale-x-100 text-[var(--theme-accent)] sm:h-32 sm:w-32" />
          <p className="relative text-[8px] font-bold uppercase tracking-[0.46em] text-[var(--theme-accent)]">Château Letterpress</p>
          <h1 className="relative mx-auto mt-7 max-w-4xl break-words font-serif text-5xl leading-[.96] text-[var(--theme-primary)] sm:text-7xl lg:text-8xl">{heroTitle}</h1>
          <div className="relative mt-7 flex flex-col items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] sm:flex-row sm:gap-5"><span>{dateText(invitation.event_date, language)}</span><span className="hidden h-1 w-1 rotate-45 bg-[var(--theme-accent)] sm:block" /><span className="break-words">{invitation.venue}</span></div>
          <div className="relative mx-auto mt-9 max-w-3xl border border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-secondary)_88%,white)] p-2 shadow-[0_15px_35px_rgba(15,23,42,.12)] sm:mt-12 sm:p-3"><div className="relative aspect-[16/9] overflow-hidden border border-[var(--theme-accent)]">
            {invitation.cover_image_url ? <Image src={invitation.cover_image_url} alt={heroTitle} fill unoptimized sizes="(max-width: 768px) 90vw, 720px" className="object-cover" /> : <div className="flex h-full items-center justify-center px-8"><InitialsSeal letters={seal} /></div>}
          </div></div>
        </header>

        <section className="border-t border-[var(--theme-accent)]/55 px-5 py-10 text-center sm:px-12 sm:py-14 lg:px-20">
          <p className="text-[9px] font-bold uppercase tracking-[0.42em] text-[var(--theme-primary)]">{t.invitation}</p>
          <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line font-serif text-lg leading-8 sm:text-xl sm:leading-9">{displayedMessage}</p>
          <div className="mx-auto my-5 max-w-md"><LetterpressDivider letters={seal} /></div>
          <h2 className="break-words font-serif text-4xl text-[var(--theme-primary)] sm:text-5xl">{invitation.guest_name}</h2>
        </section>

        <section className="border-t border-[var(--theme-accent)]/55 px-5 py-10 sm:px-12 sm:py-14 lg:px-20">
          <p className="text-center text-[9px] font-bold uppercase tracking-[0.42em] text-[var(--theme-primary)]">{t.programme}</p>
          <div className={`mt-7 grid gap-5 ${hasCeremony ? "md:grid-cols-2" : "mx-auto max-w-xl"}`}>{hasCeremony && <ItineraryCard numeral="I" title={invitation.ceremony_title || t.ceremony} date={invitation.ceremony_date} time={invitation.ceremony_time} venue={invitation.ceremony_venue} mapUrl={invitation.ceremony_map_url} language={language} />}<ItineraryCard numeral={hasCeremony ? "II" : "I"} title={t.reception} date={invitation.event_date} time={invitation.event_time} venue={invitation.venue} mapUrl={invitation.reception_map_url} language={language} /></div>
        </section>

        {invitation.dress_code && <section className="grid border-t border-[var(--theme-accent)]/55 sm:grid-cols-[1fr_auto]"><div className="px-6 py-9 text-center sm:px-12 sm:text-left"><p className="text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.attire}</p><p className="mt-3 break-words font-serif text-3xl text-[var(--theme-primary)]">{invitation.dress_code}</p></div><div className="flex items-center justify-center gap-3 border-t border-[var(--theme-accent)]/40 px-8 py-8 sm:border-l sm:border-t-0"><span className="h-12 w-12 rounded-full border-4 border-double border-[var(--theme-accent)] bg-[var(--theme-primary)]" /><span className="h-12 w-12 rounded-full border-4 border-double border-[var(--theme-accent)] bg-[var(--theme-secondary)]" /><span className="h-12 w-12 rounded-full border-4 border-double border-[var(--theme-primary)] bg-[var(--theme-accent)]" /></div></section>}

        <section className="border-t border-[var(--theme-accent)]/55 px-5 py-10 sm:px-12 sm:py-14 lg:px-20">
          <p className="text-center text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.countdown}</p>
          <Countdown eventDate={invitation.event_date} eventTime={invitation.event_time} language={language} accentTextClass="font-serif text-[var(--theme-accent)]" boxClassName="rounded-none border-4 border-double border-[var(--theme-primary)] bg-transparent shadow-none" />
          <p className="mt-10 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.rsvp}</p>
          <RsvpButtons invitationToken={invitation.invitation_token} currentStatus={invitation.rsvp_status} language={language} variant="letterpress" />
          <div className="relative mt-12 border-2 border-dashed border-[var(--theme-accent)] p-2 before:absolute before:-left-4 before:top-1/2 before:h-7 before:w-7 before:-translate-y-1/2 before:rounded-full before:border before:border-[var(--theme-accent)] before:bg-[var(--theme-secondary)] after:absolute after:-right-4 after:top-1/2 after:h-7 after:w-7 after:-translate-y-1/2 after:rounded-full after:border after:border-[var(--theme-accent)] after:bg-[var(--theme-secondary)]"><p className="py-3 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.admission}</p><EventPass guestName={invitation.guest_name} qrToken={invitation.qr_token} eventPassId={invitation.event_pass_id} allowedGuests={invitation.allowed_guests} category={invitation.category} language={language} accentTextClass="font-serif text-[var(--theme-primary)]" boxClassName="rounded-none border-0 bg-transparent shadow-none" /></div>
          <div className="mt-12 border-t border-[var(--theme-accent)]/55 pt-10"><p className="mb-7 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.wishes}</p><WishForm invitationToken={invitation.invitation_token} guestName={invitation.guest_name} language={language} /></div>
        </section>

        <footer className="relative overflow-hidden border-t-4 border-double border-[var(--theme-accent)] bg-[var(--theme-primary)] px-6 py-12 text-center text-[var(--letterpress-primary-contrast)]"><CornerOrnament className="absolute -bottom-8 -left-8 h-32 w-32 text-[var(--theme-accent)] opacity-35" /><CornerOrnament className="absolute -bottom-8 -right-8 h-32 w-32 -scale-x-100 text-[var(--theme-accent)] opacity-35" /><p className="relative font-serif text-3xl sm:text-4xl">{t.closing}</p><p className="relative mt-5 text-[8px] font-bold uppercase tracking-[0.44em]">Smart Event Pass · Château Letterpress</p></footer>
      </div></div>
    </article>
  );
}
