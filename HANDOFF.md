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

- **UNRELEASED (committed locally, not pushed):** the admin view of the **Certifications**
  screen hides members whose roster row is inactive (or who are no longer on the roster)
  behind a "Show N inactive members" toggle at the bottom (`certRowActive`,
  `CERT.showInactive`); shown rows carry a grey INACTIVE tag; a search still finds them.
  The reminder emails already skipped inactive members — only the screen listed them.
  Tests: smoke 64. Preview: `node preview-certs-inactive.js` in scratch/catalog. Next
  release (1.15.0) when Joseph says so.
- **Live: 1.14.0** (Nov 20, 2026) — **supply request archive:** `db/add_supply_archive.sql` (already applied live Nov 20, 2026: columns
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
