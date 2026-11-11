-- Hatzalah of Houston - bring certification names back in line with the roster
--
-- The certifications table keeps its own copy of each member's first and last
-- name, written when the row was first created. Names are edited on the
-- roster, and until the next app release that edit never reached here, so the
-- Certifications screen and the reminder emails kept the old spelling.
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run.
-- Step 1 only LOOKS. Read the list, then run step 2 to fix it.

-- ---------------------------------------------------------------------------
-- STEP 1: show every certifications row whose name differs from the roster
-- ---------------------------------------------------------------------------
select c.unit,
       c.first_name as cert_first,  c.last_name as cert_last,
       r.first_name as roster_first, r.last_name as roster_last
from certifications c
join roster r
  on upper(regexp_replace(coalesce(r.unit,''), '[^A-Za-z0-9]', '', 'g'))
   = upper(regexp_replace(coalesce(c.unit,''), '[^A-Za-z0-9]', '', 'g'))
where lower(coalesce(r.active,'')) not in ('no','false','0','off','disabled')
  and ( coalesce(trim(c.first_name),'') is distinct from coalesce(trim(r.first_name),'')
     or coalesce(trim(c.last_name),'')  is distinct from coalesce(trim(r.last_name),'') )
order by c.unit;

-- ---------------------------------------------------------------------------
-- STEP 2: copy the roster's spelling onto those rows (same matching as above)
-- ---------------------------------------------------------------------------
update certifications c
set first_name = r.first_name,
    last_name  = r.last_name
from roster r
where upper(regexp_replace(coalesce(r.unit,''), '[^A-Za-z0-9]', '', 'g'))
    = upper(regexp_replace(coalesce(c.unit,''), '[^A-Za-z0-9]', '', 'g'))
  and lower(coalesce(r.active,'')) not in ('no','false','0','off','disabled')
  and ( coalesce(trim(c.first_name),'') is distinct from coalesce(trim(r.first_name),'')
     or coalesce(trim(c.last_name),'')  is distinct from coalesce(trim(r.last_name),'') );

-- Run step 1 again afterwards: it should return no rows.
