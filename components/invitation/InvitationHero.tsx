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
      <section className="relative h-[350px] overflow-hidden bg-slate-950 text-center text-white sm:h-[430px]">
        {/* Background inayojaza nafasi */}
        <img
          src={coverImageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-lg"
        />

        {/* Picha kamili bila kukata watu */}
        <img
          src={coverImageUrl}
          alt={eventTitle}
          className="absolute inset-0 h-full w-full object-contain object-center"
        />

        {/* Overlay ya kufanya maandishi yaonekane */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-5 pb-7 sm:px-8 sm:pb-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl shadow-lg backdrop-blur-sm">
            {icon}
          </div>

          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white">
            {invitationLabel}
          </p>

          <h1 className="mt-2 max-w-lg text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl">
            {heroTitle}
          </h1>

          <p className="mt-2 text-sm font-semibold text-white sm:text-base">
            {eventLabel}
          </p>

          {heroTitle !==
            eventTitle && (
            <p className="mt-1 max-w-md truncate text-xs text-white/80 sm:text-sm">
              {eventTitle}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden px-5 py-10 text-center text-white sm:px-8 sm:py-12 ${heroBackground}`}
    >
      <div className="absolute -left-12 -top-12 h-36 w-36 rounded-full bg-white/10" />

      <div className="absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-white/10" />

      <div className="relative flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl shadow-lg">
          {icon}
        </div>

        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white">
          {invitationLabel}
        </p>

        <h1 className="mt-3 max-w-lg text-3xl font-bold leading-tight sm:text-4xl">
          {heroTitle}
        </h1>

        <p className="mt-2 text-sm font-semibold text-white/95 sm:text-base">
          {eventLabel}
        </p>

        {heroTitle !==
          eventTitle && (
          <p className="mt-1 max-w-md text-xs text-white/80 sm:text-sm">
            {eventTitle}
          </p>
        )}
      </div>
    </section>
  );
}