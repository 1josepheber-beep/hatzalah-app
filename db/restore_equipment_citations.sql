-- ============================================================
--  Restore the 34 legal citations to the equipment list.
--
--  The original app kept two separate fields: "note" for the statute
--  or city citation, and "notes" for free text. The free-text field
--  was empty everywhere, and the migration copied that one -- so all
--  34 citations were lost. This puts them back.
--
--  Safe to run more than once. Nothing else is touched.
-- ============================================================

-- Before: should report 0
select count(*) as citations_before
from equipment_items where notes is not null and notes <> '';

update equipment_items e
set    notes = v.note
from  (values
  ('2', 'State §157.11(e)(7): min 2-inch contrasting lettering, plus "TX" + license number'),
  ('6', 'State §157.11(j)(2): secured at time of patient care'),
  ('9', 'State §157.11(k)(8)(B): operable emergency warning devices'),
  ('10', 'State §157.11(k)(8)(B): operable emergency warning devices'),
  ('14', 'State §157.11(e)(5): capable of contacting appropriate medical resources'),
  ('19', 'NOT ON HHD SHEET. State §157.11(e)(4): must protect medications per manufacturer spec'),
  ('21', 'State: original, correct level, displayed in patient compartment'),
  ('26', 'NOT ON HHD SHEET. State §157.11(k)(8)(A): current and complete'),
  ('28', 'State §157.11(k)(8)(G) adds: 5-pound ABC, currently inspected'),
  ('29', 'State: portable, battery-powered — a pen-light does not satisfy'),
  ('30', 'Both require the CURRENT edition — ERG 2024 is current, next due 2028. Electronic version acceptable to state.'),
  ('32', 'NOT ON HHD SHEET. State §157.11(j)(2): applies to every powered patient-care device'),
  ('34', 'State §157.11(k)(1)(J): spinal immobilization device'),
  ('35', 'State: rigid cervical immobilization device'),
  ('36', 'State: patient fully restrained per manufacturer recommendation'),
  ('42', 'NOT ON HHD SHEET. State §157.11(k)(1)(L): defined by your medical director'),
  ('47', 'State: bag valve mask units, oxygen capable'),
  ('67', 'State: protective, non-porous'),
  ('69', 'State: medical protective gowns or equivalent'),
  ('71', 'State §157.11(k)(8)(C)(iii) is stricter: one per crew member. Carry the greater of 2 or crew size.'),
  ('72', 'NOT ON HHD SHEET. State §157.11(k)(8)(C)(v)'),
  ('80', 'MERGED: HHD sheet says 10 tags; state §157.11(k)(8)(J) requires 25 — or documented RAC triage plan participation'),
  ('87', 'State: external cardiac defibrillator appropriate to staffing level'),
  ('89', 'State §157.11(k)(1)(O): two sets adult AND two sets pediatric'),
  ('90', 'State §157.11(k)(1)(Q): auto injector or similar device'),
  ('93', 'State §157.11(k)(1)(N)'),
  ('94', 'NOT A WHITE BOX — from the HHD sheet footnote and state §157.11(e)(1). Must sit inside the MD-approved list at every level.'),
  ('96', 'State §157.11(k)(2)(C): advanced airway equipment'),
  ('98', 'State §157.11(k)(7): required when performing or monitoring ET intubation'),
  ('99', 'HHD sheet: under "If not using supraglottic:"'),
  ('100', 'HHD sheet: under "If not using supraglottic:"'),
  ('101', 'State §157.11(k)(2)(A)(v): IV initiation and maintenance of fluids'),
  ('104', 'State §157.11(k)(3)(C) adds: transmitting 12-lead capability'),
  ('109', 'State §157.11(k)(3)(D): pharmaceuticals as required by MD protocols')
      ) as v(item_id, note)
where  e.item_id = v.item_id;

-- After: should report 34
select count(*) as citations_after
from equipment_items where notes is not null and notes <> '';

-- Spot-check a few
select item_id, name, notes
from   equipment_items
where  item_id in ('2','6','9','10')
order  by (item_id)::int;
