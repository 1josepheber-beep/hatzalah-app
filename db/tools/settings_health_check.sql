-- ============================================================
--  Settings health check.
--
--  Paste the whole thing into the Supabase SQL editor and run it.
--  Anything wrong appears at the top with a PROBLEM note. If every
--  row says "ok", the settings are sound.
-- ============================================================

with expected(name, kind, note) as (values
  ('Cert Reminder Days',                        'number',  'how many days ahead reminders start, normally 90'),
  ('CPR Cycle Minutes',                         'number',  'normally 2'),
  ('Scene Timer Minutes',                       'number',  'normally 10'),
  ('Scene Reminder Minutes',                    'number',  'normally 45'),
  ('Scene Timer Snooze Minutes',                'number',  'normally 5'),
  ('Dispatch Number',                           'phone',   'the dispatch phone number'),
  ('Medical Control Number',                    'phone',   'the medical control number'),
  ('Dispatch Label',                            'words',   'normally "Call Dispatch"'),
  ('Medical Control Label',                     'words',   'normally "Call Medical Control"'),
  ('Org Name',                                  'words',   'Hatzalah of Houston'),
  ('Search Placeholder',                        'words',   'text shown in the search box'),
  ('Rule Of 9 Image',                           'image',   'must start with sb:'),
  ('Logo URL',                                  'blankok', 'blank uses the built-in logo'),
  ('Renewal Webhook URL',                       'url',     'the Apps Script /exec address'),
  ('Renewal Webhook Secret',                    'secret',  'a phrase, no spaces, not a URL'),
  ('ESO PCR URL',                               'url',     'the ESO login address'),
  ('Availability',                              'url',     'the availability link'),
  ('Profile Update URL',                        'blankok', 'blank is fine'),
  ('Member Levels',                             'list',    'EMT, AEMT, ALS, Doctor, PR'),
  ('Member Types',                              'list',    'Responder, Non Responder, Dispatcher'),
  ('Member Statuses',                           'list',    'Primary, Backup, Observer, Dispatcher'),
  ('Certifications That Block Response',        'list',    'normally just State EMT and American Heart BLS'),
  ('Text Home',                                 'onoff',   'on or off'),
  ('Text Home Message',                         'words',   'the message sent home'),
  ('Guest Demo',                                'onoff',   'on or off'),
  ('RX Lookup',                                 'onoff',   'on or off'),
  ('Remember Device',                           'onoff',   'on, off, yes or no'),
  ('Location',                                  'onoff',   'on or off'),
  ('Scene Timer Message',                       'words',   'shown when the timer fires'),
  ('Scene Reminder Message',                    'words',   'shown at the later reminder'),
  ('Cert Email Subject (expired)',              'blankok', 'blank uses the built-in wording'),
  ('Cert Email Body (expired)',                 'blankok', 'blank uses the built-in wording'),
  ('Cert Email Subject (expired, non-blocking)','blankok', 'blank uses the built-in wording'),
  ('Cert Email Body (expired, non-blocking)',   'blankok', 'blank uses the built-in wording'),
  ('Cert Email Subject (expiring)',             'blankok', 'blank uses the built-in wording'),
  ('Cert Email Body (expiring)',                'blankok', 'blank uses the built-in wording'),
  ('Cert Email Subject (renewed)',              'blankok', 'blank uses the built-in wording'),
  ('Cert Email Body (renewed)',                 'blankok', 'blank uses the built-in wording')
),
actual as (
  select trim(setting) as name, coalesce(value,'') as value
  from   public.settings
  where  setting is not null and trim(setting) <> ''
)
select
  coalesce(e.name, a.name)                                   as setting,
  left(coalesce(a.value,''), 60)                             as value,
  case
    when a.name is null                      then 'MISSING - this setting has no row'
    when e.name is null                      then 'ok (extra setting, not checked)'
    when e.kind = 'number'  and a.value !~ '^[0-9]+$'
         then 'PROBLEM - should be a number. ' || e.note
    when e.kind = 'phone'   and a.value !~ '[0-9]{3}'
         then 'PROBLEM - should be a phone number'
    when e.kind = 'url'     and a.value <> '' and a.value not like 'http%'
         then 'PROBLEM - should start with http'
    when e.kind = 'image'   and a.value <> '' and a.value not like 'sb:%'
         then 'PROBLEM - should start with sb:'
    when e.kind = 'secret'  and (a.value like 'http%' or a.value ~ '[0-9]{3}-[0-9]{3}')
         then 'PROBLEM - looks like a URL or phone number, not a secret'
    when e.kind = 'words'   and a.value ~ '^[0-9()+,-]{7,}$'
         then 'PROBLEM - looks like a phone number'
    when e.kind = 'words'   and a.value = ''
         then 'PROBLEM - should not be empty. ' || e.note
    when e.kind = 'onoff'   and lower(a.value) not in ('on','off','yes','no','true','false','')
         then 'PROBLEM - should be on or off'
    when e.kind = 'list'    and a.value = ''
         then 'PROBLEM - should not be empty. ' || e.note
    when e.kind = 'list'    and a.value !~ ','
         then 'CHECK - expected a comma separated list. ' || e.note
    else 'ok'
  end                                                        as verdict,
  e.note                                                     as expected
from       expected e
full join  actual   a on lower(a.name) = lower(e.name)
order by
  case
    when a.name is null then 0
    when coalesce(e.kind,'') <> '' and (
      (e.kind='number'  and a.value !~ '^[0-9]+$') or
      (e.kind='phone'   and a.value !~ '[0-9]{3}') or
      (e.kind='url'     and a.value <> '' and a.value not like 'http%') or
      (e.kind='image'   and a.value <> '' and a.value not like 'sb:%') or
      (e.kind='secret'  and (a.value like 'http%' or a.value ~ '[0-9]{3}-[0-9]{3}')) or
      (e.kind='words'   and (a.value = '' or a.value ~ '^[0-9()+,-]{7,}$')) or
      (e.kind='onoff'   and lower(a.value) not in ('on','off','yes','no','true','false','')) or
      (e.kind='list'    and a.value = '')
    ) then 1
    else 3
  end,
  setting;
