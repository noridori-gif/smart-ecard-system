import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";
import CardShell from "./shared/CardShell";
import DressCodeSwatches from "./shared/DressCodeSwatches";
import PhotoHero from "./shared/PhotoHero";
import ScheduleGrid, { type ScheduleEntry } from "./shared/ScheduleGrid";
import { coupleInitials, formatEventDate, heroNameFontSize } from "./shared/formatters";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";

type GoldenEleganceProps = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: Language;
};

export default function GoldenElegance({ invitation, heroTitle, displayedMessage, language }: GoldenEleganceProps) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);

  const t =
    language === "sw"
      ? {
          heading: "MWALIKO WA HARUSI",
          details: "Ratiba ya Tukio",
          ceremony: "Ibada",
          reception: "Mapokezi / Sherehe",
          closing: "Tunatarajia kusherehekea pamoja nawe",
        }
      : {
          heading: "WEDDING INVITATION",
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

  const monogramText = coupleInitials(invitation.bride_name, invitation.groom_name, "SEP");

  const heroTextBlockDark = (
    <div className="text-center sm:text-left">
      <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: "var(--theme-accent)" }}>
        {t.heading}
      </p>
      <h1
        className="mt-3 font-serif leading-[1.02] tracking-tight text-slate-950"
        style={{ fontSize: heroNameFontSize(heroTitle) }}
      >
        {heroTitle}
      </h1>
      <div className="mt-4 flex items-center justify-center gap-3 sm:justify-start">
        <span className="h-px w-9" style={{ backgroundColor: "var(--theme-accent)" }} />
        <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: "var(--theme-accent)" }} />
        <span className="h-px w-9" style={{ backgroundColor: "var(--theme-accent)" }} />
      </div>
    </div>
  );

  const contentBody = (
    <>
      <div className="mx-auto max-w-xl text-center">
        <p className="font-script text-xl sm:text-2xl" style={{ color: "var(--theme-accent)" }}>
          {language === "sw" ? "Kwa heshima ya" : "In honour of"}
        </p>
        <h2 className="mt-2 font-serif text-3xl leading-tight text-slate-950 sm:text-4xl">{invitation.guest_name}</h2>
        <p className="mt-5 whitespace-pre-line text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          {displayedMessage}
        </p>
      </div>

      <div className="my-10 flex items-center gap-4">
        <div className="h-px flex-1" style={{ backgroundColor: "color-mix(in srgb, var(--theme-accent) 45%, transparent)" }} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: "var(--theme-primary)" }}>{t.details}</p>
        <div className="h-px flex-1" style={{ backgroundColor: "color-mix(in srgb, var(--theme-accent) 45%, transparent)" }} />
      </div>

      <ScheduleGrid entries={entries} language={language} primaryColor="var(--theme-primary)" accentColor="var(--theme-accent)" />

      <DressCodeSwatches
        dressCode={invitation.dress_code}
        language={language}
        primaryColor="var(--theme-primary)"
        secondaryColor="var(--theme-secondary)"
        accentColor="var(--theme-accent)"
        className="mt-8 border-y py-5"
      />

      <div className="mt-8">
        <Countdown
          eventDate={invitation.event_date}
          eventTime={invitation.event_time}
          language={language}
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
        />

        <div className="mt-10"><WishForm invitationToken={invitation.invitation_token} guestName={invitation.guest_name} language={language} /></div>
      </div>
    </>
  );

  const footer = (
    <footer className="px-5 py-8 text-center text-white sm:px-10" style={{ backgroundColor: "var(--theme-primary)" }}>
      <p className="font-serif text-xl">{t.closing}</p>
      <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">Smart Event Pass</p>
    </footer>
  );

  return (
    <CardShell backgroundColor="var(--theme-secondary)">
      <PhotoHero
        coverImageUrl={invitation.cover_image_url}
        alt={heroTitle}
        treatment="duotone"
        heightClassName="h-[44vw] max-h-[500px] min-h-[340px]"
        primaryColor="var(--theme-primary)"
        accentColor="var(--theme-accent)"
        monogramText={monogramText}
      >
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-6 text-[9px] font-bold uppercase tracking-[0.3em] text-white/85 sm:px-10 sm:pt-8">
          <span>Smart Event Pass</span>
          <span>{formatEventDate(invitation.event_date, language)}</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-6 pb-8 sm:px-10 sm:pb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">{t.heading}</p>
          <h1
            className="mt-3 font-serif leading-[1.02] tracking-tight text-white"
            style={{ color: "var(--theme-accent)", fontSize: heroNameFontSize(heroTitle) }}
          >
            {heroTitle}
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-px w-9" style={{ backgroundColor: "var(--theme-accent)" }} />
            <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: "var(--theme-accent)" }} />
            <span className="h-px w-9" style={{ backgroundColor: "var(--theme-accent)" }} />
          </div>
        </div>
      </PhotoHero>

      <section className="px-5 pb-9 pt-9 sm:px-10 sm:pb-12">{contentBody}</section>

      {footer}
    </CardShell>
  );
}
