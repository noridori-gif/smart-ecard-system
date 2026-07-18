import Countdown from "@/components/invitation/Countdown";
import EventPass from "@/components/invitation/EventPass";
import RsvpButtons from "@/components/invitation/RsvpButtons";
import WishForm from "@/components/invitation/WishForm";

import type { PublicInvitation } from "@/services/invitationService";

type Language = "sw" | "en";

type ClassicPhotoProps = {
  invitation: PublicInvitation;
  heroTitle: string;
  displayedMessage: string;
  language: Language;
};

type ScheduleProps = {
  eyebrow: string;
  title: string;
  date: string | null;
  time: string | null;
  venue: string | null;
  mapUrl: string | null;
  language: Language;
};

function formatDate(
  date: string | null,
  language: Language
) {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(
    `${date}T00:00:00`
  );

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return date;
  }

  return new Intl.DateTimeFormat(
    language === "sw"
      ? "sw-TZ"
      : "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(parsedDate);
}

function formatTime(
  time: string | null,
  language: Language
) {
  if (!time) {
    return "—";
  }

  const [
    hours,
    minutes,
  ] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return time;
  }

  return new Intl.DateTimeFormat(
    language === "sw"
      ? "sw-TZ"
      : "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  ).format(
    new Date(
      2026,
      0,
      1,
      hours,
      minutes
    )
  );
}

function Schedule({
  eyebrow,
  title,
  date,
  time,
  venue,
  mapUrl,
  language,
}: ScheduleProps) {
  return (
    <article className="border-t border-black/10 py-6 first:border-t-0 sm:grid sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-6">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-[var(--theme-primary)] sm:mb-0">
        {eyebrow}
      </p>

      <div>
        <h3 className="font-serif text-2xl leading-tight text-slate-950 sm:text-3xl">
          {title}
        </h3>

        <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {language === "sw"
                ? "Tarehe"
                : "Date"}
            </span>

            <span className="mt-1 block font-semibold">
              {formatDate(
                date,
                language
              )}
            </span>
          </p>

          <p>
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {language === "sw"
                ? "Muda"
                : "Time"}
            </span>

            <span className="mt-1 block font-semibold">
              {formatTime(
                time,
                language
              )}
            </span>
          </p>

          <p className="sm:col-span-2">
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {language === "sw"
                ? "Mahali"
                : "Venue"}
            </span>

            <span className="mt-1 block font-semibold">
              {venue || "—"}
            </span>
          </p>
        </div>

        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 border-b-2 border-[var(--theme-primary)] pb-1 text-xs font-black uppercase tracking-[0.14em] text-[var(--theme-primary)]"
          >
            <span>⌖</span>

            {language === "sw"
              ? "Fungua Ramani"
              : "Open Map"}
          </a>
        )}
      </div>
    </article>
  );
}

export default function ClassicPhoto({
  invitation,
  heroTitle,
  displayedMessage,
  language,
}: ClassicPhotoProps) {
  const hasCeremony =
    Boolean(
      invitation.ceremony_date ||
        invitation.ceremony_time ||
        invitation.ceremony_venue
    );

  const translation =
    language === "sw"
      ? {
          invitation:
            "Mwaliko Maalumu",

          invitationFor:
            "Kwa heshima tunamwalika",

          details:
            "Ratiba ya Tukio",

          ceremony:
            "Ibada",

          reception:
            "Mapokezi / Sherehe",

          dress:
            "Mavazi",

          closing:
            "Tunatarajia kusherehekea pamoja nawe",
        }
      : {
          invitation:
            "A Special Invitation",

          invitationFor:
            "With pleasure, we invite",

          details:
            "Event Schedule",

          ceremony:
            "Ceremony",

          reception:
            "Reception",

          dress:
            "Dress Code",

          closing:
            "We look forward to celebrating with you",
        };

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden bg-[#f7f4ee] shadow-[0_28px_90px_rgba(15,23,42,0.25)] sm:rounded-[2rem]">
      <header className="relative min-h-[620px] overflow-hidden bg-slate-900 sm:min-h-[720px]">
        {invitation.cover_image_url ? (
          <img
            src={
              invitation.cover_image_url
            }
            alt={heroTitle}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(145deg,var(--theme-primary),#0f172a_70%)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/85" />

        <div className="absolute inset-x-5 top-5 flex items-center justify-between border-b border-white/45 pb-4 text-[9px] font-bold uppercase tracking-[0.25em] text-white sm:inset-x-8 sm:top-8">
          <span>
            Smart Event Pass
          </span>

          <span>
            {
              translation.invitation
            }
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-9 text-white sm:px-10 sm:pb-12">
          <div className="mb-5 h-1 w-14 bg-[var(--theme-accent)]" />

          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/75">
            {
              invitation.event_title
            }
          </p>

          <h1 className="mt-3 max-w-xl font-serif text-5xl leading-[0.95] tracking-tight sm:text-7xl">
            {heroTitle}
          </h1>

          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
            {formatDate(
              invitation.event_date,
              language
            )}
          </p>
        </div>
      </header>

      <section className="px-5 py-9 sm:px-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-[0.85fr_1.5fr] sm:gap-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--theme-primary)]">
              {
                translation
                  .invitationFor
              }
            </p>

            <h2 className="mt-3 font-serif text-3xl leading-tight text-slate-950 sm:text-4xl">
              {
                invitation.guest_name
              }
            </h2>
          </div>

          <p className="whitespace-pre-line border-l-2 border-[var(--theme-accent)] pl-5 text-base leading-8 text-slate-600 sm:text-lg">
            {displayedMessage}
          </p>
        </div>

        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-black/10" />

          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            {
              translation.details
            }
          </p>

          <div className="h-px flex-1 bg-black/10" />
        </div>

        <div>
          {hasCeremony && (
            <Schedule
              eyebrow="01"
              title={
                invitation
                  .ceremony_title ||
                translation.ceremony
              }
              date={
                invitation
                  .ceremony_date
              }
              time={
                invitation
                  .ceremony_time
              }
              venue={
                invitation
                  .ceremony_venue
              }
              mapUrl={
                invitation
                  .ceremony_map_url
              }
              language={language}
            />
          )}

          <Schedule
            eyebrow={
              hasCeremony
                ? "02"
                : "01"
            }
            title={
              translation.reception
            }
            date={
              invitation.event_date
            }
            time={
              invitation.event_time
            }
            venue={
              invitation.venue
            }
            mapUrl={
              invitation
                .reception_map_url
            }
            language={language}
          />
        </div>

        {invitation.dress_code && (
          <section className="mt-3 flex items-center justify-between gap-4 bg-slate-950 px-5 py-5 text-white">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/55">
                {
                  translation.dress
                }
              </p>

              <p className="mt-1 font-serif text-xl">
                {
                  invitation
                    .dress_code
                }
              </p>
            </div>

            <div className="flex gap-2">
              <span className="h-7 w-7 rounded-full border border-white/30 bg-[var(--theme-primary)]" />

              <span className="h-7 w-7 rounded-full border border-white/30 bg-[var(--theme-accent)]" />
            </div>
          </section>
        )}

        <div className="mt-8">
          <Countdown
            eventDate={
              invitation.event_date
            }
            eventTime={
              invitation.event_time
            }
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
            boxClassName="bg-white"
          />

          <RsvpButtons
            invitationToken={
              invitation
                .invitation_token
            }
            currentStatus={
              invitation.rsvp_status
            }
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
          />

          <EventPass
            guestName={
              invitation.guest_name
            }
            qrToken={
              invitation.qr_token
            }
            eventPassId={
              invitation.event_pass_id
            }
            allowedGuests={
              invitation
                .allowed_guests
            }
            category={
              invitation.category
            }
            language={language}
            accentTextClass="text-[var(--theme-primary)]"
            boxClassName="bg-white"
          />

          <WishForm
            invitationToken={
              invitation
                .invitation_token
            }
            guestName={
              invitation.guest_name
            }
            language={language}
          />
        </div>
      </section>

      <footer className="bg-[var(--theme-primary)] px-5 py-8 text-center text-white sm:px-10">
        <p className="font-serif text-xl">
          {
            translation.closing
          }
        </p>

        <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.3em] text-white/60">
          Smart Event Pass
        </p>
      </footer>
    </div>
  );
}