-- Cabinets / Placement -> Supabase (run once)
drop table if exists cabinets cascade;
create table cabinets (
  id bigint generated always as identity primary key,
  cab_id text,
  name text,
  img text,
  sort_order text
);
drop table if exists cabinet_bins cascade;
create table cabinet_bins (
  id bigint generated always as identity primary key,
  cab_id text,
  n text,
  q text,
  x text,
  y text,
  w text,
  h text,
  sort_order text
);
create index if not exists idx_cabinet_bins_cab on cabinet_bins(cab_id);

insert into cabinets (cab_id, name, img, sort_order) values
('D', 'Airway Cabinet', 'cabD.webp', '1'),
('F', 'Trauma & Wound', 'cabF.webp', '2'),
('H', 'Heavy Gear / Floor', 'cabH.webp', '3');

insert into cabinet_bins (cab_id, n, q, x, y, w, h, sort_order) values
('D', 'iGel 5', '2', '0.0817', '0.0072', '0.1104', '0.258', '1'),
('D', 'iGel 4', '2', '0.1928', '0.0137', '0.1159', '0.2509', '2'),
('D', 'iGel 3', '2', '0.3103', '0.0203', '0.1107', '0.2502', '3'),
('D', 'iGel 2', '2', '0.4208', '0.0282', '0.1161', '0.2491', '4'),
('D', 'Nebulizer, Pedi', '2', '0.5375', '0.0294', '0.1097', '0.2468', '5'),
('D', 'O2 Key', '2 sizes', '0.6485', '0.0298', '0.1111', '0.2499', '6'),
('D', 'Lubricant', '20', '0.7606', '0.0312', '0.1177', '0.2505', '7'),
('D', 'Nebulizer, Adult', '2', '0.8803', '0.0244', '0.1024', '0.2572', '8'),
('D', 'Extra Puls Ox Connectors', '10', '0.0156', '0.2968', '0.0628', '0.3111', '9'),
('D', 'Extra Suction Container', '2', '0.8413', '0.6791', '0.1147', '0.2815', '10'),
('D', 'LifeVac', '1', '0.0056', '0.0084', '0.0744', '0.2499', '11'),
('D', 'BVM, Adult', '2', '0.0798', '0.3061', '0.227', '0.3057', '12'),
('D', 'BVM, Pedi', '2', '0.3083', '0.3154', '0.2139', '0.3022', '13'),
('D', 'BVM, Infant', '2', '0.5229', '0.3217', '0.2266', '0.3069', '14'),
('D', 'Nasal Airway (NPA)', '2 ea', '0.7504', '0.3276', '0.1141', '0.3041', '15'),
('D', 'Oral Airway (OPA)', '2 kits', '0.8655', '0.3294', '0.0996', '0.3107', '16'),
('D', 'Rectal Thermometer', '1', '0.0839', '0.6454', '0.1093', '0.2767', '17'),
('D', 'NRB, Adult', '2', '0.1946', '0.6497', '0.0557', '0.2763', '18'),
('D', 'NRB, Pedi', '2', '0.252', '0.6508', '0.053', '0.2817', '19'),
('D', 'NC, Adult', '2', '0.3051', '0.6495', '0.0508', '0.2793', '20'),
('D', 'NC, Pedi', '2', '0.3562', '0.6525', '0.0537', '0.2776', '21'),
('D', 'NRB / NC Infant', '2', '0.4099', '0.656', '0.1074', '0.2852', '22'),
('D', 'Suction Catheter', '2 ea', '0.5185', '0.6606', '0.1013', '0.2852', '23'),
('D', 'Manual Suction', '1', '0.6221', '0.6701', '0.11', '0.2759', '24'),
('D', 'Suction Kit', '2', '0.7329', '0.6769', '0.105', '0.2783', '25'),
('F', 'Burn Sheet', '2', '0.0992', '0.0228', '0.1648', '0.2599', '1'),
('F', 'Pelvic Binder / Splint', '1', '0.2643', '0.0228', '0.1034', '0.2587', '2'),
('F', 'Trauma Dressing', '2', '0.3687', '0.024', '0.1483', '0.2599', '3'),
('F', 'Ring Cutter', '2', '0.5225', '0.0299', '0.0638', '0.2575', '4'),
('F', 'Emergency blankets / Foil blanket', '2', '0.5886', '0.0275', '0.0578', '0.2563', '5'),
('F', 'Sam Splint', '2', '0.1256', '0.326', '0.1371', '0.3116', '6'),
('F', 'Sheers', '2', '0.1336', '0.6633', '0.0625', '0.2822', '7'),
('F', 'Ice Packs', '4', '0.2848', '0.6597', '0.0994', '0.2834', '8'),
('F', 'Tape ', '4', '0.1996', '0.6656', '0.0869', '0.1106', '9'),
('F', 'Finger Splints', '4', '0.1957', '0.7784', '0.0856', '0.16', '10'),
('F', 'Ace Wrap', '2', '0.3935', '0.6705', '0.0601', '0.2668', '11'),
('F', 'Triangle Bandage', '4', '0.4565', '0.6743', '0.0458', '0.2545', '12'),
('H', 'Jump Bag', '1', '0.53', '0.601', '0.3732', '0.3304', '1'),
('H', 'Lucas device', '1', '0.32', '0.6092', '0.1954', '0.3163', '2'),
('H', 'Pedi Mate', '1', '0.3338', '0.2226', '0.207', '0.3174', '3'),
('H', 'Fire extinguisher', '1', '0.0568', '0.1157', '0.1596', '0.4326', '4'),
('H', 'Portable suction', '1', '0.2149', '0.1298', '0.1077', '0.3069', '5'),
('H', 'Extra Lucas battery ', '1', '0.5427', '0.319', '0.11', '0.14', '6'),
('H', 'Gun Safe', '1', '0.5935', '0.1686', '0.2935', '0.1412', '7'),
('H', 'Extra oxygen tanks', '2', '0.2126', '0.5998', '0.0996', '0.2317', '8');

-- access: members read, admins manage
alter table cabinets enable row level security;
alter table cabinet_bins enable row level security;
drop policy if exists "member read" on cabinets;
create policy "member read" on cabinets for select to authenticated using (public.is_member());
drop policy if exists "admin write" on cabinets;
create policy "admin write" on cabinets for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "member read" on cabinet_bins;
create policy "member read" on cabinet_bins for select to authenticated using (public.is_member());
drop policy if exists "admin write" on cabinet_bins;
create policy "admin write" on cabinet_bins for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on cabinets, cabinet_bins to authenticated;
grant usage, select on all sequences in schema public to authenticated;