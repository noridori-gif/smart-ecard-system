// Regenerates public/invitation-assets/gilded-border/{flourish,hex-tl,hex-br}.png.
// Run with:
//   node scripts/build-gilded-border-assets.mjs
//
// Unlike Rose Garden (cropped from a client-supplied reference photo), this
// floral art is drawn entirely in code below -- flat-illustration roses,
// buds, leaves and line sprigs in the template's fixed navy / burnt-orange /
// cream palette -- so there is no third-party artwork (and no licensing
// question) involved. The reference mockup only informed the general idea,
// nothing is traced or cropped from it.
//
// The card background is navy, so navy roses get a thin cream ring (`halo`)
// to stay visible against it. Rendered at 2x the display size used in
// lib/GildedBorderCard.tsx for a crisp downscale through the JPEG re-encode.
// A one-off build step, not something the app runs at request time.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const outDir = "public/invitation-assets/gilded-border";

const PALETTE = {
  navy: { base: "#1F2E4D", dark: "#121C33", light: "#3A5078", tint: "#6F84A8" },
  orange: { base: "#C4571B", dark: "#8F3B10", light: "#E07B3C", tint: "#F2A673" },
  cream: { base: "#F1E2C6", dark: "#D9BF93", light: "#FBF3E4", tint: "#FFFFFF" },
  leaf: { base: "#33465F", dark: "#22324A", light: "#4D6382" },
  sage: { base: "#7D8C74", dark: "#5E6B57", light: "#9DAA93" },
  bronze: "#A8793A",
  gold: "#C9A45C",
};

const f = (n) => Math.round(n * 100) / 100;
const pt = (r, deg) => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];

// One petal: outer arc on a circle of radius r from a0 to a0+sweep, closed
// by a flatter inner arc -- stacked rings of these read as a rose's cupped
// petals in a flat-illustration style.
function crescent(r, a0, sweep, flat, fill, stroke, strokeWidth) {
  const [x1, y1] = pt(r, a0);
  const [x2, y2] = pt(r, a0 + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `<path d="M${f(x1)},${f(y1)} A${f(r)},${f(r)} 0 ${large} 1 ${f(x2)},${f(y2)} A${f(r * flat)},${f(r * flat)} 0 0 0 ${f(x1)},${f(y1)} Z" fill="${fill}" stroke="${stroke}" stroke-width="${f(strokeWidth)}" stroke-linejoin="round"/>`;
}

function rose(cx, cy, R, tone, rotation = 0, halo = false) {
  const c = PALETTE[tone];
  const sw = Math.max(1, R * 0.03);
  const p = [];
  if (halo) p.push(`<circle r="${f(R + Math.max(1.5, R * 0.05))}" fill="${PALETTE.cream.base}"/>`);
  p.push(`<circle r="${f(R)}" fill="${c.dark}"/>`);
  p.push(`<circle r="${f(R * 0.93)}" fill="${c.base}"/>`);
  [0, 95, 185, 275].forEach((a) => p.push(crescent(R * 0.97, a, 115, 1.25, c.base, c.dark, sw)));
  [40, 165, 285].forEach((a) => p.push(crescent(R * 0.76, a, 150, 1.15, c.light, c.dark, sw)));
  [110, 235, 350].forEach((a) => p.push(crescent(R * 0.55, a, 150, 1.12, c.base, c.dark, sw)));
  [20, 200].forEach((a) => p.push(crescent(R * 0.35, a, 200, 1.05, c.light, c.dark, sw)));
  p.push(`<circle r="${f(R * 0.16)}" fill="${c.dark}"/>`);
  p.push(`<path d="M${f(-R * 0.1)},${f(-R * 0.02)} A${f(R * 0.1)},${f(R * 0.1)} 0 1 1 ${f(R * 0.06)},${f(R * 0.08)}" fill="none" stroke="${c.tint}" stroke-width="${f(sw)}" stroke-linecap="round"/>`);
  p.push(`<path d="M${f(-R * 0.62)},${f(-R * 0.38)} A${f(R * 0.75)},${f(R * 0.75)} 0 0 1 ${f(-R * 0.1)},${f(-R * 0.72)}" fill="none" stroke="${c.tint}" stroke-width="${f(sw * 1.4)}" stroke-linecap="round" opacity="0.55"/>`);
  return `<g transform="translate(${f(cx)},${f(cy)}) rotate(${rotation})">${p.join("")}</g>`;
}

// Closed rosebud with two sepals, pointing along `angle` (deg, 0 = right).
function bud(x, y, size, tone, angle) {
  const c = PALETTE[tone];
  const s = size;
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${angle + 90})">
    <path d="M0,0 C${f(s * 0.55)},${f(-s * 0.2)} ${f(s * 0.5)},${f(-s * 0.95)} 0,${f(-s * 1.15)} C${f(-s * 0.5)},${f(-s * 0.95)} ${f(-s * 0.55)},${f(-s * 0.2)} 0,0 Z" fill="${c.base}"/>
    <path d="M0,${f(-s * 1.15)} C${f(s * 0.3)},${f(-s * 0.8)} ${f(s * 0.25)},${f(-s * 0.35)} ${f(s * 0.05)},${f(-s * 0.1)}" fill="none" stroke="${c.dark}" stroke-width="${f(s * 0.06)}" stroke-linecap="round" opacity="0.6"/>
    <path d="M0,${f(-s * 0.05)} C${f(-s * 0.55)},${f(-s * 0.25)} ${f(-s * 0.45)},${f(-s * 0.6)} ${f(-s * 0.2)},${f(-s * 0.75)} C${f(-s * 0.25)},${f(-s * 0.45)} ${f(-s * 0.1)},${f(-s * 0.2)} 0,${f(-s * 0.05)} Z" fill="${PALETTE.leaf.base}"/>
    <path d="M0,${f(-s * 0.05)} C${f(s * 0.55)},${f(-s * 0.25)} ${f(s * 0.45)},${f(-s * 0.6)} ${f(s * 0.2)},${f(-s * 0.75)} C${f(s * 0.25)},${f(-s * 0.45)} ${f(s * 0.1)},${f(-s * 0.2)} 0,${f(-s * 0.05)} Z" fill="${PALETTE.leaf.light}"/>
  </g>`;
}

// Filled leaf with a fine gold midrib, pointing along `angle`.
function leaf(x, y, len, angle, tone = "leaf") {
  const c = PALETTE[tone];
  const L = len;
  const W = len * 0.3;
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${angle})">
    <path d="M0,0 C${f(L * 0.3)},${f(-W)} ${f(L * 0.75)},${f(-W * 0.9)} ${f(L)},0 C${f(L * 0.75)},${f(W * 0.9)} ${f(L * 0.3)},${f(W)} 0,0 Z" fill="${c.base}"/>
    <path d="M0,0 C${f(L * 0.3)},${f(W)} ${f(L * 0.75)},${f(W * 0.9)} ${f(L)},0 Z" fill="${c.dark}" opacity="0.45"/>
    <path d="M${f(L * 0.04)},0 Q${f(L * 0.5)},${f(-W * 0.12)} ${f(L * 0.95)},0" fill="none" stroke="${PALETTE.gold}" stroke-width="${f(Math.max(1.2, L * 0.018))}" stroke-linecap="round" opacity="0.9"/>
  </g>`;
}

// Fine bronze sprig: gently curved stem, alternating small leaves, gold berries at the tip.
function sprig(x, y, len, angle, bend) {
  const L = len;
  const along = (t) => [L * t, -bend * L * 4 * t * (1 - t)];
  let s = `<path d="M0,0 Q${f(L * 0.5)},${f(-bend * L * 2)} ${f(L)},0" fill="none" stroke="${PALETTE.bronze}" stroke-width="1.6" stroke-linecap="round"/>`;
  [0.2, 0.35, 0.5, 0.65, 0.8].forEach((t, i) => {
    const [px, py] = along(t);
    const side = i % 2 ? 1 : -1;
    const l = L * 0.075;
    s += `<path d="M${f(px)},${f(py)} c${f(l * 0.3)},${f(side * l * 0.55)} ${f(l * 0.8)},${f(side * l * 0.7)} ${f(l * 1.1)},${f(side * l * 0.6)} c${f(-l * 0.3)},${f(-side * l * 0.45)} ${f(-l * 0.75)},${f(-side * l * 0.6)} ${f(-l * 1.1)},${f(-side * l * 0.6)} Z" fill="${PALETTE.bronze}"/>`;
  });
  [[1.0, 0], [0.965, -0.035], [0.965, 0.035]].forEach(([t, o]) => {
    s += `<circle cx="${f(L * t)}" cy="${f(L * o)}" r="2.6" fill="${PALETTE.gold}"/>`;
  });
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${angle})">${s}</g>`;
}

function stem(x1, y1, x2, y2, bend) {
  const mx = (x1 + x2) / 2 + bend;
  const my = (y1 + y2) / 2 + bend;
  return `<path d="M${f(x1)},${f(y1)} Q${f(mx)},${f(my)} ${f(x2)},${f(y2)}" fill="none" stroke="${PALETTE.leaf.dark}" stroke-width="2.4" stroke-linecap="round"/>`;
}

// Thin pale-blue line accent: a slow S-curve with a curl at the end.
function swirl(x, y, len, angle, flip = 1) {
  const L = len;
  const d = `M0,0 C${f(L * 0.3)},${f(-flip * L * 0.22)} ${f(L * 0.6)},${f(flip * L * 0.18)} ${f(L * 0.86)},${f(-flip * L * 0.02)} C${f(L * 0.98)},${f(-flip * L * 0.1)} ${f(L * 0.94)},${f(-flip * L * 0.2)} ${f(L * 0.86)},${f(-flip * L * 0.16)}`;
  return `<g transform="translate(${f(x)},${f(y)}) rotate(${angle})"><path d="${d}" fill="none" stroke="${PALETTE.navy.tint}" stroke-width="1.8" stroke-linecap="round"/></g>`;
}

// Small horizontal spray that sits above the text column: a burnt-orange
// rose flanked by a cream and a navy rose, leaves, buds, and pale-blue line
// accents reaching out to both sides. 400x150 design space.
function flourishSvg(scale) {
  const g = [];
  g.push(swirl(196, 84, 190, 182, 1));
  g.push(swirl(204, 84, 190, -2, -1));
  g.push(sprig(150, 92, 120, 190, 0.08));
  g.push(sprig(250, 92, 120, -10, -0.08));
  g.push(leaf(150, 78, 74, 200, "sage"));
  g.push(leaf(250, 78, 74, -20, "sage"));
  g.push(leaf(170, 100, 62, 160, "leaf"));
  g.push(leaf(230, 100, 62, 20, "leaf"));
  g.push(bud(118, 74, 18, "orange", 196));
  g.push(bud(282, 74, 18, "orange", -16));
  g.push(rose(160, 86, 24, "cream", -15, true));
  g.push(rose(240, 86, 24, "navy", 25, true));
  g.push(rose(200, 78, 34, "orange", 10, true));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${400 * scale}" height="${150 * scale}" viewBox="0 0 400 150">${g.join("")}</svg>`;
}

// Accents tucked against the hexagon monogram's top-left and bottom-right
// corners. 200x200 design space, origin at the hexagon-facing corner.
function hexAccentSvg(variant, scale) {
  const g = [];
  if (variant === "tl") {
    g.push(swirl(120, 150, 110, 200, 1));
    g.push(leaf(110, 120, 70, 200, "sage"));
    g.push(leaf(120, 110, 70, 250, "leaf"));
    g.push(bud(70, 128, 18, "orange", 215));
    g.push(rose(132, 132, 24, "cream", 20, true));
    g.push(rose(150, 150, 30, "orange", -10, true));
  } else {
    g.push(swirl(80, 50, 110, 20, -1));
    g.push(leaf(90, 80, 70, 20, "sage"));
    g.push(leaf(80, 90, 70, 70, "leaf"));
    g.push(bud(130, 72, 18, "orange", 35));
    g.push(rose(68, 68, 24, "orange", 30, true));
    g.push(rose(50, 50, 30, "navy", -20, true));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${200 * scale}" height="${200 * scale}" viewBox="0 0 200 200">${g.join("")}</svg>`;
}

const ASSETS = {
  "flourish.png": flourishSvg(2), // displayed at 400x150
  "hex-tl.png": hexAccentSvg("tl", 2), // displayed at 200x200
  "hex-br.png": hexAccentSvg("br", 2),
};

mkdirSync(outDir, { recursive: true });
for (const [name, svg] of Object.entries(ASSETS)) {
  const file = path.join(outDir, name);
  // Palette-quantized like the Rose Garden crops: flat colours compress to a
  // fraction of a truecolor PNG with no visible difference.
  await sharp(Buffer.from(svg)).png({ palette: true, quality: 90, effort: 10 }).toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`${file}: ${meta.width}x${meta.height}`);
}
