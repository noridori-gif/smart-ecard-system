import type { ReactNode } from "react";

type Ornament = "none" | "botanical" | "geometric" | "frame";

type SideBySidePhotoProps = {
  coverImageUrl: string | null;
  alt: string;
  ornament?: Ornament;
  primaryColor: string;
  accentColor: string;
  blendColor: string;
  monogramText: string;
  children: ReactNode;
};

function EdgeMarks({ accentColor }: { accentColor: string }) {
  return (
    <>
      <div
        className="pointer-events-none absolute left-3 top-3 h-10 w-10 rounded-full border sm:left-4 sm:top-4"
        style={{ borderColor: `${accentColor}90` }}
      />
      <div
        className="pointer-events-none absolute bottom-3 left-3 h-10 w-10 rounded-full border sm:bottom-4 sm:left-4"
        style={{ borderColor: `${accentColor}90` }}
      />
    </>
  );
}

/** Thin corner brackets on the two left (outer) corners only - the right edge already carries the blend fade into the text panel. */
function FrameEdge({ accentColor }: { accentColor: string }) {
  const bracketClass = "pointer-events-none absolute h-9 w-9 sm:h-11 sm:w-11";

  return (
    <>
      <div className={`${bracketClass} left-3 top-3 border-l border-t sm:left-4 sm:top-4`} style={{ borderColor: accentColor }} />
      <div className={`${bracketClass} bottom-3 left-3 border-b border-l sm:bottom-4 sm:left-4`} style={{ borderColor: accentColor }} />
    </>
  );
}

function GeometricEdge({ accentColor }: { accentColor: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 flex w-2.5 flex-col items-center justify-center sm:w-3"
      style={{
        backgroundImage: `repeating-linear-gradient(180deg, ${accentColor}CC 0 6px, transparent 6px 22px)`,
      }}
    />
  );
}

/** Right-edge feather so the photo dissolves into the text panel instead of ending in a hard line, without cropping any of the image itself. */
const EDGE_FEATHER_MASK =
  "linear-gradient(to right, black 0%, black 82%, transparent 100%)";

/**
 * A diptych layout: the photo sits in a fixed-width column on the left,
 * with all invitation content in a (much taller) scrolling column on the
 * right. The photo column is sticky so it pins within the viewport as the
 * guest scrolls the content - matching "full height" against the screen
 * rather than stretching to the card's full scrollable length, which
 * would otherwise shrink a no-crop photo down to a sliver in a sea of
 * blurred backdrop.
 *
 * The photo itself is never cropped: a blurred, cover-scaled copy fills
 * the column edge-to-edge as a backdrop, and the real photo sits on top
 * fully visible via object-contain. Both layers fade into the panel's
 * background color at the right edge so the two columns read as one
 * continuous card rather than two blocks stitched together.
 */
export default function SideBySidePhoto({
  coverImageUrl,
  alt,
  ornament = "none",
  primaryColor,
  accentColor,
  blendColor,
  monogramText,
  children,
}: SideBySidePhotoProps) {
  return (
    <div className="flex items-start">
      <div className="sticky top-0 h-screen w-[36%] shrink-0 overflow-hidden sm:w-[40%]">
        {coverImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
            />
            <div className="absolute inset-0" style={{ backgroundColor: `${blendColor}59` }} />
            <img
              src={coverImageUrl}
              alt={alt}
              className="relative h-full w-full object-contain"
              style={{
                maskImage: EDGE_FEATHER_MASK,
                WebkitMaskImage: EDGE_FEATHER_MASK,
              }}
            />
          </>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: `linear-gradient(190deg, ${primaryColor}, color-mix(in srgb, ${primaryColor} 55%, black))` }}
          >
            <span
              className="font-script rotate-[-90deg] whitespace-nowrap text-4xl sm:text-5xl"
              style={{ color: accentColor }}
            >
              {monogramText}
            </span>
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(to right, transparent 62%, ${blendColor} 100%)` }}
        />

        {ornament === "botanical" && <EdgeMarks accentColor={accentColor} />}
        {ornament === "geometric" && <GeometricEdge accentColor={accentColor} />}
        {ornament === "frame" && <FrameEdge accentColor={accentColor} />}
      </div>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
