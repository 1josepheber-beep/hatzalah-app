-- ============================================================
--  ADD A NEW CERTIFICATION
--  Run this whenever you need a certification the app doesn't have yet.
--  Change the two column names, keep the _num / _exp endings.
--
--  Naming rule: lowercase, words separated by underscores.
--    "FTO Certification"  ->  fto_certification_num / fto_certification_exp
--    "CPR Instructor"     ->  cpr_instructor_num    / cpr_instructor_exp
--
--  The app and the reminder emails both build the display name from the
--  column, so there is nothing else to change.
-- ============================================================

alter table public.certifications add column if not exists fto_certification_num text;
alter table public.certifications add column if not exists fto_certification_exp text;

-- Only some members need it? Mark the rest "N/A" and it disappears for them.
-- update public.certifications set fto_certification_exp = 'N/A'
--  where unit not in ('H-24','H-44');

select column_name from information_schema.columns
 where table_name = 'certifications' order by ordinal_position;
