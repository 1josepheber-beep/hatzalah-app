-- ============================================================
--  Check every setting, and find the Rule of 9 image again.
--
--  The overwrite bug in 18.4 / 18.5 could have moved a value onto
--  any setting that shared a card. This lists the lot so you can
--  see what looks wrong, with a note on what each should contain.
--
--  Your uploaded image is still in storage -- only the setting that
--  pointed at it was overwritten. Step 2 finds it so you do not
--  have to upload it again.
-- ============================================================


-- ---------- STEP 1: every setting, with what it should look like ----------
select setting,
       value,
       case
         when setting ilike '%number%'        then 'a phone number'
         when setting ilike '%label%'         then 'a short word, e.g. Dispatch'
         when setting ilike '%image%'         then 'starts with sb:  (or blank)'
         when setting ilike '%url%'           then 'starts with https://'
         when setting ilike '%secret%'        then 'a phrase, no spaces'
         when setting ilike '%mb%'            then 'a number'
         when setting ilike '%minutes%'       then 'a number'
         when setting ilike '%message%'       then 'a sentence'
         else ''
       end as should_be,
       case
         when setting ilike '%number%'  and value !~ '[0-9]{3}'          then 'LOOKS WRONG'
         when setting ilike '%image%'   and coalesce(value,'') <> ''
                                        and value not like 'sb:%'        then 'LOOKS WRONG'
         when setting ilike '%url%'     and coalesce(value,'') <> ''
                                        and value not like 'http%'       then 'LOOKS WRONG'
         when setting ilike '%secret%'  and value like 'http%'           then 'LOOKS WRONG'
         when setting ilike '%label%'   and value ~ '^[0-9()+-]{7,}$'    then 'LOOKS WRONG'
         when setting ilike '%mb%'      and value !~ '^[0-9]+$'          then 'LOOKS WRONG'
         else 'ok'
       end as verdict
from   public.settings
order  by verdict desc, setting;


-- ---------- STEP 2: find the image you uploaded ----------
-- Anything in the "misc" folder is an image uploaded from a setting.
-- The newest one is almost certainly your Rule of 9 diagram.
select name,
       'sb:' || name as put_this_in_the_setting,
       round(coalesce((metadata->>'size')::bigint,0)/1024.0,1) as kb,
       created_at
from   storage.objects
where  bucket_id = 'image' and name like 'misc/%'
order  by created_at desc;


-- ---------- STEP 3: point the setting back at it ----------
-- Copy the "put_this_in_the_setting" value from step 2 into the line below,
-- then run it. Or just paste it into Admin -> Settings -> Rule Of 9 Image.
--
-- update public.settings
-- set    value = 'sb:misc/PASTE_THE_FILENAME_HERE'
-- where  setting = 'Rule Of 9 Image';


-- ---------- STEP 4: check again ----------
select setting, value from public.settings order by setting;
