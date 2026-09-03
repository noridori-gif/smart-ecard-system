# invitation-assets/

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
