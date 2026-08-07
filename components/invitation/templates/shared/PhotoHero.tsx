import type { ReactNode } from "react";

type Ornament = "none" | "botanical" | "geometric" | "frame";

type PhotoHeroProps = {
  coverImageUrl: string | null;
  alt: string;
  treatment?: "color" | "duotone";
  ornament?: Ornament;
  overlay?: boolean;
  heightClassName?: string;
  primaryColor: string;
  accentColor: string;
  monogramText: string;
  children?: ReactNode;
};

function BotanicalCorners({ accentColor }: { accentColor: string }) {
  return (
    <>
      <div
        className="pointer-events-none absolute left-4 top-4 h-16 w-16 rounded-full border sm:left-6 sm:top-6 sm:h-20 sm:w-20"
        style={{ borderColor: `${accentColor}99` }}
      />
      <div
        className="pointer-events-none absolute left-7 top-7 h-9 w-9 rotate-45 rounded-tl-full rounded-br-full border sm:left-10 sm:top-10 sm:h-11 sm:w-11"
        style={{ borderColor: `${accentColor}CC` }}
      />
      <div
        className="pointer-events-none absolute bottom-4 right-4 h-16 w-16 rounded-full border sm:bottom-6 sm:right-6 sm:h-20 sm:w-20"
        style={{ borderColor: `${accentColor}99` }}
      />
      <div
        className="pointer-events-none absolute bottom-7 right-7 h-9 w-9 rotate-45 rounded-tl-full rounded-br-full border sm:bottom-10 sm:right-10 sm:h-11 sm:w-11"
        style={{ borderColor: `${accentColor}CC` }}
      />
    </>
  );
}

/** A thin, refined picture-frame corner motif - four fine L-shaped brackets inset from the edge. */
function FrameCorners({ accentColor }: { accentColor: string }) {
  const bracketClass = "pointer-events-none absolute h-9 w-9 sm:h-12 sm:w-12";

  return (
    <>
      <div className={`${bracketClass} left-3 top-3 border-l border-t sm:left-5 sm:top-5`} style={{ borderColor: accentColor }} />
      <div className={`${bracketClass} right-3 top-3 border-r border-t sm:right-5 sm:top-5`} style={{ borderColor: accentColor }} />
      <div className={`${bracketClass} bottom-3 left-3 border-b border-l sm:bottom-5 sm:left-5`} style={{ borderColor: accentColor }} />
      <div className={`${bracketClass} bottom-3 right-3 border-b border-r sm:bottom-5 sm:right-5`} style={{ borderColor: accentColor }} />
    </>
  );
}

function GeometricBorder({ accentColor }: { accentColor: string }) {
  const strip = (position: "top" | "bottom") => (
    <div
      className={`pointer-events-none absolute inset-x-0 ${position === "top" ? "top-0" : "bottom-0"} flex h-2.5 items-center justify-center gap-3 sm:h-3`}
      style={{
        backgroundImage: `repeating-linear-gradient(90deg, ${accentColor}CC 0 6px, transparent 6px 22px)`,
      }}
    />
  );

  return (
    <>
      {strip("top")}
      {strip("bottom")}
    </>
  );
}

export default function PhotoHero({
  coverImageUrl,
  alt,
  treatment = "color",
  ornament = "none",
  overlay = true,
  heightClassName = "h-[42vw] max-h-[440px] min-h-[300px]",
  primaryColor,
  accentColor,
  monogramText,
  children,
}: PhotoHeroProps) {
  if (coverImageUrl) {
    return (
      <div className="relative w-full overflow-hidden">
        <img
          src={coverImageUrl}
          alt={alt}
          className="block h-auto w-full"
          style={
            treatment === "duotone"
              ? { filter: "grayscale(1) contrast(1.08) brightness(1.05)" }
              : undefined
          }
        />

        {treatment === "duotone" && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: accentColor, mixBlendMode: "color", opacity: 0.65 }}
          />
        )}

        {overlay && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        )}

        {ornament === "botanical" && <BotanicalCorners accentColor={accentColor} />}
        {ornament === "geometric" && <GeometricBorder accentColor={accentColor} />}
        {ornament === "frame" && <FrameCorners accentColor={accentColor} />}

        {children}
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden ${heightClassName}`}>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: `linear-gradient(150deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 55%, black))` }}
      >
        <div
          className="absolute inset-3 rounded-2xl border sm:inset-5"
          style={{ borderColor: `${accentColor}70` }}
        />

        <span
          className="font-script relative text-6xl sm:text-7xl"
          style={{ color: accentColor }}
        >
          {monogramText}
        </span>
      </div>

      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      )}

      {ornament === "botanical" && <BotanicalCorners accentColor={accentColor} />}
      {ornament === "geometric" && <GeometricBorder accentColor={accentColor} />}
      {ornament === "frame" && <FrameCorners accentColor={accentColor} />}

      {children}
    </div>
  );
}
