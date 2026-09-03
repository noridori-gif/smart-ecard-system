-- Apply through the normal reviewed migration workflow. Do not run ad hoc in production.
--
-- Adds 'garden_elegance': a 7th invitation_template value, a fully-coded
-- preset (same architecture as royal_portrait/golden_elegance/etc. in
-- lib/PremiumWhatsAppCard.tsx) themed in deep forest green / deep red /
-- blush pink on ivory. Not an uploaded-image template like 'custom'.
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
      'garden_elegance'
    )
  );
