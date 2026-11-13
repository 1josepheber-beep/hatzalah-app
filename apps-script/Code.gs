/**
 * Hatzalah of Houston — background jobs
 * Reads everything from SUPABASE. The Google Sheet's tabs are no longer used.
 * All member/admin editing happens in the app's Admin Portal.
 *
 * What this script still does:
 *   1. dailyCertCheck()  — the certification expiration reminder emails (daily trigger)
 *      + dailyJumpBagCheck() — jump bag expiration reminders, email + push (same trigger)
 *      + sweepRestockRequests() — restock requests the app could not report
 *   6. doPost "restock" / "restock_status" — restock request emails + pushes (web app)
 *   2. buildTaskDoc()    — generates a member's EMT Task Book as a Google Doc
 *   3. rebuildAllTaskDocs() — run by hand to regenerate every task book doc
 *   5. sendProblemReport() — mails a member's "Send a report" (their note plus the
 *                           app's diagnostics and event log) to every active admin
 *   4. nightlyBackup()    — copies EVERY database table into a Google Sheet in
 *                           Drive > "Hatzalah App Backups", once a night (trigger)
 *                           and whenever an admin taps "Back up now" in the app
 */

// ===================== CONFIG =====================
// Nothing secret lives in this file, so it can sit in the public GitHub repo.
// The keys are Script Properties (Project Settings -> Script Properties):
//   SB_SERVICE_KEY  the Supabase service_role key (bypasses row security; never the anon key)
//   ADMIN_EMAILS    "a@..., b@..." fallback recipients when the roster has no active admin
//   PUSH_CRON_KEY   the same string as the push worker's CRON_KEY secret
//   TEST_EMAIL      (optional) where sendTestToMe() sends its one test email
// Run checkConfig() from the editor after changing any of them.
var SB_URL  = "https://gcvbohdarppaolqhdnri.supabase.co";
var APP_URL = "https://houstonhatzalahapp.org";
var SB_KEY  = scriptProp_("SB_SERVICE_KEY");
var ADMIN_EMAILS = scriptProp_("ADMIN_EMAILS");

function scriptProp_(name){
  try { return String(PropertiesService.getScriptProperties().getProperty(name) || "").trim(); }
  catch (e) { return ""; }
}

/** Run this by hand after editing Script Properties: says what is set and whether Supabase answers. */
function checkConfig(){
  var missing = ["SB_SERVICE_KEY","ADMIN_EMAILS","PUSH_CRON_KEY"].filter(function(k){ return !scriptProp_(k); });
  Logger.log(missing.length ? "MISSING Script Properties: " + missing.join(", ") : "All Script Properties set.");
  var rows = sbGet("settings", "select=setting&limit=1");
  Logger.log(rows.length ? "Supabase answers with the service key." : "Supabase did NOT answer -- check SB_SERVICE_KEY.");
  Logger.log("Admin fallback: " + (ADMIN_EMAILS || "(none)") + "   Roster admins: " + adminRecipients());
}

// ===================== SUPABASE HELPERS =====================
function sbGet(table, query){
  var url = SB_URL + "/rest/v1/" + table + "?" + (query || "select=*");
  var res = UrlFetchApp.fetch(url, {
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    Logger.log("Supabase read failed for " + table + ": " + res.getResponseCode() + " " + res.getContentText());
    return [];
  }
  try { return JSON.parse(res.getContentText()) || []; } catch (e) { return []; }
}
function sbAll(table){
  // pages through tables larger than 1000 rows
  var out = [], page = 0;
  while (true) {
    var chunk = sbGet(table, "select=*&order=id.asc&limit=1000&offset=" + (page * 1000));
    out = out.concat(chunk);
    if (chunk.length < 1000) break;
    page++;
    if (page > 20) break;
  }
  return out;
}
function sbInsert(table, row){
  var res = UrlFetchApp.fetch(SB_URL + "/rest/v1/" + table, {
    method: "post",
    contentType: "application/json",
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Prefer: "return=minimal" },
    payload: JSON.stringify(row),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code >= 300) {
    // This used to fail silently, which is how 27 reminders got sent without a
    // single one being recorded. Without the log the gap rules cannot work and
    // people get chased over and over.
    Logger.log("WRITE FAILED on " + table + ": " + code + " " + res.getContentText());
  }
  return code < 300;
}
function sbPatch(table, query, patch){
  var res = UrlFetchApp.fetch(SB_URL + "/rest/v1/" + table + "?" + query, {
    method: "patch",
    contentType: "application/json",
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Prefer: "return=minimal" },
    payload: JSON.stringify(patch),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  if (code >= 300) Logger.log("PATCH FAILED on " + table + ": " + code + " " + res.getContentText());
  return code < 300;
}
function sbDelete(table, query){
  var res = UrlFetchApp.fetch(SB_URL + "/rest/v1/" + table + "?" + query, {
    method: "delete",
    headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Prefer: "return=minimal" },
    muteHttpExceptions: true
  });
  return res.getResponseCode() < 300;
}

// ===================== SMALL UTILITIES =====================
function normUnit(u){ return String(u == null ? "" : u).toLowerCase().replace(/[^a-z0-9]/g, ""); }
function isX(v){ v = String(v == null ? "" : v).trim().toLowerCase(); return v === "x" || v === "yes" || v === "true"; }
function isNAv(v){ v = String(v == null ? "" : v).trim().toLowerCase(); return v === "na" || v === "n/a"; }
function parseDate(v){
  if (!v) return null;
  var s = String(v).trim();
  if (!s || isNAv(s)) return null;
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);          // M/D/YYYY
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);                     // YYYY-MM-DD
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function settingsMap(){
  var rows = sbAll("settings"), m = {};
  rows.forEach(function(r){ if (r.setting) m[String(r.setting).trim().toLowerCase()] = String(r.value == null ? "" : r.value); });
  return m;
}
function getSet(m, key, def){
  var v = m[String(key).toLowerCase()];
  return (v == null || v === "") ? (def || "") : v;
}
function fillTpl(tpl, map){
  return String(tpl).replace(/\{(\w+)\}/g, function(mm, k){
    k = k.toLowerCase();
    return (map[k] !== undefined && map[k] !== null) ? String(map[k]) : mm;
  });
}
// Turn a certifications row into a list of {name, expCol, expVal}
function certPairs(row){
  var out = [], seen = {};
  for (var k in row) {
    if (k === "id" || k === "unit" || k === "last_name" || k === "first_name" || k === "paused") continue;
    if (!/_exp$/.test(k)) continue;
    var base = k.replace(/_exp$/, "");
    if (seen[base]) continue;
    seen[base] = 1;
    var pretty = base.replace(/_/g, " ").replace(/\b\w/g, function(c){ return c.toUpperCase(); })
                     .replace(/\bNum\b/g, "#").replace(/\bNremt\b/g, "NREMT").replace(/\bAcls\b/g, "ACLS")
                     .replace(/\bPals\b/g, "PALS").replace(/\bBls\b/g, "BLS").replace(/\bHipaa\b/g, "HIPAA")
                     .replace(/\bEvoc\b/g, "EVOC").replace(/\bCoh\b/g, "COH").replace(/\bEmt\b/g, "EMT");
    out.push({ name: pretty, expCol: k, numCol: (row[base + "_num"] !== undefined ? base + "_num" : null) });
  }
  return out;
}

// ===================== 1. DAILY CERT REMINDERS =====================
/**
 * Cadence: monthly from "Cert Reminder Days" (default 90) down to 30 days out,
 * then weekly through the final 30 days, then the expired notice weekly until renewed.
 * Also auto-cleans reminder rows whose expiration no longer matches (i.e. renewed).
 */
function dailyCertCheck(onlyUnit){
  // A time-driven trigger hands the function an event object. Taken as a unit
  // it matched nobody, so every scheduled run examined 0 members and reported
  // 0 sent, while manual runs -- which pass nothing -- worked fine.
  if (onlyUnit && typeof onlyUnit !== "string") onlyUnit = "";
  // The jump bag reminders ride on the same daily trigger. They never stop the
  // certification run: a failure there is logged and the certs still go out.
  if (!onlyUnit) { try { dailyJumpBagCheck(); } catch (e) { Logger.log("jump bag check failed: " + e); } }
  if (!onlyUnit) { try { sweepRestockRequests(); } catch (e) { Logger.log("restock sweep failed: " + e); } }
  var S = settingsMap();
  var remindDays = parseInt(getSet(S, "cert reminder days", "90"), 10);
  if (isNaN(remindDays) || remindDays <= 0) remindDays = 90;
  // The days before expiry on which a reminder goes out. Each fires once. A
  // run that was missed catches up on the next day, still only once.
  var milestones = String(getSet(S, "cert reminder milestones", "")).split(/[,\s]+/)
                     .map(function(x){ return parseInt(x, 10); })
                     .filter(function(n){ return !isNaN(n) && n > 0 && n <= remindDays; });
  if (!milestones.length) milestones = [90, 60, 30, 14, 7, 3, 1].filter(function(n){ return n <= remindDays; });
  milestones.sort(function(a, b){ return b - a; });                       // biggest first

  var tplSubjExpiring = getSet(S, "cert email subject (expiring)", "").trim();
  var tplBodyExpiring = getSet(S, "cert email body (expiring)", "");
  var tplSubjExpired  = getSet(S, "cert email subject (expired)", "").trim();
  var tplBodyExpired  = getSet(S, "cert email body (expired)", "");
  // Certifications that actually stop someone responding to patients.
  // Anything not listed is treated as operational/administrative and gets
  // softer wording (e.g. a city ambulance permit affects driving, not care).
  var blockRaw = getSet(S, "certifications that block response", "").trim();
  // "(none)" is written by the admin portal to mean "nothing blocks response"
  var blockNone = (blockRaw.toLowerCase() === "(none)");
  var blockList = blockNone ? ["~none~"]
                : blockRaw.split(",").map(function(x){ return x.trim().toLowerCase(); })
                          .filter(function(x){ return x; });
  var tplSubjExpiredSoft = getSet(S, "cert email subject (expired, non-blocking)", "").trim();
  var tplBodyExpiredSoft = getSet(S, "cert email body (expired, non-blocking)", "");

  var certs   = sbAll("certifications");
  var roster  = sbAll("roster");
  var log     = sbAll("cert_reminders");
  // Scheduled runs kept reporting 0 with no clue why. Say what was read, so a
  // failed table read cannot look like "nothing was due".
  Logger.log("Read: certifications " + certs.length + ", roster " + roster.length +
             ", reminder log " + log.length + (onlyUnit ? "  (only " + onlyUnit + ")" : ""));
  if (!certs.length) {
    Logger.log("STOPPING: the certifications table came back empty. Nothing can be checked.");
    return;
  }
  if (!certs.length) { Logger.log("No certifications found."); return; }

  var emailByUnit = {}, personalByUnit = {}, activeByUnit = {}, onRoster = {};
  var adminTo = [];
  roster.forEach(function(r){
    var u = normUnit(r.unit);
    if (!u) return;
    onRoster[u] = true;
    emailByUnit[u] = String(r.email || "").trim();
    personalByUnit[u] = String(r.personal_email || "").trim();
    var a = String(r.active == null ? "" : r.active).trim().toLowerCase();
    activeByUnit[u] = !(a === "no" || a === "off" || a === "false" || a === "0");
    // Every ACTIVE admin on the roster is copied on cert mail, so granting
    // someone admin in the app is all it takes - no script edit needed.
    var isAdm = String(r.admin == null ? "" : r.admin).trim().toLowerCase();
    if (activeByUnit[u] && (isAdm === "x" || isAdm === "yes" || isAdm === "true" || isAdm === "1")) {
      var ae = emailByUnit[u];
      if (ae && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ae) && adminTo.indexOf(ae) < 0) adminTo.push(ae);
    }
  });
  // Fall back to the built-in list if the roster failed to load or nobody is
  // flagged admin, so a bad read can never leave these emails going nowhere.
  var ADMIN_TO = adminTo.length ? adminTo.join(", ") : ADMIN_EMAILS;
  Logger.log("Cert mail admin recipients: " + ADMIN_TO);

  var TZ = Session.getScriptTimeZone(), DAY = 86400000;
  function ymd(d){ return Utilities.formatDate(new Date(d), TZ, "yyyy-MM-dd"); }
  var today = new Date(); today.setHours(0, 0, 0, 0);

  // most recent log entry for a unit+cert+expiry
  function lastSend(uk, cert, exp, col){
    var L = null, ph = "";
    log.forEach(function(row){
      if (normUnit(row.unit) !== uk) return;
      // Match on the underlying column when we have it; fall back to the name.
      // Renaming a certification used to look like "never sent" and start over.
      var rc = String(row.cert_col || "").trim();
      if (rc) { if (rc !== col) return; }
      else if (String(row.certification || "").trim() !== cert) return;
      var rd = parseDate(row.exp_date);
      if (!rd || ymd(rd) !== exp) return;
      var w = parseDate(row.when_at) || new Date(row.when_at);
      if (w && (!L || w > L)) { L = w; ph = String(row.type || "").trim(); }
    });
    return { when: L, phase: ph };
  }

  var howto = "To renew it in our system: open the Hatzalah of Houston app (" + APP_URL +
              "), tap Certifications, enter the new expiration date, and upload a copy of your renewed certification when prompted.";
  var closing = "Thank you very much for your attention to this matter.\n\nSincerely,\nHatzalah of Houston Administration";
  var validKeys = {}, sent = 0, cleared = 0, logFails = 0, examined = 0, looked = 0;
  // wording for the "you renewed it" confirmation
  var tplSubjFixed = getSet(S, "cert email subject (renewed)", "").trim();
  var tplBodyFixed = getSet(S, "cert email body (renewed)", "");

  var onlyKey = onlyUnit ? normUnit(String(onlyUnit)) : "";
  certs.forEach(function(cr){
    var unit = String(cr.unit || "").trim();
    if (!unit) return;
    var uk = normUnit(unit);
    // When the app asks us to check one person, skip everybody else.
    if (onlyKey && uk !== onlyKey) return;
    examined++;
    // Don't chase people who have been deactivated or removed from the roster.
    // Only applied when the roster really loaded, so a failed read can't
    // silently stop everyone's reminders.
    if (roster.length > 1) {
      if (!onRoster[uk]) return;
      if (activeByUnit[uk] === false) return;
    }
    var name = ((cr.first_name || "") + " " + (cr.last_name || "")).trim();
    var who = name ? (name + " (" + unit + ")") : unit;

    // The member is the only address in To; the admins ride along in Bcc, so
    // nobody sees anyone else's address. A member with no address at all gets
    // nothing, and the admins are then the To line so the reminder still lands.
    var memberTo = [];
    var em = emailByUnit[uk] || "";
    if (em && /@houstonhatzalah\.org$/i.test(em)) memberTo.push(em);
    var pers = personalByUnit[uk] || "";
    if (pers && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(pers) && memberTo.indexOf(pers) < 0) memberTo.push(pers);
    var to = memberTo.length ? memberTo.join(", ") : ADMIN_TO;
    var bcc = memberTo.length ? ADMIN_TO : "";

    // certifications this member has reminders paused on (set in the admin portal)
    var paused = String(cr.paused || "").split(",").map(function(s){ return s.trim(); })
                   .filter(function(s){ return s; });

    certPairs(cr).forEach(function(c){
      var skipNA = isNAv(cr[c.expCol]) || (c.numCol && isNAv(cr[c.numCol]));
      var skipPaused = paused.indexOf(c.expCol) >= 0;
      if (skipNA || skipPaused) {
        // keep the history so resuming later doesn't restart the whole cycle
        var ek = parseDate(cr[c.expCol]);
        if (ek) { ek.setHours(0,0,0,0);
                  validKeys[uk + "|" + c.name + "|" + ymd(ek)] = true;
                  validKeys[uk + "|COL:" + c.expCol + "|" + ymd(ek)] = true; }
        return;
      }
      var exp = parseDate(cr[c.expCol]);
      if (!exp) return;
      exp.setHours(0, 0, 0, 0);
      var days = Math.round((exp - today) / DAY);
      var cert = c.name, e = ymd(exp);
      validKeys[uk + "|" + cert + "|" + e] = true;
      validKeys[uk + "|COL:" + c.expCol + "|" + e] = true;

      looked++;
      // Reminders used to go out every 7 days counted from the PREVIOUS
      // email, so the day counts drifted to wherever they happened to fall
      // and, after the log was emptied once, everyone marched in step. Now
      // they are pinned to the expiry date: the 14-day reminder goes out when
      // 14 days are left, full stop. A missed day catches up on the next run.
      var last = lastSend(uk, cert, e, c.expCol), due = false, phase = "";
      if (days <= 0) {
        // the day it lapses, then every week until it is renewed
        phase = "expired";
        if (!last.when || last.phase !== "expired") due = true;
        else {
          var ls = new Date(last.when); ls.setHours(0, 0, 0, 0);
          if (Math.round((today - ls) / DAY) >= 7) due = true;
        }
      } else {
        if (days > remindDays) return;
        // the most recently crossed milestone: smallest one that is >= days left
        var m = null;
        for (var mi = 0; mi < milestones.length; mi++) { if (milestones[mi] >= days) m = milestones[mi]; }
        if (m == null) return;
        phase = m + "d";
        // due unless something already went out since that milestone was crossed
        var crossed = new Date(exp.getTime() - m * DAY); crossed.setHours(0, 0, 0, 0);
        if (!last.when) due = true;
        else { var lw = new Date(last.when); lw.setHours(0, 0, 0, 0); if (lw < crossed) due = true; }
      }
      if (!due) return;

      var expNice = Utilities.formatDate(exp, TZ, "MMMM d, yyyy");
      var map = { name: (name || unit), unit: unit, cert: cert, date: expNice, days: Math.abs(days), link: APP_URL };
      var subj, body;
      if (phase === "expired") {
        // does this one actually stop them treating patients?
        var blocks = blockList.length === 0 ||
                     blockList.indexOf(cert.toLowerCase()) >= 0 ||
                     blockList.indexOf(c.expCol.toLowerCase()) >= 0;
        if (blocks) {
          subj = tplSubjExpired ? fillTpl(tplSubjExpired, map) : ("Your " + cert + " has expired \u2014 Hatzalah of Houston");
          body = tplBodyExpired ? fillTpl(tplBodyExpired, map)
               : ("Hi " + who + ",\n\nYour " + cert + " has expired. You are not permitted to respond to medical emergencies until your certification has been renewed, is up to date, and has been updated in our system.\n\n" +
                  howto + "\n\nSincerely,\nHatzalah of Houston Administration");
        } else {
          subj = tplSubjExpiredSoft ? fillTpl(tplSubjExpiredSoft, map) : ("Action needed: your " + cert + " has expired \u2014 Hatzalah of Houston");
          body = tplBodyExpiredSoft ? fillTpl(tplBodyExpiredSoft, map)
               : ("Hi " + who + ",\n\nYour " + cert + " expired on " + expNice + ". This one does not stop you responding to " +
                  "patients, but it is required to stay current with the organization, and some duties may depend on it.\n\n" +
                  "Please renew it as soon as you can.\n\n" + howto + "\n\n" + closing);
        }
      } else {
        subj = tplSubjExpiring ? fillTpl(tplSubjExpiring, map) : ("Reminder: your " + cert + " expires in " + days + " day" + (days === 1 ? "" : "s") + " \u2014 Hatzalah of Houston");
        body = tplBodyExpiring ? fillTpl(tplBodyExpiring, map)
             : ("Hi " + who + ",\n\nThis is a reminder that your " + cert + " will expire in " + days + " day" + (days === 1 ? "" : "s") +
                ", on " + expNice + ". Please remember to renew it before the expiration date.\n\n" + howto + "\n\n" + closing);
      }
      var brand = { kind: "Certification reminder",
                    strip: phase === "expired" ? ("Expired " + (days === 0 ? "today" : Math.abs(days) + " day" + (Math.abs(days) === 1 ? "" : "s") + " ago")) : ("Expires in " + days + " day" + (days === 1 ? "" : "s")),
                    stripColor: phase === "expired" ? "red" : "gold",
                    facts: [["Certification", cert], ["Expires", Utilities.formatDate(exp, TZ, "MMM d, yyyy"), phase === "expired" ? "" : "\u00b7 " + days + " day" + (days === 1 ? "" : "s")]],
                    note: { title: "How to renew", text: certNote(S, c.expCol) },
                    footer: "You are receiving this because you are an active Hatzalah of Houston member. Reminders go out " + milestones.slice().sort(function(a, b){ return b - a; }).join(", ") + " days before a certification expires, then weekly once it has lapsed." };
      try { mailBoth(to, subj, body, bcc, brand); sent++; } catch (err) { Logger.log("Mail failed: " + err); }
      var stamp = Utilities.formatDate(new Date(), TZ, "M/d/yyyy h:mm a");
      if (!sbInsert("cert_reminders", { when_at: stamp, unit: unit, name: name, certification: cert, cert_col: c.expCol, exp_date: e, type: phase })) {
        logFails++;
      }
      log.push({ when_at: stamp, unit: unit, certification: cert, cert_col: c.expCol, exp_date: e, type: phase });
    });
    // ---- did anything get renewed since we last chased them? ----
    // A reminder logged against an OLD expiry date, where the cert now carries a
    // NEW future date, means they fixed it.
    var renewed = [];
    certPairs(cr).forEach(function(c){
      if (isNAv(cr[c.expCol]) || (c.numCol && isNAv(cr[c.numCol]))) return;
      var nowExp = parseDate(cr[c.expCol]);
      if (!nowExp) return;
      nowExp.setHours(0,0,0,0);
      if (nowExp <= today) return;                 // still expired - nothing to confirm
      var hadOld = false;
      log.forEach(function(row){
        if (normUnit(row.unit) !== uk) return;
        var rc = String(row.cert_col || "").trim();
        if (rc) { if (rc !== c.expCol) return; }
        else if (String(row.certification || "").trim() !== c.name) return;
        var rd = parseDate(row.exp_date);
        if (!rd) return;
        rd.setHours(0,0,0,0);
        if (rd.getTime() !== nowExp.getTime()) hadOld = true;   // logged against an older date
      });
      if (hadOld) renewed.push(c);
    });

    if (renewed.length) {
      // Check the WHOLE person before telling anyone they are cleared - renewing
      // one certification means nothing if another blocking one is still expired.
      var stillBlocking = [];
      certPairs(cr).forEach(function(c2){
        if (isNAv(cr[c2.expCol]) || (c2.numCol && isNAv(cr[c2.numCol]))) return;
        var e2 = parseDate(cr[c2.expCol]);
        if (!e2) return;
        e2.setHours(0,0,0,0);
        if (e2 > today) return;                    // still valid
        var isB = blockList.length === 0 ||
                  blockList.indexOf(c2.name.toLowerCase()) >= 0 ||
                  blockList.indexOf(c2.expCol.toLowerCase()) >= 0;
        if (isB) stillBlocking.push(c2.name);
      });

      renewed.forEach(function(c){
        var wasBlocking = blockList.length === 0 ||
                          blockList.indexOf(c.name.toLowerCase()) >= 0 ||
                          blockList.indexOf(c.expCol.toLowerCase()) >= 0;
        var newExp = parseDate(cr[c.expCol]);
        var newNice = Utilities.formatDate(newExp, TZ, "MMMM d, yyyy");
        var m2 = { name:(name||unit), unit:unit, cert:c.name, date:newNice, days:0, link:APP_URL };
        var s2 = tplSubjFixed ? fillTpl(tplSubjFixed, m2)
                              : ("Your " + c.name + " is up to date \u2014 Hatzalah of Houston");
        var b2txt;
        if (tplBodyFixed) {
          b2txt = fillTpl(tplBodyFixed, m2);
        } else if (!wasBlocking) {
          b2txt = "Hi " + who + ",\n\nThank you \u2014 your " + c.name +
                  " has been updated in our system and now expires " + newNice +
                  ". No further action is needed for this one.\n\nSincerely,\nHatzalah of Houston Administration";
        } else if (stillBlocking.length === 0) {
          b2txt = "Hi " + who + ",\n\nThank you \u2014 your " + c.name +
                  " has been updated in our system and now expires " + newNice +
                  ".\n\nYou are cleared to respond to medical emergencies.\n\nSincerely,\nHatzalah of Houston Administration";
        } else {
          b2txt = "Hi " + who + ",\n\nThank you \u2014 your " + c.name +
                  " has been updated in our system and now expires " + newNice + ".\n\n" +
                  "You are still not cleared to respond to medical emergencies, because the following " +
                  (stillBlocking.length === 1 ? "certification is" : "certifications are") + " expired: " +
                  stillBlocking.join(", ") + ". Please renew " +
                  (stillBlocking.length === 1 ? "it" : "them") + " as well.\n\n" +
                  howto + "\n\nSincerely,\nHatzalah of Houston Administration";
        }
        var brand2 = { kind: "Certification renewed", strip: "Up to date", stripColor: "green",
                       facts: [["Certification", c.name], ["New expiration", newNice]] };
        try { mailBoth(to, s2, b2txt, bcc, brand2); cleared++; } catch (err) { Logger.log("Renewal mail failed: " + err); }
      });
    }
  });

  // Auto-clean: drop reminder rows for certs that have since been renewed.
  //
  // This must only ever consider the people actually examined on this run.
  // When the app asks for a single member, validKeys is built for that member
  // alone -- so running over the whole log made everybody else's rows look
  // stale and deleted them. That is why the log kept emptying itself.
  var cleaned = 0;
  log.forEach(function(row){
    if (!row.id) return;
    if (onlyKey && normUnit(row.unit) !== onlyKey) return;
    var rd = parseDate(row.exp_date);
    var key  = normUnit(row.unit) + "|" + String(row.certification || "").trim() + "|" + (rd ? ymd(rd) : "");
    var key2 = normUnit(row.unit) + "|COL:" + String(row.cert_col || "").trim() + "|" + (rd ? ymd(rd) : "");
    if (!validKeys[key] && !validKeys[key2]) { if (sbDelete("cert_reminders", "id=eq." + row.id)) cleaned++; }
  });
  if (logFails) Logger.log("WARNING: " + logFails + " reminder(s) could not be recorded. People will be chased again.");
  Logger.log("Members examined: " + examined + ", certifications looked at: " + looked + ".");
  Logger.log("Cert check done. Reminders sent: " + sent + ". Renewal notices: " + cleared + ". Stale reminder rows cleaned: " + cleaned + ".");
}

// ===================== 2. TASK BOOK GOOGLE DOC =====================
function tbOnboardingFolder(){
  var name = "Onboarding Members";
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}
function buildTaskDoc(unit){
  unit = String(unit || "").trim();
  if (!unit) return;
  var uk = normUnit(unit);

  var roster = sbAll("roster");
  var name = unit, fto = "";
  for (var i = 0; i < roster.length; i++) {
    if (normUnit(roster[i].unit) === uk) {
      name = ((roster[i].first_name || "") + " " + (roster[i].last_name || "")).trim() || unit;
      fto = String(roster[i].fto || "").trim();
      break;
    }
  }

  var tasks = sbAll("task_list");
  if (!tasks.length) return;
  var prog = {};
  sbGet("task_progress", "select=*&unit=eq." + encodeURIComponent(unit)).forEach(function(p){
    prog[String(p.task_id || "").trim()] = {
      conf: isX(p.confirmed), by: String(p.confirmed_by || ""),
      date: String(p.confirmed_date || ""), count: String(p.count || "")
    };
  });

  var folder = tbOnboardingFolder();
  var title = "Task Book - " + name + " (" + unit + ")";
  var files = folder.getFilesByName(title), doc;
  if (files.hasNext()) doc = DocumentApp.openById(files.next().getId());
  else {
    doc = DocumentApp.create(title);
    var f = DriveApp.getFileById(doc.getId());
    folder.addFile(f);
    try { DriveApp.getRootFolder().removeFile(f); } catch (e) {}
  }

  var body = doc.getBody(); body.clear();
  body.appendParagraph("Hatzalah of Houston \u2014 EMT Task Book").setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph("Name: " + name);
  body.appendParagraph("Unit: " + unit + "     FTO: " + (fto || "\u2014"));

  var cats = [], catMap = {}, objs = [];
  tasks.forEach(function(t){
    var id = String(t.task_id || "").trim();
    if (!id) return;
    var type = String(t.type || "check").toLowerCase();
    if (type === "count") {
      var p0 = prog[id];
      objs.push([String(t.task || ""), (p0 && p0.count ? p0.count : "0") + " / " + String(t.target || "")]);
      return;
    }
    var cat = String(t.category || "General");
    if (!catMap[cat]) { catMap[cat] = []; cats.push(cat); }
    var p = prog[id];
    catMap[cat].push([String(t.task || ""), (p && p.conf ? p.date : ""), (p && p.conf ? p.by : "")]);
  });

  cats.forEach(function(cat){
    body.appendParagraph(cat).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendTable([["Task", "Date", "FTO Signing"]].concat(catMap[cat]));
  });
  if (objs.length) {
    body.appendParagraph("Objectives").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    objs.forEach(function(o){ body.appendParagraph(o[0] + ": " + o[1]); });
  }
  body.appendParagraph("Generated " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "M/d/yyyy h:mm a"));
  doc.saveAndClose();
  Logger.log("Built task book doc for " + name + " (" + unit + ")");
}

// ===================== NIGHTLY HOUSEKEEPING =====================
/**
 * Removes data that no longer serves a purpose:
 *   - availability slots whose end time passed more than 7 days ago
 *   - profile-change log entries older than 30 days
 * Everything else (code logs, cert updates, task progress) is left alone.
 * Change the two numbers below if you want different windows.
 */
var KEEP_SCHEDULE_DAYS = 7;    // days AFTER a slot ends before it is removed
var KEEP_CHANGES_DAYS  = 30;   // days to keep the profile-change log

function nightlyCleanup(){
  var DAY = 86400000, now = new Date(), removedSched = 0, removedChanges = 0;

  // ---- expired availability slots ----
  var cutoffSched = new Date(now.getTime() - KEEP_SCHEDULE_DAYS*DAY);
  sbAll("schedule").forEach(function(r){
    if (!r.id) return;
    var ends = parseDate(r.end_at);
    // no end time means "until I go off" - fall back to the start
    if (!ends) ends = parseDate(r.start_at);
    if (!ends) return;                 // can't tell - leave it alone
    if (ends < cutoffSched) { if (sbDelete("schedule", "id=eq." + r.id)) removedSched++; }
  });

  // ---- old profile-change entries ----
  var cutoffChanges = new Date(now.getTime() - KEEP_CHANGES_DAYS*DAY);
  sbAll("changes").forEach(function(r){
    if (!r.id) return;
    var when = parseDate(r.when_at);
    if (!when) return;
    if (when < cutoffChanges) { if (sbDelete("changes", "id=eq." + r.id)) removedChanges++; }
  });

  Logger.log("Cleanup done. Schedule slots removed: " + removedSched +
             ". Change-log entries removed: " + removedChanges + ".");
}

/**
 * NIGHTLY JOB — rebuilds every member's Task Book doc.
 * Set this up once: in the Apps Script editor click the clock icon (Triggers) ->
 * Add Trigger -> function: nightlyTaskDocs, event source: Time-driven,
 * type: Day timer, time: 2am-3am. Save.
 */
function nightlyTaskDocs(){
  try { rebuildAllTaskDocs(); }
  catch (e) { Logger.log("Nightly task docs failed: " + e); }
  try { nightlyCleanup(); }
  catch (e) { Logger.log("Nightly cleanup failed: " + e); }
}

/** Run this by hand to regenerate task book docs for everyone who has progress. */
function rebuildAllTaskDocs(){
  var seen = {}, n = 0;
  sbAll("task_progress").forEach(function(p){
    var u = String(p.unit || "").trim();
    if (!u || seen[normUnit(u)]) return;
    seen[normUnit(u)] = 1;
    try { buildTaskDoc(u); n++; } catch (e) { Logger.log("Failed for " + u + ": " + e); }
  });
  Logger.log("Rebuilt " + n + " task book doc(s).");
}

/** Quick connection test — run this first to confirm Supabase is reachable. */
function testSupabase(){
  var r = sbAll("roster"), s = sbAll("settings"), c = sbAll("certifications");
  Logger.log("Roster rows: " + r.length);
  Logger.log("Settings rows: " + s.length);
  Logger.log("Certification rows: " + c.length);
  var S = settingsMap();
  Logger.log("Cert Reminder Days = " + getSet(S, "cert reminder days", "(not set, default 90)"));
  if (r.length) Logger.log("Sample member: " + r[0].first_name + " " + r[0].last_name + " (" + r[0].unit + ")");
}


// ===================== INSTANT RENEWAL CONFIRMATION =====================
/**
 * The app calls this the moment a member saves a new expiration date, so the
 * "thank you / you are cleared to respond" email arrives in seconds instead of
 * waiting for tonight's run. It simply runs the normal check for that one
 * person, so the wording, the templates and the reminder log all behave
 * exactly as they do nightly.
 *
 * SETUP (once):
 *   1. Deploy -> Manage deployments -> pencil -> New version -> Deploy.
 *      "Who has access" must be ANYONE, or the app cannot reach it.
 *   2. Copy the /exec web app URL.
 *   3. In the app: Admin -> Settings, set
 *        Renewal Webhook URL     = that /exec URL
 *        Renewal Webhook Secret  = any phrase you invent (both sides must match)
 *   4. In this script's Settings sheet the same phrase must be stored under
 *        renewal webhook secret
 *      (the app reads it from Supabase Settings; this reads the same table).
 *
 * If any of that is missing the app quietly does nothing and the nightly run
 * still sends the email. Nothing breaks.
 */

/**
 * Plain-text email gets hard-wrapped by mail servers at about 78 characters,
 * which is why the reminders arrived with ragged line breaks mid-sentence.
 * Sending an HTML version alongside lets the mail client wrap naturally.
 *
 * Templates have been stored two ways over time -- some with real line breaks,
 * some with literal <br> tags -- so both are handled.
 */
/**
 * Every email goes out in the Hatzalah of Houston layout: navy header with the
 * shield, an optional colored strip ("Expires in 30 days"), the message, an
 * optional facts box and "How to renew" note, an "Open the app" button and a
 * footer. The plain-text version is the same words without the decoration.
 *
 * brand (optional):
 *   kind   small line under the org name, e.g. "Certification reminder"
 *   strip  text for the colored bar; stripColor "gold" (default), "red", "green"
 *   facts  [[label, value], ...] shown in a two-column box
 *   note   {title, text} the highlighted box (the per-certification renewal note)
 *   cta    {label, url} the button; default "Open the app" -> the app
 *   footer extra line under the standard footer
 */
function mailBoth(to, subject, body, bcc, brand) {
  var txt = String(body == null ? "" : body)
              .replace(/<br\s*\/?>/gi, "\n")
              .replace(/\r\n/g, "\n");
  brand = brand || {};
  var html = brandHtml(txt, brand);
  // the plain-text copy carries the note too, just before the sign-off
  if (brand.note && brand.note.text) {
    var parts = splitSignoff(txt);
    txt = parts.main + "\n\n" + (brand.note.title || "How to renew") + ": " + brand.note.text + (parts.signoff ? "\n\n" + parts.signoff : "");
  }
  // Group mail goes out Bcc so recipients never see each other's addresses.
  // Gmail needs something in To, so a Bcc-only message is addressed to the
  // account the script runs as.
  var msg = { to: String(to || "").trim() || Session.getEffectiveUser().getEmail(),
              subject: subject, body: txt, htmlBody: html };
  if (bcc && String(bcc).trim()) msg.bcc = String(bcc).trim();
  MailApp.sendEmail(msg);
}
var BRAND_NAVY = "#143D75", BRAND_GOLD = "#C9933A", BRAND_RED = "#b3261e", BRAND_GREEN = "#1e9e57";
var BRAND_LOGO = APP_URL + "/logo-email.png";
var BRAND_FONT = "font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;";
function escHtml(s){ return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
/** Plain text -> paragraphs with live links and <b>..</b> kept from the templates. */
function textToHtml(txt){
  var h = escHtml(txt)
    // Stop at the address itself. The templates write it as "(https://... ),"
    // and grabbing the trailing bracket and comma produced a dead link.
    .replace(/(https?:\/\/[^\s<]*[^\s<.,;:!?)\]}])/g, '<a href="$1" style="color:' + BRAND_NAVY + ';">$1</a>')
    .replace(/&lt;b&gt;([\s\S]*?)&lt;\/b&gt;/g, "<b>$1</b>");
  return h.split(/\n{2,}/).map(function(p){
    return '<p style="margin:0 0 14px;">' + p.replace(/\n/g, "<br>") + "</p>";
  }).join("");
}
/** Splits the closing lines ("Thank you...", "Sincerely, ...") off the end of a message,
    so a box can go between the message and the sign-off. */
function splitSignoff(txt){
  var paras = String(txt || "").split(/\n{2,}/), i = paras.length;
  while (i > 0 && i > paras.length - 3 && /^\s*(thank you|thanks|sincerely|regards|best)/i.test(paras[i - 1])) i--;
  return { main: paras.slice(0, i).join("\n\n"), signoff: paras.slice(i).join("\n\n") };
}
function brandHtml(txt, b){
  b = b || {};
  var stripBg = b.stripColor === "red" ? BRAND_RED : b.stripColor === "green" ? BRAND_GREEN : BRAND_GOLD;
  var stripFg = b.stripColor === "gold" || !b.stripColor ? "#1a1300" : "#ffffff";
  var cta = b.cta || { label: "Open the app", url: APP_URL };
  var h = '';
  h += '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef1f5;"><tr><td align="center" style="padding:24px 12px;">';
  h += '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">';
  // header
  h += '<tr><td style="background:' + BRAND_NAVY + ';border-radius:14px 14px 0 0;padding:20px 28px;">'
     + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>'
     + '<td width="54" valign="middle"><img src="' + BRAND_LOGO + '" width="48" height="62" alt="" style="display:block;border:0;"></td>'
     + '<td valign="middle" style="padding-left:14px;' + BRAND_FONT + '">'
     + '<div style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.2px;">Hatzalah of Houston</div>'
     + (b.kind ? '<div style="color:#b8c7e0;font-size:12.5px;font-weight:600;margin-top:2px;">' + escHtml(b.kind) + '</div>' : '')
     + '</td></tr></table></td></tr>';
  // strip
  if (b.strip) h += '<tr><td style="background:' + stripBg + ';padding:10px 28px;' + BRAND_FONT + 'color:' + stripFg + ';font-size:13.5px;font-weight:800;letter-spacing:.3px;text-transform:uppercase;">' + escHtml(b.strip) + '</td></tr>';
  // body
  h += '<tr><td style="background:#ffffff;padding:28px 28px 8px;' + BRAND_FONT + 'color:#16202e;font-size:15.5px;line-height:1.55;">';
  if (b.facts && b.facts.length) {
    h += '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dfe5ee;border-radius:12px;margin-bottom:18px;"><tr>';
    b.facts.forEach(function(f, i){
      h += '<td width="' + Math.floor(100 / b.facts.length) + '%" style="padding:14px 18px;' + (i < b.facts.length - 1 ? 'border-right:1px solid #dfe5ee;' : '') + '">'
         + '<div style="font-size:11.5px;font-weight:700;color:#6b7688;text-transform:uppercase;letter-spacing:.04em;">' + escHtml(f[0]) + '</div>'
         + '<div style="font-size:16px;font-weight:800;color:' + (i === 0 ? BRAND_NAVY : '#16202e') + ';margin-top:4px;">' + escHtml(f[1]) + (f[2] ? ' <span style="color:' + BRAND_GOLD + ';">' + escHtml(f[2]) + '</span>' : '') + '</div></td>';
    });
    h += '</tr></table>';
  }
  if (b.note && b.note.text) {
    var sp = splitSignoff(txt);
    h += textToHtml(sp.main);
    h += '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 18px;background:#f3f6fb;border-left:4px solid ' + BRAND_NAVY + ';border-radius:0 10px 10px 0;"><tr><td style="padding:14px 18px;">'
       + '<div style="font-size:12px;font-weight:800;color:' + BRAND_NAVY + ';text-transform:uppercase;letter-spacing:.04em;">' + escHtml(b.note.title || "How to renew") + '</div>'
       + '<div style="margin-top:6px;font-size:15px;line-height:1.5;">' + textToHtml(b.note.text).replace(/margin:0 0 14px;/g, "margin:0;") + '</div></td></tr></table>';
    if (sp.signoff) h += textToHtml(sp.signoff);
  } else {
    h += textToHtml(txt);
  }
  h += '</td></tr>';
  // button
  if (cta && cta.url) {
    h += '<tr><td style="background:#ffffff;padding:6px 28px 28px;" align="left"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="background:' + BRAND_NAVY + ';border-radius:10px;">'
       + '<a href="' + escHtml(cta.url) + '" style="display:inline-block;padding:13px 26px;' + BRAND_FONT + 'font-size:15px;font-weight:800;color:#ffffff;text-decoration:none;">' + escHtml(cta.label || "Open the app") + '</a>'
       + '</td></tr></table></td></tr>';
  }
  // footer
  h += '<tr><td style="background:' + BRAND_NAVY + ';border-radius:0 0 14px 14px;padding:14px 28px;' + BRAND_FONT + 'color:#b8c7e0;font-size:11.5px;line-height:1.5;">'
     + 'Sent by the Hatzalah of Houston member app &middot; <a href="' + APP_URL + '" style="color:#ffffff;text-decoration:none;">' + APP_URL.replace(/^https?:\/\//, "") + '</a>'
     + (b.footer ? '<br>' + escHtml(b.footer) : '')
     + '</td></tr>';
  h += '</table></td></tr></table>';
  return h;
}
/** The admin's "how to renew" note for one certification (Admin -> Certifications). */
function certNote(S, expCol){
  return String(getSet(S, "cert note (" + String(expCol || "").toLowerCase() + ")", "")).trim();
}

function doPost(e){
  var out = { ok:false };
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (x) {}
    var S = settingsMap();
    var secret = String(getSet(S, "renewal webhook secret", "")).trim();
    if (!secret) {
      out.error = "no secret configured";
    } else if (String(body.secret || "") !== secret) {
      out.error = "bad secret";
    } else if (String(body.action || "") === "backup") {
      // the "Back up now" button in the admin
      var bk = runBackup();
      out.ok = true;
      out.backup = bk;
    } else if (String(body.action || "") === "report") {
      // "Send a report" in the app: a member's note plus the app's own diagnostics
      sendProblemReport(body.report || {});
      out.ok = true;
    } else if (String(body.action || "") === "restock") {
      // "Request restock" (jump bag) or "Order needed" (inventory check): tell the admins + service units
      out.sent = notifyRestock(body.id);
      out.ok = true;
    } else if (String(body.action || "") === "restock_status") {
      // an admin / service unit marked a request Ordered or Done: tell the member
      out.sent = notifyRestockStatus(body.id);
      out.ok = true;
    } else if (!body.unit) {
      out.error = "no unit";
    } else {
      dailyCertCheck(String(body.unit));
      out.ok = true;
      out.unit = String(body.unit);
    }
  } catch (err) {
    out.error = String(err);
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Handy for testing in a browser - confirms the deployment is live. */
function doGet(){
  return ContentService.createTextOutput(
    JSON.stringify({ ok:true, msg:"Hatzalah cert mailer is deployed." })
  ).setMimeType(ContentService.MimeType.JSON);
}



// ===================== JUMP BAG REMINDERS =====================
/**
 * Every member keeps their own jump bag in the app (My Jump Bag) and enters an
 * expiration date on the items that have one. Once a day this looks at those
 * dates and, per member, sends ONE email and ONE push listing everything that
 * is due: at each milestone in the "Jump Bag Reminder Days" setting (default
 * 30, 7, 0 = days before expiry; 0 = on the day), then every 14 days while an
 * item stays expired. The jumpbag_reminders table records what went out so a
 * member is never chased twice for the same date and milestone.
 *
 * It also handles "remind me to check my bag every N days" (jumpbag_bags):
 * once the bag has not been checked for N days the member gets a reminder,
 * then again weekly until they tap "I checked my bag today".
 */
function dailyJumpBagCheck(){
  var S = settingsMap();
  var days = String(getSet(S, "jump bag reminder days", "30, 7, 0")).split(/[,\s]+/)
               .map(function(x){ return parseInt(x, 10); }).filter(function(n){ return !isNaN(n) && n >= 0; });
  if (!days.length) days = [30, 7, 0];
  days.sort(function(a, b){ return a - b; });                        // smallest first
  var EXPIRED_EVERY = 14;

  var items  = sbAll("jumpbag_items");
  var status = sbAll("jumpbag_status");
  var roster = sbAll("roster");
  var log    = sbAll("jumpbag_reminders");
  var bags   = []; try { bags = sbAll("jumpbag_bags"); } catch (e) { Logger.log("jumpbag_bags not readable yet: " + e); }
  Logger.log("Jump bag: items " + items.length + ", status rows " + status.length + ", roster " + roster.length + ", log " + log.length + ", bags " + bags.length);
  if (!items.length) return;

  var itemById = {}; items.forEach(function(i){ itemById[i.id] = i; });
  var byUnit = {}; roster.forEach(function(r){ var u = normUnit(r.unit); if (u) byUnit[u] = r; });
  var TZ = Session.getScriptTimeZone(), DAY = 86400000;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var BAG_AGAIN = 7;   // once a bag check is overdue, nudge again weekly

  // "remind me every N days" - which bags are due a reminder tonight
  var bagDue = {};     // unit key -> {bag, days since checked (or null)}
  bags.forEach(function(b){
    var n = parseInt(b.remind_days, 10) || 0; if (n <= 0) return;
    var since = b.checked_at ? Math.floor((today.getTime() - new Date(b.checked_at).setHours(0, 0, 0, 0)) / DAY) : null;
    if (since !== null && since < n) return;                           // checked recently enough
    if (b.reminded_at && (today.getTime() - new Date(b.reminded_at).getTime()) / DAY < BAG_AGAIN) return;
    var k = normUnit(b.unit); if (k) bagDue[k] = { bag: b, since: since, every: n };
  });
  function ymd(d){ return Utilities.formatDate(new Date(d), TZ, "yyyy-MM-dd"); }
  function nice(d){ return Utilities.formatDate(new Date(d), TZ, "MMM d, yyyy"); }

  // what has already gone out, keyed by unit|item|exp|milestone -> last send
  var sentAt = {};
  log.forEach(function(row){
    var k = normUnit(row.unit) + "|" + row.item_id + "|" + String(row.exp_date || "") + "|" + String(row.milestone || "");
    var w = new Date(row.when_at); if (!sentAt[k] || w > sentAt[k]) sentAt[k] = w;
  });

  var due = {};   // unit key -> [{item, exp, n, milestone}]
  status.forEach(function(s){
    if (!s.exp_date) return;
    var it = itemById[s.item_id]; if (!it || !isX(it.active === "" ? "X" : it.active)) return;
    if (s.status === "missing") return;                              // nothing to expire
    var exp = parseDate(s.exp_date); if (!exp) return;
    var n = Math.round((exp.getTime() - today.getTime()) / DAY);     // days until expiry
    var milestone = null;
    if (n < 0) milestone = "expired";
    else { for (var i = 0; i < days.length; i++) { if (n <= days[i]) { milestone = String(days[i]); break; } } }
    if (milestone === null) return;                                  // not close yet
    var k = normUnit(s.unit) + "|" + s.item_id + "|" + ymd(exp) + "|" + milestone;
    var last = sentAt[k];
    if (last) {
      if (milestone !== "expired") return;                           // each milestone once per date
      if ((today.getTime() - last.getTime()) / DAY < EXPIRED_EVERY) return;
    }
    (due[normUnit(s.unit)] = due[normUnit(s.unit)] || []).push({ item: it, exp: exp, n: n, milestone: milestone, status: s });
  });

  var sent = 0, units = {};
  Object.keys(due).forEach(function(k){ units[k] = 1; }); Object.keys(bagDue).forEach(function(k){ units[k] = 1; });
  Object.keys(units).forEach(function(uk){
    var r = byUnit[uk]; if (!r) return;
    var a = String(r.active == null ? "" : r.active).trim().toLowerCase();
    if (a === "no" || a === "off" || a === "false" || a === "0") return;
    var list = (due[uk] || []).sort(function(x, y){ return x.n - y.n; }), bd = bagDue[uk] || null;
    var expired = list.filter(function(x){ return x.n < 0; }), soon = list.filter(function(x){ return x.n >= 0; });
    var first = String(r.first_name || "").trim() || "there";
    var lines = list.map(function(x){
      var when = x.n < 0 ? ("expired " + nice(x.exp)) : x.n === 0 ? "expires TODAY" : ("expires " + nice(x.exp) + " (in " + x.n + " day" + (x.n === 1 ? "" : "s") + ")");
      return "\u2022 " + String(x.item.name) + " \u2014 " + when;
    });
    var bagLine = bd ? ("Time to go through your whole bag" + (bd.since === null ? " \u2014 you have not marked it checked yet" : " \u2014 it has been " + bd.since + " days since you last did") +
                        " (you asked to be reminded every " + bd.every + " days). When you are done, tap \u201cI checked my bag today\u201d in the app.") : "";
    var subject = list.length
      ? "Jump bag: " + (expired.length ? (expired.length + " item" + (expired.length === 1 ? "" : "s") + " expired") : "") +
        (expired.length && soon.length ? ", " : "") + (soon.length ? (soon.length + " item" + (soon.length === 1 ? "" : "s") + " expiring soon") : "")
      : "Jump bag: time to check your bag";
    var body = "Hi " + first + ",\n\n" +
               (list.length ? "From your jump bag in the app:\n\n" + lines.join("\n") + "\n\n" : "") +
               (bagLine ? bagLine + "\n\n" : "") +
               (list.length ? "Once you have replaced an item, open the app \u2192 My Jump Bag and enter the new expiration date so the reminders stop.\n" : "Open the app \u2192 My Jump Bag:\n") + APP_URL +
               "\n\nThank you,\nHatzalah of Houston Administration";
    var to = [String(r.email || "").trim(), String(r.personal_email || "").trim()].filter(function(e){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); });
    to = to.filter(function(e, i){ return to.indexOf(e) === i; });
    var okMail = false;
    var brandJb = { kind: "Jump bag",
                    strip: list.length ? (expired.length ? (expired.length + " item" + (expired.length === 1 ? "" : "s") + " expired") : (soon.length + " item" + (soon.length === 1 ? "" : "s") + " expiring soon")) : "Time to check your bag",
                    stripColor: expired.length ? "red" : "gold" };
    if (to.length) { try { mailBoth(to.join(", "), subject, body, "", brandJb); okMail = true; } catch (e) { Logger.log("jump bag mail failed for " + r.unit + ": " + e); } }
    var pushBody = list.length ? lines.map(function(l){ return l.replace(/^\u2022 /, ""); }).join("\n") : (bd && bd.since !== null ? bd.since + " days since you last checked it." : "You asked to be reminded to go through it.");
    var okPush = pushUnit(String(r.unit), subject, pushBody.slice(0, 180));
    if (okMail || okPush) {
      sent++;
      list.forEach(function(x){ sbInsert("jumpbag_reminders", { unit: String(r.unit), item_id: x.item.id, exp_date: ymd(x.exp), milestone: x.milestone }); });
      if (bd) sbPatch("jumpbag_bags", "id=eq." + encodeURIComponent(bd.bag.id), { reminded_at: new Date().toISOString() });
    }
  });
  Logger.log("Jump bag: " + sent + " member" + (sent === 1 ? "" : "s") + " reminded.");
}

/**
 * Sends a push notification to one member's phones through the push worker.
 * The worker normally insists on an admin's sign-in; this script has none, so
 * it shows a shared key instead. Set it once, in this project's Script
 * Properties, as PUSH_CRON_KEY, to the same value as the worker's CRON_KEY
 * secret. Returns true when the worker accepted it.
 */
function pushUnit(unit, title, body, kind){
  try {
    var S = settingsMap();
    var url = String(getSet(S, "push worker url", "")).trim();
    var key = PropertiesService.getScriptProperties().getProperty("PUSH_CRON_KEY");
    if (!url || !key) { Logger.log("push skipped: " + (!url ? "no Push Worker URL setting" : "no PUSH_CRON_KEY script property")); return false; }
    kind = kind || "jumpbag";
    var res = UrlFetchApp.fetch(url, {
      method: "post", contentType: "application/json",
      headers: { "X-Cron-Key": key },
      payload: JSON.stringify({ title: title, body: body, audience: "unit:" + unit, kind: kind, url: "./", tag: kind + "-" + normUnit(unit) }),
      muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 300) { Logger.log("push failed for " + unit + ": " + res.getResponseCode() + " " + res.getContentText()); return false; }
    return true;
  } catch (e) { Logger.log("push error for " + unit + ": " + e); return false; }
}

// ===================== RESTOCK REQUESTS =====================
/**
 * A member tapped "Request restock" in My Jump Bag, or an inventory check was
 * submitted with items marked "Order needed". The app saved the request in
 * supply_requests and called this; it emails and pushes every active admin and
 * service unit, then writes what it sent on the row so it never goes twice.
 * The nightly run also sweeps up any request the app could not report.
 */
function restockHandlers(roster){
  return (roster || sbAll("roster")).filter(function(r){
    var a = String(r.active == null ? "" : r.active).trim().toLowerCase();
    if (a === "no" || a === "off" || a === "false" || a === "0") return false;
    var adm = String(r.admin == null ? "" : r.admin).trim().toLowerCase();
    var svc = String(r.service_unit == null ? "" : r.service_unit).trim().toLowerCase();
    var typ = String(r.type == null ? "" : r.type).toLowerCase();
    return adm === "x" || adm === "yes" || adm === "true" || svc === "x" || svc === "yes" || svc === "true" || typ.indexOf("service unit") >= 0;
  });
}
function restockItemsText(req){
  var items = []; try { items = JSON.parse(JSON.stringify(req.items || [])); } catch (e) {}
  if (!Array.isArray(items)) items = [];
  return items.map(function(x){ return "\u2022 " + String(x.name || "") + (x.qty ? " (\u00d7" + x.qty + ")" : "") + (x.why ? " \u2014 " + String(x.why) : ""); });
}
function restockTitle(req){
  var n = Array.isArray(req.items) ? req.items.length : 0;
  return (String(req.source) === "inventory" ? String(req.ambulance || "Ambulance").replace(/ Ambulance - \d+$/, "") + " inventory" : "Jump bag") +
         " \u2014 " + n + " item" + (n === 1 ? "" : "s") + " to order";
}
function notifyRestock(id){
  id = parseInt(id, 10); if (!id) return 0;
  var rows = sbGet("supply_requests", "select=*&id=eq." + id); var req = rows && rows[0];
  if (!req) { Logger.log("restock: no request " + id); return 0; }
  if (String(req.notified || "").trim()) { Logger.log("restock " + id + " already notified"); return 0; }
  var who = restockHandlers(); var TZ = Session.getScriptTimeZone();
  var lines = restockItemsText(req);
  var subject = "Restock needed: " + restockTitle(req) + " (" + String(req.name || req.unit) + ")";
  var body = String(req.name || req.unit) + " (" + String(req.unit) + ") " +
             (String(req.source) === "inventory" ? "marked these for ordering on the " + String(req.ambulance || "ambulance") + " inventory check" : "needs these for their jump bag") + ":\n\n" +
             lines.join("\n") + (req.note ? "\n\nNote: " + String(req.note) : "") +
             "\n\nWhoever orders it: open the app \u2192 " + (String(req.source) === "inventory" ? "Ambulance Checkoff" : "Admin or Ambulance Checkoff") + " \u2192 Supply requests and mark it Ordered, so nobody orders it twice.\n" + APP_URL +
             "\n\nSent " + Utilities.formatDate(new Date(), TZ, "MMM d, yyyy h:mm a");
  var mails = [], pushed = 0;
  who.forEach(function(r){
    [String(r.email || "").trim(), String(r.personal_email || "").trim()].forEach(function(e){ if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && mails.indexOf(e) < 0) mails.push(e); });
  });
  var okMail = false;
  var brandRs = { kind: "Supply request", strip: "Restock needed", stripColor: "gold",
                  facts: [["Requested by", String(req.name || req.unit) + " (" + String(req.unit) + ")"], ["For", String(req.source) === "inventory" ? String(req.ambulance || "Ambulance") : "Jump bag"]] };
  if (mails.length) { try { mailBoth("", subject, body, mails.join(", "), brandRs); okMail = true; } catch (e) { Logger.log("restock mail failed: " + e); } }
  who.forEach(function(r){ if (pushUnit(String(r.unit), subject, lines.map(function(l){ return l.replace(/^\u2022 /, ""); }).join("\n").slice(0, 180), "restock")) pushed++; });
  var note = (okMail ? mails.length + " emailed" : "mail failed") + ", " + pushed + " pushed, " + Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm");
  sbPatch("supply_requests", "id=eq." + id, { notified: note });
  Logger.log("restock " + id + ": " + note);
  return mails.length + pushed;
}
/** The member who asked is told when their request is marked Ordered or Done. */
function notifyRestockStatus(id){
  id = parseInt(id, 10); if (!id) return 0;
  var rows = sbGet("supply_requests", "select=*&id=eq." + id); var req = rows && rows[0];
  if (!req || String(req.status) === "open") return 0;
  var roster = sbAll("roster"), me = null;
  roster.forEach(function(r){ if (normUnit(r.unit) === normUnit(req.unit)) me = r; });
  if (!me) return 0;
  var st = String(req.status) === "ordered" ? "ordered" : "done";
  var subject = "Your restock request was marked " + st;
  var body = "Hi " + (String(me.first_name || "").trim() || "there") + ",\n\n" +
             (st === "ordered" ? "Good news \u2014 it has been ordered" : "It is marked done") + (req.status_by ? " by " + String(req.status_by) : "") + ":\n\n" +
             restockItemsText(req).join("\n") + "\n\n" + APP_URL + "\n\nThank you,\nHatzalah of Houston Administration";
  var to = [String(me.email || "").trim(), String(me.personal_email || "").trim()].filter(function(e){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); });
  to = to.filter(function(e, i){ return to.indexOf(e) === i; });
  var n = 0;
  var brandSt = { kind: "Supply request", strip: st === "ordered" ? "Ordered" : "Done", stripColor: "green" };
  if (to.length) { try { mailBoth(to.join(", "), subject, body, "", brandSt); n++; } catch (e) { Logger.log("restock status mail failed: " + e); } }
  if (pushUnit(String(me.unit), subject, restockItemsText(req).map(function(l){ return l.replace(/^\u2022 /, ""); }).join("\n").slice(0, 180), "jumpbag")) n++;
  return n;
}
/** Requests the app saved but could not report (no signal, old app): sent on the nightly run. */
function sweepRestockRequests(){
  var rows = sbGet("supply_requests", "select=id,created_at,notified&status=eq.open&notified=eq.&order=created_at.asc&limit=50");
  var n = 0;
  (rows || []).forEach(function(r){ if (Date.now() - new Date(r.created_at).getTime() > 10 * 60000) { notifyRestock(r.id); n++; } });
  if (n) Logger.log("restock sweep: " + n + " request(s) sent");
}

// ===================== WHY WAS NOTHING SENT? =====================
/**
 * Prints the decision for every certification of one member, so there is no
 * guessing about why a reminder did or did not go out.
 *
 * Edit the unit on the line below, then pick this function from the dropdown
 * and press Run. Read the output under "Execution log".
 */
function whyNotSent() {
  var UNIT = "H-33";          // <-- change this, then Run

  var S = settingsMap();
  var remindDays = parseInt(getSet(S, "cert reminder days", "90"), 10) || 90;
  var today = new Date(); today.setHours(0,0,0,0);

  // read the three tables directly, so this cannot be tripped up by anything
  // else in the script
  function grab(name){
    var rows = sbGet(name, "select=*&limit=1000");
    Logger.log("read " + name + ": " + (rows ? rows.length : 0) + " rows");
    return rows || [];
  }
  var certs  = grab("certifications");
  var roster = grab("roster");
  var log    = grab("cert_reminders");
  if (!certs.length) { Logger.log("Could not read the certifications table - stopping."); return; }

  var uk = normUnit(UNIT);
  var cr = null;
  certs.forEach(function(r){ if (normUnit(r.unit) === uk) cr = r; });
  if (!cr) { Logger.log("No certifications row for " + UNIT); return; }

  var mem = null;
  roster.forEach(function(r){ if (normUnit(r.unit) === uk) mem = r; });
  Logger.log("Unit " + UNIT + " | on roster: " + (mem ? "yes" : "NO") +
             " | active: " + (mem ? (mem.active || "(blank)") : "-"));
  Logger.log("Reminder window: " + remindDays + " days");
  Logger.log("Paused list: " + (cr.paused || "(none)"));
  Logger.log("-----");

  var paused = String(cr.paused || "").split(",").map(function(x){ return x.trim().toLowerCase(); });

  certPairs(cr).forEach(function(c) {
    var raw  = cr[c.expCol];
    var name = c.name;
    var why  = "";

    if (isNAv(raw)) why = "SKIPPED - the date is N/A";
    else if (c.numCol && isNAv(cr[c.numCol])) why = "SKIPPED - the number is N/A";
    else if (paused.indexOf(String(c.expCol).toLowerCase()) >= 0) why = "SKIPPED - paused";

    var d = parseDate(raw);
    if (!why && !d) why = "SKIPPED - the date could not be read: " + JSON.stringify(raw);

    var days = null;
    if (!why) {
      d.setHours(0,0,0,0);
      days = Math.round((d - today) / 86400000);
      if (days > remindDays) why = "not due yet - " + days + " days away";
    }

    var last = null;
    log.forEach(function(row) {
      if (normUnit(row.unit) !== uk) return;
      var rc = String(row.cert_col || "").trim();
      var match = rc ? (rc.toLowerCase() === String(c.expCol).toLowerCase())
                     : (String(row.certification || "").trim().toLowerCase() === name.toLowerCase());
      if (!match) return;
      if (!last || String(row.when_at) > String(last.when_at)) last = row;
    });

    if (!why) {
      // same rule as dailyCertCheck: fixed milestones before expiry, weekly after
      var milestones = String(getSet(S, "cert reminder milestones", "")).split(/[,\s]+/)
                         .map(function(x){ return parseInt(x, 10); })
                         .filter(function(n){ return !isNaN(n) && n > 0 && n <= remindDays; });
      if (!milestones.length) milestones = [90, 60, 30, 14, 7, 3, 1].filter(function(n){ return n <= remindDays; });
      milestones.sort(function(a, b){ return b - a; });
      var lastWhen = last ? parseDate(last.when_at) : null;
      if (lastWhen) lastWhen.setHours(0,0,0,0);
      if (days <= 0) {
        var since = lastWhen ? Math.round((today - lastWhen) / 86400000) : 999;
        if (!last) why = "DUE - expired, nothing logged before";
        else if (String(last.type || "").toLowerCase() !== "expired") why = "DUE - just moved into expired";
        else if (since >= 7) why = "DUE - expired, " + since + " days since the last one (weekly)";
        else why = "held back - expired, only " + since + " days since the last one, needs 7 (last sent " + last.when_at + ")";
      } else {
        var m = null;
        for (var mi = 0; mi < milestones.length; mi++) { if (milestones[mi] >= days) m = milestones[mi]; }
        if (m == null) why = "not due yet - " + days + " days away, first milestone is " + milestones[0];
        else {
          var crossed = new Date(d.getTime() - m * 86400000); crossed.setHours(0,0,0,0);
          if (!lastWhen) why = "DUE - the " + m + "-day reminder, nothing logged before";
          else if (lastWhen < crossed) why = "DUE - the " + m + "-day reminder (last one was " + last.when_at + ", before that point)";
          else why = "held back - the " + m + "-day reminder already went out " + last.when_at +
                     "; next is the " + (milestones.filter(function(x){ return x < m; })[0] || "expiry-day") + "-day one";
        }
      }
    }

    Logger.log(name + "  [" + c.expCol + "]" +
               "\n    value: " + JSON.stringify(raw) +
               (days === null ? "" : "   days: " + days) +
               "\n    " + why +
               (last ? "\n    last logged: " + last.when_at + " for exp " + last.exp_date : "\n    last logged: never"));
  });
}


// ===================== SEND ONE TO YOURSELF =====================
/**
 * Renders a real reminder for your own certifications and sends it to you
 * alone. Nobody else receives it, and nothing is written to the reminder log,
 * so the normal schedule is untouched.
 *
 * Set the unit and address below, then Run.
 */
function sendTestToMe() {
  var UNIT = "H-24";                                                          // <-- your unit
  var TO   = scriptProp_("TEST_EMAIL") || ADMIN_EMAILS.split(",")[0].trim();  // Script Property TEST_EMAIL, else the first admin fallback address

  var S = settingsMap();
  var remindDays = parseInt(getSet(S, "cert reminder days", "90"), 10) || 90;
  var today = new Date(); today.setHours(0,0,0,0);
  var TZ = Session.getScriptTimeZone();   // scoped inside the nightly job, so declared again here

  var certs = sbGet("certifications", "select=*&limit=1000") || [];
  var uk = normUnit(UNIT), cr = null;
  certs.forEach(function(r){ if (normUnit(r.unit) === uk) cr = r; });
  if (!cr) { Logger.log("No certifications row for " + UNIT); return; }

  var name = ((cr.first_name || "") + " " + (cr.last_name || "")).trim() || UNIT;
  var howto = "To renew it in our system: open the Hatzalah of Houston app (" + APP_URL +
              "), tap Certifications, enter the new expiration date, and upload a copy of your " +
              "renewed certification when prompted.";
  var closing = "Thank you very much for your attention to this matter.\n\nSincerely,\n" +
                "Hatzalah of Houston Administration";

  var picked = null;
  certPairs(cr).forEach(function(c) {
    if (picked) return;
    if (isNAv(cr[c.expCol]) || (c.numCol && isNAv(cr[c.numCol]))) return;
    var d = parseDate(cr[c.expCol]); if (!d) return;
    d.setHours(0,0,0,0);
    var days = Math.round((d - today) / 86400000);
    if (days > remindDays) return;
    picked = { c: c, d: d, days: days };
  });

  if (!picked) { Logger.log("Nothing of yours is inside the " + remindDays + " day window."); return; }

  var when = Utilities.formatDate(picked.d, TZ, "MMMM d, yyyy");
  var subj, body;

  if (picked.days <= 0) {
    subj = "Your " + picked.c.name + " has expired \u2014 Hatzalah of Houston";
    body = "Hi " + name + " (" + UNIT + "),\n\nYour " + picked.c.name + " has expired. You are not " +
           "permitted to respond to medical emergencies until your certification has been renewed, " +
           "is up to date, and has been updated in our system.\n\n" + howto +
           "\n\nSincerely,\nHatzalah of Houston Administration";
  } else {
    subj = "Reminder: your " + picked.c.name + " expires in " + picked.days + " days \u2014 Hatzalah of Houston";
    body = "Hi " + name + " (" + UNIT + "),\n\nThis is a reminder that your " + picked.c.name +
           " will expire in " + picked.days + " days, on " + when + ". Please remember to renew it " +
           "before the expiration date.\n\n" + howto + "\n\n" + closing;
  }

  mailBoth(TO, "[TEST] " + subj, body, "", { kind: "Certification reminder (test)",
    strip: picked.days <= 0 ? "Expired" : ("Expires in " + picked.days + " days"), stripColor: picked.days <= 0 ? "red" : "gold",
    facts: [["Certification", picked.c.name], ["Expires", Utilities.formatDate(picked.d, TZ, "MMM d, yyyy")]],
    note: { title: "How to renew", text: certNote(S, picked.c.expCol) } });
  Logger.log("Sent to " + TO + " only \u2014 " + picked.c.name + ", " + picked.days + " days.");
  Logger.log("Nothing was written to the reminder log.");
}


// ===================== BACKUP TO GOOGLE SHEETS =====================
//
// The database plan keeps no backups of its own, and rebuilding the settings
// by hand after they were wiped took hours. This copies every table into a
// Google Sheet: one spreadsheet per run, one sheet per table, every cell
// written as text so nothing is turned into a date or loses a leading zero.
//
// Files land in Drive > "Hatzalah App Backups". Daily files are kept for
// BACKUP_KEEP_DAYS; the first of each month is kept for good. Trashed files
// can still be pulled back from the Drive trash for 30 days after that.
//
// To set up once:  Run > backupNow  (approve the permissions it asks for)
//                  Run > setupBackupTrigger  (creates the nightly run)
// The admin's "Back up now" button also arrives here through doPost.

var BACKUP_FOLDER    = "Hatzalah App Backups";
var BACKUP_KEEP_DAYS = 30;
var BACKUP_HOUR      = 3;      // runs between 3 and 4 in the morning

/** Every table the database exposes, read from its own listing, so a table
    added next month is in the next backup without touching this script. */
function backupTableNames(){
  var names = {};
  try {
    var res = UrlFetchApp.fetch(SB_URL + "/rest/v1/", {
      headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Accept: "application/openapi+json" },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) {
      var spec = JSON.parse(res.getContentText());
      Object.keys((spec && spec.definitions) || {}).forEach(function(t){ names[t] = 1; });
    } else {
      Logger.log("Table listing failed: " + res.getResponseCode());
    }
  } catch (e) { Logger.log("Table listing failed: " + e); }
  // belt and braces: the tables the app is known to use
  ["settings","roster","certifications","cert_reminders","cert_updates","tiles","apartments",
   "apartment_markers","hospitals","resources","vitals","uploads","cpr_buttons","task_list",
   "task_progress","announcements","announcement_reads","poll_tallies","cabinets","cabinet_bins",
   "equipment_items","equipment_meta","schedule","availability","code_logs","changes","guests"
  ].forEach(function(t){ names[t] = 1; });
  return Object.keys(names).sort();
}

function backupFolder(){
  var it = DriveApp.getFoldersByName(BACKUP_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER);
}

/** Pull every table and write the spreadsheet. Returns a summary the app can show. */
function runBackup(){
  var t0 = Date.now();
  var TZ = Session.getScriptTimeZone();
  var names = backupTableNames();
  var stamp = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm");
  var folder = backupFolder();

  var ss = SpreadsheetApp.create("Hatzalah backup " + stamp);
  var file = DriveApp.getFileById(ss.getId());
  try { file.moveTo(folder); }
  catch (e) { folder.addFile(file); DriveApp.getRootFolder().removeFile(file); }

  var about = [["Hatzalah of Houston - database backup", "", ""],
               ["", "", ""],
               ["Taken", stamp, ""],
               ["Tables", String(names.length), ""],
               ["", "", ""],
               ["Table", "Rows", "Note"]];
  var total = 0, problems = [];

  names.forEach(function(t){
    var rows, note = "";
    try { rows = sbAll(t); }
    catch (e) { rows = []; note = "read failed: " + e; }
    var cols = [], seen = {};
    rows.forEach(function(r){ for (var k in r) { if (!seen[k]) { seen[k] = 1; cols.push(k); } } });
    var data = [cols.length ? cols : ["(empty)"]];
    rows.forEach(function(r){
      data.push(cols.map(function(c){
        var v = r[c];
        return v == null ? "" : (typeof v === "object" ? JSON.stringify(v) : String(v));
      }));
    });
    var sh = ss.insertSheet(t.slice(0, 100));
    var rng = sh.getRange(1, 1, data.length, data[0].length);
    rng.setNumberFormat("@");                 // plain text, on purpose
    rng.setValues(data);
    sh.getRange(1, 1, 1, data[0].length).setFontWeight("bold");
    sh.setFrozenRows(1);
    if (note) problems.push(t);
    about.push([t, String(rows.length), note]);
    total += rows.length;
  });

  // the sheet Google created for us becomes the front page
  var first = ss.getSheets()[0];
  first.setName("_about");
  first.getRange(1, 1, about.length, 3).setNumberFormat("@").setValues(about);
  first.getRange(1, 1, 1, 1).setFontWeight("bold");
  first.getRange(6, 1, 1, 3).setFontWeight("bold");
  first.setColumnWidth(1, 220);
  ss.setActiveSheet(first);
  ss.moveActiveSheet(1);

  pruneBackups(folder);

  var took = Math.round((Date.now() - t0) / 1000);
  Logger.log("Backup done: " + names.length + " tables, " + total + " rows, " + took + "s -> " + ss.getUrl());
  return { ok: true, url: ss.getUrl(), folderUrl: folder.getUrl(), name: ss.getName(),
           tables: names.length, rows: total, took: took, problems: problems, when: stamp };
}

/** Daily files older than BACKUP_KEEP_DAYS go to the trash, except one from
    the first of each month, which stays. */
function pruneBackups(folder){
  var TZ = Session.getScriptTimeZone();
  var cutoff = Date.now() - BACKUP_KEEP_DAYS * 86400000;
  var it = folder.getFiles(), n = 0;
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf("Hatzalah backup ") !== 0) continue;
    var made = f.getDateCreated();
    if (made.getTime() > cutoff) continue;
    if (Utilities.formatDate(made, TZ, "dd") === "01") continue;   // monthly keeper
    f.setTrashed(true); n++;
  }
  if (n) Logger.log("Old backups trashed: " + n);
}

/** The nightly trigger lands here. */
function nightlyBackup(){
  var r = runBackup();
  Logger.log("Nightly backup: " + r.tables + " tables, " + r.rows + " rows -> " + r.url);
}

/** Run this by hand once to test and to grant the permissions. */
function backupNow(){
  var r = runBackup();
  Logger.log("Backup: " + r.name + "  (" + r.tables + " tables, " + r.rows + " rows, " + r.took + "s)");
  Logger.log("Open it: " + r.url);
  Logger.log("Folder:  " + r.folderUrl);
}

/** Run this by hand once. Replaces any earlier backup trigger with a nightly one. */
function setupBackupTrigger(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === "nightlyBackup") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("nightlyBackup").timeBased().everyDays(1).atHour(BACKUP_HOUR).create();
  Logger.log("Nightly backup set for between " + BACKUP_HOUR + ":00 and " + (BACKUP_HOUR + 1) + ":00.");
}


// ===================== PROBLEM REPORTS FROM THE APP =====================
//
// A member taps "Send a report", writes a line, and the app attaches the
// facts (version, phone, fingerprint state, what is saved offline) and its
// own event log. It arrives here through doPost {action:"report"} and goes
// out as one email to every active admin on the roster.

/** Every active admin's email, read from the roster; the built-in list if that fails. */
function adminRecipients(){
  var out = [];
  try {
    sbAll("roster").forEach(function(r){
      var a = String(r.active == null ? "" : r.active).trim().toLowerCase();
      if (a === "no" || a === "off" || a === "false" || a === "0") return;
      var adm = String(r.admin == null ? "" : r.admin).trim().toLowerCase();
      if (!(adm === "x" || adm === "yes" || adm === "true" || adm === "1")) return;
      var e = String(r.email || "").trim();
      if (e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && out.indexOf(e) < 0) out.push(e);
    });
  } catch (e) { Logger.log("adminRecipients: " + e); }
  return out.length ? out.join(", ") : ADMIN_EMAILS;
}

/** A 7-day link to a file in the private documents bucket. */
function signedDocUrl(path, seconds){
  try {
    var res = UrlFetchApp.fetch(SB_URL + "/storage/v1/object/sign/docs/" + encodeURI(path), {
      method: "post", contentType: "application/json",
      headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
      payload: JSON.stringify({ expiresIn: seconds || 604800 }), muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return "";
    var j = JSON.parse(res.getContentText()); var u = j.signedURL || j.signedUrl || "";
    if (u && u.indexOf("http") !== 0) u = SB_URL + "/storage/v1" + (u.indexOf("/") === 0 ? "" : "/") + u;
    return u;
  } catch (e) { return ""; }
}
function sendProblemReport(rep){
  var f = rep.facts || {}, log = rep.log || [];
  if (f.screenshot && f.screenshot.indexOf("(") !== 0) f.screenshotUrl = signedDocUrl(f.screenshot) || ("(could not sign " + f.screenshot + ")");
  else if (f.screenshot) f.screenshotUrl = f.screenshot;
  var who = (f.name ? f.name + " " : "") + (f.unit ? "(" + f.unit + ")" : "") || f.email || "a member";
  var TZ = Session.getScriptTimeZone();
  var lines = [];
  lines.push("Problem report from " + who);
  lines.push("");
  lines.push("What they said:");
  lines.push("  " + String(rep.note || "(nothing written)").replace(/\n/g, "\n  "));
  lines.push("");
  lines.push("Details the app attached:");
  var order = ["from","saidTheyAre","app","worker","workerState","unit","email","installed","state","database","site","connection","storage","battery","memory","permissions","screenshotUrl","fingerprint","notifications","online","lastOfflineSave","cached","device","screen","language","timezone","time"];
  var label = {from:"Sent from", saidTheyAre:"They said they are", app:"App version", workerState:"Worker state", state:"Where they were",
               database:"Database, live check", site:"App site, live check", connection:"Connection", storage:"Storage on phone",
               battery:"Battery", memory:"Phone memory", permissions:"Permissions", screenshotUrl:"Screenshot (link works 7 days)", worker:"Service worker", unit:"Unit", email:"Email", installed:"Installed",
               fingerprint:"Fingerprint unlock", notifications:"Notifications", online:"Online", lastOfflineSave:"Last offline save", cached:"Saved offline",
               device:"Device", screen:"Screen", language:"Language", timezone:"Time zone", time:"Phone time"};
  order.forEach(function(k){ if (f[k] != null && f[k] !== "") lines.push("  " + label[k] + ": " + f[k]); });
  lines.push("");
  lines.push("What the app did (most recent last, " + log.length + " entries):");
  log.slice(-80).forEach(function(e){
    var t = "";
    try { t = Utilities.formatDate(new Date(e.t), TZ, "MMM d HH:mm:ss"); } catch (x) { t = String(e.t || ""); }
    lines.push("  " + t + "  " + e.k + (e.d ? "  " + e.d : ""));
  });
  if (log.length > 80) lines.push("  (" + (log.length - 80) + " older entries not shown)");
  var subject = "App problem report: " + String(rep.note || "").slice(0, 60).replace(/\s+/g, " ") + " \u2014 " + who;
  mailBoth("", subject, lines.join("\n"), adminRecipients(), { kind: "Problem report", strip: "Problem report from " + who, stripColor: "red" });
  Logger.log("Problem report mailed for " + who);
}
