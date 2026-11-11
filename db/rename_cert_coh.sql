-- Rename "COH E-Permit" -> "COH Ambulance Permit"
-- The app and the reminder emails both take the name from the column, so this
-- one change updates the certifications screen, the admin portal and the emails.

alter table public.certifications rename column coh_e_permit_num to coh_ambulance_permit_num;
alter table public.certifications rename column coh_e_permit_exp to coh_ambulance_permit_exp;

-- keep any logged reminders pointing at the new name
update public.cert_reminders set certification = 'COH Ambulance Permit'
 where certification = 'COH E-Permit';
update public.cert_updates set certification = 'COH Ambulance Permit'
 where certification = 'COH E-Permit';

select column_name from information_schema.columns
 where table_name='certifications' and column_name like 'coh%';
