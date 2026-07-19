-- Apply through the normal reviewed migration workflow. Do not run ad hoc in production.
alter table public.events
  drop constraint if exists events_invitation_template_check;

alter table public.events
  add constraint events_invitation_template_check
  check (
    invitation_template in (
      'classic_photo',
      'elegant_gold',
      'luxury_envelope',
      'modern_floral',
      'royal_dark',
      'minimal_ivory',
      'african_royal',
      'midnight_luxe',
      'heritage_monogram',
      'chateau_letterpress'
    )
  );
