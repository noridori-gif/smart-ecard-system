import { notFound } from "next/navigation";
import { getInvitationByToken } from "@/services/invitationService";
import Countdown from "@/components/invitation/Countdown";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

type InvitationTheme = {
  icon: string;
  invitationLabel: string;
  eventLabel: string;
  message: string;
  pageBackground: string;
  heroBackground: string;
  accentText: string;
  detailBackground: string;
  guestBoxStyle: string;
  statusStyle: string;
};

function getInvitationTheme(eventType: string): InvitationTheme {
  const normalizedType = eventType.trim().toLowerCase();

  if (
    normalizedType === "wedding" ||
    normalizedType.includes("harusi")
  ) {
    return {
      icon: "💍",
      invitationLabel: "You Are Invited",
      eventLabel: "Wedding Celebration",
      message:
        "Together with their families, they warmly invite you to celebrate their special day. Your presence will make this occasion truly memorable.",
      pageBackground:
        "bg-gradient-to-br from-rose-100 via-white to-amber-100",
      heroBackground:
        "bg-gradient-to-r from-rose-600 via-pink-500 to-amber-400",
      accentText: "text-rose-700",
      detailBackground: "bg-rose-50",
      guestBoxStyle: "border-rose-200 bg-rose-50",
      statusStyle: "bg-rose-100 text-rose-700",
    };
  }

  if (
    normalizedType === "send-off" ||
    normalizedType === "sendoff" ||
    normalizedType.includes("send")
  ) {
    return {
      icon: "✨",
      invitationLabel: "Special Invitation",
      eventLabel: "Send-Off Ceremony",
      message:
        "We warmly invite you to join us as we celebrate this beautiful and important occasion. Your presence will bring joy and make the day even more special.",
      pageBackground:
        "bg-gradient-to-br from-orange-100 via-white to-yellow-100",
      heroBackground:
        "bg-gradient-to-r from-orange-600 via-rose-500 to-amber-400",
      accentText: "text-orange-700",
      detailBackground: "bg-orange-50",
      guestBoxStyle: "border-amber-300 bg-amber-50",
      statusStyle: "bg-orange-100 text-orange-700",
    };
  }

  if (
    normalizedType === "birthday" ||
    normalizedType.includes("birthday")
  ) {
    return {
      icon: "🎂",
      invitationLabel: "Come Celebrate With Us",
      eventLabel: "Birthday Celebration",
      message:
        "Join us for a joyful birthday celebration filled with happiness, laughter and wonderful memories. We would be delighted to celebrate with you.",
      pageBackground:
        "bg-gradient-to-br from-purple-100 via-white to-pink-100",
      heroBackground:
        "bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500",
      accentText: "text-purple-700",
      detailBackground: "bg-purple-50",
      guestBoxStyle: "border-purple-200 bg-purple-50",
      statusStyle: "bg-purple-100 text-purple-700",
    };
  }

  if (
    normalizedType === "corporate" ||
    normalizedType.includes("conference") ||
    normalizedType.includes("seminar") ||
    normalizedType.includes("business")
  ) {
    return {
      icon: "💼",
      invitationLabel: "Official Invitation",
      eventLabel: "Corporate Event",
      message:
        "You are formally invited to attend this important event. We look forward to welcoming you and sharing a valuable and memorable experience.",
      pageBackground:
        "bg-gradient-to-br from-slate-200 via-white to-blue-100",
      heroBackground:
        "bg-gradient-to-r from-slate-900 via-blue-800 to-blue-600",
      accentText: "text-blue-800",
      detailBackground: "bg-blue-50",
      guestBoxStyle: "border-blue-200 bg-blue-50",
      statusStyle: "bg-blue-100 text-blue-700",
    };
  }

  if (
    normalizedType === "graduation" ||
    normalizedType.includes("graduation")
  ) {
    return {
      icon: "🎓",
      invitationLabel: "You Are Invited",
      eventLabel: "Graduation Celebration",
      message:
        "Join us as we celebrate this remarkable achievement and an exciting new chapter. Your presence will make this milestone even more meaningful.",
      pageBackground:
        "bg-gradient-to-br from-indigo-100 via-white to-amber-100",
      heroBackground:
        "bg-gradient-to-r from-indigo-800 via-indigo-600 to-amber-500",
      accentText: "text-indigo-700",
      detailBackground: "bg-indigo-50",
      guestBoxStyle: "border-indigo-200 bg-indigo-50",
      statusStyle: "bg-indigo-100 text-indigo-700",
    };
  }

  return {
    icon: "🎉",
    invitationLabel: "You Are Invited",
    eventLabel: "Special Event",
    message:
      "We warmly invite you to join us for this special occasion. Your presence will make the event even more meaningful and memorable.",
    pageBackground:
      "bg-gradient-to-br from-slate-100 via-white to-blue-100",
    heroBackground:
      "bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500",
    accentText: "text-blue-700",
    detailBackground: "bg-slate-50",
    guestBoxStyle: "border-blue-200 bg-blue-50",
    statusStyle: "bg-blue-100 text-blue-700",
  };
}

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  const theme = getInvitationTheme(invitation.event_type);

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${invitation.event_date}T00:00:00`));

  const formattedTime = invitation.event_time
    ? invitation.event_time.slice(0, 5)
    : "Time to be confirmed";

  const normalizedEventType = invitation.event_type
    .trim()
    .toLowerCase();

  const isWedding =
    normalizedEventType === "wedding" ||
    normalizedEventType.includes("harusi");

  const isSendOff =
    normalizedEventType === "send-off" ||
    normalizedEventType === "sendoff" ||
    normalizedEventType.includes("send");

  const heroTitle =
    isWedding && invitation.bride_name && invitation.groom_name
      ? `${invitation.groom_name} & ${invitation.bride_name}`
      : isSendOff && invitation.bride_name
        ? invitation.bride_name
        : invitation.event_title;

  return (
    <main
      className={`min-h-screen px-4 py-8 sm:py-12 ${theme.pageBackground}`}
    >
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <section
          className={`relative overflow-hidden px-6 py-14 text-center text-white sm:px-10 sm:py-16 ${theme.heroBackground}`}
        >
          <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -right-12 h-52 w-52 rounded-full bg-white/10" />

          <div className="relative">
            <div className="text-5xl">{theme.icon}</div>

            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.3em] text-white/90">
              {theme.invitationLabel}
            </p>

            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
              {heroTitle}
            </h1>

            <p className="mt-4 text-lg font-medium text-white/90">
              {theme.eventLabel}
            </p>

            {heroTitle !== invitation.event_title && (
              <p className="mt-2 text-base text-white/80">
                {invitation.event_title}
              </p>
            )}
          </div>
        </section>

        <section className="px-6 py-10 sm:px-12 sm:py-12">
          <div
            className={`rounded-2xl border p-6 text-center ${theme.guestBoxStyle}`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
              Special Invitation For
            </p>

            <h2
              className={`mt-3 text-3xl font-bold sm:text-4xl ${theme.accentText}`}
            >
              {invitation.guest_name}
            </h2>
          </div>

          <p className="mx-auto mt-7 max-w-lg text-center text-base leading-7 text-slate-600">
            {theme.message}
          </p>

          <div className="my-9 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className={`text-2xl ${theme.accentText}`}>
              ✦
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div
              className={`rounded-2xl p-6 text-center ${theme.detailBackground}`}
            >
              <div className="text-2xl">📅</div>

              <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Date
              </p>

              <p className="mt-2 font-semibold leading-6 text-slate-900">
                {formattedDate}
              </p>
            </div>

            <div
              className={`rounded-2xl p-6 text-center ${theme.detailBackground}`}
            >
              <div className="text-2xl">🕒</div>

              <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Time
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {formattedTime}
              </p>
            </div>

            <div
              className={`rounded-2xl p-6 text-center sm:col-span-2 ${theme.detailBackground}`}
            >
              <div className="text-2xl">📍</div>

              <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Venue
              </p>

              <p className="mt-2 text-lg font-semibold text-slate-900">
                {invitation.venue}
              </p>
            </div>
          </div>

          <Countdown
            eventDate={invitation.event_date}
            eventTime={invitation.event_time}
            accentTextClass={theme.accentText}
            boxClassName={theme.detailBackground}
          />

          <div
            className={`mt-7 rounded-2xl border p-6 text-center ${theme.guestBoxStyle}`}
          >
            <p className="text-sm text-slate-600">
              This invitation admits
            </p>

            <p className={`mt-2 text-3xl font-bold ${theme.accentText}`}>
              {invitation.allowed_guests}{" "}
              {invitation.allowed_guests === 1
                ? "Guest"
                : "Guests"}
            </p>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-slate-500">
              RSVP Status
            </p>

            <span
              className={`mt-3 inline-flex rounded-full px-5 py-2 text-sm font-bold capitalize ${theme.statusStyle}`}
            >
              {invitation.rsvp_status}
            </span>
          </div>

          <div className="mt-10 border-t border-slate-100 pt-7 text-center">
            <p className="text-sm font-semibold text-slate-500">
              Smart Event Pass
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Your invitation. Your moment.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}