import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";
import CardShell from "./shared/CardShell";
import DressCodeSwatches from "./shared/DressCodeSwatches";
import PhotoHero from "./shared/PhotoHero";
import ScheduleGrid, { type ScheduleEntry } from "./shared/ScheduleGrid";
import SideBySidePhoto from "./shared/SideBySidePhoto";
import TextOnlyHero from "./shared/TextOnlyHero";
import { coupleInitials, heroNameFontSize } from "./shared/formatters";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";

type BotanicalRomanceProps = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: Language;
};

export default function BotanicalRomance({ invitation, heroTitle, displayedMessage, language }: BotanicalRomanceProps) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);

  const t =
    language === "sw"
      ? {
          eyebrow: "Kwa Upendo, Tunakualika",
          details: "Ratiba ya Tukio",
          ceremony: "Ibada",
          reception: "Mapokezi / Sherehe",
          closing: "Tunatarajia kusherehekea pamoja nawe",
        }
      : {
          eyebrow: "With Love, We Invite You",
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

  const layout = invitation.photo_layout;
  const monogramText = coupleInitials(invitation.bride_name, invitation.groom_name, "SEP");

  const heroTextBlock = (
    <div className={layout === "side_by_side" ? "text-center sm:text-left" : "text-center"}>
      <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: "var(--theme-accent)" }}>
        {t.eyebrow}
      </p>

      <h1
        className="font-script mt-4 leading-tight"
        style={{ color: "var(--theme-primary)", fontSize: heroNameFontSize(heroTitle) }}
      >
        {heroTitle}
      </h1>
    </div>
  );

  const contentBody = (
    <>
      <div className="mx-auto my-6 h-px w-20" style={{ backgroundColor: "var(--theme-accent)" }} />

      <div className="mx-auto max-w-xl">
        <p className="whitespace-pre-line text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          {displayedMessage}
        </p>
        <h2 className="mt-6 font-serif text-2xl leading-tight text-slate-950 sm:text-3xl">{invitation.guest_name}</h2>
      </div>

      <div className="my-10 flex items-center gap-4">
        <div className="h-px flex-1 bg-black/10" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t.details}</p>
        <div className="h-px flex-1 bg-black/10" />
      </div>

      <div className="text-left">
        <ScheduleGrid entries={entries} language={language} primaryColor="var(--theme-primary)" accentColor="var(--theme-accent)" />
      </div>

      <DressCodeSwatches
        dressCode={invitation.dress_code}
        language={language}
        primaryColor="var(--theme-primary)"
        secondaryColor="var(--theme-secondary)"
        accentColor="var(--theme-accent)"
        className="mt-8 rounded-2xl bg-black/[0.03] px-5 py-5 text-left"
      />

      <div className="mt-8 text-left">
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

  if (layout === "side_by_side") {
    return (
      <CardShell backgroundColor="var(--theme-secondary)">
        <SideBySidePhoto
          coverImageUrl={invitation.cover_image_url}
          alt={heroTitle}
          ornament="botanical"
          primaryColor="var(--theme-primary)"
          accentColor="var(--theme-accent)"
          blendColor="var(--theme-secondary)"
          monogramText={monogramText}
        >
          <div className="px-6 py-10 text-center sm:px-9 sm:py-12">
            {heroTextBlock}
            {contentBody}
          </div>
        </SideBySidePhoto>
        {footer}
      </CardShell>
    );
  }

  if (layout === "text_only") {
    return (
      <CardShell backgroundColor="var(--theme-secondary)">
        <TextOnlyHero
          eyebrow={t.eyebrow}
          heroTitle={heroTitle}
          titleClassName="font-script"
          titleStyle={{ color: "var(--theme-primary)", fontSize: heroNameFontSize(heroTitle) }}
          monogramText={monogramText}
          primaryColor="var(--theme-primary)"
          secondaryColor="var(--theme-secondary)"
          accentColor="var(--theme-accent)"
          ornament="botanical"
        />

        <section className="px-5 pb-9 pt-2 text-center sm:px-10 sm:pb-12">{contentBody}</section>

        {footer}
      </CardShell>
    );
  }

  return (
    <CardShell backgroundColor="var(--theme-secondary)">
      <PhotoHero
        coverImageUrl={invitation.cover_image_url}
        alt={heroTitle}
        ornament="botanical"
        heightClassName="h-[38vw] max-h-[400px] min-h-[280px]"
        primaryColor="var(--theme-primary)"
        accentColor="var(--theme-accent)"
        monogramText={monogramText}
      />

      <section className="px-5 pb-9 pt-8 text-center sm:px-10 sm:pb-12">
        {heroTextBlock}
        {contentBody}
      </section>

      {footer}
    </CardShell>
  );
}
