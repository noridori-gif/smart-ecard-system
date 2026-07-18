import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";

type MinimalIvoryProps = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: Language;
};

function formatDate(date: string | null, language: Language) {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatTime(time: string | null, language: Language) {
  if (!time) return "—";
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2000, 0, 1, Number(match[1]), Number(match[2])));
}

function Itinerary({
  number,
  title,
  date,
  time,
  venue,
  mapUrl,
  language,
}: {
  number: string;
  title: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapUrl: string | null;
  language: Language;
}) {
  return (
    <article className="grid grid-cols-[48px_minmax(0,1fr)] gap-4 border-t border-[#d8cdbb] py-7 first:border-t-0 sm:grid-cols-[70px_minmax(0,1fr)] sm:gap-7">
      <p className="font-serif text-3xl text-[var(--theme-accent)] sm:text-4xl">{number}</p>
      <div className="min-w-0">
        <h3 className="break-words font-serif text-2xl leading-tight text-[#27231d] sm:text-3xl">{title}</h3>
        <dl className="mt-5 grid gap-4 text-sm text-[#625b52] sm:grid-cols-2">
          <div><dt className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "sw" ? "Tarehe" : "Date"}</dt><dd className="mt-1">{formatDate(date, language)}</dd></div>
          <div><dt className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "sw" ? "Muda" : "Time"}</dt><dd className="mt-1">{formatTime(time, language)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--theme-primary)]">{language === "sw" ? "Mahali" : "Venue"}</dt><dd className="mt-1 break-words">{venue || "—"}</dd></div>
        </dl>
        {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block border-b border-[var(--theme-primary)] pb-1 text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--theme-primary)]">{language === "sw" ? "Fungua Ramani" : "Open Map"}</a>}
      </div>
    </article>
  );
}

export default function MinimalIvory({ invitation, heroTitle, displayedMessage, language }: MinimalIvoryProps) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);
  const t = language === "sw"
    ? { invitation: "Mwaliko wa Heshima", for: "Imeandaliwa kwa", letter: "Barua ya Mwaliko", itinerary: "Ratiba ya Siku", ceremony: "Ibada", reception: "Mapokezi / Sherehe", dress: "Mavazi", countdown: "Tukio linaanza baada ya", wishes: "Salamu na Baraka", closing: "Kwa furaha tunatarajia kusherehekea pamoja nawe" }
    : { invitation: "A Formal Invitation", for: "Prepared for", letter: "Invitation Letter", itinerary: "Order of the Day", ceremony: "Ceremony", reception: "Reception", dress: "Dress Code", countdown: "The event begins in", wishes: "Wishes & Blessings", closing: "With joy, we look forward to celebrating with you" };

  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden border border-[#d8cdbb] bg-[#fbf7ed] text-[#27231d] shadow-[0_25px_80px_rgba(62,52,38,0.18)]">
      <div className="m-2 border border-[#d8cdbb] sm:m-4">
        <header className="px-5 pb-10 pt-7 text-center sm:px-12 sm:pb-14 sm:pt-10">
          <div className="flex items-center justify-between gap-4 border-b border-[#d8cdbb] pb-4 text-[8px] font-bold uppercase tracking-[0.3em] text-[var(--theme-primary)] sm:text-[9px]">
            <span>Smart Event Pass</span><span>{t.invitation}</span>
          </div>
          <p className="mt-10 text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--theme-primary)]">{invitation.event_title}</p>
          {invitation.cover_image_url ? (
            <div className="mx-auto mt-7 h-32 w-24 overflow-hidden rounded-[50%] border border-[var(--theme-accent)] p-1 sm:h-40 sm:w-28">
              <img src={invitation.cover_image_url} alt={heroTitle} className="h-full w-full rounded-[50%] object-cover" />
            </div>
          ) : (
            <div className="mx-auto mt-7 flex h-28 w-20 items-center justify-center rounded-[50%] border border-[var(--theme-accent)] text-3xl text-[var(--theme-primary)] sm:h-36 sm:w-24">&amp;</div>
          )}
          <h1 className="mx-auto mt-8 max-w-2xl break-words font-serif text-5xl leading-[0.95] tracking-[-0.03em] text-[var(--theme-primary)] sm:text-7xl">{heroTitle}</h1>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-[#6f675d]">{formatDate(invitation.event_date, language)}</p>
        </header>

        <section className="border-t border-[#d8cdbb] px-5 py-10 sm:px-12 sm:py-14">
          <p className="text-center text-[9px] font-bold uppercase tracking-[0.38em] text-[var(--theme-primary)]">{t.for}</p>
          <h2 className="mx-auto mt-4 max-w-xl break-words text-center font-serif text-3xl leading-tight sm:text-5xl">{invitation.guest_name}</h2>
          <div className="mx-auto mt-9 max-w-xl border-y border-[#d8cdbb] px-1 py-8 sm:px-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.34em] text-[var(--theme-accent)]">{t.letter}</p>
            <p className="mt-5 whitespace-pre-line font-serif text-lg leading-8 text-[#514b43] sm:text-xl sm:leading-9">{displayedMessage}</p>
          </div>
        </section>

        <section className="border-t border-[#d8cdbb] px-5 py-10 sm:px-12 sm:py-14">
          <p className="mb-5 text-[9px] font-bold uppercase tracking-[0.38em] text-[var(--theme-primary)]">{t.itinerary}</p>
          {hasCeremony && <Itinerary number="01" title={invitation.ceremony_title || t.ceremony} date={invitation.ceremony_date} time={invitation.ceremony_time} venue={invitation.ceremony_venue} mapUrl={invitation.ceremony_map_url} language={language} />}
          <Itinerary number={hasCeremony ? "02" : "01"} title={t.reception} date={invitation.event_date} time={invitation.event_time} venue={invitation.venue} mapUrl={invitation.reception_map_url} language={language} />
          {invitation.dress_code && (
            <div className="mt-4 flex flex-col gap-5 border-t border-[#d8cdbb] pt-7 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--theme-primary)]">{t.dress}</p><p className="mt-2 break-words font-serif text-xl">{invitation.dress_code}</p></div>
              <div className="flex gap-2" aria-hidden="true"><span className="h-8 w-8 border border-black/10 bg-[var(--theme-primary)]" /><span className="h-8 w-8 border border-black/10 bg-[var(--theme-secondary)]" /><span className="h-8 w-8 border border-black/10 bg-[var(--theme-accent)]" /></div>
            </div>
          )}
        </section>

        <section className="border-t border-[#d8cdbb] px-5 py-10 sm:px-12 sm:py-14">
          <p className="text-center text-[9px] font-bold uppercase tracking-[0.38em] text-[var(--theme-primary)]">{t.countdown}</p>
          <Countdown eventDate={invitation.event_date} eventTime={invitation.event_time} language={language} accentTextClass="font-serif text-[var(--theme-primary)]" boxClassName="rounded-none border-[#d8cdbb] bg-transparent shadow-none" />
          <RsvpButtons invitationToken={invitation.invitation_token} currentStatus={invitation.rsvp_status} language={language} variant="ivory" />
          <EventPass guestName={invitation.guest_name} qrToken={invitation.qr_token} eventPassId={invitation.event_pass_id} allowedGuests={invitation.allowed_guests} category={invitation.category} language={language} accentTextClass="text-[var(--theme-primary)]" boxClassName="rounded-none border-[#d8cdbb] bg-white shadow-none" />
          <div className="mt-12 border-t border-[#d8cdbb] pt-10"><p className="mb-6 text-center text-[9px] font-bold uppercase tracking-[0.38em] text-[var(--theme-primary)]">{t.wishes}</p><WishForm invitationToken={invitation.invitation_token} guestName={invitation.guest_name} language={language} /></div>
        </section>
        <footer className="border-t border-[#d8cdbb] px-5 py-10 text-center sm:px-12"><p className="font-serif text-xl text-[var(--theme-primary)] sm:text-2xl">{t.closing}</p><p className="mt-4 text-[8px] font-bold uppercase tracking-[0.38em] text-[#81786d]">Smart Event Pass</p></footer>
      </div>
    </div>
  );
}
