-- Hatzalah of Houston — Supabase schema (v3)
-- Safe to run repeatedly: drops & recreates each table (do this BEFORE importing data).
-- Reserved words handled; no column clashes with the primary key.

-- ===== Task List -> task_list (93 rows) =====
drop table if exists task_list cascade;
create table task_list (
  id bigint generated always as identity primary key,
  task_id text,
  category text,
  task text,
  type text,
  target text
);
comment on column task_list.task_id is 'ID';
comment on column task_list.category is 'Category';
comment on column task_list.task is 'Task';
comment on column task_list.type is 'Type';
comment on column task_list.target is 'Target';
create index if not exists idx_task_list_task_id on task_list(task_id);

-- ===== Task Progress -> task_progress (8 rows) =====
drop table if exists task_progress cascade;
create table task_progress (
  id bigint generated always as identity primary key,
  unit text,
  task_id text,
  self_marked text,
  self_date text,
  confirmed text,
  confirmed_by text,
  confirmed_date text,
  count text,
  note text
);
comment on column task_progress.unit is 'Unit';
comment on column task_progress.task_id is 'Task ID';
comment on column task_progress.self_marked is 'Self Marked';
comment on column task_progress.self_date is 'Self Date';
comment on column task_progress.confirmed is 'Confirmed';
comment on column task_progress.confirmed_by is 'Confirmed By';
comment on column task_progress.confirmed_date is 'Confirmed Date';
comment on column task_progress.count is 'Count';
comment on column task_progress.note is 'Note';
create index if not exists idx_task_progress_unit on task_progress(unit);

-- ===== Roster -> roster (48 rows) =====
drop table if exists roster cascade;
create table roster (
  id bigint generated always as identity primary key,
  unit text,
  last_name text,
  first_name text,
  email text,
  personal_email text,
  phone text,
  address text,
  dob text,
  type text,
  dispatcher text,
  level text,
  status text,
  fto text,
  admin text,
  active text,
  last_active text,
  t_shirt_size text,
  polo_shirt_size text,
  dress_shirt_size text,
  hat_size text,
  coat_size text,
  emergency_contact text,
  emergency_phone text,
  emergency_relationship text,
  text_home text,
  text_home_method text
);
comment on column roster.unit is 'Unit';
comment on column roster.last_name is 'Last Name';
comment on column roster.first_name is 'First Name';
comment on column roster.email is 'Email';
comment on column roster.personal_email is 'Personal Email';
comment on column roster.phone is 'Phone';
comment on column roster.address is 'Address';
comment on column roster.dob is 'DOB';
comment on column roster.type is 'Type';
comment on column roster.dispatcher is 'Dispatcher';
comment on column roster.level is 'Level';
comment on column roster.status is 'Status';
comment on column roster.fto is 'FTO';
comment on column roster.admin is 'Admin';
comment on column roster.active is 'Active';
comment on column roster.last_active is 'Last Active';
comment on column roster.t_shirt_size is 'T-Shirt Size';
comment on column roster.polo_shirt_size is 'Polo Shirt Size';
comment on column roster.dress_shirt_size is 'Dress Shirt Size';
comment on column roster.hat_size is 'Hat Size';
comment on column roster.coat_size is 'Coat Size';
comment on column roster.emergency_contact is 'Emergency Contact';
comment on column roster.emergency_phone is 'Emergency Phone';
comment on column roster.emergency_relationship is 'Emergency Relationship';
comment on column roster.text_home is 'Text Home';
comment on column roster.text_home_method is 'Text Home Method';
create index if not exists idx_roster_unit on roster(unit);
create index if not exists idx_roster_email on roster(email);

-- ===== Cert Reminders -> cert_reminders (17 rows) =====
drop table if exists cert_reminders cascade;
create table cert_reminders (
  id bigint generated always as identity primary key,
  when_at text,
  unit text,
  name text,
  certification text,
  exp_date text,
  type text
);
comment on column cert_reminders.when_at is 'When';
comment on column cert_reminders.unit is 'Unit';
comment on column cert_reminders.name is 'Name';
comment on column cert_reminders.certification is 'Certification';
comment on column cert_reminders.exp_date is 'Exp Date';
comment on column cert_reminders.type is 'Type';
create index if not exists idx_cert_reminders_unit on cert_reminders(unit);

-- ===== Tiles -> tiles (15 rows) =====
drop table if exists tiles cascade;
create table tiles (
  id bigint generated always as identity primary key,
  order_col text,
  label text,
  type text,
  target text,
  admin_only text,
  icon text,
  image text,
  active text
);
comment on column tiles.order_col is 'Order';
comment on column tiles.label is 'Label';
comment on column tiles.type is 'Type';
comment on column tiles.target is 'Target';
comment on column tiles.admin_only is 'Admin Only';
comment on column tiles.icon is 'Icon';
comment on column tiles.image is 'Image';
comment on column tiles.active is 'Active';

-- ===== apartments -> apartments (12 rows) =====
drop table if exists apartments cascade;
create table apartments (
  id bigint generated always as identity primary key,
  name text,
  file text,
  address text,
  active text
);
comment on column apartments.name is 'Name';
comment on column apartments.file is 'File';
comment on column apartments.address is 'Address';
comment on column apartments.active is 'Active';
create index if not exists idx_apartments_file on apartments(file);

-- ===== Apartment Markers -> apartment_markers (1486 rows) =====
drop table if exists apartment_markers cascade;
create table apartment_markers (
  id bigint generated always as identity primary key,
  file text,
  label text,
  x text,
  y text
);
comment on column apartment_markers.file is 'File';
comment on column apartment_markers.label is 'Label';
comment on column apartment_markers.x is 'X';
comment on column apartment_markers.y is 'Y';
create index if not exists idx_apartment_markers_file on apartment_markers(file);

-- ===== Cert Updates -> cert_updates (0 rows) =====
drop table if exists cert_updates cascade;
create table cert_updates (
  id bigint generated always as identity primary key,
  when_at text,
  unit text,
  certification text,
  old_date text,
  new_date text
);
comment on column cert_updates.when_at is 'When';
comment on column cert_updates.unit is 'Unit';
comment on column cert_updates.certification is 'Certification';
comment on column cert_updates.old_date is 'Old date';
comment on column cert_updates.new_date is 'New date';
create index if not exists idx_cert_updates_unit on cert_updates(unit);

-- ===== Vitals -> vitals (44 rows) =====
drop table if exists vitals cascade;
create table vitals (
  id bigint generated always as identity primary key,
  tab text,
  section text,
  item text,
  value text,
  value2 text,
  value3 text
);
comment on column vitals.tab is 'Tab';
comment on column vitals.section is 'Section';
comment on column vitals.item is 'Item';
comment on column vitals.value is 'Value';
comment on column vitals.value2 is 'Value2';
comment on column vitals.value3 is 'Value3';

-- ===== Schedule -> schedule (6 rows) =====
drop table if exists schedule cascade;
create table schedule (
  id bigint generated always as identity primary key,
  sched_id text,
  unit text,
  start_at text,
  end_at text,
  label text,
  lat text,
  lng text,
  loc_source text,
  created text
);
comment on column schedule.sched_id is 'ID';
comment on column schedule.unit is 'Unit';
comment on column schedule.start_at is 'Start';
comment on column schedule.end_at is 'End';
comment on column schedule.label is 'Label';
comment on column schedule.lat is 'Lat';
comment on column schedule.lng is 'Lng';
comment on column schedule.loc_source is 'Loc Source';
comment on column schedule.created is 'Created';
create index if not exists idx_schedule_unit on schedule(unit);

-- ===== Availability -> availability (1 rows) =====
drop table if exists availability cascade;
create table availability (
  id bigint generated always as identity primary key,
  unit text,
  available text,
  until text,
  lat text,
  lng text,
  loc_source text,
  updated text
);
comment on column availability.unit is 'Unit';
comment on column availability.available is 'Available';
comment on column availability.until is 'Until';
comment on column availability.lat is 'Lat';
comment on column availability.lng is 'Lng';
comment on column availability.loc_source is 'Loc Source';
comment on column availability.updated is 'Updated';
create index if not exists idx_availability_unit on availability(unit);

-- ===== Code Logs -> code_logs (0 rows) =====
drop table if exists code_logs cascade;
create table code_logs (
  id bigint generated always as identity primary key,
  saved_at text,
  unit text,
  name text,
  mode text,
  duration text,
  shocks text,
  epis text,
  cycles text,
  started text,
  log text
);
comment on column code_logs.saved_at is 'Saved At';
comment on column code_logs.unit is 'Unit';
comment on column code_logs.name is 'Name';
comment on column code_logs.mode is 'Mode';
comment on column code_logs.duration is 'Duration';
comment on column code_logs.shocks is 'Shocks';
comment on column code_logs.epis is 'Epis';
comment on column code_logs.cycles is 'Cycles';
comment on column code_logs.started is 'Started';
comment on column code_logs.log is 'Log';
create index if not exists idx_code_logs_unit on code_logs(unit);

-- ===== Changes -> changes (9 rows) =====
drop table if exists changes cascade;
create table changes (
  id bigint generated always as identity primary key,
  when_at text,
  unit text,
  name text,
  field text,
  old_value text,
  new_value text
);
comment on column changes.when_at is 'When';
comment on column changes.unit is 'Unit';
comment on column changes.name is 'Name';
comment on column changes.field is 'Field';
comment on column changes.old_value is 'Old value';
comment on column changes.new_value is 'New value';
create index if not exists idx_changes_unit on changes(unit);

-- ===== CPR Buttons -> cpr_buttons (12 rows) =====
drop table if exists cpr_buttons cascade;
create table cpr_buttons (
  id bigint generated always as identity primary key,
  order_col text,
  label text,
  action text,
  color text,
  active text
);
comment on column cpr_buttons.order_col is 'Order';
comment on column cpr_buttons.label is 'Label';
comment on column cpr_buttons.action is 'Action';
comment on column cpr_buttons.color is 'Color';
comment on column cpr_buttons.active is 'Active';

-- ===== Certifications -> certifications (24 rows) =====
drop table if exists certifications cascade;
create table certifications (
  id bigint generated always as identity primary key,
  unit text,
  last_name text,
  first_name text,
  drivers_license_num text,
  drivers_license_exp text,
  state_emt_paramedic_license_num text,
  state_emt_paramedic_license_exp text,
  nremt_num text,
  nremt_exp text,
  american_heart_bls_num text,
  american_heart_bls_exp text,
  acls_num text,
  acls_exp text,
  pals_num text,
  pals_exp text,
  coh_e_permit_num text,
  coh_e_permit_exp text,
  jurisprudence_exp text,
  epi_training_exp text,
  hipaa_exp text,
  hipaa_awareness text,
  evoc_course text,
  hazmat text,
  blood_borne_pathogen text,
  administrator_of_record text,
  administrator_of_record_exp text
);
comment on column certifications.unit is 'Unit #';
comment on column certifications.last_name is 'Last Name';
comment on column certifications.first_name is 'First Name';
comment on column certifications.drivers_license_num is 'Driver''s License #';
comment on column certifications.drivers_license_exp is 'Driver''s License Exp';
comment on column certifications.state_emt_paramedic_license_num is 'State EMT/Paramedic License #';
comment on column certifications.state_emt_paramedic_license_exp is 'State EMT/Paramedic License Exp';
comment on column certifications.nremt_num is 'NREMT #';
comment on column certifications.nremt_exp is 'NREMT Exp';
comment on column certifications.american_heart_bls_num is 'American Heart BLS #';
comment on column certifications.american_heart_bls_exp is 'American Heart BLS Exp';
comment on column certifications.acls_num is 'ACLS #';
comment on column certifications.acls_exp is 'ACLS Exp';
comment on column certifications.pals_num is 'PALS #';
comment on column certifications.pals_exp is 'PALS Exp';
comment on column certifications.coh_e_permit_num is 'COH E-Permit #';
comment on column certifications.coh_e_permit_exp is 'COH E-Permit Exp';
comment on column certifications.jurisprudence_exp is 'Jurisprudence Exp';
comment on column certifications.epi_training_exp is 'Epi Training Exp';
comment on column certifications.hipaa_exp is 'HIPAA Exp';
comment on column certifications.hipaa_awareness is 'HIPAA Awareness';
comment on column certifications.evoc_course is 'EVOC Course';
comment on column certifications.hazmat is 'Hazmat';
comment on column certifications.blood_borne_pathogen is 'Blood Borne Pathogen';
comment on column certifications.administrator_of_record is 'Administrator of Record';
comment on column certifications.administrator_of_record_exp is 'Administrator of Record Exp';
create index if not exists idx_certifications_unit on certifications(unit);

-- ===== Settings -> settings (23 rows) =====
drop table if exists settings cascade;
create table settings (
  id bigint generated always as identity primary key,
  setting text,
  value text
);
comment on column settings.setting is 'Setting';
comment on column settings.value is 'Value';
create index if not exists idx_settings_setting on settings(setting);

-- ===== Guests -> guests (1 rows) =====
drop table if exists guests cascade;
create table guests (
  id bigint generated always as identity primary key,
  passcode text,
  name text,
  active text
);
comment on column guests.passcode is 'Passcode';
comment on column guests.name is 'Name';
comment on column guests.active is 'Active';

-- ===== Hospitals -> hospitals (43 rows) =====
drop table if exists hospitals cascade;
create table hospitals (
  id bigint generated always as identity primary key,
  hospital_name text,
  code text,
  phone_call text,
  red_phone text,
  address_navigate text,
  door_code text,
  latitude text,
  longitude text,
  specialties_summary text,
  trauma_i_ii text,
  trauma_iii text,
  pedi_trauma_i text,
  stroke_comprehensive text,
  stroke_primary text,
  cardiac_cath_24hr text,
  post_arrest_hypothermia text,
  vad text,
  burn text,
  hyperbaric text,
  obstetric text,
  pediatric_icu text,
  safe_certified text,
  hide text
);
comment on column hospitals.hospital_name is 'Hospital Name';
comment on column hospitals.code is 'Code';
comment on column hospitals.phone_call is 'Phone (Call)';
comment on column hospitals.red_phone is 'Red Phone';
comment on column hospitals.address_navigate is 'Address (Navigate)';
comment on column hospitals.door_code is 'Door Code';
comment on column hospitals.latitude is 'Latitude';
comment on column hospitals.longitude is 'Longitude';
comment on column hospitals.specialties_summary is 'Specialties (summary)';
comment on column hospitals.trauma_i_ii is 'Trauma I/II';
comment on column hospitals.trauma_iii is 'Trauma III';
comment on column hospitals.pedi_trauma_i is 'Pedi Trauma I';
comment on column hospitals.stroke_comprehensive is 'Stroke Comprehensive';
comment on column hospitals.stroke_primary is 'Stroke Primary';
comment on column hospitals.cardiac_cath_24hr is '24hr Cardiac Cath';
comment on column hospitals.post_arrest_hypothermia is 'Post-Arrest Hypothermia';
comment on column hospitals.vad is 'VAD';
comment on column hospitals.burn is 'Burn';
comment on column hospitals.hyperbaric is 'Hyperbaric';
comment on column hospitals.obstetric is 'Obstetric';
comment on column hospitals.pediatric_icu is 'Pediatric ICU';
comment on column hospitals.safe_certified is 'SAFE Certified';
comment on column hospitals.hide is 'Hide';

-- ===== Uploads -> uploads (22 rows) =====
drop table if exists uploads cascade;
create table uploads (
  id bigint generated always as identity primary key,
  document_type text
);
comment on column uploads.document_type is 'Document Type';
