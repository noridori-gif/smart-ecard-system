import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";
import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";
type Props = { invitation: PublicInvitation; heroTitle: string; displayedMessage: string; language: Language };
type DetailProps = { title: string; date: string | null; time: string | null; venue: string | null; mapUrl: string | null; language: Language };

function formatDate(value: string | null, language: Language) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function Detail({ title, date, time, venue, mapUrl, language }: DetailProps) {
  return (
    <article className="border-l border-[var(--theme-accent)] bg-white/5 p-6">
      <h3 className="font-serif text-3xl text-white">{title}</h3>
      <div className="mt-5 grid gap-4 text-sm text-white/70">
        <p><b className="block text-[9px] uppercase tracking-[0.24em] text-[var(--theme-accent)]">{language === "sw" ? "Tarehe" : "Date"}</b>{formatDate(date, language)}</p>
        <p><b className="block text-[9px] uppercase tracking-[0.24em] text-[var(--theme-accent)]">{language === "sw" ? "Muda" : "Time"}</b>{time?.slice(0, 5) || "—"}</p>
        <p><b className="block text-[9px] uppercase tracking-[0.24em] text-[var(--theme-accent)]">{language === "sw" ? "Mahali" : "Venue"}</b>{venue || "—"}</p>
      </div>
      {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex border-b border-[var(--theme-accent)] pb-1 text-[10px] font-black uppercase tracking-wider text-[var(--theme-accent)]">⌖ {language === "sw" ? "Fungua Ramani" : "Open Map"}</a>}
    </article>
  );
}

export default function RoyalDark({ invitation, heroTitle, displayedMessage, language }: Props) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);
  const t = language === "sw"
    ? { invite: "Mwaliko wa Kifalme", guest: "Mgeni wetu wa heshima", ceremony: "Ibada", reception: "Mapokezi / Sherehe", dress: "Mavazi", close: "Uwepo wako ni heshima kwetu" }
    : { invite: "A Royal Invitation", guest: "Our honoured guest", ceremony: "Ceremony", reception: "Reception", dress: "Dress Code", close: "Your presence is our honour" };

  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden bg-[#080b12] text-white shadow-2xl sm:rounded-[2rem]">
      <header className="grid min-h-[680px] lg:grid-cols-2">
        <div className="relative min-h-[420px] overflow-hidden">
          {invitation.cover_image_url ? <img src={invitation.cover_image_url} alt={heroTitle} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 bg-[var(--theme-primary)]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080b12] via-transparent to-black/20" />
        </div>
        <div className="relative flex flex-col justify-center px-8 py-12 sm:px-12">
          <span className="absolute right-8 top-8 text-6xl text-[var(--theme-accent)] opacity-30">♛</span>
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--theme-accent)]">{t.invite}</p>
          <h1 className="mt-6 font-serif text-5xl leading-none sm:text-7xl">{heroTitle}</h1>
          <p className="mt-7 border-l border-[var(--theme-accent)] pl-5 text-sm uppercase tracking-widest text-white/65">{formatDate(invitation.event_date, language)}</p>
        </div>
      </header>

      <section className="px-6 py-12 sm:px-12">
        <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--theme-accent)]">{t.guest}</p><h2 className="mt-3 font-serif text-4xl">{invitation.guest_name}</h2><p className="mx-auto mt-5 max-w-xl whitespace-pre-line leading-8 text-white/65">{displayedMessage}</p></div>
        <div className={`mt-12 grid gap-6 ${hasCeremony ? "md:grid-cols-2" : "mx-auto max-w-md"}`}>
          {hasCeremony && <Detail title={invitation.ceremony_title || t.ceremony} date={invitation.ceremony_date} time={invitation.ceremony_time} venue={invitation.ceremony_venue} mapUrl={invitation.ceremony_map_url} language={language} />}
          <Detail title={t.reception} date={invitation.event_date} time={invitation.event_time} venue={invitation.venue} mapUrl={invitation.reception_map_url} language={language} />
        </div>
        {invitation.dress_code && <div className="mt-8 border-y border-[var(--theme-accent)] py-6 text-center"><p className="text-[9px] uppercase tracking-[0.3em] text-[var(--theme-accent)]">{t.dress}</p><p className="mt-2 font-serif text-2xl">{invitation.dress_code}</p></div>}
        <div className="mt-8 rounded-[2rem] bg-[var(--theme-secondary)] p-3 text-slate-900 sm:p-6">
          <Countdown eventDate={invitation.event_date} eventTime={invitation.event_time} language={language} accentTextClass="text-[var(--theme-primary)]" boxClassName="bg-white/70" />
          <RsvpButtons invitationToken={invitation.invitation_token} currentStatus={invitation.rsvp_status} language={language} accentTextClass="text-[var(--theme-primary)]" variant="classic" />
          <EventPass qrToken={invitation.qr_token} eventPassId={invitation.event_pass_id} allowedGuests={invitation.allowed_guests} category={invitation.category} language={language} accentTextClass="text-[var(--theme-primary)]" boxClassName="bg-white/70" />
          <WishForm invitationToken={invitation.invitation_token} guestName={invitation.guest_name} language={language} />
        </div>
      </section>
      <footer className="border-t border-[var(--theme-accent)] bg-[var(--theme-primary)] px-8 py-10 text-center"><p className="font-serif text-2xl">{t.close}</p><p className="mt-3 text-[8px] uppercase tracking-[0.35em] text-[var(--theme-accent)]">Smart Event Pass</p></footer>
    </div>
  );
}