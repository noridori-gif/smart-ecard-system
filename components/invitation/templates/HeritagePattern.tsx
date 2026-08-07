import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";
import CardShell from "./shared/CardShell";
import DateBadge from "./shared/DateBadge";
import PhotoHero from "./shared/PhotoHero";
import ScheduleGrid, { type ScheduleEntry } from "./shared/ScheduleGrid";
import { coupleInitials, heroNameFontSize } from "./shared/formatters";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";

type HeritagePatternProps = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: Language;
};

export default function HeritagePattern({ invitation, heroTitle, displayedMessage, language }: HeritagePatternProps) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);

  const t =
    language === "sw"
      ? {
          eyebrow: "Mwaliko wa Heshima",
          details: "Ratiba ya Tukio",
          ceremony: "Ibada",
          reception: "Mapokezi / Sherehe",
          closing: "Tunatarajia kusherehekea pamoja nawe",
        }
      : {
          eyebrow: "An Honoured Invitation",
          details: "Event Schedule",
          ceremony: "Ceremony",
          reception: "Reception",
          closing: "We look forward to celebrating with you",
        };

  const entries: ScheduleEntry[] = [
    ...(hasCeremony
      ? [
          {
            eyebrow: "01",
            title: invitation.ceremony_title || t.ceremony,
            date: invitation.ceremony_date,
            time: invitation.ceremony_time,
            venue: invitation.ceremony_venue,
            mapUrl: invitation.ceremony_map_url,
          },
        ]
      : []),
    {
      eyebrow: hasCeremony ? "02" : "01",
      title: t.reception,
      date: invitation.event_date,
      time: invitation.event_time,
      venue: invitation.venue,
      mapUrl: invitation.reception_map_url,
    },
  ];

  return (
    <CardShell backgroundColor="var(--theme-secondary)">
      <PhotoHero
        coverImageUrl={invitation.cover_image_url}
        alt={heroTitle}
        ornament="geometric"
        heightClassName="h-[42vw] max-h-[440px] min-h-[320px]"
        primaryColor="var(--theme-primary)"
        accentColor="var(--theme-accent)"
        monogramText={coupleInitials(invitation.bride_name, invitation.groom_name, "SEP")}
      >
        <div className="absolute inset-x-0 bottom-0 px-6 pb-9 text-center sm:px-10 sm:pb-11">
          <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: "var(--theme-accent)" }}>
            {t.eyebrow}
          </p>
          <h1
            className="mt-3 font-serif font-black leading-[1.02] tracking-tight text-white"
            style={{ fontSize: heroNameFontSize(heroTitle) }}
          >
            {heroTitle}
          </h1>
        </div>
      </PhotoHero>

      <section className="px-5 pb-9 pt-8 sm:px-10 sm:pb-12">
        <div className="mx-auto max-w-xl text-center">
          <p className="whitespace-pre-line text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {displayedMessage}
          </p>
          <div className="mx-auto my-5 flex items-center justify-center gap-3">
            <span className="h-px w-10" style={{ backgroundColor: "var(--theme-accent)" }} />
            <span className="h-2 w-2 rotate-45" style={{ backgroundColor: "var(--theme-accent)" }} />
            <span className="h-px w-10" style={{ backgroundColor: "var(--theme-accent)" }} />
          </div>
          <h2 className="font-serif text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{invitation.guest_name}</h2>
        </div>

        <div className="mt-8 flex justify-center">
          <DateBadge
            date={invitation.event_date}
            language={language}
            shape="square"
            primaryColor="var(--theme-primary)"
            accentColor="var(--theme-accent)"
          />
        </div>

        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-black/10" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t.details}</p>
          <div className="h-px flex-1 bg-black/10" />
        </div>

        <ScheduleGrid entries={entries} language={language} primaryColor="var(--theme-primary)" accentColor="var(--theme-accent)" />

        {invitation.dress_code && (
          <section className="mt-3 flex items-center justify-between gap-4 px-5 py-5 text-white" style={{ backgroundColor: "var(--theme-primary)" }}>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/55">
                {language === "sw" ? "Mavazi" : "Dress Code"}
              </p>
              <p className="mt-1 font-serif text-xl font-bold">{invitation.dress_code}</p>
            </div>
            <div className="flex gap-2">
              <span className="h-7 w-7 rounded-full border border-white/30" style={{ backgroundColor: "var(--theme-accent)" }} />
              <span className="h-7 w-7 rounded-full border border-white/30" style={{ backgroundColor: "var(--theme-secondary)" }} />
            </div>
          </section>
        )}

        <div className="mt-8">
          <Countdown
            eventDate={invitation.event_date}
            eventTime={invitation.event_time}
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
            boxClassName="bg-white"
          />

          <RsvpButtons
            invitationToken={invitation.invitation_token}
            currentStatus={invitation.rsvp_status}
            language={language}
            variant="editorial"
          />

          <EventPass
            guestName={invitation.guest_name}
            qrToken={invitation.qr_token}
            eventPassId={invitation.event_pass_id}
            allowedGuests={invitation.allowed_guests}
            category={invitation.category}
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
            boxClassName="bg-white"
          />

          <WishForm invitationToken={invitation.invitation_token} guestName={invitation.guest_name} language={language} />
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-white sm:px-10" style={{ backgroundColor: "var(--theme-primary)" }}>
        <p className="font-serif text-xl">{t.closing}</p>
        <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">Smart Event Pass</p>
      </footer>
    </CardShell>
  );
}
