import { notFound } from "next/navigation";
import { getInvitationByToken } from "@/services/invitationService";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    notFound();
  }

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${invitation.event_date}T00:00:00`));

  const formattedTime = invitation.event_time
    ? invitation.event_time.slice(0, 5)
    : "";

  const coupleNames =
    invitation.bride_name && invitation.groom_name
      ? `${invitation.groom_name} & ${invitation.bride_name}`
      : invitation.event_title;

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="bg-gradient-to-r from-rose-500 to-amber-400 px-6 py-12 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.3em]">
            You Are Invited
          </p>

          <h1 className="mt-5 text-4xl font-bold md:text-5xl">
            {coupleNames}
          </h1>

          <p className="mt-4 text-lg text-white/90">
            {invitation.event_title}
          </p>
        </div>

        <div className="px-6 py-10 md:px-12">
          <p className="text-center text-sm uppercase tracking-[0.25em] text-slate-500">
            Special Invitation For
          </p>

          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900">
            {invitation.guest_name}
          </h2>

          <p className="mx-auto mt-5 max-w-lg text-center leading-7 text-slate-600">
            We warmly invite you to celebrate this special occasion with us.
            Your presence will make the event even more memorable.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Date
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {formattedDate}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Time
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {formattedTime}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 text-center sm:col-span-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Venue
              </p>

              <p className="mt-2 font-semibold text-slate-900">
                {invitation.venue}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
            <p className="text-sm text-amber-800">
              This invitation allows
            </p>

            <p className="mt-1 text-2xl font-bold text-amber-900">
              {invitation.allowed_guests}{" "}
              {invitation.allowed_guests === 1 ? "Guest" : "Guests"}
            </p>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              RSVP Status
            </p>

            <span className="mt-2 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold capitalize text-blue-700">
              {invitation.rsvp_status}
            </span>
          </div>

          <p className="mt-10 text-center text-sm text-slate-400">
            Smart Event Pass
          </p>
        </div>
      </div>
    </main>
  );
}