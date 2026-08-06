-- Apply through the normal reviewed migration workflow. Do not run ad hoc in production.
--
-- Replaces the previous 11-template set with 5 new photo-led designs.
-- NOT SAFE TO RUN until every existing event.invitation_template value has
-- been migrated to one of the new ids below (e.g. via a backfill UPDATE) --
-- otherwise this constraint will reject any pre-existing row still holding
-- an old template id.
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
      'heritage_pattern'
    )
  );
