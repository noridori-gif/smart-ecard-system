import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";
import CardShell from "./shared/CardShell";
import DateBadge from "./shared/DateBadge";
import DressCodeSwatches from "./shared/DressCodeSwatches";
import PhotoHero from "./shared/PhotoHero";
import ScheduleGrid, { type ScheduleEntry } from "./shared/ScheduleGrid";
import { coupleInitials, heroNameFontSize } from "./shared/formatters";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";

type ModernMinimalPhotoProps = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: Language;
};

export default function ModernMinimalPhoto({ invitation, heroTitle, displayedMessage, language }: ModernMinimalPhotoProps) {
  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);

  const t =
    language === "sw"
      ? {
          eyebrow: "Mwaliko",
          details: "Ratiba",
          ceremony: "Ibada",
          reception: "Mapokezi",
          closing: "Asante kwa kuwa nasi",
        }
      : {
          eyebrow: "Invitation",
          details: "Schedule",
          ceremony: "Ceremony",
          reception: "Reception",
          closing: "Thank you for being with us",
        };

  const entries: ScheduleEntry[] = [
    ...(hasCeremony
      ? [
          {
            eyebrow: t.ceremony,
            title: invitation.ceremony_title || t.ceremony,
            date: invitation.ceremony_date,
            time: invitation.ceremony_time,
            venue: invitation.ceremony_venue,
            mapUrl: invitation.ceremony_map_url,
          },
        ]
      : []),
    {
      eyebrow: t.reception,
      title: t.reception,
      date: invitation.event_date,
      time: invitation.event_time,
      venue: invitation.venue,
      mapUrl: invitation.reception_map_url,
    },
  ];

  const monogramText = coupleInitials(invitation.bride_name, invitation.groom_name, "SEP");

  const heroTextBlock = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-slate-400">{t.eyebrow}</p>

      <h1
        className="mt-5 font-serif font-light leading-tight text-slate-950"
        style={{ fontSize: heroNameFontSize(heroTitle) }}
      >
        {heroTitle}
      </h1>

      <div className="mt-8 flex justify-center">
        <DateBadge
          date={invitation.event_date}
          language={language}
          shape="square"
          primaryColor="var(--theme-primary)"
          accentColor="var(--theme-accent)"
        />
      </div>
    </>
  );

  const contentBody = (
    <>
      <p className="mx-auto mt-8 max-w-md whitespace-pre-line text-sm leading-7 text-slate-500 sm:text-base">
        {displayedMessage}
      </p>

      <p className="mx-auto mt-8 max-w-xs text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {invitation.guest_name}
      </p>

      <div className="mx-auto my-12 h-px w-10 bg-slate-200" />

      <div className="mx-auto max-w-md text-left">
        <ScheduleGrid entries={entries} language={language} primaryColor="var(--theme-primary)" accentColor="var(--theme-accent)" />
      </div>

      <DressCodeSwatches
        dressCode={invitation.dress_code}
        language={language}
        primaryColor="var(--theme-primary)"
        secondaryColor="var(--theme-secondary)"
        accentColor="var(--theme-accent)"
        className="mx-auto mt-10 max-w-md text-left"
      />

      <div className="mx-auto mt-10 max-w-md text-left">
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
    <footer className="border-t border-slate-100 px-5 py-7 text-center sm:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{t.closing}</p>
      <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.3em] text-slate-300">Smart Event Pass</p>
    </footer>
  );

  return (
    <CardShell backgroundColor="var(--theme-secondary)">
      <PhotoHero
        coverImageUrl={invitation.cover_image_url}
        alt={heroTitle}
        overlay={false}
        heightClassName="h-[40vw] max-h-[420px] min-h-[300px]"
        primaryColor="var(--theme-primary)"
        accentColor="var(--theme-accent)"
        monogramText={monogramText}
      />

      <section className="px-6 pb-10 pt-10 text-center sm:px-14 sm:pb-14 sm:pt-14">
        {heroTextBlock}
        {contentBody}
      </section>

      {footer}
    </CardShell>
  );
}
