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
const crops = {
  tl: { left: 0, top: 0, width: 85, height: 340 },
  tr: { left: 395, top: 0, width: 102, height: 300 },
  bl: { left: 0, top: 460, width: 85, height: 210 },
  br: { left: 430, top: 410, width: 67, height: 300 },
};

// Final on-card display width (CSS px, at CARD_WIDTH=1080 in
// lib/whatsappInvitationCard.tsx -- keep these two in sync). Assets are
// baked at 2x this for a crisp downscale through the JPEG re-encode.
const displayWidth = { tl: 220, tr: 260, bl: 220, br: 180 };
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

function linearMaskSvg(dw, dh, x1, y1, x2, y2) {
  return Buffer.from(`
    <svg width="${dw}" height="${dh}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
          <stop offset="0%" stop-color="white" stop-opacity="1"/>
          <stop offset="60%" stop-color="white" stop-opacity="1"/>
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
