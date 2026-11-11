-- Records which certification column each reminder was for, so renaming a
-- certification can no longer look like "never sent" and restart the cycle.
alter table public.cert_reminders add column if not exists cert_col text;
