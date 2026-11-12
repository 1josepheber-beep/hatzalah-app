# Hatzalah of Houston member app — how it's built

This is the member app that lives at **houstonhatzalahapp.org**: one installable web app
(a PWA) with tiles for hospitals, protocols, the ERG, responder availability, certifications,
the task book, ambulance checkoffs, each member's jump bag, supply requests, announcements and
the admin portal. About fifty members use it on their phones.

This page is the map of every moving part, so that anyone — Joseph, a future admin, or a
developer picking it up cold — can see what runs where, where the keys are kept, how a release
goes out and how to undo one. The actual account names and console links are deliberately
**not** in here (this repo is public); they are in a private note kept outside the repo.

---

## 1. The pieces

| Piece | What it does | Where it lives | Owned by |
|---|---|---|---|
| **The app** | `index.html` (one file: all screens, styles and code) + `sw.js` (the service worker: offline cache and the update prompt) | This repo, branch `main`, served by **GitHub Pages** | The GitHub account that owns this repo |
| **Domain** | `houstonhatzalahapp.org` → GitHub Pages (`A` records to GitHub's four IPs, `www` → the github.io name). The `CNAME` file in this repo tells GitHub the domain | The domain registrar (Namecheap name servers) | The registrar account |
| **Database, sign-in, file storage** | Supabase: Postgres tables with row-level security, Google sign-in, two Storage buckets — `image` (public: cabinet and equipment photos) and `docs` (private: certification documents, checklist photos, signed links) | Supabase project (the `SB_URL` in `index.html`) | The Supabase account |
| **Google sign-in** | Google Identity Services on the phone → Supabase checks the Google token. A member can sign in only if their address is on the roster | OAuth client ID is in `index.html`; the client itself is in a Google Cloud project | A Google account (see the private note) |
| **Background jobs** | A Google Apps Script project (`apps-script/Code.gs`): three nightly triggers and a small web app the app calls (see §2) | Apps Script, under the Hatzalah Google Workspace admin account | The Workspace admin account |
| **Email** | Everything the app emails (cert reminders, jump bag reminders, restock requests, problem reports) is sent by the Apps Script from that same Workspace account | Apps Script `MailApp` | The Workspace admin account |
| **Push notifications** | A Cloudflare Worker (`push-worker/worker.js`, name `hoh-push`) that encrypts and sends Web Push to every phone that allowed notifications. Phones' subscriptions are in the `push_subs` table | Cloudflare Workers | The Cloudflare account |
| **Analytics** | Google Analytics 4: every tile tap is an event and a page view (`/tile/<name>`), with the member's unit as the user. Google Tag Manager and a Meta Pixel can be added the same way | The IDs live in **Admin → Settings → Analytics tracking** (the built-in GA ID in `index.html` is only the fallback until Settings have loaded once on a phone) | A Google account (see the private note) |
| **Backups** | Every night the Apps Script copies **every table** into a Google Sheet in Drive → *Hatzalah App Backups* (kept 30 days). "Back up now" in the admin does the same on demand | Google Drive of the Workspace admin account | The Workspace admin account |

Other files in the repo: `equipment.html` + `equipment.js` (the ambulance equipment list),
`protocols/` + `proto_index.js` (the protocol book pages and their search index),
`erg/` + `erg_index.js` (the Emergency Response Guidebook), `apartments/` (apartment-complex
site plans for the finder), `cab*.webp` (cabinet photos), `offline-check.html`, the icons and
`manifest.webmanifest` (what makes it installable).

## 2. What runs on a schedule

All three are time-based triggers in the Apps Script project (Triggers page), run as the
Workspace admin account, on the **latest saved code**:

| Trigger | When (Central) | What it does |
|---|---|---|
| `nightlyBackup` | 3–4 am | Every table → a dated Google Sheet in *Hatzalah App Backups*; daily sheets older than 30 days go to the trash, the first of each month is kept for good |
| `nightlyTaskDocs` | 3–4 am | Regenerates the Task Book Google Doc of every member with progress; `nightlyCleanup()` removes schedule slots older than 7 days and profile-change log entries older than 30 |
| `dailyCertCheck` | 7–8 am | Certification expiry reminders (members + admins) → then `dailyJumpBagCheck()` (jump bag item expiry and "check your bag" reminders, email + push) → then `sweepRestockRequests()` (re-sends any restock request the app couldn't report) |

The script's **web app** (`doPost`) is what the app calls while someone is using it. The app
sends the shared secret with every call (setting *Renewal Webhook Secret*):

| `action` | Triggered by |
|---|---|
| `backup` | Admin → *Back up now* |
| `report` | *Send a report* (a member's note + the phone's diagnostics log → every active admin) |
| `restock` | *Request restock* (jump bag) or *Order needed* (inventory check) → emails + pushes to admins and service units |
| `restock_status` | An admin / service unit marks a request Ordered or Done → the member is told |
| *(unit only)* | Instant certification-renewal email for one member |

## 3. Where the secrets live

Nothing secret is in this repo, and nothing secret is in the app. If any of these ever lands in
`index.html` or in a commit, rotate it (Supabase → Project Settings → API → new key, then update
every place below that uses it).

| Secret | Lives in | Used by |
|---|---|---|
| Supabase **service_role** key (bypasses all row security) | Apps Script → Project Settings → Script Properties → `SB_SERVICE_KEY`; Cloudflare worker → Settings → Variables and Secrets → `SUPABASE_SERVICE_KEY` | The nightly jobs, the web app, the push worker. **Never the app** |
| Supabase **anon** key | `index.html` (`SB_ANON`) — public by design; row-level security is what protects the data | The app |
| Webhook secret + web-app URL | Supabase `settings` table → *Renewal Webhook Secret* / *Renewal Webhook URL* | The app sends them; `doPost` checks the secret |
| Cron key (lets the nightly script send pushes) | Cloudflare secret `CRON_KEY` **and** Script Property `PUSH_CRON_KEY` — the same string in both | Apps Script → worker |
| Push (VAPID) keys | Cloudflare secrets `VAPID_PUBLIC`, `VAPID_PRIVATE_JWK`, `VAPID_SUBJECT`; the public half is also in the setting *Push Public Key* | Worker signs every push; phones subscribe with the public key |
| Worker config | Cloudflare vars `SUPABASE_URL`, `ALLOWED_ORIGIN` (`https://houstonhatzalahapp.org`); the worker's address is in the setting *Push Worker URL* | Worker, app |
| Fallback admin addresses | Script Property `ADMIN_EMAILS` (`a@…, b@…`), used only if the roster has no active admin | Apps Script |
| `TEST_EMAIL` (optional) | Script Property; where `sendTestToMe()` sends its one test email | Apps Script |
| Google OAuth client ID, GA property ID | `index.html` — public by design (the GA ID is also a Settings row) | Sign-in, analytics |

After changing any Script Property, run `checkConfig()` from the Apps Script editor: it says
which properties are set and whether Supabase answers with the key.

## 4. How a release goes out

1. Edit `index.html` and/or `sw.js`.
2. **Bump the version in six places**: `Version x.y.z` appears five times in `index.html`
   (`APP_VERSION`, two version lines, two profile screens — a find-and-replace of the old
   number gets all five) and once as `VERSION = "x.y.z"` in `sw.js`. The
   service worker only updates when `sw.js` changes, so a release without the bump leaves
   members on the old app.
3. Run the checks (the jsdom test harnesses — being moved into this repo with the automatic
   gate; until then they run from Joseph's working session).
4. Commit and push to `main`. GitHub Pages publishes within about a minute. Open
   `houstonhatzalahapp.org/sw.js` and look for the new `VERSION` to confirm.
5. Members get the "update ready" prompt the next time they open the app. The version line is
   at the bottom of the Profile screen.

Changes that need more than a push:

- **Database** — run the SQL in Supabase → SQL Editor (the "Potential issue detected" dialog
  for `delete`/`alter`/`drop` → *Run query*). Keep the file in `db/` so the change is on record.
  Every new table needs row-level-security policies or the app sees it as empty (see
  `db/security_rules.sql` and any `db/add_*.sql` for the pattern).
- **Apps Script** — paste the file into the editor, `Ctrl+S`. Triggers pick up the saved code
  automatically. **But the web app (`doPost`) runs a deployed version**: Deploy → Manage
  deployments → pencil → Version: *New version* → Deploy. The URL stays the same. Forgetting
  this is the single most common "I changed it and nothing happened".
- **Push worker** — Cloudflare → Workers → `hoh-push` → Edit code → paste → Deploy. Open the
  worker's address in a browser: it answers `{"ok":true,"version":N}`; bump `WORKER_VERSION`
  in the file so you can tell.
- **Tiles, settings, email wording, reminder days** — no code at all: Admin → the relevant
  section (tiles and settings are rows in the `tiles` and `settings` tables).

## 5. How to roll back

- **The app** (bad release): GitHub Desktop → History → right-click the bad commit → *Revert
  changes in commit* → Push origin. About a minute to go live. The reverted `sw.js` counts as a
  change, so phones move back to the previous version on their own. Roll back first, debug
  second — `index.html` is one file, and one broken line blanks the whole app for everyone.
- **Apps Script**: Deploy → Manage deployments → pencil → pick the previous version → Deploy.
  For the code itself, the editor's *Project history* (clock icon) shows every saved version.
- **Push worker**: Cloudflare → the worker → Deployments → roll back to the previous one.
- **Database rows** (something deleted or overwritten): last night's sheet in Drive →
  *Hatzalah App Backups* has every table; copy the rows back with an `insert`/`update`.
  There is no automatic undo for SQL — read a file before running it.

## 6. Gotchas that have already cost time

- Apps Script web app = deployed version, not saved code (§4).
- A Supabase table without policies looks **empty** to the app; the SQL editor (which runs as
  the owner) still shows the rows, which is confusing.
- Forgetting the `sw.js` version bump → members keep the old app.
- Push on iPhone only works for the **installed** app (Share → Add to Home Screen), iOS 16.4+.
  Android works from the browser too.
- The *Service unit* switch on a roster row decides who gets restock requests (admins always do).
- Emails sent by the script count against the Workspace account's daily sending limit.
- A member whose roster email differs from the Google account they sign in with can't get in —
  the roster address is the key.
- The phone's diagnostics log ("Send a report" on the Profile screen) is the fastest way to
  understand "it kicked me out" — it records opens, updates, sign-outs and every failed request.

## 7. Is everything alive? (the manual check)

- App: open `houstonhatzalahapp.org` → Profile → version line matches the last release.
- Push: open the worker address → `{"ok":true,"version":N}`.
- Apps Script: Triggers page → last run times from this morning and 0% error rate; the
  Executions page shows each run's log.
- Backups: Drive → *Hatzalah App Backups* → today's file exists.
- Database and storage: Admin → the storage % badge; Supabase dashboard → Project health.
- Sign-in: sign out and back in on one phone after any change to Supabase Auth or the roster.

## 8. Repo map

```
index.html            the whole app (screens, styles, code)
sw.js                 service worker: offline cache, update prompt, VERSION
manifest.webmanifest  install settings (name, icons, colors)
CNAME                 the custom domain for GitHub Pages
tile-icons/           the home-screen tile images
apps-script/Code.gs   the background jobs + web app (paste into Apps Script; no secrets inside)
push-worker/worker.js the push sender (paste into the Cloudflare worker; secrets are Cloudflare vars)
db/                   the SQL that built and changed the database, oldest first by name:
                      schema.sql, security_rules.sql, then add_*.sql / fix_*.sql per feature
db/tools/             read-only health checks (settings, unused images)
equipment.html/.js    ambulance equipment list
protocols/ erg/       protocol book and ERG pages + their search indexes
apartments/           apartment-complex site plans
demo/                 demo mode: demo-data.js (sample tables: real lists, invented people),
                      sample.pdf and sample-photo.jpg (stand-ins for uploaded documents)
```

## 9. Demo mode

A guest passcode (Admin → Guest codes; the *Guest Demo* setting turns the whole thing on
or off) opens the complete app on sample data. In demo mode every read and write the app
makes goes to an in-memory copy of the database built from `demo/demo-data.js`, so a
visitor can tap through every tile and every admin section, change things, and nothing
reaches Supabase; "Start over" or "Exit demo" throws the changes away. People, phones,
addresses, codes, certifications and documents in the sample data are invented; the lists
(hospitals, equipment, jump bag items, vitals, task book, tiles, settings) are the real ones.
The data file is generated by `scratch/demo/build_demo_data.py` from the SQL in `db/`; the
time-based parts (who is on shift, jump bags, checkoffs) are made fresh each time the demo
starts, so dates are always "now".

The feature catalog PDF (every screen and setting, phone and desktop) is generated from the
demo by the three scripts in `scratch/catalog/`: `catalog-shots.js` takes the screenshots
with Playwright, `catalog-slice.py` splits the tall admin captures at card gaps, and
`catalog-build.js` lays out the pages and prints the PDF. Re-run them after a release.

`db/` holds structure and templates only — never member data. The data lives in Supabase and
in the nightly backup sheets.
