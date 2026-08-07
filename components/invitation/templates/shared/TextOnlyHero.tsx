import type { ReactNode } from "react";

type Ornament = "none" | "botanical" | "geometric";

type TextOnlyHeroProps = {
  eyebrow: string;
  heroTitle: string;
  titleClassName?: string;
  titleStyle?: React.CSSProperties;
  monogramText: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  ornament?: Ornament;
  children?: ReactNode;
};

/**
 * A deliberate, photo-free hero: organizers can pick this even when they
 * have a cover photo, for a purely typographic/decorative invitation.
 * Distinct from PhotoHero's plain gradient-and-monogram no-photo fallback -
 * this is its own composed design (pattern backdrop, framed panel, layered
 * ornament), not an apology for a missing image.
 */
export default function TextOnlyHero({
  eyebrow,
  heroTitle,
  titleClassName = "font-serif font-black text-slate-950",
  titleStyle,
  monogramText,
  primaryColor,
  secondaryColor,
  accentColor,
  ornament = "botanical",
  children,
}: TextOnlyHeroProps) {
  return (
    <div className="relative overflow-hidden px-6 pb-12 pt-14 text-center sm:px-10 sm:pb-16 sm:pt-20">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${accentColor}26 1.5px, transparent 1.5px)`,
          backgroundSize: "18px 18px",
          backgroundColor: secondaryColor,
        }}
      />

      <div
        className="pointer-events-none absolute inset-3 rounded-[1.75rem] border sm:inset-5"
        style={{ borderColor: `${accentColor}55` }}
      />
      <div
        className="pointer-events-none absolute inset-4 rounded-[1.5rem] border sm:inset-6"
        style={{ borderColor: `${accentColor}30` }}
      />

      {ornament === "botanical" && (
        <>
          <span
            className="pointer-events-none absolute left-6 top-8 text-2xl opacity-70 sm:left-10 sm:top-10 sm:text-3xl"
            style={{ color: accentColor }}
          >
            ❧
          </span>
          <span
            className="pointer-events-none absolute bottom-8 right-6 rotate-180 text-2xl opacity-70 sm:bottom-10 sm:right-10 sm:text-3xl"
            style={{ color: accentColor }}
          >
            ❧
          </span>
        </>
      )}

      {ornament === "geometric" && (
        <div
          className="pointer-events-none absolute inset-x-8 top-8 flex h-px sm:inset-x-12"
          style={{ backgroundImage: `repeating-linear-gradient(90deg, ${accentColor}CC 0 6px, transparent 6px 16px)` }}
        />
      )}

      <div className="relative">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border text-lg font-black sm:h-16 sm:w-16 sm:text-xl"
          style={{ borderColor: accentColor, color: primaryColor }}
        >
          {monogramText}
        </div>

        <p
          className="mt-6 text-[11px] font-black uppercase tracking-[0.4em]"
          style={{ color: accentColor }}
        >
          {eyebrow}
        </p>

        <div className="mx-auto mt-4 flex items-center justify-center gap-3">
          <span className="h-px w-10" style={{ backgroundColor: accentColor }} />
          <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accentColor }} />
          <span className="h-px w-10" style={{ backgroundColor: accentColor }} />
        </div>

        <h1 className={`mt-6 leading-[1.05] tracking-tight ${titleClassName}`} style={titleStyle}>
          {heroTitle}
        </h1>

        {children}
      </div>
    </div>
  );
}
