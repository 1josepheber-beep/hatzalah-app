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
3. **Batch releases.** Several fixes/features go out as one tested version; bump
   `Version x.y.z` in `index.html` (five places) and `VERSION` in `sw.js`.
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
9. **Apps Script gotcha:** a change to `doPost`/`doGet` needs Deploy → Manage deployments →
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

- **Live: 1.8.1** (Nov 12, 2026). 1.8.0 made the demo fully functional on sample data;
  1.8.1 added Settings → Analytics tracking (GA / GTM / Meta Pixel IDs, validated, with a
  "Replace the current analytics ID?" confirmation), the Logo upload card, and the demo
  "view as member" switch (`localStorage.hoh_demo_as = "H-101"`).
- **Feature catalog PDF**: generated from the demo by `scratch/catalog/` (see below).
  The Scheduler map screen can't be captured in the sandbox (no map tiles); a hand-taken
  screenshot lives in `scratch/catalog/manual/` and is used automatically.
- **Pinned (agreed, not started):** automatic test gate (GitHub Actions running
  `scratch/tests`), health watch (uptime ping + nightly check + client error table), a beta
  address, later Supabase Pro / splitting the single file.
- **Open:** an announcement draft about the Quick Actions redesign (Joseph decides whether
  to post it); Google account owners for the private note; Service-unit switches on members.
- **Supply requests** are in daily use — treat that flow as production-critical.

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
