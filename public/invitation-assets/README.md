# invitation-assets/

## fonts/

Local WOFF files for `rose_garden`'s typography (Playfair Display regular/
bold/italic, Great Vibes, Inter bold), read once at module load and passed
to `next/og`'s `ImageResponse` via its `fonts` option in
`lib/whatsappInvitationCard.tsx`. Without this, Satori silently falls back
to its own generic default sans for every `fontFamily` in that file --
registering these was most of what took Rose Garden from "text on a
background" to a designed invitation. Sourced from Google Fonts (OFL
licensed) as static WOFF instances (`fonts.googleapis.com/css2` with a
legacy user-agent, since the current googlefonts/google/fonts repo only
ships variable fonts, and next/og needs a single static instance per
weight/style) -- bundled locally rather than fetched at request time, same
reasoning as the rose-garden/ corner crops below: keep the render off the
network path that caused the Meta 131053 timeout regression.

## rose-garden/

Four corner decoration crops used by the `rose_garden` WhatsApp card template
(`lib/whatsappInvitationCard.tsx`).

- **Source**: `rose-garden-reference.png` in this same directory (the
  client-supplied reference design: green silk drape, red/pink roses, pink
  ribbon, on an ivory "Save the Date" card for Samuel & Dionista).
- **Crops**: `tl.png` / `tr.png` / `bl.png` / `br.png` are rectangular crops
  of that reference's four corners, chosen to include only the decorative
  silk/floral/ribbon motifs and exclude every piece of the reference's own
  text, photo, and UI chrome (that content is specific to that one couple
  and must never appear on another invitation). Each crop has a soft alpha
  fade baked in on its two inner edges (toward the card's center) so it
  blends into the ivory card background instead of ending in a hard
  rectangle. Saved as palette-quantized PNG (WebP is not decodable by this
  project's `next/og`/Satori build).
- Regenerating these crops (e.g. cropped tighter, or from a new reference)
  is a one-off image-editing task, not something done at request time -- see
  git history for the crop/fade script used to produce the current files.
- **Second pass** (visual-quality revision): the first pass's crop boxes
  left a real gap in the reference's own left-edge decoration (silk stops,
  roses/ribbon don't start until further down) and, on top of that, an
  aggressive 60%-start fade made even the covered portion look thin near
  each asset's own edge. `scripts/build-rose-garden-assets.mjs` now splits
  the left/right reference strips where they're actually continuous
  (verified against the full-height reference, not just the original crop
  boxes) and fades later (80%), closing most of the "weak/thin corners"
  gap without inventing any new source content.
