// Regenerates public/invitation-assets/rose-garden/{tl,tr,bl,br}.png from
// public/invitation-assets/rose-garden-reference.png. Run with:
//   node scripts/build-rose-garden-assets.mjs
//
// The crop boxes below were chosen by hand (see public/invitation-assets/
// README.md) to include only the reference design's decorative silk/rose/
// ribbon corners and exclude every bit of its own text, photo, and UI
// chrome. Re-run this after touching the crop boxes, display sizes, or the
// fade recipe; it's a one-off image-editing step, not something the app
// runs at request time.
import sharp from "sharp";
import path from "node:path";

const src = "public/invitation-assets/rose-garden-reference.png";
const outDir = "public/invitation-assets/rose-garden";

// Source crop boxes (verified clean of any card text/photo/icons).
// tr/br were widened after the first pass looked visibly weaker than tl/bl
// on the actual ivory card: the original 300px-tall tr crop cut off a much
// richer floral cascade that (per public/invitation-assets/README.md)
// actually continues text-free down to ~y:700, and br's left edge (430)
// was cropping into the ribbon's paler, lower-saturation fold instead of
// its fuller body. Both were re-verified clean of text/UI before widening.
//
// Second pass (visual-quality revision, see rose-garden-corner-quality
// branch): inspecting full-height left/right strips of the reference showed
// the left edge is decorated top-to-bottom with NO gap in the source itself
// (silk -> rose cluster -> ribbon tail), but the old tl/bl crops only took
// the silk (0-340) and the roses (460-670), skipping both the rose cluster's
// start (340-460) and the ribbon tail below 670 -- that skipped band is what
// produced the bare stretch of ivory client feedback called "weaker/thinner
// than the reference". tl/bl now split the same left strip at y:380 instead,
// so between them they cover the reference's full 0-730 with no source gap.
// The right side already had no source gap (tr/br overlap at 410-520); tr
// and br are extended a little further here for more display-height (closes
// most of the remaining CARD-space gap, since tr/br's card-mapped height was
// short of the card's own height even with zero source gap -- see
// lib/whatsappInvitationCard.tsx's RoseGardenCard comment).
const crops = {
  tl: { left: 0, top: 0, width: 88, height: 380 },
  tr: { left: 383, top: 0, width: 114, height: 560 },
  bl: { left: 0, top: 380, width: 88, height: 350 },
  br: { left: 403, top: 380, width: 94, height: 350 },
};

// Final on-card display width (CSS px, at CARD_WIDTH=1080 in
// lib/whatsappInvitationCard.tsx -- keep these two in sync). Assets are
// baked at 2x this for a crisp downscale through the JPEG re-encode.
// Widened slightly from the first pass (220/220/220/210) for more visual
// weight/saturation per corner, per client feedback that the corners read
// as thin -- kept well short of the card's centre text column though.
const displayWidth = { tl: 236, tr: 236, bl: 236, br: 226 };
const SCALE = 2;

// Each tile is anchored to one canvas corner and should fade to transparent
// toward its two inner (non-anchored) edges so it blends into the ivory
// card background instead of ending in a hard rectangle.
const fadeAxes = {
  tl: { h: ["0%", "100%"], v: ["0%", "100%"] },
  tr: { h: ["100%", "0%"], v: ["0%", "100%"] },
  bl: { h: ["0%", "100%"], v: ["100%", "0%"] },
  br: { h: ["100%", "0%"], v: ["100%", "0%"] },
};

// Fade starts later (80% vs the original 60%) than the first pass: with the
// first pass's earlier falloff, the last ~40% of each corner asset's own
// bounding box was already faint enough to read as empty card, which (on
// top of the old crop boxes' literal source gap) compounded into the
// "weaker/thinner than the reference" corner feedback. A shorter, later
// taper keeps corners looking present almost to their true edge while still
// blending cleanly into the ivory background.
function linearMaskSvg(dw, dh, x1, y1, x2, y2) {
  return Buffer.from(`
    <svg width="${dw}" height="${dh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
          <stop offset="0%" stop-color="white" stop-opacity="1"/>
          <stop offset="80%" stop-color="white" stop-opacity="1"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${dw}" height="${dh}" fill="url(#fade)"/>
    </svg>
  `);
}

for (const [name, box] of Object.entries(crops)) {
  const dw = displayWidth[name] * SCALE;
  const dh = Math.round((box.height / box.width) * dw);
  const resized = await sharp(src).extract(box).resize(dw, dh).ensureAlpha().png().toBuffer();

  const axes = fadeAxes[name];
  const hMask = await sharp(linearMaskSvg(dw, dh, axes.h[0], "0%", axes.h[1], "0%")).png().toBuffer();
  const vMask = await sharp(linearMaskSvg(dw, dh, "0%", axes.v[0], "0%", axes.v[1])).png().toBuffer();

  // Palette-quantized PNG: WebP is not decodable by this project's
  // next/og / Satori build, and a full-color alpha PNG at this resolution
  // runs 1-1.7MB each; palette mode cuts that to ~100-175KB with no
  // visible quality loss on these soft, edge-faded photo crops.
  await sharp(resized)
    .composite([
      { input: hMask, blend: "dest-in" },
      { input: vMask, blend: "dest-in" },
    ])
    .png({ palette: true, quality: 85, compressionLevel: 9, effort: 10 })
    .toFile(path.join(outDir, `${name}.png`));

  console.log(name, "done");
}
