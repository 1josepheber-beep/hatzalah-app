-- Lets you pause reminder emails for one member on one certification.
-- Stores a list of paused certifications per member; nothing else changes.
alter table public.certifications add column if not exists paused text;
