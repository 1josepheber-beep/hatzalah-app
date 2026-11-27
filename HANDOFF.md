# Handoff — read this first in a new chat

This file is for Claude (or anyone) picking up work on the Hatzalah of Houston member app
in a fresh conversation. `README.md` explains how the app is built; this file explains how
we work and where things stand. Keep it current: update it in the same commit as any change
that makes it wrong.

## Who and what

- Joseph Eber (unit H-24) runs the app for Hatzalah of Houston. He is an admin and not a
  programmer: Claude writes all code; Joseph tests on real devices and reports back bluntly.
- The app is a single-file PWA (`index.html` + `sw.js`) on GitHub Pages at
  houstonhatzalahapp.org, backed by Supabase (project `gcvbohdarppaolqhdnri`), Google
  sign-in, a Cloudflare worker for push, and a Google Apps Script for certification emails
  and the nightly Google Sheets backup. Details and account ownership: `README.md`
  (roles) and the private accounts note Joseph holds (names) — never put secrets or
  account names in the repo.
- Other organizations may license the app later (a multi-tenant version is being planned
  separately). The built-in demo exists to show it to them.

## How we work (standing rules)

1. **Ask before building** when a request is ambiguous; otherwise build and show.
2. **Previews before shipping.** Screenshot or mock-up first; ship on "push".
3. **Batch releases.** Fixes and features pile up and go out together as one tested
   version — one change or twenty. The version number goes up **only when Joseph says
   release**: then bump `Version x.y.z` in `index.html` (five places) and `VERSION` in
   `sw.js`. Every batch goes to the **beta address first**; it reaches the live site only
   after Joseph has tried it on his own devices and approved.
4. **Complete, ready-to-deploy files**, never snippets to paste. Joseph deploys by
   dragging files into GitHub Desktop, or Claude pushes directly.
5. **Secrets never go through the chat.** They live in Apps Script Script Properties
   (`SB_SERVICE_KEY`, `ADMIN_EMAILS`, `PUSH_CRON_KEY`, `TEST_EMAIL`), in Cloudflare, or in a
   file Joseph keeps. The anon key and GA id in `index.html` are public by design.
6. **Honest diagnosis** over optimistic guessing; concise, plain-language replies.
7. Every release runs the harnesses in `scratch/tests/` (all must pass) and, for UI
   changes, a Playwright preview from the demo.
8. Commits are made as `Claude <noreply@anthropic.com>` and end with
   `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` plus a `Claude-Session:` line.
9. **Search the code before saying something isn't on record.** `grep` index.html, sw.js,
   db/ and scratch/ (not only this file and the chat notes) before answering "we never built
   that" or "there is no setting for that".
10. **Apps Script gotcha:** a change to `doPost`/`doGet` needs Deploy → Manage deployments →
   New version, or the web app keeps running the old code. Never grant new OAuth scopes
   without Joseph; never type passwords.

## Tools available in a chat

- **Supabase MCP connector** (on Joseph's account): `execute_sql` against the live
  database — fine for reading and for small, reversible inserts (settings rows); say what
  you ran. No storage-file access.
- **Joseph's Chrome** (Claude in Chrome): used for anything behind a login — Apps Script
  editor (yeber@houstonhatzalah.org, authuser=2; the project is named **"Hatzalah App -
  Background Jobs (emails, backups, push)"**, one file, Code.gs), Supabase dashboard, the
  live app. To update the script: paste the repo's `apps-script/Code.gs` into the editor
  (check the editor still matches the previous repo copy first), save, then Deploy →
  Manage deployments → pencil → New version → Deploy, keeping the same deployment so the
  /exec URL in Settings stays valid.
  Tool outputs containing base64/hex/JWT are blocked; page text truncates at 50k chars.
- **The sandbox** can reach GitHub and npm/pip registries only — not Supabase, not the
  live site, not map tiles. Anything that needs the live backend goes through the MCP
  connector or Chrome.

## Where things stand (keep this section current)

- **Standings policy — proposal written for leadership (Nov 22, 2026), NOT approved yet:**
  the Claude Doc "Hatzalah of Houston — Responder Standings Policy (draft for leadership
  review)" (https://claude.ai/artifact/J6k4T7xYDqfuXbKpSxqjGP). Joseph's plan as stated:
  Primary under minimum → email + app notice to member and admins, admin discussion; Primary
  under minimum **two quarters in a row → automatic drop to Backup**, admin can override;
  Backup under minimum → notice + discussion only, never automatic; Observers no minimum;
  **all doctors (Medical Control) exempt from everything** — a second doctor is being added
  to the roster. **Clearance rule (Joseph, Nov 22, 2026): call numbers never make anyone a
  Primary — a member must be "cleared as Primary" first.** To build with the rest: a
  clearance on the roster (tick + date cleared + who cleared, suggested columns
  `cleared_primary`, `cleared_primary_at`, `cleared_primary_by`), shown and set in
  Admin → Members; the app **blocks** setting a status of Primary without it; a Backup over
  the Primary minimum is never promoted automatically (flagged for a conversation, and if
  never cleared the screen says clearance is the next step); clearance **does not expire**,
  so an auto-dropped Primary keeps it and can be restored without re-clearing.
  **The real minimums are 8 (Primary) and 5 (Backup)** — the settings rows
  said 15/6 (placeholders) until Nov 22, 2026 and were corrected that day. The doc also proposes: check on the 7th after quarter end after a refresh,
  an "excused quarter" option, a standings log, first partial quarter not counted. Build
  nothing of the notices/auto-drop until leadership signs off; the Doc exemption fix
  (`csExempt`) went out in 1.17.0; it matches any Medical Control type or MD-n unit, so the
  second doctor is covered automatically when added.
- **Standings rule addition (Joseph, Nov 22, 2026 — "very important"): Doc — Lars
  Thestrup, MD-1, type Medical Control — is NEVER part of the call statistics, the
  standings reminders, or the automatic downgrade.** `csExempt()` (type matches
  medical control / physician / doctor, or unit MD-n) keeps him out of Admin → Call stats
  and gives his My Standing no minimum ("Medical Control has no call minimum"). Any future
  reminder or auto-downgrade code must call `csExempt()` first.
- **Live: 1.24.0** (Nov 27, 2026): **a counter for pulse and respirations in Call Notes.**
  App only — no database change, no Apps Script change (still **v60**).
  - A stopwatch button sits inside the HR box and the RR box (`#ntHrCnt`, `#ntRrCnt`,
    wrapper `.nt-tw`). It opens a bottom sheet `#rcSheet` (state `RC`, functions `rc*`,
    right after the Call Notes code).
  - **Timed count** (default): 15 / 30 / 60 seconds (RR starts at 30, HR at 15), Start,
    count in your head; at the end the phone vibrates and beeps twice (`rcTone`), the sheet
    shrinks to "Time's up" + "How many did you count?" and shows count x multiplier = rate
    a minute. "Use N for RR/HR" writes the box and closes. The clock runs off `Date.now()`
    so a throttled timer cannot drift; a screen wake lock is held while counting.
  - **Tap along**: one big button tapped on every breath/beat; rate = (taps-1) over the time
    from first to last tap, shown from the 3rd tap.
  - Remembered on the phone only (`hoh_rc_v1`): last length per vital and last mode. Nothing
    is sent anywhere; the result only lands in the HR / RR box of the entry being written.
  - The sheet is on the Back stack (`navOpen(rcHide)`), so Back closes the counter and not
    Call Notes. `rcKb` lifts the sheet by the keyboard's height (visualViewport) because
    newer phones overlay the keyboard. iPhones do not vibrate from a web app: they get the
    beep (unless on silent) and the "Time's up" screen.
  - Tests: `scratch/tests/ratecounter.js` (42, in `npm test`). Preview:
    `scratch/catalog/preview-ratecounter.js`.
- **Live: 1.23.0** (Nov 23, 2026): the standings pieces that 1.21.0 left out, plus the
  organization's call total. Apps Script **v60**.
  - **Excuse a quarter**: Admin → Call statistics → End of quarter, "Excuse this quarter"
    on each member below the minimum; a reason is required (`csExcuse` upserts a
    `standings_log` row, action `excused`, streak 0, note, by_whom); Undo deletes the row
    for a running quarter or resets it for a past one (`csUnexcuse`). The panel now lists
    members with zero calls too, and only Primary/Backup (like the job).
  - **Reason on an override**: in `admSave`, moving a member back to Primary whose newest
    `standings_log` row is `downgrade` asks for a reason, then marks that row
    `overridden` with note + by_whom.
  - **Streak rule**: an `excused` or `overridden` previous quarter starts the count again
    (script `standingsQuarterEnd`, app `stdStreakBefore`).
  - **Push** with the standing notice (`pushUnit(..., "standing")`); the app opens My
    Standing on `PUSH_OPEN` kind `standing`. Only when Standings Notices is on.
  - **Organization totals** (`db/add_call_totals.sql`: table `call_totals`, member-read):
    the daily import counts distinct incident numbers per quarter. Setting **Standings
    Show Total Calls** (switch, ships **Off**): when on, My Standing shows "Hatzalah ran N
    calls this quarter — you were on X (Y%)" and "of N" on past quarters. Totals exist
    only for quarters covered by the daily file (2026 onward). `reimportCallStats()`
    re-reads the newest ESO email.
  - Still not built: a rule for members promoted or reactivated mid-quarter (left to
    leadership).
- **Live: 1.22.0** (Nov 23, 2026): the Standings settings can no longer be mistyped.
  *Standings Notices* and *Standings Auto Downgrade* render as on/off switches
  (`SETTING_ONOFF`: a hidden `data-row` input holding exactly "On"/"Off" plus a
  `[data-onoff]` switch), and *Standings Quarters Before Downgrade* is a 1-4 picker
  (`SETTING_PICK`). Any future on/off or fixed-choice setting should be added to those two
  maps rather than left as a text box. Demo data carries the same five Standings rows
  (8 / 5 / Off / Off / 2). No script change (still v59). The leadership document
  (https://claude.ai/artifact/J6k4T7xYDqfuXbKpSxqjGP) was rewritten the same day from
  "proposal" to "in place and switched off", with the settings card screenshot; it lists
  as NOT built: the admin button to excuse a quarter (the job already honours an
  `excused` row), a reason on overrides, push notifications for standings, and a
  mid-quarter promotion rule.
- **Live: 1.21.0** (Nov 23, 2026): **standings at the end of a quarter — built, shipped
  switched OFF** (`db/add_standings.sql`: table `standings_log`, settings *Standings
  Notices* = Off, *Standings Auto Downgrade* = Off, *Standings Quarters Before Downgrade*
  = 2, all in the existing Settings → Standings card). Apps Script **v59**:
  `standingsQuarterEnd()` runs daily from `dailyCallStats()`; from the 3rd day of a new
  quarter it writes one `standings_log` row per responder with a minimum (status, need,
  total, short, streak, action). Off = `would_notice` / `would_downgrade`, nothing emailed,
  nobody moved. Notices on = email to the member, admins Bcc (sent whenever someone is
  short, even with the downgrade off). Auto downgrade on = a Primary with `streak >=
  quarters` is patched to Backup; **clearance is kept**. The streak counts only logged
  quarters, so the clock starts when this shipped. A member with an existing row for the
  period (e.g. action `excused`, written by an admin) is left alone. Medical Control,
  dispatchers and Observers are never included. `standingsDryRun()` lists who is short
  and writes nothing. App: Admin → Call statistics has an **End of quarter** panel
  (`csEndQHTML`, `stdSettings`) showing who is below minimum and what the rules would do.
  **Leadership has NOT approved turning it on** — the switches stay off until Joseph says.
  Same release: **"open its setting" buttons** (`admSetLinkHTML` / `admWireSetLinks` /
  `admSetFocus`) on Call statistics, Jump bags, Ambulance checks and Supply requests —
  Joseph's rule: any admin screen governed by a setting links straight to its Settings
  card (opens it, flashes it, offers a way back); and **"Not a member"** for crew names
  that are not responders (`call_stats_names.unit = 'IGNORE'`; skipped by the app's
  unmatched warning and by the daily import — TECHSUPPORT ESO and MICHAEL FLANAGAN are
  marked).
- **Live: 1.20.0** (Nov 22, 2026): **call statistics now load themselves every morning.**
  ESO Insights runs the saved query **"Hatzalah App - Calls by Responder"** (owner
  JOSEPH EBER, EMS model, Denormalized, filter *ESO Record Created Date = this year
  (YTD)*, columns Crew Full Name / Crew Standard Role / Incident Number / ESO Record
  Created Date) **daily at 5:00**, and emails it as a **.csv.gz attachment** — a real
  attachment, no portal login. Joseph's ESO **work email was changed to
  yeber@houstonhatzalah.org** on Nov 22 (personal address moved to Home Email; ESO uses
  the work email for password recovery too; his login `j_jobor` is unchanged), so the
  file lands in the mailbox the script runs in. Apps Script **v58**: `dailyCallStats()`
  on a 6:00 trigger runs `importCallStats()` (newest unimported ESO email → `Utilities.ungzip`
  → parseCsv → dedupe crew+incident → per-quarter lead/driver/other → upsert `call_stats`
  on `crew_name,period,source`, and save new `call_stats_names` links) and
  `callStatsStaleCheck()` (no new rows for *Call Stats Stale Days*, default 10 → one email
  to the admins, repeated at most weekly). Name matching mirrors the app's but is
  **stricter**: where the app would flag a guess for an admin, the job leaves the row
  unmatched for Admin → Call stats to link. Last imported message is remembered in script
  property `CS_LAST_MSG_MS`, so a re-run imports nothing. Tests: `scratch/tests/gs-callstats.js`.
- **Live: 1.19.0** (Nov 22, 2026): **battery check on a jump bag item**
  (`db/add_battery_bars.sql`: `jumpbag_items.bars`, `jumpbag_status.bars` + `.bars_at`).
  An item ticked **"Ask how many battery bars (1-4)"** in Admin → Jump bag items shows, on
  top of its expiration date, four bar buttons and a **Checked** date; tapping a bar stamps
  that day, and the date can be backdated. **AED w/ Battery is the one item ticked today.**
  1 bar is red ("replace the battery"), 2 amber ("getting low"); both tint the row, count in
  a "battery low" pill on the member's summary, tag the member in Admin → Jump bags (sorted
  just under expired), show in the detail and in the spreadsheet, and are listed in the
  "Remind to restock" email (Apps Script **v57**). Nightly expiry emails are untouched.
  Helpers: `jbWantsBars` / `jbBarsOf` / `jbBarsAtOf` / `jbBarState`; every member write now
  goes through one `jbSave(id, patch)` that carries over whatever the patch does not name.
- **Live: 1.18.0** (Nov 22, 2026): **jump bag expiration dates only where the item carries
  one.** An item whose "Has an expiration date" tick is off now shows no date box and no
  "+ expiration date" link in My Jump Bag (that link and `JB.expOpen` are gone), so a date
  cannot be entered by mistake. An item that does carry a date gets a **Clear** button
  beside it, so a wrong date can be taken out in one tap. A date already saved against a
  non-expiring item is **ignored, not deleted**: `jbExpOf(r,s)` returns "" unless
  `jbWantsExp(r)`, which keeps it out of the member's screen, the summary pills, the admin
  Jump bags view and its spreadsheet; Apps Script **v56** skips it in the nightly expiry
  reminders and in "Remind to restock" (`if (!isX(it.expires)) return;`). Tick the item in
  Admin → Jump bag items and the saved date comes straight back. 15 such dates existed at
  release (H-1 and H-24: Isolation Kit, OB Kit, Kerlix 4", ABD Pad 5x9, nonrebreathing
  masks, nasal cannulas, Eye Wash, Trauma Dressing Sheet, Burn Sheet, Trauma Shears) —
  Joseph releases as is and ticks whichever of those should expire afterwards.
- **Live: 1.17.0** (Nov 22, 2026): **Cleared as Primary** (`db/add_primary_clearance.sql`:
  roster columns `cleared_primary`, `cleared_primary_at`, `cleared_primary_by`). Admin →
  Members → Role & access has the switch under Status; turning it on stamps today's date
  and the admin's name, turning it off clears the stamp, and **saving a status of Primary
  without it is refused** ("Primary needs clearance first…"). Backfilled on Nov 22, 2026:
  every member then standing as Primary, plus H-29 (a former Primary), marked cleared with
  `cleared_primary_by='Backfilled from existing standing'` — MD-1 included so his record
  stays editable. Same release carries the Medical Control exemption (`csExempt`). The
  rest of the standings policy (notices, auto-drop, excused quarters, standings log) is
  still unbuilt and waits on leadership.
- **1.16.0** (Nov 22, 2026) — **Call statistics / real Standings data:**
  `db/add_call_stats.sql` (tables `call_stats` — unit, crew_name, period '2026-Q4', total,
  lead, driver, other, unknown, source eso|web|manual, updated_at; unique (crew_name,
  period, source) — and `call_stats_names` crew_name → unit; RLS: own-or-admin read, admin
  write). Migration applied and the ESO history loaded on Nov 22, 2026: 315 rows (29 crew
  names, 4,200 calls, Q1 2023 – Q4 2026, pulled from the ESO
  Insights "Responder Contribution Dashboard" via the Sisense JAQL API — see below; the
  pulled file lives only in the sandbox under `scratch/eso/`, which is git-ignored: names
  with call counts do not belong in the public repo).
  App: `CS` module (search `Call statistics (the numbers behind Standings)`):
  `csParse()` reads the ESO export (Crew Full Name + date or Quarter + role + incident; one
  crew member per incident counted once; a file starting mid-quarter leaves that quarter
  alone and says so; also a pre-counted Crew/Quarter/Role/Calls list), `csMatchUnit()`
  links names to the roster (saved link → first+last → unique last name, flagged "loose"
  when the first initial differs → active responder over inactive/dispatcher), import
  upserts on (crew_name, period, source) and saves new links. **Admin → People → Call
  stats**: quarter chips, responders sorted by calls with Lead/Driver/Other and red when
  under their minimum, tap → history; Import screen with preview, unlinked-name pickers
  and a Name links list to correct a guess. **My Standing** now reads the member's own
  rows: this quarter's count with the role split, the bar against their minimum, "X more
  needed" (plus "speak to an administrator" inside the last 30 days), previous quarters,
  and "Counts come from ESO records · updated …"; a member with no rows gets a plain
  "No data yet" screen (no invented numbers; the old EXAMPLE preview is gone). Demo seeds
  8 quarters per demo responder. Tests: `scratch/tests/callstats.js` (25, in `npm test`),
  smoke now expects 18 admin sections. Preview: `node preview-callstats.js` in
  scratch/catalog. Still to decide with Joseph: the automatic Primary→Backup drop and the
  header warning dot — the data is now there to do both. Joseph: ESO fills the gap; once
  Hatzalah Web access/API arrives the counts come from there (source "web") and the import
  becomes automatic.
- **ESO (Nov 22, 2026):** ESO Insights is Sisense (`sisense.esosuite.net`). With Joseph
  signed in, the Sisense REST API answers from a page on that origin: `GET
  /api/v1/dashboards/<oid>/widgets` and `POST /api/datasources/EMS/jaql` with dims
  `[Incident Crew.Crew Full Name]`, `[Incident Crew.Crew Standard Role]` (Lead / Driver /
  Other / Unknown), `[Incident Response.Incident Number]` (count), `[Incident Response.ESO
  Record Created Date (Calendar)]` (level quarters/days). Dashboard oid
  `6a220de01e1bb32c965a7efd` ("Responder Contribution Dashboard"). This only works from
  Joseph's browser session — no key for the background script. His Insights license is
  Viewer (no Query Builder / scheduled export); a colleague with a creator license was
  asked to set up a weekly Query Builder export (Crew Full Name, ESO Record Created Date,
  Crew Standard Role, Incident Number, last 120 days, CSV) to app@houstonhatzalah.org —
  when it arrives as an attachment, the Apps Script can import it on its own (not built
  yet; the app's `csParse` is the reference for the format). Never browse ESO patient
  records; Insights/Analytics only.
- **1.15.0** (Nov 21, 2026): the admin view of the **Certifications**
  screen hides members whose roster row is inactive (or who are no longer on the roster)
  behind a "Show N inactive members" toggle at the bottom (`certRowActive`,
  `CERT.showInactive`); shown rows carry a grey INACTIVE tag; a search still finds them.
  The reminder emails already skipped inactive members — only the screen listed them.
  Tests: smoke 64. Preview: `node preview-certs-inactive.js` in scratch/catalog.
- **1.14.0** (Nov 20, 2026) — **supply request archive:** `db/add_supply_archive.sql` (already applied live Nov 20, 2026: columns
  `archived_at`, `archived_by`, `kept` on `supply_requests`; settings row 57 **Supply
  Archive Days** = 30). A request counts as archived when `archived_at` is set, or when it
  is In stock with `status_at` older than Supply Archive Days and `kept` is false
  (`srIsArchived`; computed on read, no nightly job). Admin → Supply requests: new
  **Archived (n)** chip (newest archived first, greyed chip), the working filters, counts
  and badge use `srLive()`; detail has **Archive now** (asks first when the request is
  still open/ordered; writes archived_at/archived_by) and, on an archived one, a grey note
  + **Unarchive** (clears archived_at, sets kept=true so the day rule leaves it alone).
  The member's bag ignores archived requests (`jbReqFor`). Help text updated ("In stock
  once it is waiting in the stock room … move to Archived on their own after N days").
  Supply Archive Days is editable in the Organisation settings card. Tests: jumpbag 77.
  Preview: `node preview-peritem.js` in scratch/catalog → out/preview/archive-*.png.
  No script change.
- **1.13.0** (Nov 20, 2026): Organisation settings card shows **Send From** /
  **Send From Name** (rows 55–56) — the address and name every email goes out from; the
  background script reads them (see the Apps Script v55 note below).
- **1.12.0** (Nov 19, 2026): **per-item status on supply requests.** In the admin
  detail every line of a request with 2+ items has its own Ordered · In stock · Reopen
  buttons; the big buttons became "Mark all ordered / Mark all in stock / Reopen all" and
  act only on the items not there yet. Each item carries `status`, `status_by`,
  `status_at` inside the `items` jsonb (no schema change); items saved before this have no
  status and inherit the request's (`srItemSt`); the first per-item tap writes an explicit
  status on every item. The request's own `status` is derived (`srDerive`: In stock only
  when every item is; Ordered when anything is ordered or in stock; else Open), so the
  filters, badge and older script paths keep working. The list chip shows the mix
  ("1 in stock · 1 ordered"). Every tap sends `restock_status` with `items:[indexes]`; the
  script emails/pushes the member about those items only (one email per tap, as Joseph
  asked). The member's My Jump Bag line now reads per item: "Requested", "Ordered" or
  "✅ In stock — pick it up from <Pickup Location>" (green); an in-stock note disappears once
  the member touches that item again (their `updated_at` newer than the item's `status_at`).
- **1.11.0** (Nov 19, 2026): supply-request status "Done" reads **"In stock"**
  everywhere (button "Mark in stock", filter chip, detail); a **Remind to restock** button
  at the bottom of Admin → Jump bags → member (asks first, calls the script's
  `jumpbag_remind`; in the demo it only shows a toast); the **Pickup Location** setting in
  the Organisation card (default "the stock room", row 54 in `settings`).
- **1.10.0** (Nov 12, 2026). 1.8.0 made the demo fully functional on sample data;
  1.8.1 added Settings → Analytics tracking, the Logo upload card and the demo "view as
  member" switch (`localStorage.hoh_demo_as = "H-101"`); 1.9.0 added Settings → Standings
  and made the My Standing preview read from them; 1.10.0 added a **"How to renew" note
  per certification** in Admin → Certifications (saved as settings rows named
  `Cert Note (<column>)`, e.g. `Cert Note (coh_ambulance_permit_exp)`, created on first
  save by `putSetting()`; hidden from the plain Settings list). Both released straight to
  live on Joseph's say-so (beta still pinned).
- **Apps Script (Nov 12, 2026):** every email now goes out in the **branded layout**
  (`brandHtml()` in Code.gs: navy header with `logo-email.png`, colored status strip,
  facts box, the per-certification "How to renew" note placed before the sign-off, "Open
  the app" button, footer). `mailBoth(to, subject, body, bcc, brand)`. Group mail is
  **Bcc**: certification emails To the member, admins Bcc; supply-request and
  problem-report emails all Bcc. Preview any of it without sending:
  `node preview-emails.js` in scratch/email (runs the real Code.gs under Node →
  scratch/email/out/*.png). Deployed as web-app version 53 (Nov 19, 2026): supply-request
  status mail now says **back in stock, pick it up from <Pickup Location>** (jump bag → the
  member; ambulance inventory → the person who did the check, admins Bcc, "and restock the
  ambulance"); new doPost action `jumpbag_remind` (`remindJumpBag(unit, by)`) for the
  admin's Remind-to-restock button; `sendJumpBagTestToMe()` sends a sample jump bag email
  to yourself. Previews: `node preview-restock.js` in scratch/email.
  **Version 54 (Nov 19, 2026):** `restock_status` takes `items` (positions in the request's
  `items` array) → `notifyRestockStatus(id, idxs)` mails/pushes about those items only, with
  the status read from the items themselves (`restockItemStatus`), subject naming the item
  ("Back in stock: Lancets", "Ordered: Test Strips"), and a "Still to come from this
  request" list of the other items (ordered / not yet ordered). No list = all items, as
  before. The "Pick up from" fact box capitalises the place ("The stock room").
- `logo-email.png` is the shield cut out of the 512 icon (transparent); `logo.png` has a
  white background baked in and is still what the app itself uses.
- **Feature catalog PDF**: generated from the demo by `scratch/catalog/` (see below).
  The Scheduler map screen can't be captured in the sandbox (no map tiles); a hand-taken
  screenshot lives in `scratch/catalog/manual/` and is used automatically.
- **Apps Script version 55 (Nov 20, 2026) — emails from app@:** every email now goes out
  as **Hatzalah of Houston <app@houstonhatzalah.org>**; replies land in the app@ mailbox
  (Joseph has access; no Reply-To override). How: app@ is a verified "Send mail as" alias
  of the script account (Gmail → Settings → Accounts; the alias row still says "Joseph
  Eber" but the script sets its own display name), and `mailBoth()` sends through
  `GmailApp.sendEmail(..., {from, name})` when settings row 55 **`Send From`** names a
  verified alias (`mailSender()`, cached per run; otherwise falls back to `MailApp` and
  logs why); row 56 **`Send From Name`** is the display name (falls back to Org Name).
  Bcc-only mail is addressed To the sender. Referencing GmailApp added the Gmail scope —
  Joseph authorized it himself on Nov 20, 2026 (Claude never clicks Allow). Verified with
  `sendTestToMe`: arrived From app@. Same version: organization voice — the admin's name
  moved out of the sentence into the facts box ("Requested by" on the Remind email,
  "Ordered by" on Ordered, "Restocked by" added to the ambulance in-stock box); fallback
  subjects trimmed to match the settings (the three `Cert Email Subject` rows lost their
  "— Hatzalah of Houston" tail the same day). Tests: gs-jumpbag 35 (`runReal` covers the
  sender logic). Editor copy == `git show cacd212:apps-script/Code.gs`.
- **Pinned (agreed, not started):** automatic test gate (GitHub Actions running
  `scratch/tests`), health watch (uptime ping + nightly check + client error table), a beta
  address, later Supabase Pro / splitting the single file.
- **Open:** an announcement draft about the Quick Actions redesign (Joseph decides whether
  to post it); Google account owners for the private note; Service-unit switches on members.
- **Supply requests** are in daily use — treat that flow as production-critical.
- **Not ours — leave alone:** the Supabase project also hosts an edge function
  **`cf26-relay`** (added Nov 2026) for Joseph's Chanukah Fest check-in system. It only
  relays requests to a Google script and writes nothing to this database. Do not edit,
  redeploy or delete it; Joseph removes it himself after Dec 6, 2026.
- **Database access (RLS), fixed Nov 12, 2026:** the leftover migration-era `"temp read"`
  policies (anon + authenticated, `using (true)`) were dropped from all 19 tables that had
  them. Every table now reads only through its `member read` / `admin read` / own-row
  policy, so the public anon key can no longer read roster, certifications, schedule, etc.
  Pre-login reads go through the security-definer RPC `guest_demo`; the backup script and
  push worker use the service key, so neither was affected. Side effect: a deactivated
  member now sees empty screens instead of being bounced to sign-in. Audit query:
  `select tablename, policyname, roles from pg_policies where schemaname='public'`.
- **Waiting on others:** SETRAC / Juvare reply about an EMResource hospital-status feed
  (Joseph emailed; the Resource Status API is a paid Juvare feature needing an agreement);
  the API contact for the personal call-statistics "standing board" (Joseph asked for pull).
- **Standings (call-activity tiers):** nothing real is built yet — no call data exists in
  the app; it will come from the outside call-data API (pull on a schedule) once Joseph gets
  access. The rule (Joseph, Nov 12 2026):
  - **Observer** = new members. No call minimum; they stay Observer until an admin moves
    them to Backup by hand (Admin → Members → Role & access → Status).
  - **Backup** and **Primary** have minimums in calls per **quarter**, set in **Admin →
    Settings → Standings** (`Standings Primary Minimum`, `Standings Backup Minimum`; rows
    50–51 in `settings`). The current 15 / 6 are placeholders; Joseph will set the real
    numbers when this goes live.
  - The only **automatic** move: a Primary who doesn't reach the minimum in a quarter drops
    to Backup, unless an admin overrides (the Status dropdown is the override).
  - Wanted alongside it: a warning to the member ("You haven't reached your minimum this
    quarter — speak to an administrator"). It is an emergency app, so **never a pop-up on
    open**; proposed: amber dot on the header status badge + the message on My Standing,
    maybe a push near quarter end.
  - **Still to decide before wiring (ask Joseph):** which number drops a Primary (the
    Primary minimum or the Backup minimum); what the Backup minimum does, since a Backup
    never drops automatically (flag to admin only?); whether moving up is ever automatic;
    exactly where the warning shows.
  The **My Standing** screen (`openStanding()`, `standingTiers()`; opens from the status
  badge in the header) reads the two settings; the quarter and days left are real, the call
  count is an example, and it stays labelled "Coming soon" until the feed is wired.
  Preview script: `node ../catalog/preview-standings.js` from scratch/tests.

## Running things

```
cd scratch/tests && npm install && npm test        # all harnesses (jsdom; ~2 min)
cd scratch/tests && npm run catalog                # screenshots → PDF in scratch/catalog/out/
cd scratch/catalog && node preview-peritem.js      # per-item supply request screens → out/preview/
cd scratch/catalog && node preview-callstats.js    # My Standing + Admin → Call stats → out/preview/
```

`scratch/demo/build_demo_data.py` rebuilds `demo/demo-data.js` from the SQL in `db/`.
The demo is entered from the sign-in screen: **View demo** → a passcode from Admin →
Guest codes. Everything in it is in memory; **Start over** resets.

## Map of the code (index.html)

All Supabase calls go through `sbFetch()`; in demo mode `demoServe()` answers them from
memory. Settings: `SETTING_GROUPS` (grouped cards), `applyAnalytics()`, `applyLogo()`.
Admin navigation: `ADM_GROUPS` → picker on phones, sidebar on desktop. Quick Actions:
`.qa` sheet. Scene timer: `scOpen()`; CPR tracker; `renderGlobal()` is the one search box.
Service-worker update guards: `restartAllowed()`, `nudgeWaiting()`, `timedFetch()`.
