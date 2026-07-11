type InvitationHeroProps = {
  icon: string;
  invitationLabel: string;
  heroTitle: string;
  eventLabel: string;
  eventTitle: string;
  heroBackground: string;
  coverImageUrl?: string | null;
};

export default function InvitationHero({
  icon,
  invitationLabel,
  heroTitle,
  eventLabel,
  eventTitle,
  heroBackground,
  coverImageUrl,
}: InvitationHeroProps) {
  if (coverImageUrl) {
    return (
      <section className="relative min-h-[420px] overflow-hidden text-center text-white sm:min-h-[500px]">
        <img
          src={coverImageUrl}
          alt={eventTitle}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

        <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -right-12 h-52 w-52 rounded-full bg-white/10" />

        <div className="relative flex min-h-[420px] flex-col items-center justify-end px-6 pb-12 pt-20 sm:min-h-[500px] sm:px-10 sm:pb-16">
          <div className="text-5xl drop-shadow-lg">
            {icon}
          </div>

          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.3em] text-white/90 drop-shadow">
            {invitationLabel}
          </p>

          <h1 className="mt-5 text-4xl font-bold leading-tight drop-shadow-lg sm:text-5xl">
            {heroTitle}
          </h1>

          <p className="mt-4 text-lg font-medium text-white/90 drop-shadow">
            {eventLabel}
          </p>

          {heroTitle !== eventTitle && (
            <p className="mt-2 text-base text-white/80 drop-shadow">
              {eventTitle}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden px-6 py-14 text-center text-white sm:px-10 sm:py-16 ${heroBackground}`}
    >
      <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-16 -right-12 h-52 w-52 rounded-full bg-white/10" />

      <div className="relative">
        <div className="text-5xl">
          {icon}
        </div>

        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.3em] text-white/90">
          {invitationLabel}
        </p>

        <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
          {heroTitle}
        </h1>

        <p className="mt-4 text-lg font-medium text-white/90">
          {eventLabel}
        </p>

        {heroTitle !== eventTitle && (
          <p className="mt-2 text-base text-white/80">
            {eventTitle}
          </p>
        )}
      </div>
    </section>
  );
}