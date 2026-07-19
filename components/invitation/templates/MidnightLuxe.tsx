import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";
type Props = { invitation: PublicInvitation; heroTitle: string; displayedMessage: string; language: Language };

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

function LightLines({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 900 500" className={className} aria-hidden="true"><g fill="none" stroke="currentColor"><path d="M-40 430C150 80 465-30 940 80" strokeWidth="1" /><path d="M-10 485C205 155 510 65 920 130" strokeWidth="2" opacity=".5" /><circle cx="735" cy="92" r="54" strokeWidth="1" /><circle cx="735" cy="92" r="82" strokeWidth="1" opacity=".45" /></g></svg>;
}

function Schedule({ index, title, date, time, venue, mapUrl, language }: { index: string; title: string; date: string | null; time: string | null; venue: string | null; mapUrl: string | null; language: Language }) {
  return (
    <article className="group border-t border-[var(--theme-accent)]/30 py-8 first:border-t-0 sm:grid sm:grid-cols-[80px_minmax(0,1fr)_auto] sm:gap-7">
      <p className="font-serif text-3xl text-[var(--theme-accent)]">{index}</p>
      <div className="mt-3 min-w-0 sm:mt-0"><h3 className="break-words font-serif text-3xl leading-tight text-[var(--theme-primary)] sm:text-4xl">{title}</h3><div className="mt-5 grid gap-4 text-sm text-slate-700 sm:grid-cols-2"><p><span className="block text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Date" : "Tarehe"}</span><span className="mt-1 block">{dateText(date, language)}</span></p><p><span className="block text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Time" : "Muda"}</span><span className="mt-1 block">{timeText(time, language)}</span></p><p className="sm:col-span-2"><span className="block text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "en" ? "Venue" : "Mahali"}</span><span className="mt-1 block break-words">{venue || "—"}</span></p></div></div>
      {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex h-fit items-center gap-2 border border-[var(--theme-primary)] px-4 py-3 text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary)] hover:text-white sm:mt-1">{language === "en" ? "Map ↗" : "Ramani ↗"}</a>}
    </article>
  );
}

export default function MidnightLuxe({ invitation, heroTitle, displayedMessage, language }: Props) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);
  const t = language === "en" ? { gala: "An evening to remember", invitationHeading: "YOUR INVITATION", programme: "The evening programme", ceremony: "Ceremony", reception: "Reception", attire: "Evening Attire", countdown: "The night begins in", pass: "Admission", wishes: "Leave a note for the hosts", closing: "Meet us beneath the evening lights" } : { gala: "Usiku wa kukumbukwa", invitationHeading: "MWALIKO WAKO", programme: "Ratiba ya jioni", ceremony: "Ibada", reception: "Mapokezi / Sherehe", attire: "Mavazi ya Jioni", countdown: "Usiku unaanza baada ya", pass: "Ruhusa ya Kuingia", wishes: "Acha ujumbe kwa wenye event", closing: "Tukutane chini ya mwanga wa jioni" };
  const showEventTitle = invitation.event_title.trim().toLocaleLowerCase() !== heroTitle.trim().toLocaleLowerCase();

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden bg-[color-mix(in_srgb,var(--theme-secondary)_86%,white)] shadow-[0_35px_110px_rgba(2,6,23,.35)]">
      <header className="relative min-h-[720px] overflow-hidden bg-[color-mix(in_srgb,var(--theme-primary)_55%,#05070d)] text-white sm:min-h-[820px]">
        {invitation.cover_image_url ? <img src={invitation.cover_image_url} alt={heroTitle} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,var(--theme-accent),transparent_24%),linear-gradient(145deg,var(--theme-primary),#05070d_72%)] opacity-90" />}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,.2),rgba(2,6,23,.15)_38%,rgba(2,6,23,.93))]" />
        <div className="absolute -right-20 top-8 h-72 w-72 rounded-full bg-[var(--theme-accent)] opacity-20 blur-[80px]" />
        <LightLines className="absolute inset-x-0 top-0 h-3/4 w-full text-[var(--theme-accent)] opacity-55" />
        {!invitation.cover_image_url && <div className="absolute right-[12%] top-[20%] flex h-48 w-48 items-center justify-center rounded-full border border-[var(--theme-accent)]/60 font-serif text-7xl text-white/75 shadow-[0_0_80px_color-mix(in_srgb,var(--theme-accent)_35%,transparent)]">ML</div>}
        <div className="relative flex items-center justify-between px-5 pt-6 text-[8px] font-bold uppercase tracking-[0.34em] text-white/70 sm:px-10 sm:pt-9"><span>Smart Event Pass</span><span>{t.gala}</span></div>
        <div className="absolute inset-x-4 bottom-7 sm:inset-x-10 sm:bottom-10 lg:left-[12%] lg:right-[8%]">
          <div className="max-w-3xl border-l-4 border-[var(--theme-accent)] bg-[color-mix(in_srgb,var(--theme-secondary)_88%,transparent)] px-5 py-7 text-slate-950 shadow-2xl backdrop-blur-md sm:px-9 sm:py-10">
            {showEventTitle && <p className="text-[9px] font-black uppercase tracking-[0.38em] text-[var(--theme-primary)]">{invitation.event_title}</p>}
            <h1 className="mt-4 break-words font-serif text-5xl leading-[.92] text-[var(--theme-primary)] sm:text-7xl lg:text-8xl">{heroTitle}</h1>
            <div className="mt-7 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-700"><span>{dateText(invitation.event_date, language)}</span><span className="h-1.5 w-1.5 rounded-full bg-[var(--theme-accent)]" /><span>{invitation.venue}</span></div>
          </div>
        </div>
      </header>

      <section className="relative px-5 py-10 sm:px-12 sm:py-16 lg:px-20"><LightLines className="absolute -right-40 top-0 h-72 w-[650px] text-[var(--theme-accent)] opacity-[.09]" /><div className="relative max-w-2xl"><p className="text-[9px] font-bold uppercase tracking-[0.38em] text-[var(--theme-primary)]">{t.invitationHeading}</p><p className="mt-3 whitespace-pre-line text-base leading-8 text-slate-700 sm:mt-4 sm:text-lg sm:leading-9">{displayedMessage}</p><div className="my-4 flex items-center gap-4 sm:my-5"><span className="h-px w-24 bg-[var(--theme-primary)]" /><span className="h-1.5 w-1.5 rounded-full bg-[var(--theme-accent)]" /></div><h2 className="break-words font-serif text-4xl leading-tight text-slate-900 sm:text-5xl">{invitation.guest_name}</h2></div></section>

      <section className="border-y border-[var(--theme-accent)]/40 bg-white/75 px-5 py-14 sm:px-12 sm:py-20 lg:px-20"><div className="flex items-center gap-5"><p className="text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.programme}</p><span className="h-px flex-1 bg-[var(--theme-accent)]/50" /></div><div className="mt-7">{hasCeremony && <Schedule index="01" title={invitation.ceremony_title || t.ceremony} date={invitation.ceremony_date} time={invitation.ceremony_time} venue={invitation.ceremony_venue} mapUrl={invitation.ceremony_map_url} language={language} />}<Schedule index={hasCeremony ? "02" : "01"} title={t.reception} date={invitation.event_date} time={invitation.event_time} venue={invitation.venue} mapUrl={invitation.reception_map_url} language={language} /></div></section>

      {invitation.dress_code && <section className="grid border-b border-[var(--theme-accent)]/40 bg-[var(--theme-secondary)] sm:grid-cols-[1fr_auto]"><div className="px-6 py-10 sm:px-12 lg:px-20"><p className="text-[9px] font-bold uppercase tracking-[0.38em] text-[var(--theme-accent)]">{t.attire}</p><p className="mt-3 break-words font-serif text-3xl text-[var(--theme-primary)] sm:text-4xl">{invitation.dress_code}</p></div><div className="flex items-center gap-3 border-t border-[var(--theme-accent)]/30 px-6 py-9 sm:border-l sm:border-t-0 sm:px-10"><span className="h-12 w-8 rounded-full border border-black/10 bg-[var(--theme-primary)]" /><span className="h-12 w-8 rounded-full border border-black/10 bg-[var(--theme-secondary)]" /><span className="h-12 w-8 rounded-full border border-black/10 bg-[var(--theme-accent)]" /></div></section>}

      <section className="px-5 py-14 sm:px-12 sm:py-20 lg:px-20"><p className="text-center text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.countdown}</p><Countdown eventDate={invitation.event_date} eventTime={invitation.event_time} language={language} accentTextClass="font-serif text-[var(--theme-accent)]" boxClassName="rounded-none border border-[var(--theme-accent)]/60 bg-[var(--theme-secondary)] shadow-none" /><RsvpButtons invitationToken={invitation.invitation_token} currentStatus={invitation.rsvp_status} language={language} variant="midnight" /><p className="mt-12 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.pass}</p><EventPass guestName={invitation.guest_name} qrToken={invitation.qr_token} eventPassId={invitation.event_pass_id} allowedGuests={invitation.allowed_guests} category={invitation.category} language={language} accentTextClass="text-[var(--theme-primary)]" boxClassName="rounded-none border border-[var(--theme-accent)]/60 bg-[var(--theme-secondary)] shadow-none" /><div className="mt-12 border-t border-[var(--theme-accent)]/50 pt-10"><p className="mb-7 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{t.wishes}</p><WishForm invitationToken={invitation.invitation_token} guestName={invitation.guest_name} language={language} /></div></section>

      <footer className="relative overflow-hidden bg-[var(--theme-primary)] px-6 py-16 text-center text-white"><div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--theme-accent)] to-transparent" /><LightLines className="absolute inset-0 h-full w-full text-[var(--theme-accent)] opacity-20" /><p className="relative font-serif text-3xl sm:text-5xl">{t.closing}</p><p className="relative mt-7 text-[8px] font-bold uppercase tracking-[0.42em] text-white/60">Smart Event Pass · Midnight Luxe</p></footer>
    </div>
  );
}
