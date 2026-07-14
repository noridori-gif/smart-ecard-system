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
      <section className="relative min-h-[310px] overflow-hidden text-center text-white sm:min-h-[380px]">
        <img
          src={coverImageUrl}
          alt={eventTitle}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />

        <div className="relative flex min-h-[310px] flex-col items-center justify-end px-5 pb-6 pt-16 sm:min-h-[380px] sm:px-8 sm:pb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/20 text-xl shadow-lg backdrop-blur-sm">
            {icon}
          </div>

          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.28em] text-white/90 drop-shadow sm:text-xs">
            {invitationLabel}
          </p>

          <h1 className="mt-2 max-w-full break-words text-3xl font-bold leading-tight drop-shadow-lg sm:text-4xl">
            {heroTitle}
          </h1>

          <div className="mt-2 rounded-full border border-white/25 bg-black/20 px-4 py-1.5 backdrop-blur-sm">
            <p className="text-xs font-semibold text-white/95 sm:text-sm">
              {eventLabel}
            </p>
          </div>

          {heroTitle !== eventTitle && (
            <p className="mt-1.5 max-w-full truncate text-xs text-white/75 drop-shadow">
              {eventTitle}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden px-5 py-8 text-center text-white sm:px-8 sm:py-10 ${heroBackground}`}
    >
      <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-white/10" />

      <div className="absolute -bottom-16 -right-12 h-40 w-40 rounded-full bg-white/10" />

      <div className="relative">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-2xl">
          {icon}
        </div>

        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.28em] text-white/90 sm:text-xs">
          {invitationLabel}
        </p>

        <h1 className="mt-2 break-words text-3xl font-bold leading-tight sm:text-4xl">
          {heroTitle}
        </h1>

        <div className="mx-auto mt-3 inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1.5">
          <p className="text-xs font-semibold text-white/95 sm:text-sm">
            {eventLabel}
          </p>
        </div>

        {heroTitle !== eventTitle && (
          <p className="mt-2 truncate text-xs text-white/75">
            {eventTitle}
          </p>
        )}
      </div>
    </section>
  );
}