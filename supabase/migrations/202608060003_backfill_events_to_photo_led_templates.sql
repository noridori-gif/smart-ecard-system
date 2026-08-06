-- Apply through the normal reviewed migration workflow. Do not run ad hoc in production.
--
-- Must run BEFORE 202608060004_replace_invitation_templates_with_photo_led_set.sql,
-- which tightens events_invitation_template_check to only the 5 new ids.
-- Remaps every existing event still holding one of the old 11 template ids
-- to the closest new equivalent. Reviewed against production data on
-- 2026-08-06: only 2 events existed at that time (event #14 -> emerald_botanical_halo,
-- event #19 -> classic_photo), both real/live events with guests and sent
-- invitations -- NOT test data. Re-check current row counts before running,
-- since new events may have been created since this was drafted.
--
-- The existing check constraint only permits the old 11 ids, so it must be
-- dropped before this UPDATE can write the new ids; 202608060004 re-adds it
-- scoped to the new 5 ids once every row has been remapped.
alter table public.events
  drop constraint if exists events_invitation_template_check;

update public.events
set invitation_template = case invitation_template
  when 'classic_photo'            then 'royal_portrait'
  when 'chateau_letterpress'      then 'royal_portrait'
  when 'elegant_gold'             then 'golden_elegance'
  when 'luxury_envelope'          then 'golden_elegance'
  when 'midnight_luxe'            then 'golden_elegance'
  when 'modern_floral'            then 'botanical_romance'
  when 'emerald_botanical_halo'   then 'botanical_romance'
  when 'minimal_ivory'            then 'modern_minimal_photo'
  when 'royal_dark'               then 'heritage_pattern'
  when 'african_royal'            then 'heritage_pattern'
  when 'heritage_monogram'        then 'heritage_pattern'
  else invitation_template
end
where invitation_template in (
  'classic_photo',
  'chateau_letterpress',
  'elegant_gold',
  'luxury_envelope',
  'midnight_luxe',
  'modern_floral',
  'emerald_botanical_halo',
  'minimal_ivory',
  'royal_dark',
  'african_royal',
  'heritage_monogram'
);
