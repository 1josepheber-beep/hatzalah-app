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
  editor (yeber@houstonhatzalah.org, authuser=2), Supabase dashboard, the live app.
  Tool outputs containing base64/hex/JWT are blocked; page text truncates at 50k chars.
- **The sandbox** can reach GitHub and npm/pip registries only — not Supabase, not the
  live site, not map tiles. Anything that needs the live backend goes through the MCP
  connector or Chrome.

## Where things stand (keep this section current)

- **Live: 1.9.0** (Nov 12, 2026). 1.8.0 made the demo fully functional on sample data;
  1.8.1 added Settings → Analytics tracking (GA / GTM / Meta Pixel IDs, validated, with a
  "Replace the current analytics ID?" confirmation), the Logo upload card, and the demo
  "view as member" switch (`localStorage.hoh_demo_as = "H-101"`); 1.9.0 added Settings →
  Standings (the two tier minimums) and made the My Standing preview read from them.
  Released straight to live on Joseph's "deploy everything pending" (beta still pinned).
- **Apps Script (Nov 12, 2026):** group mail now goes out **Bcc** — certification emails
  are To the member with admins in Bcc; supply-request and problem-report emails are all
  Bcc with the sending account in To (`mailBoth(to, subject, body, bcc)`).
- **Feature catalog PDF**: generated from the demo by `scratch/catalog/` (see below).
  The Scheduler map screen can't be captured in the sandbox (no map tiles); a hand-taken
  screenshot lives in `scratch/catalog/manual/` and is used automatically.
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
