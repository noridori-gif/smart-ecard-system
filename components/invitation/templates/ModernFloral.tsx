import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";
import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";
type Props = { invitation: PublicInvitation; heroTitle: string; displayedMessage: string; language: Language };
type DetailsProps = { title: string; date: string | null; time: string | null; venue: string | null; mapUrl: string | null; language: Language };

function formatDate(value: string | null, language: Language) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(date);
}

function Details({ title, date, time, venue, mapUrl, language }: DetailsProps) {
  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-[var(--theme-accent)]/50 bg-white/75 p-6 shadow-lg backdrop-blur-sm">
      <span className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--theme-accent)] opacity-15" />
      <h3 className="font-serif text-2xl text-[var(--theme-primary)]">{title}</h3>
      <div className="mt-5 space-y-4 border-l-2 border-[var(--theme-accent)] pl-4 text-sm text-slate-700">
        <p><b className="block text-[9px] uppercase tracking-[0.22em] text-[var(--theme-primary)]">{language === "sw" ? "Tarehe" : "Date"}</b>{formatDate(date, language)}</p>
        <p><b className="block text-[9px] uppercase tracking-[0.22em] text-[var(--theme-primary)]">{language === "sw" ? "Muda" : "Time"}</b>{time?.slice(0, 5) || "—"}</p>
        <p><b className="block text-[9px] uppercase tracking-[0.22em] text-[var(--theme-primary)]">{language === "sw" ? "Mahali" : "Venue"}</b>{venue || "—"}</p>
      </div>
      {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex rounded-full bg-[var(--theme-primary)] px-5 py-2 text-[10px] font-black uppercase tracking-wider text-white">⌖ {language === "sw" ? "Fungua Ramani" : "Open Map"}</a>}
    </article>
  );
}

export default function ModernFloral({ invitation, heroTitle, displayedMessage, language }: Props) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);
  const t = language === "sw"
    ? { invite: "Tunayo furaha kukualika", guest: "Mwaliko Maalumu Kwa", ceremony: "Ibada", reception: "Mapokezi / Sherehe", dress: "Rangi za Mavazi", close: "Karibu tusherehekee pamoja" }
    : { invite: "We joyfully invite you", guest: "A Special Invitation For", ceremony: "Ceremony", reception: "Reception", dress: "Dress Colours", close: "Come celebrate with us" };

  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden bg-[var(--theme-secondary)] shadow-2xl sm:rounded-[2.5rem]">
      <span className="absolute -right-16 -top-20 h-64 w-40 rotate-45 rounded-[100%_0_100%_0] bg-[var(--theme-primary)] opacity-80" />
      <span className="absolute right-16 top-6 h-28 w-16 rotate-12 rounded-[100%_0_100%_0] bg-[var(--theme-accent)] opacity-80" />

      <header className="relative px-7 pb-10 pt-14 sm:px-12">
        <p className="text-[9px] font-black uppercase tracking-[0.34em] text-[var(--theme-primary)]">{t.invite}</p>
        <h1 className="relative z-10 mt-5 max-w-[80%] font-serif text-5xl leading-none text-[var(--theme-primary)] sm:text-7xl">{heroTitle}</h1>
        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-600">{formatDate(invitation.event_date, language)}</p>

        <div className="relative ml-auto mt-10 h-[420px] w-[88%] overflow-hidden rounded-t-[10rem] rounded-b-[2rem] border-4 border-white shadow-2xl">
          {invitation.cover_image_url ? <img src={invitation.cover_image_url} alt={heroTitle} className="h-full w-full object-cover" /> : <div className="h-full bg-[linear-gradient(145deg,var(--theme-primary),var(--theme-accent))]" />}
        </div>
      </header>

      <section className="px-6 pb-12 sm:px-12">
        <div className="rounded-[2rem] bg-white/65 p-7 text-center backdrop-blur-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--theme-primary)]">{t.guest}</p>
          <h2 className="mt-3 font-serif text-3xl text-[var(--theme-primary)]">{invitation.guest_name}</h2>
          <p className="mt-5 whitespace-pre-line leading-8 text-slate-600">{displayedMessage}</p>
        </div>

        <div className={`mt-8 grid gap-5 ${hasCeremony ? "sm:grid-cols-2" : "mx-auto max-w-md"}`}>
          {hasCeremony && <Details title={invitation.ceremony_title || t.ceremony} date={invitation.ceremony_date} time={invitation.ceremony_time} venue={invitation.ceremony_venue} mapUrl={invitation.ceremony_map_url} language={language} />}
          <Details title={t.reception} date={invitation.event_date} time={invitation.event_time} venue={invitation.venue} mapUrl={invitation.reception_map_url} language={language} />
        </div>

        {invitation.dress_code && <div className="mt-7 rounded-[2rem] bg-[var(--theme-primary)] p-6 text-center text-white"><p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--theme-accent)]">{t.dress}</p><p className="mt-2 font-serif text-2xl">{invitation.dress_code}</p></div>}

        <Countdown eventDate={invitation.event_date} eventTime={invitation.event_time} language={language} accentTextClass="text-[var(--theme-primary)]" boxClassName="bg-white/70" />
        <RsvpButtons invitationToken={invitation.invitation_token} currentStatus={invitation.rsvp_status} language={language} accentTextClass="text-[var(--theme-primary)]" variant="classic" />
        <EventPass guestName={invitation.guest_name} qrToken={invitation.qr_token} eventPassId={invitation.event_pass_id} allowedGuests={invitation.allowed_guests} category={invitation.category} language={language} accentTextClass="text-[var(--theme-primary)]" boxClassName="bg-white/70" />
        <WishForm invitationToken={invitation.invitation_token} guestName={invitation.guest_name} language={language} />
      </section>

      <footer className="bg-[var(--theme-primary)] px-8 py-10 text-center text-white"><p className="font-serif text-2xl">{t.close}</p><p className="mt-3 text-[8px] font-bold uppercase tracking-[0.35em] text-[var(--theme-accent)]">Smart Event Pass</p></footer>
    </div>
  );
}