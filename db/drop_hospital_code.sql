-- Removes the unused "Code" column from the hospitals table.
--
-- This was the old 2019 Houston EMS facility number (e.g. 113 = Memorial
-- Hermann Southwest). Hatzalah of Houston does not use these numbers, so the
-- field has been removed from the admin screen and from hospital search.
--
-- IMPORTANT: deploy app version 12.3 (or later) FIRST, then run this.
-- Running it against an older app version is still safe -- the app reads
-- hospitals with "select *" -- but the admin screen would show an empty box.
--
-- This does NOT touch:
--   door_code   (the hospital door code shown to responders)
--   code_logs   (the CPR / cardiac arrest logs)
--   guests.passcode (guest demo codes)

-- Have a look at what you are about to lose:
SELECT hospital_name, code
FROM   hospitals
WHERE  code IS NOT NULL AND code <> ''
ORDER  BY hospital_name;

-- If you are happy, run this line:
ALTER TABLE hospitals DROP COLUMN IF EXISTS code;

-- Confirm it is gone (should return no rows):
SELECT column_name
FROM   information_schema.columns
WHERE  table_name = 'hospitals' AND column_name = 'code';
