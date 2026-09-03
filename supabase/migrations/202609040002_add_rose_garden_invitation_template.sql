-- Apply through the normal reviewed migration workflow. Do not run ad hoc in production.
--
-- Adds 'rose_garden': an 8th invitation_template value, a fully-coded
-- preset (same architecture as garden_elegance/royal_portrait/etc. in
-- lib/whatsappInvitationCard.tsx) reproducing the client's photographic
-- reference design -- green silk, red/pink roses, and pink ribbon in the
-- four corners, on an ivory card -- via bundled corner photo crops rather
-- than CSS motifs. Not an uploaded-image template like 'custom'.
alter table public.events
  drop constraint if exists events_invitation_template_check;

alter table public.events
  add constraint events_invitation_template_check
  check (
    invitation_template in (
      'royal_portrait',
      'golden_elegance',
      'botanical_romance',
      'modern_minimal_photo',
      'heritage_pattern',
      'custom',
      'garden_elegance',
      'rose_garden'
    )
  );
