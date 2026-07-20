import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";
type Props = { invitation: PublicInvitation; heroTitle: string; displayedMessage: string; language: Language };

function formattedDate(value: string | null, language: Language) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function formattedTime(value: string | null, language: Language) {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value || "—";
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(2000, 0, 1, Number(match[1]), Number(match[2])));
}

function initials(title: string) {
  const parts = title.replace(/&/g, " ").split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "E"}${parts.at(-1)?.[0] ?? "H"}`.toUpperCase();
}

function BotanicalSprig({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 300" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M28 286C56 220 54 142 136 22" strokeWidth="2" />
        <path d="M55 219C30 205 18 180 20 153 48 160 64 180 55 219ZM75 170c28-8 46-29 54-56-30 1-50 18-54 56ZM98 116C77 99 72 76 78 52c25 12 35 34 20 64ZM119 72c24-9 38-26 43-48-25 2-42 16-43 48Z" fill="currentColor" strokeWidth="1" />
        <circle cx="45" cy="238" r="4" fill="currentColor" /><circle cx="108" cy="92" r="3" fill="currentColor" />
      </g>
    </svg>
  );
}

function BotanicalDivider() {
  return <div className="mx-auto flex max-w-xs items-center gap-3 text-[var(--theme-accent)]" aria-hidden="true"><span className="h-px flex-1 bg-current opacity-60" /><svg viewBox="0 0 70 32" className="h-8 w-16" fill="none" stroke="currentColor"><path d="M2 25C20 24 25 14 35 4c9 11 17 20 33 21M19 21c-5-7-5-13-2-18 7 4 9 10 2 18Zm33 0c5-7 5-13 2-18-7 4-9 10-2 18Z" /></svg><span className="h-px flex-1 bg-current opacity-60" /></div>;
}

function ScheduleCard({ title, date, time, venue, mapUrl, language }: { title: string; date: string | null; time: string | null; venue: string | null; mapUrl: string | null; language: Language }) {
  return (
    <article className="relative overflow-hidden rounded-[1.75rem] border border-[var(--theme-accent)]/35 bg-white/[0.06] p-6 backdrop-blur-sm sm:p-8">
      <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-[3rem] border-b border-l border-[var(--theme-accent)]/25" />
      <h3 className="font-serif text-3xl text-white">{title}</h3>
      <dl className="mt-6 grid gap-5 text-sm text-white/75 sm:grid-cols-2">
        <div><dt className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--theme-accent)]">{language === "en" ? "Date" : "Tarehe"}</dt><dd className="mt-2">{formattedDate(date, language)}</dd></div>
        <div><dt className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--theme-accent)]">{language === "en" ? "Time" : "Muda"}</dt><dd className="mt-2">{formattedTime(time, language)}</dd></div>
        <div className="sm:col-span-2"><dt className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--theme-accent)]">{language === "en" ? "Venue" : "Mahali"}</dt><dd className="mt-2 break-words">{venue || "—"}</dd></div>
      </dl>
      {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex rounded-full border border-[var(--theme-accent)] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--theme-accent)] transition hover:bg-[var(--theme-accent)] hover:text-[#07120d]">{language === "en" ? "Open map ↗" : "Fungua ramani ↗"}</a>}
    </article>
  );
}

export default function EmeraldBotanicalHalo({ invitation, heroTitle, displayedMessage, language }: Props) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);
  const mark = initials(heroTitle);
  const t = language === "en" ? { invitation: "YOUR INVITATION", guest: "Honoured guest", schedule: "The celebration", ceremony: "Ceremony", reception: "Reception", attire: "Dress code", countdown: "Counting down to our day", pass: "Your Event Pass", wishes: "Send your wishes", close: "A beautiful beginning, shared with you" } : { invitation: "MWALIKO WAKO", guest: "Mgeni wetu wa heshima", schedule: "Ratiba ya sherehe", ceremony: "Ibada", reception: "Mapokezi / Sherehe", attire: "Mavazi", countdown: "Tunaihesabu siku yetu", pass: "Event Pass Yako", wishes: "Tuma salamu zako", close: "Mwanzo mzuri, tukishiriki pamoja nawe" };

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden bg-[color-mix(in_srgb,var(--theme-primary)_78%,#020806)] text-white shadow-[0_35px_120px_rgba(0,0,0,.42)]">
      <header className="relative overflow-hidden px-5 pb-16 pt-12 text-center sm:px-10 sm:pb-24 sm:pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,color-mix(in_srgb,var(--theme-secondary)_26%,transparent),transparent_35%),linear-gradient(160deg,color-mix(in_srgb,var(--theme-primary)_88%,#020806),#020806)]" />
        <BotanicalSprig className="absolute -left-8 top-20 h-72 text-[var(--theme-secondary)] opacity-35" />
        <BotanicalSprig className="absolute -right-7 top-64 h-64 -scale-x-100 rotate-12 text-[var(--theme-secondary)] opacity-30" />
        <p className="relative text-[9px] font-bold uppercase tracking-[0.5em] text-[var(--theme-accent)]">Smart Event Pass · Botanical Edition</p>
        <div className="relative mx-auto mt-12 aspect-[4/5] w-[min(72vw,390px)]">
          <div className="absolute -inset-5 rounded-[50%] border border-[var(--theme-accent)]/35" /><div className="absolute -inset-2 rounded-[50%] border-2 border-[var(--theme-accent)]/75" /><div className="absolute inset-2 rounded-[50%] border border-[var(--theme-accent)]/45" />
          <div className="absolute inset-4 flex items-center justify-center overflow-hidden rounded-[50%] border-4 border-[color-mix(in_srgb,var(--theme-accent)_78%,white)] bg-[var(--theme-primary)] shadow-[0_0_60px_color-mix(in_srgb,var(--theme-accent)_18%,transparent)]">
            {invitation.cover_image_url ? (
              // Event cover URLs are user-managed and may not match a fixed Next Image host allowlist.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={invitation.cover_image_url} alt={heroTitle} className="h-full w-full object-cover" />
            ) : <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,var(--theme-secondary),var(--theme-primary)_72%)] font-serif text-7xl tracking-[0.08em] text-[var(--theme-accent)] sm:text-8xl">{mark}</div>}
          </div>
          <BotanicalSprig className="absolute -bottom-12 -left-16 h-56 -rotate-[38deg] text-[var(--theme-accent)]" />
          <BotanicalSprig className="absolute -right-14 -top-14 h-48 rotate-[142deg] text-[var(--theme-accent)]" />
        </div>
        <h1 className="relative mx-auto mt-14 max-w-3xl break-words font-serif text-5xl leading-[1.02] sm:text-7xl">{heroTitle}</h1>
        <p className="relative mt-5 text-[10px] font-bold uppercase tracking-[0.34em] text-[var(--theme-accent)]">{formattedDate(invitation.event_date, language)}</p>
      </header>

      <section className="bg-[var(--theme-secondary)] px-5 py-14 text-center text-[var(--theme-primary)] sm:px-12 sm:py-20">
        <p className="text-[9px] font-bold uppercase tracking-[0.46em] text-[var(--theme-accent)]">{t.invitation}</p>
        <p className="mx-auto mt-5 max-w-2xl whitespace-pre-line text-base leading-8 opacity-80 sm:text-lg sm:leading-9">{displayedMessage}</p>
        <div className="my-8"><BotanicalDivider /></div>
        <p className="text-[9px] font-bold uppercase tracking-[0.38em] text-[var(--theme-accent)]">{t.guest}</p>
        <h2 className="mt-4 break-words font-serif text-4xl sm:text-5xl">{invitation.guest_name}</h2>
      </section>

      <section className="relative px-5 py-16 sm:px-12 sm:py-20 lg:px-20">
        <BotanicalSprig className="absolute -right-12 top-10 h-60 text-[var(--theme-secondary)] opacity-15" />
        <p className="relative text-center text-[9px] font-bold uppercase tracking-[0.46em] text-[var(--theme-accent)]">{t.schedule}</p>
        <div className="relative mt-9 grid gap-5 md:grid-cols-2">{hasCeremony && <ScheduleCard title={invitation.ceremony_title || t.ceremony} date={invitation.ceremony_date} time={invitation.ceremony_time} venue={invitation.ceremony_venue} mapUrl={invitation.ceremony_map_url} language={language} />}<ScheduleCard title={t.reception} date={invitation.event_date} time={invitation.event_time} venue={invitation.venue} mapUrl={invitation.reception_map_url} language={language} /></div>
      </section>

      {invitation.dress_code && <section className="border-y border-[var(--theme-accent)]/30 bg-white/[0.04] px-6 py-12 text-center"><p className="text-[9px] font-bold uppercase tracking-[0.42em] text-[var(--theme-accent)]">{t.attire}</p><p className="mt-4 font-serif text-3xl">{invitation.dress_code}</p><div className="mt-7 flex justify-center gap-3"><span className="h-11 w-11 rounded-full border-2 border-white/25 bg-[var(--theme-primary)]" /><span className="h-11 w-11 rounded-full border-2 border-white/25 bg-[var(--theme-secondary)]" /><span className="h-11 w-11 rounded-full border-2 border-white/25 bg-[var(--theme-accent)]" /></div></section>}

      <section className="bg-[var(--theme-secondary)] px-5 py-14 text-[var(--theme-primary)] sm:px-12 sm:py-20 lg:px-20">
        <p className="text-center text-[9px] font-bold uppercase tracking-[0.42em] text-[var(--theme-accent)]">{t.countdown}</p>
        <Countdown eventDate={invitation.event_date} eventTime={invitation.event_time} language={language} accentTextClass="font-serif text-[var(--theme-primary)]" boxClassName="rounded-full border border-[var(--theme-accent)]/55 bg-white/40 shadow-none" />
        <RsvpButtons invitationToken={invitation.invitation_token} currentStatus={invitation.rsvp_status} language={language} variant="emerald" />
        <p className="mt-14 text-center text-[9px] font-bold uppercase tracking-[0.42em] text-[var(--theme-accent)]">{t.pass}</p>
        <EventPass guestName={invitation.guest_name} qrToken={invitation.qr_token} eventPassId={invitation.event_pass_id} allowedGuests={invitation.allowed_guests} category={invitation.category} language={language} accentTextClass="text-[var(--theme-primary)]" boxClassName="rounded-[2rem] border border-[var(--theme-accent)]/50 bg-white/50 shadow-none" />
        <div className="mt-14 border-t border-[var(--theme-accent)]/35 pt-10"><p className="mb-7 text-center text-[9px] font-bold uppercase tracking-[0.42em] text-[var(--theme-accent)]">{t.wishes}</p><WishForm invitationToken={invitation.invitation_token} guestName={invitation.guest_name} language={language} /></div>
      </section>

      <footer className="relative overflow-hidden px-6 py-20 text-center"><BotanicalSprig className="absolute -bottom-24 left-4 h-64 rotate-45 text-[var(--theme-accent)] opacity-40" /><BotanicalDivider /><p className="relative mx-auto mt-8 max-w-2xl font-serif text-3xl sm:text-5xl">{t.close}</p><p className="relative mt-8 text-[8px] font-bold uppercase tracking-[0.46em] text-[var(--theme-accent)]">{mark} · Emerald Botanical Halo</p></footer>
    </div>
  );
}
