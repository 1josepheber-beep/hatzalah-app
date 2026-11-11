-- Equipment Finder -> Supabase (run once)
drop table if exists equipment_items cascade;
create table equipment_items (
  id bigint generated always as identity primary key,
  item_id text,
  tier text,
  cat text,
  name text,
  qty text,
  src text,
  ours text,
  notes text,
  image text,
  subs text,
  sort_order text
);
create index if not exists idx_equipment_items_cat on equipment_items(cat);

drop table if exists equipment_meta cascade;
create table equipment_meta (
  id bigint generated always as identity primary key,
  mkey text,
  mvalue text
);

insert into equipment_meta (mkey, mvalue) values
('legend_s', 'State of Texas · 25 TAC §157.11'),
('legend_c', 'City of Houston · HHD EMS Min. Equipment (Ver 9.16.25)'),
('legend_sc', 'State + City'),
('note', 'Minimum you must carry: State of Texas + City of Houston, merged. Quantities are the higher of the two.'),
('cats', 'Vehicle Requirements|Documentation|Safety Equipment|Transportation, Immobilization and Splinting|Oxygen & Suction|Trauma & Bandaging|Infection Control|Vitals & Diagnostics|Miscellaneous|Cardiovascular Care|Medications|Intubation & Airways|Medication Delivery & Vascular Access|MICU equipment & medications');

insert into equipment_items (item_id, tier, cat, name, qty, src, ours, notes, image, subs, sort_order) values
('1', 'bls', 'Vehicle Requirements', 'Current registration', '1', 'c', 'Current Vehicle Inspection Sticker', null, null, '[]', '1'),
('2', 'bls', 'Vehicle Requirements', 'Name of service on both sides', '—', 'sc', 'Part of ambulance ', null, null, '[]', '2'),
('3', 'bls', 'Vehicle Requirements', 'No smoking signs in front and rear', '2', 'sc', 'No-Smoking Signs (1 Cab & 1 Patient Area)', null, null, '[{"label": "Front (cab)", "have": false}, {"label": "Rear (patient compartment)", "have": false}]', '3'),
('4', 'bls', 'Vehicle Requirements', 'Tires in good condition', '4', 'c', 'Yes', null, null, '[]', '4'),
('5', 'bls', 'Vehicle Requirements', 'Doors in acceptable condition', '—', 'c', 'Yes', null, null, '[]', '5'),
('6', 'bls', 'Vehicle Requirements', 'All items stored securely', '—', 'sc', 'Yes', null, null, '[]', '6'),
('7', 'bls', 'Vehicle Requirements', 'Dome lights', '—', 'c', 'Yes', null, null, '[]', '7'),
('8', 'bls', 'Vehicle Requirements', 'Seat belts front / rear', '—', 'c', 'Yes', null, null, '[]', '8'),
('9', 'bls', 'Vehicle Requirements', 'Emergency lights', '—', 'sc', 'Yes', null, null, '[]', '9'),
('10', 'bls', 'Vehicle Requirements', 'Siren', '—', 'sc', 'Yes', null, null, '[]', '10'),
('11', 'bls', 'Vehicle Requirements', 'Vehicle horn', '—', 'c', 'Yes', null, null, '[]', '11'),
('12', 'bls', 'Vehicle Requirements', 'Vehicle lights', '—', 'c', 'Yes', null, null, '[]', '12'),
('13', 'bls', 'Vehicle Requirements', 'Windshield free of obstructions', '—', 'c', 'Yes', null, null, '[]', '13'),
('14', 'bls', 'Vehicle Requirements', 'Communication equipment', '—', 'sc', 'Radio (1)', null, null, '[]', '14'),
('15', 'bls', 'Vehicle Requirements', 'Steps and body free of major damage', '—', 'c', 'Yes', null, null, '[]', '15'),
('16', 'bls', 'Vehicle Requirements', 'Positive locks on cabinets and seats', '—', 'c', 'Yes', null, null, '[]', '16'),
('17', 'bls', 'Vehicle Requirements', 'Free from electrical hazards', '—', 'c', '—', null, null, '[]', '17'),
('18', 'bls', 'Vehicle Requirements', 'Clean equipment patient area', '—', 'c', 'Yes', null, null, '[]', '18'),
('19', 'bls', 'Vehicle Requirements', 'Environmental system — heating and cooling', '—', 's', 'Air Conditioner/Heater', null, null, '[]', '19'),
('20', 'bls', 'Documentation', 'Current protocols signed by medical director', '1', 'sc', 'Medical Treatment Guidelines signed by MD (1)', null, null, '[]', '20'),
('21', 'bls', 'Documentation', 'Current TDSHS vehicle authorization', '1', 'sc', 'Current TDSHS License', null, null, '[]', '21'),
('22', 'bls', 'Documentation', 'Current proof of insurance', '1', 'c', 'Yes', null, null, '[]', '22'),
('23', 'bls', 'Documentation', 'CoH ambulance service permit', '1', 'c', 'City of Houston Permit (1)', null, null, '[]', '23'),
('24', 'bls', 'Documentation', 'CoH ambulance driver''s permit', '1', 'c', 'Yes', null, null, '[]', '24'),
('25', 'bls', 'Documentation', 'Vehicle is listed on vehicle information page', '—', 'c', 'Yes', null, null, '[]', '25'),
('26', 'bls', 'Documentation', 'Equipment, supply and medication list available to crew', '1', 's', 'Yes', null, null, '[]', '26'),
('27', 'bls', 'Safety Equipment', 'Emergency road triangles or non-flammable reflective devices', '3', 'c', 'Emergency Reflective Triangle (3)', null, null, '[]', '27'),
('28', 'bls', 'Safety Equipment', 'Fire extinguisher- mounted, tagged, accessible from patient area', '1', 'sc', 'Fire Extinguisher Mounted and Tagged (1)', null, null, '[{"label": "5-lb ABC", "have": false}, {"label": "Mounted", "have": false}, {"label": "Tagged / currently inspected", "have": false}, {"label": "Accessible from patient area", "have": false}]', '28'),
('29', 'bls', 'Safety Equipment', 'Flashlight with charger or extra batteries', '1', 'sc', 'Flashlight (1)', null, null, '[]', '29'),
('30', 'bls', 'Safety Equipment', 'Current HAZMAT ERG', '1', 'sc', 'ERG, 2016 or newer (1) — two editions stale', null, null, '[]', '30'),
('31', 'bls', 'Safety Equipment', 'Reflective vests', '2', 'c', '—', null, null, '[]', '31'),
('32', 'bls', 'Safety Equipment', 'Powered equipment: manual feature, spare batteries, or alternate power', '—', 's', '—', null, null, '[]', '32'),
('33', 'bls', 'Transportation, Immobilization and Splinting', 'KED or short board', '1', 'sc', 'Extrication Device (KED) (1)', null, null, '[]', '33'),
('34', 'bls', 'Transportation, Immobilization and Splinting', 'Long spine board', '1', 'sc', 'Backboard (long) w/ Tape (1)', null, null, '[]', '34'),
('35', 'bls', 'Transportation, Immobilization and Splinting', 'Cervical collars infant- adult', '1 ea', 'sc', 'Adult (2), Pediatric (2)', null, null, '[{"label": "Infant", "have": false}, {"label": "Pediatric", "have": false}, {"label": "Adult", "have": false}]', '35'),
('36', 'bls', 'Transportation, Immobilization and Splinting', 'Stretcher', '1', 'sc', 'Multi-Level Stretcher (1)', null, null, '[]', '36'),
('37', 'bls', 'Transportation, Immobilization and Splinting', 'Stair chair or mega mover', '1', 'c', 'Stair Chair (1)', null, null, '[]', '37'),
('38', 'bls', 'Transportation, Immobilization and Splinting', 'Pediatric restraint System', '1', 'c', 'Car Seat or Equivalent (1)', null, null, '[]', '38'),
('39', 'bls', 'Transportation, Immobilization and Splinting', 'Extremity splint', '2', 'sc', 'Splint Pack or 2 short / 2 med / 2 long', null, null, '[]', '39'),
('40', 'bls', 'Transportation, Immobilization and Splinting', 'Femoral (traction) splint', '1', 'c', 'Traction Splint for Adult & Child (1)', null, null, '[]', '40'),
('41', 'bls', 'Transportation, Immobilization and Splinting', 'Pelvis stabilizing device or material', '1', 'c', '—', null, null, '[]', '41'),
('42', 'bls', 'Transportation, Immobilization and Splinting', 'Equipment to meet special patient needs', '—', 's', '—', null, null, '[]', '42'),
('43', 'bls', 'Oxygen & Suction', 'Mounted oxygen cylinder (>200 psi)', '1', 'sc', '"H" Cylinder w/ Regulator (1)', null, null, '[]', '43'),
('44', 'bls', 'Oxygen & Suction', 'Portable oxygen cylinder w/ regulator', '1', 'sc', '"D" Cylinder (2) + "D" Regulator (1)', null, null, '[]', '44'),
('45', 'bls', 'Oxygen & Suction', 'Nasal cannula pediatric - adult', '1 ea', 'sc', 'Adult (2), Pediatric (2)', null, null, '[{"label": "Pediatric", "have": false}, {"label": "Adult", "have": false}]', '45'),
('46', 'bls', 'Oxygen & Suction', 'Non-rebreather or simple face mask pediatric - adult', '1 ea', 'sc', 'NRB Adult (2), NRB Child (2)', null, null, '[{"label": "Pediatric", "have": false}, {"label": "Adult", "have": false}]', '46'),
('47', 'bls', 'Oxygen & Suction', 'BVM infant - adult', '1 ea', 'sc', 'Adult (1), Child (1), Infant w/ neonatal mask (1)', null, null, '[{"label": "Infant", "have": false}, {"label": "Child", "have": false}, {"label": "Adult", "have": false}]', '47'),
('48', 'bls', 'Oxygen & Suction', 'OPA (40mm, 60mm, 80mm, 90mm, 100mm, &110mm)', '1 ea', 'sc', 'Adult (2), Child (2), Infant (2)', null, null, '[{"label": "40mm", "have": false}, {"label": "60mm", "have": false}, {"label": "80mm", "have": false}, {"label": "90mm", "have": false}, {"label": "100mm", "have": false}, {"label": "110mm", "have": false}]', '48'),
('49', 'bls', 'Oxygen & Suction', 'NPA (16fr or smaller, 18fr-24fr, & 26fr or larger)', '1 ea', 'c', 'Multiple Sizes (2)', null, null, '[{"label": "16fr or smaller", "have": false}, {"label": "18fr-24fr", "have": false}, {"label": "26fr or larger", "have": false}]', '49'),
('50', 'bls', 'Oxygen & Suction', 'Mounted and Portable Suction w/ intact cannister', '1', 'sc', 'Wall Mount (1), Portable (1), Spare Canister (1)', null, null, '[{"label": "Mounted / wall unit", "have": false}, {"label": "Portable unit", "have": false}, {"label": "Intact cannister", "have": false}]', '50'),
('51', 'bls', 'Oxygen & Suction', 'Suction catheter (5 or 6, 8 or 10, 12 or 14, 16 or 18)', '1 ea.', 'c', 'Multiple Sizes', null, null, '[{"label": "5 or 6", "have": false}, {"label": "8 or 10", "have": false}, {"label": "12 or 14", "have": false}, {"label": "16 or 18", "have": false}]', '51'),
('52', 'bls', 'Oxygen & Suction', 'Rigid suction catheter', '1', 'c', '—', null, null, '[]', '52'),
('53', 'bls', 'Trauma & Bandaging', 'Commercial arterial tourniquet', '2', 'sc', 'Tourniquet (2)', null, null, '[]', '53'),
('54', 'bls', 'Trauma & Bandaging', '4x4 sterile', '25', 'sc', 'Dressing, 4x4, Sterile (8)', null, null, '[]', '54'),
('55', 'bls', 'Trauma & Bandaging', '4x4 non- sterile', '25', 'c', '—', null, null, '[]', '55'),
('56', 'bls', 'Trauma & Bandaging', 'Adhesive bandage', '1 bx', 'sc', '—', null, null, '[]', '56'),
('57', 'bls', 'Trauma & Bandaging', 'Adhesive tape', '2', 'sc', 'Tape, Adhesive (2)', null, null, '[]', '57'),
('58', 'bls', 'Trauma & Bandaging', 'Occlusive dressing / chest seal', '2', 'sc', 'Chest Seal (2), Dressing Occlusive (1)', null, null, '[]', '58'),
('59', 'bls', 'Trauma & Bandaging', 'Fluid for irrigation of wounds', '1', 'c', 'Sterile Saline or Water Bottle (1)', null, null, '[]', '59'),
('60', 'bls', 'Trauma & Bandaging', 'Elastic (ACE) bandage', '2', 'sc', '—', null, null, '[]', '60'),
('61', 'bls', 'Infection Control', 'Hand cleaner / sanitizer', '1', 'c', '—', null, null, '[]', '61'),
('62', 'bls', 'Infection Control', 'Mounted sharps container', '1', 'sc', 'Sharps Container (1)', null, null, '[]', '62'),
('63', 'bls', 'Infection Control', 'Emesis bag, basin, or bed pan', '2 ea', 'c', 'Disposable Bed Pan (1)', null, null, '[]', '63'),
('64', 'bls', 'Infection Control', 'Biohazard bags', '1', 'sc', 'Bio-Hazard Bag (2)', null, null, '[]', '64'),
('65', 'bls', 'Infection Control', 'General trash bags', '1', 'c', '—', null, null, '[]', '65'),
('66', 'bls', 'Infection Control', 'Disinfectant wipes or solution', '1', 'c', 'Disinfectant/Cleaner (1)', null, null, '[]', '66'),
('67', 'bls', 'Infection Control', 'Examination gloves', '1 bx.', 'sc', '1 box each XL, Lg, Med', null, null, '[]', '67'),
('68', 'bls', 'Infection Control', 'Eye protection', '2', 'sc', 'Eyewear, Protective (2)', null, null, '[]', '68'),
('69', 'bls', 'Infection Control', 'Gowns', '2', 'sc', 'Gown, Protective (2)', null, null, '[]', '69'),
('70', 'bls', 'Infection Control', 'Surgical masks', '2', 'c', 'Masks, Protective (2)', null, null, '[]', '70'),
('71', 'bls', 'Infection Control', 'N95 masks', '2', 'sc', '—', null, null, '[]', '71'),
('72', 'bls', 'Infection Control', 'Personal cleansing supplies', '—', 's', '—', null, null, '[]', '72'),
('73', 'bls', 'Vitals & Diagnostics', 'Glucometer w/ test strips & disposable lancets', '1', 'sc', 'Blood Glucometer Kit (1)', null, null, '[]', '73'),
('74', 'bls', 'Vitals & Diagnostics', 'Oral glucose', '1', 'c', 'Glucose, Oral (1)', null, null, '[]', '74'),
('75', 'bls', 'Vitals & Diagnostics', 'Pulse oximeter with pediatric - adult capabilities', '1', 'sc', 'Pulse Oximeter (1)', null, null, '[]', '75'),
('76', 'bls', 'Vitals & Diagnostics', 'Stethoscope', '1', 'sc', 'Stethoscope (1)', null, null, '[]', '76'),
('77', 'bls', 'Vitals & Diagnostics', 'Blood pressure cuffs infant - adult', '1 ea', 'sc', 'Adult (1), Child (1)', null, null, '[{"label": "Infant", "have": false}, {"label": "Child", "have": false}, {"label": "Adult", "have": false}]', '77'),
('78', 'bls', 'Vitals & Diagnostics', 'Thermometer (w/ covers if oral)', '1', 'sc', 'Thermometer (1) + Probes (2)', null, null, '[{"label": "Thermometer", "have": false}, {"label": "Covers (if oral)", "have": false}]', '78'),
('79', 'bls', 'Miscellaneous', 'Trauma shears', '1', 'c', 'Trauma Shears (2)', null, null, '[]', '79'),
('80', 'bls', 'Miscellaneous', 'Triage marking system or 10 tags', '25', 'sc', 'Disaster Tags (10)', null, null, '[]', '80'),
('81', 'bls', 'Miscellaneous', 'Cold pack', '2', 'c', 'Cold Pack (2)', null, null, '[]', '81'),
('82', 'bls', 'Miscellaneous', 'Heat pack', '2', 'c', '—', null, null, '[]', '82'),
('83', 'bls', 'Miscellaneous', 'Emergency blanket', '2', 'c', 'Blanket (2)', null, null, '[]', '83'),
('84', 'bls', 'Miscellaneous', 'Alcohol swabs or topical antiseptic towelettes', '20', 'c', 'Alcohol Preps (10)', null, null, '[]', '84'),
('85', 'bls', 'Miscellaneous', 'Pediatric dosing', '1', 'c', '—', null, null, '[]', '85'),
('86', 'bls', 'Miscellaneous', 'OB Kit w/ baby bunting and bulb suction', '1', 'c', 'O.B. Kit, Sterile (1)', null, null, '[]', '86'),
('87', 'bls', 'Cardiovascular Care', 'AED w/ no errors', '1', 'sc', 'AED (1)', null, null, '[]', '87'),
('88', 'bls', 'Cardiovascular Care', 'Spare battery', '1', 'c', '—', null, null, '[]', '88'),
('89', 'bls', 'Cardiovascular Care', 'Adult & Pediatric defibrillator pads (compatible with AED)', '2ea', 'sc', 'AED Pads Adult (1), AED Pads Infant/Child (1)', null, null, '[{"label": "Adult \u2014 set 1", "have": false}, {"label": "Adult \u2014 set 2", "have": false}, {"label": "Pediatric \u2014 set 1", "have": false}, {"label": "Pediatric \u2014 set 2", "have": false}]', '89'),
('90', 'bls', 'Medications', 'Epinephrine for anaphylaxis w/ delivery capability (pediatric & adult)', '1ea', 'sc', 'EpiPen Adult (1) + EpiPen Jr (1), or Certadose Kit', null, null, '[{"label": "Pediatric", "have": false}, {"label": "Adult", "have": false}]', '90'),
('91', 'bls', 'Medications', 'Filter needles if using ampule', '1ea', 'c', '—', null, null, '[]', '91'),
('92', 'bls', 'Medications', 'Naloxone w/ appropriate delivery system', '1', 'c', 'Naloxone Single Dose Spray (2)', null, null, '[]', '92'),
('93', 'bls', 'Medications', 'Other medications per protocols w/ appropriate delivery devices', '—', 'sc', 'Albuterol (3), Nebulizers (4)', null, null, '[]', '93'),
('94', 'bls', 'Medications', 'Pediatric and neonatal equipment per endorsed national standards', '—', 's', 'Infant Insulating Device (1)', null, null, '[]', '94'),
('95', 'als', 'Intubation & Airways', 'Magill forceps', '1', 'c', 'Adult (1), Pediatric (1)', null, null, '[]', '95'),
('96', 'als', 'Intubation & Airways', 'Supraglottic airway devices infant - adult', '1 ea', 'sc', 'iGel Supraglottic Device (4 sizes)', null, null, '[{"label": "Infant", "have": false}, {"label": "Child", "have": false}, {"label": "Adult", "have": false}]', '96'),
('97', 'als', 'Intubation & Airways', 'Chest decompression needle 14g x 1.5" or greater or other commercially available size', '2', 'c', 'Chest decompression needle (3 sizes)', null, null, '[]', '97'),
('98', 'als', 'Intubation & Airways', 'Continuous waveform capnography', '—', 'sc', 'ETCO₂ Filterline (1), ETCO₂ Nasal Cannula (1)', null, null, '[]', '98'),
('99', 'als', 'Intubation & Airways', 'Laryngoscope handle & blades (size 0 -4)', '1 ea', 'c', 'Handle (2), Blades Adult/Peds/Infant (1 ea), Spare Battery (2)', null, null, '[{"label": "Handle", "have": false}, {"label": "Blade 0", "have": false}, {"label": "Blade 1", "have": false}, {"label": "Blade 2", "have": false}, {"label": "Blade 3", "have": false}, {"label": "Blade 4", "have": false}]', '99'),
('100', 'als', 'Intubation & Airways', 'ET tubes 3.0- 8.0', '1 ea', 'c', 'MICU: cuffed 6.0–9.0 (3), uncuffed 2.5–5.5 (3)', null, null, '[{"label": "3.0", "have": false}, {"label": "3.5", "have": false}, {"label": "4.0", "have": false}, {"label": "4.5", "have": false}, {"label": "5.0", "have": false}, {"label": "5.5", "have": false}, {"label": "6.0", "have": false}, {"label": "6.5", "have": false}, {"label": "7.0", "have": false}, {"label": "7.5", "have": false}, {"label": "8.0", "have": false}]', '100'),
('101', 'als', 'Medication Delivery & Vascular Access', 'Isotonic crystalloid fluids per protocol', '—', 'sc', 'Sodium Chloride, IV Bag (2)', null, null, '[]', '101'),
('102', 'als', 'Medication Delivery & Vascular Access', 'Administration tubing (macro & micro)', '1 ea', 'c', 'Micro Drip (1), Regular Macro Drip (1)', null, null, '[{"label": "Macro drip", "have": false}, {"label": "Micro drip", "have": false}]', '102'),
('103', 'als', 'Medication Delivery & Vascular Access', 'Other medications per protocols w/ appropriate delivery devices', '—', 'c', 'Aspirin 81mg (24), Ipratropium (3), Narcan 2mg (2)', null, null, '[]', '103'),
('104', 'micu', 'MICU equipment & medications', 'Cardiac monitor w/ ECG acquisition and trans-cutaneous pacing', '—', 'sc', 'ECG Monitor/Defibrillator (1)', null, null, '[{"label": "ECG acquisition", "have": false}, {"label": "Trans-cutaneous pacing", "have": false}, {"label": "Transmitting 12-lead (state)", "have": false}]', '104'),
('105', 'micu', 'MICU equipment & medications', 'Extra batteries for monitor', '1', 'c', 'ECG Monitor Spare Battery (2)', null, null, '[]', '105'),
('106', 'micu', 'MICU equipment & medications', 'Extra paper', '1', 'c', 'ECG Paper (1)', null, null, '[]', '106'),
('107', 'micu', 'MICU equipment & medications', 'Electrodes', '1 set', 'c', 'ECG Electrode (10)', null, null, '[]', '107'),
('108', 'micu', 'MICU equipment & medications', 'Specialized equipment per protocols', '—', 'c', 'Video Laryngoscope (1), EZ-IO (1)', null, null, '[]', '108'),
('109', 'micu', 'MICU equipment & medications', 'Other medications per protocol w/ appropriate delivery devices', '—', 'sc', 'Full MICU drug box — see §9.03(C)', null, null, '[]', '109');

-- access: members read, admins manage
alter table equipment_items enable row level security;
alter table equipment_meta enable row level security;
drop policy if exists "member read" on equipment_items;
create policy "member read" on equipment_items for select to authenticated using (public.is_member());
drop policy if exists "admin write" on equipment_items;
create policy "admin write" on equipment_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "member read" on equipment_meta;
create policy "member read" on equipment_meta for select to authenticated using (public.is_member());
drop policy if exists "admin write" on equipment_meta;
create policy "admin write" on equipment_meta for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on equipment_items, equipment_meta to authenticated;
grant usage, select on all sequences in schema public to authenticated;