import { QRCodeSVG } from "qrcode.react";

import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";
import CardShell from "./shared/CardShell";
import DressCodeSwatches from "./shared/DressCodeSwatches";
import ScheduleGrid, { type ScheduleEntry } from "./shared/ScheduleGrid";

import type { CSSProperties } from "react";
import type { CustomLayoutElement } from "@/services/invitationLayoutService";
import type { PublicInvitation } from "@/services/invitationService";

// Matches lib/whatsappInvitationCard.tsx's CARD_WIDTH: the layout percentages
// are saved against that render width, so fontSize (stored in px at that
// width) is converted to container-query width units here to stay
// proportional at any on-screen size, same intent as the WhatsApp image.
const REFERENCE_WIDTH = 1080;

const DEFAULT_ELEMENTS: CustomLayoutElement[] = [
  { key: "guest_name", xPct: 6, yPct: 70, widthPct: 60, heightPct: 8, fontSize: 42, align: "left", color: "#FFFFFF" },
  { key: "venue", xPct: 6, yPct: 79, widthPct: 60, heightPct: 6, fontSize: 26, align: "left", color: "#FFFFFF" },
  { key: "datetime", xPct: 6, yPct: 86, widthPct: 60, heightPct: 6, fontSize: 26, align: "left", color: "#FFFFFF" },
  { key: "qr", xPct: 72, yPct: 70, widthPct: 22, heightPct: 22, fontSize: null, align: null, color: null },
];

type CustomProps = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: "sw" | "en";
};

function elementFor(elements: CustomLayoutElement[] | null, key: CustomLayoutElement["key"]) {
  return elements?.find((item) => item.key === key) ?? DEFAULT_ELEMENTS.find((item) => item.key === key)!;
}

function formatDate(dateValue: string, language: "sw" | "en") {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatTime(timeValue: string, language: "sw" | "en") {
  const [hoursValue, minutesValue] = timeValue.split(":");
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return timeValue;
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "sw-TZ", { hour: "2-digit", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes));
}

export default function Custom({ invitation, heroTitle, displayedMessage, language }: CustomProps) {
  const t =
    language === "sw"
      ? { eyebrow: "Mwaliko", details: "Ratiba ya Tukio", ceremony: "Ibada", reception: "Mapokezi / Sherehe", closing: "Tunatarajia kusherehekea pamoja nawe", noBackground: "Muundo wa mwaliko bado haujawekwa. Wasiliana na mwandaaji wa event." }
      : { eyebrow: "Invitation", details: "Event Schedule", ceremony: "Ceremony", reception: "Reception", closing: "We look forward to celebrating with you", noBackground: "The invitation design hasn't been uploaded yet. Please contact the event organizer." };

  const hasCeremony = Boolean(invitation.ceremony_date || invitation.ceremony_time || invitation.ceremony_venue);
  const entries: ScheduleEntry[] = [
    ...(hasCeremony ? [{ eyebrow: "01", title: invitation.ceremony_title || t.ceremony, date: invitation.ceremony_date, time: invitation.ceremony_time, venue: invitation.ceremony_venue, mapUrl: invitation.ceremony_map_url }] : []),
    { eyebrow: hasCeremony ? "02" : "01", title: t.reception, date: invitation.event_date, time: invitation.event_time, venue: invitation.venue, mapUrl: invitation.reception_map_url },
  ];

  const nameElement = elementFor(invitation.custom_layout_elements, "guest_name");
  const venueElement = elementFor(invitation.custom_layout_elements, "venue");
  const datetimeElement = elementFor(invitation.custom_layout_elements, "datetime");
  const qrElement = elementFor(invitation.custom_layout_elements, "qr");
  const datetimeText = [formatDate(invitation.event_date, language), formatTime(invitation.event_time, language)].filter(Boolean).join(" · ");

  return (
    <CardShell backgroundColor="var(--theme-secondary)">
      {invitation.custom_invitation_background_url ? (
        <div
          style={{ containerType: "inline-size" } as unknown as CSSProperties}
          className="relative w-full overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={invitation.custom_invitation_background_url} alt={heroTitle} className="block w-full" />

          <OverlayText element={nameElement} text={invitation.guest_name} />
          <OverlayText element={venueElement} text={invitation.venue} />
          <OverlayText element={datetimeElement} text={datetimeText} />

          <div
            className="absolute flex items-center justify-center rounded bg-white p-1"
            style={{ left: `${qrElement.xPct}%`, top: `${qrElement.yPct}%`, width: `${qrElement.widthPct}%`, height: `${qrElement.heightPct}%` }}
          >
            <QRCodeSVG value={invitation.qr_token} className="h-full w-full" />
          </div>
        </div>
      ) : (
        <div className="flex min-h-[280px] items-center justify-center px-8 text-center text-sm font-semibold text-slate-500">
          {t.noBackground}
        </div>
      )}

      <section className="px-5 py-9 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-script text-xl sm:text-2xl" style={{ color: "var(--theme-accent)" }}>{t.eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight text-slate-950 sm:text-5xl">{heroTitle}</h1>
          <p className="mt-6 whitespace-pre-line text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{displayedMessage}</p>
        </div>

        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-black/10" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t.details}</p>
          <div className="h-px flex-1 bg-black/10" />
        </div>

        <ScheduleGrid entries={entries} language={language} primaryColor="var(--theme-primary)" accentColor="var(--theme-accent)" />

        <DressCodeSwatches
          dressCode={invitation.dress_code}
          language={language}
          primaryColor="var(--theme-primary)"
          secondaryColor="var(--theme-secondary)"
          accentColor="var(--theme-accent)"
          className="mt-8 rounded-2xl bg-black/[0.03] px-5 py-5"
        />

        <div className="mt-8">
          <Countdown eventDate={invitation.event_date} eventTime={invitation.event_time} language={language} />
          <RsvpButtons invitationToken={invitation.invitation_token} currentStatus={invitation.rsvp_status} language={language} variant="editorial" />
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
      </section>

      <footer className="px-5 py-8 text-center text-white sm:px-10" style={{ backgroundColor: "var(--theme-primary)" }}>
        <p className="font-serif text-xl">{t.closing}</p>
        <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">Smart Event Pass</p>
      </footer>
    </CardShell>
  );
}

function OverlayText({ element, text }: { element: CustomLayoutElement; text: string }) {
  if (!text) return null;

  const align = element.align ?? "left";
  const justifyContent = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <div
      className="absolute flex items-center overflow-hidden"
      style={{
        left: `${element.xPct}%`,
        top: `${element.yPct}%`,
        width: `${element.widthPct}%`,
        height: `${element.heightPct}%`,
        justifyContent,
        textAlign: align,
        fontSize: `${((element.fontSize ?? 32) / REFERENCE_WIDTH) * 100}cqw`,
        color: element.color ?? "#FFFFFF",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}
