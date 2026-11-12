// Builds the feature catalog: HTML pages (Letter) from the demo screenshots, then prints to PDF.
const {chromium}=require("playwright"); const fs=require("fs"); const path=require("path");
const ROOT=process.env.HOH_ROOT||path.join(__dirname,"..",".."); const DIR=path.join(__dirname,"out"), SHOTS=DIR+"/shots", PIECES=DIR+"/pieces";
const OUT_HTML=DIR+"/catalog.html", OUT_PDF=process.env.OUT_PDF||DIR+"/Hatzalah-App-Feature-Catalog.pdf";
// screens that can only be captured by hand (the Scheduler map needs live map tiles) live in manual/
try{ fs.readdirSync(path.join(__dirname,"manual")).forEach(f=>{ if(/\.png$/.test(f)) fs.copyFileSync(path.join(__dirname,"manual",f), SHOTS+"/"+f); }); }catch(e){}
const pieces=JSON.parse(fs.readFileSync(PIECES+"/pieces.json","utf8"));
const sizeOf=require("image-size"); // for aspect ratios
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const VERSION="1.8.1", DATE="November 2026";

/* ------------------------------------------------------------------ content */
const S=(id,title,blurb)=>({id,title,blurb});
const sections=[
 {key:"home", num:1, title:"Home screen & everyday use", kind:"phone",
  intro:"What a member sees every day. One tap to call dispatch or medical control, announcements that need an answer, and a grid of tiles the organization controls. Everything below was captured on a phone.",
  shots:[
   S("p-home","Home screen","What a member sees: status pill, availability check and unit badge in the header; Call Dispatch and Call Medical Control; the search box that finds anything in the app (next section); announcements waiting for an answer; then the tiles, 2 or 3 per row. This is a new member, so a please-read and a welcome note are still pending."),
   S("p-quick","Quick Actions","The lightning bolt opens a thumb-first sheet built for an emergency: Text Home, Scene Timer, Vitals Reference, Call Notes, and a large red CPR Tracker. The install banner appears until the app is on the home screen."),
   S("p-texthome","Text Home","One tap in Quick Actions opens the member’s texting app (SMS or WhatsApp) with a ready-made message to the number they chose — “I responded to a Hatzalah call and I’m heading out now…” — so the family knows without a phone call from the scene. The number and SMS/WhatsApp choice are set here in My Profile; the wording is an admin setting."),
   S("p-availability","My Availability","Tap the status pill. Go available or off now, share or hide location, and schedule a window ahead of time (with optional location sharing for that window). While available, dispatch sees status, phone and location."),
   S("p-profile","My Profile","Tap the unit badge. Members keep their own phone, address, personal email (used only for certification reminders), photo, emergency contact, uniform sizes and Text Home settings current — so admins don't have to."),
   S("p-notice-poll","Announcement: poll","A poll announcement asks for a vote. Members tap an option and submit; admins see the tally and who voted under Admin → Announcements."),
   S("p-notice-confirm","Announcement: please read","A please-read announcement needs an explicit “I have read and understood this” before it clears. Admins see exactly who has confirmed."),
   S("p-rx","Medication Lookup","The Rx button in the search bar. Type a brand or generic name and read the official FDA label information. Needs internet."),
   S("p-report","Report a problem","At the bottom of the home screen. A member describes what happened in their own words; the app attaches the version, phone type and its own technical log and sends it to the admins."),
  ]},
 {key:"search", num:2, title:"One search box finds everything", kind:"phone",
  intro:"The box at the top of the home screen searches the whole app at once: members, hospitals, protocol pages, resources, apartment addresses and buildings, equipment on the ambulance, the ERG, even the tiles. Results are grouped by kind, and tapping one opens the right screen already pointed at the right thing.",
  shots:[
   S("p-search-mixed","“stroke”","One word, several kinds of answer: the hospitals that take stroke patients (with their capability tags) and the protocol pages that mention it. Scroll on for resources and more."),
   S("p-search-member","“Katz”","People come up with a call button and a card button right in the results — no need to open the directory."),
   S("p-search-address","“7822 Bellfort”","An address finds the building inside the complex: Bellfort Square, with the gate code right there in the result."),
   S("p-search-address-open","… and the building is pinned","Tapping it opens the site plan with that building flagged and the gate code on top, so a crew knows where to drive before they arrive. Pinch to zoom."),
   S("p-search-item","“iGel”","Equipment comes up with the cabinet it lives in — every size of iGel is in the Airway Cabinet — alongside the protocol page that mentions it."),
   S("p-search-item-open","… and the slot lights up","Tapping it opens that cabinet’s photo with the item’s numbered slot highlighted, and the item list below. Find it in the truck in seconds."),
  ]},
 {key:"call", num:3, title:"On a call", kind:"phone",
  intro:"Tools that only matter when seconds do. Each one is one tap from the home screen and works without a signal.",
  shots:[
   S("p-scene","Scene Timer","Tap the logo (or Quick Actions). A reassessment timer with +5 min, snooze and a loud alarm that also fires as a phone notification. If it has been running 45+ minutes the app reminds you to close it. Minutes, messages and repeats are admin settings."),
   S("p-cpr","CPR Tracker","Total code time, the 2-minute compression cycle, time since the last epi, a metronome, and one-tap event buttons (Compression started, Pads applied, O2/BVM, iGel, Shock, Lucas, Gave epi, ROSC…). Every tap is timestamped into a log you can copy into the PCR. The buttons are configured under Admin → CPR buttons."),
   S("p-vitals","Vitals Reference","Adult and pediatric normal ranges, GCS and the Rule of 9s. The values come from Admin → Vitals, so the organization's medical director controls what is shown."),
   S("p-notes","Call Notes","Quick vitals and findings with a timestamp, kept only on this phone. “Copy all” pastes the whole set into the PCR; “Clear all” wipes it when the call is done. Nothing is uploaded."),
  ]},
 {key:"reference", num:3, title:"Reference tiles", kind:"phone",
  intro:"Information members look up on scene or on the way: hospitals, protocols, the hazmat guide, where things are on the truck, apartment gate codes and site plans, documents, and who's who.",
  shots:[
   S("p-hospitals","Hospitals","Searchable by name or specialty, with filter chips and capability tags (trauma level, stroke, pediatric, 24-hour cardiac cath). Tap a hospital for address, phone and directions. Maintained under Admin → Hospitals."),
   S("p-protocols","Protocols","The full protocol book, searchable, with page-numbered sections. Opens in the in-app reader."),
   S("p-protocol-page","Protocol reader","Page view with Prev / Next, zoom and a jump-to list. Pages are cached so the book opens without a signal."),
   S("p-erg","ERG 2024","The DOT Emergency Response Guidebook: search by material name or UN number, open the guidebook, and quick links to the placard tables, ID charts, isolation distances and guides."),
   S("p-equipment","Equipment Finder","What is where on the ambulance. Cabinets with a photo and item count; searching an item tells you which cabinet it is in. (Admins get an Edit button here to update photos and lists in place.)"),
   S("p-equipment-cabinet","A cabinet opened","The numbered photo and everything stored in it with quantities, searchable within the cabinet."),
   S("p-apartments","Apartments Directory","Apartment complexes with their gate codes, searchable by name or address. Tap one for the site plan."),
   S("p-apartment-plan","Apartment site plan","Gate code on top, the plan below with building markers; pinch or double-tap to zoom. (Admins can pin buildings on the plan from this screen.)"),
   S("p-resources","Resources","Documents the organization publishes: SOPs, the radio guide, Shabbos procedures, medication card, uniform policy. Each opens over a secure link that expires. Managed under Admin → Resources."),
   S("p-state-equipment","State Equipment (admin tile)","The Texas / City of Houston required-equipment list by tier (BLS, ALS, MICU) with required and overlap counts; download the checklist, export to Excel or PDF, and record what you checked."),
   S("p-directory","Members Directory","Search by name, unit or phone; filter by Responder, Service Unit, Dispatcher, Medical Control. Shows level, phone (tap to call), address, uniform sizes and emergency contact."),
   S("p-scheduler","Scheduler","Who is available right now and until when, ranked by GPS distance from you, with one-tap call and map. A dispatcher can type the call address to rank everyone by distance from the scene."),
   S("p-scheduler-map","Scheduler — the map","Above the list, a live map with a pin for every available responder who is sharing location; type the call address and a red dot marks the scene and the list re-ranks by distance to it. Tap a pin for name, unit and distance."),
  ]},
 {key:"certs", num:4, title:"Certifications & training", kind:"phone",
  intro:"The app tracks every certification and document for every member, emails reminders before they expire, and lets a member renew by uploading the card from their phone.",
  shots:[
   S("p-certs","Certifications","A member’s own list: each certification with its number and expiry, color-coded (green valid, amber within 30 days, red expired or missing), with Remind (adds a calendar reminder) and Renew. Admins see every responder here instead; that view is in the desktop admin section."),
   S("p-certs-renew","Renew","Enter the new expiry date and attach a photo or PDF of the card. The date is saved only once the document is in, so the record and the proof always match."),
   S("p-taskbook","Task Book","A new responder’s own field-training book: each item is self-marked, then confirmed by the FTO with a date, and the percent complete grows. An FTO sees their trainees here too. Task items are set under Admin → Task list."),
  ]},
 {key:"gear", num:5, title:"Jump bags, ambulance checks & supplies", kind:"phone",
  intro:"Each responder keeps their own jump bag inventory. Ambulance checks and supply requests belong to the service units (the members who look after the trucks), so those screens are shown here as a service unit sees them. Admins see all of it on the desktop.",
  shots:[
   S("p-jumpbag","My Jump Bag","72 of 75 stocked, by pouch (Trauma, Vital signs, Glucometer kit, Airway & O2, AED, Medication, Misc). “I checked my bag today” with a reminder every 30 days; items that carry an expiry date are tracked and flagged."),
   S("p-jumpbag-jump","Short / missing","Tap the amber badge to see only what needs attention, so restocking takes a minute."),
   S("p-jumpbag-pouch","A pouch opened","Every item is Have / Short / Missing with one tap. Expiry dates show where they apply."),
   S("p-jumpbag-restock","Request restock","Picks the short and missing items, lets the member add a note, and sends a supply request to the admins and service units."),
   S("p-checkoff","Ambulance Checkoff","Pick the ambulance, the log type (weekly check, monthly check, maintenance log, inventory checklist) and the date. Supply requests are one tap below."),
   S("p-checkoff-sections","Weekly check","Sections with a count of what is left and a progress bar. Answers stay on the phone until submitted, so a check can be finished later."),
   S("p-checkoff-section","A section opened","Fluid levels, top-offs, odometer, tire pressures, photo items — tap to answer, with as little typing as possible."),
   S("p-checkoff-left","What's left","Jumps straight to the unanswered items."),
   S("p-checkoff-partial","Submitting with gaps","If items are unchecked the app says so: they will be saved as “not checked” and visible to the admins. Submit as is, or go back and finish."),
   S("p-checkoff-done","Saved","Flagged items are listed for the admins; skipped items are recorded as not checked. Flags can turn into a restock request automatically."),
   S("p-supply","Supply requests","For service units and admins: what members asked to have restocked and what inventory checks flagged. Each request moves Open → Ordered → Done."),
   S("p-supply-detail","A request opened","The needed items with quantities, who asked and when, their note, and Mark ordered / Mark done."),
  ]},
 {key:"admin-phone", num:6, title:"Admin on the phone", kind:"phone",
  intro:"Everything an admin can do on the desktop also works on the phone. Sections are grouped behind a picker so the top of the screen stays clean.",
  shots:[
   S("p-admin","Members","Filters for Active, Inactive, Admins and Certs due; a dot per member; Add member; download the whole list as a spreadsheet."),
   S("p-admin-picker","Section picker","Tap the title to switch section: People, Ambulances & gear, App content, Certifications, Reference lists — with badges for open items."),
   S("p-admin-member","Editing a member","Identity & role, Contact & personal and Certifications tabs; shows when they last opened the app and which version they are on."),
  ]},
 {key:"admin", num:7, title:"Admin on a desktop", kind:"desktop",
  intro:"On a laptop the admin gets a sidebar, a list and a detail pane side by side. Every list is drag-to-reorder, every change is saved with one button, and most lists can be downloaded as a spreadsheet.",
  shots:[
   S("d-home","The app on a desktop","The same app in a desktop browser — the phone layout, centered. Nothing to learn twice."),
   S("d-admin-members","Members — Identity & role","Name, unit, date of birth, the Google account they sign in with, member type and level. The list shows status dots and when each member last opened the app."),
   S("d-admin-member-contact","Members — Contact & personal","Phone, address, personal email, uniform sizes and emergency contact — the same fields members edit in My Profile."),
   S("d-admin-member-certs","Members — Certifications","Per certification: number, expiry, required or not, Pause (stops reminders), Remove, and the document on file with a direct link."),
   S("d-admin-storage","Storage","The percentage badge opens usage against the plan limits for the database and the photo storage, a cleanup for images nothing uses anymore, and a one-click backup to Google Sheets (which also runs by itself every night) or a download to this device."),
   S("d-admin-guest-codes","Guest codes","Passcodes that open the demo for a visiting organization. Each code can be named and turned off."),
   S("d-admin-supply-requests","Supply requests","Everything members and inventory checks asked for, with status and who asked. Service units see the same list on their phones."),
   S("d-admin-supply-detail","A supply request","Items and quantities, the note, and Mark ordered / Mark done."),
   S("d-admin-ambulance-checks","Ambulance checks","Every submitted check by ambulance, type and date, with flagged items highlighted. Filter by type; download as a spreadsheet."),
   S("d-admin-ambulance-check-detail","A submitted check","Every answer, photos taken, what was flagged and what was skipped."),
   S("d-admin-jump-bags","Jump bags","Each responder's bag: how much is stocked, when it was last updated and last checked, what is short, missing or expiring. The ones with problems float to the top."),
   S("d-admin-jump-bag-detail","One responder's bag","Pouch by pouch with Have / Short / Missing and expiry dates."),
   S("d-admin-jump-bag-items","Jump bag items","The master list every bag is measured against: pouch, quantity, whether the item carries an expiry date. Drag to reorder."),
   S("d-admin-announcements","Announcements","Each announcement shows its type and response count: seen by, confirmed, voted. Sending one pushes a notification to every phone."),
   S("d-admin-announcement-edit","Writing an announcement","Title, type (Notice, Please read, Poll), message, where it takes the member when tapped, and the poll choices."),
   S("d-admin-announcement-responses","Who responded","Per member: seen, confirmed or voted — downloadable."),
   S("d-admin-tiles","Tiles","The home-screen buttons. Each has a label, a type (web link or phone number, another app, or a built-in screen), a target, an image or icon, Admin-only and Active switches. Drag to reorder."),
   S("d-admin-tile-edit","A tile opened","Change the label, type, target, upload a tile image, or switch it off without deleting it."),
   S("d-admin-resources","Resources","Documents published to members: name, description and the PDF. Drag to reorder."),
   S("d-admin-settings","Settings","Forty-one settings in grouped cards: dispatch and medical control numbers, Text Home, scene timer, member options, certification emails, storage limits, organization details, analytics, logo, and more. Every one is listed in the settings reference at the end."),
   S("d-admin-settings-analytics","Analytics tracking & Logo (new in 1.8.1)","Google Analytics, Google Tag Manager and Meta Pixel IDs in their own card — an ID that doesn’t look right is refused, and changing one that is already set asks “Replace the current analytics ID?” before saving. Below it, the Logo card: upload your own logo for the header, sign-in screens and install banner, or go back to the built-in one."),
   S("d-admin-settings-all","Settings — every card opened","The same screen with every group expanded, so each setting and its current value is visible."),
   S("d-admin-certification-types","Certification types","Which certifications are tracked and, for each, whether being expired means the person cannot respond. Blocking ones warn the member; the rest only get reminders."),
   S("d-admin-document-types","Document types","The 22 documents a member can upload: agreements, licenses, courses, policies. Drag to reorder."),
   S("d-admin-hospitals","Hospitals","Name, address, phone and capability tags. Drag to reorder; what members see in the Hospitals tile."),
   S("d-admin-apartments","Apartments","Complexes, addresses and gate codes. Site plans and building pins are edited from the member-facing screen."),
   S("d-admin-task-list","Task list","The Task Book items a new responder has to complete, with who signs them off."),
   S("d-admin-cpr-buttons","CPR buttons","The event buttons in the CPR Tracker — label and color. Add, remove or reorder."),
   S("d-admin-vitals","Vitals","The values shown in Vitals Reference: adult and pediatric vitals, GCS, Rule of 9s and the assessment mnemonics."),
  ]},
];

// Every setting, as it appears in Admin → Settings, with what it does.
const SETTINGS=[
 ["Organisation","Org Name","Hatzalah of Houston","Shown in the app title, emails and exports."],
 ["Organisation","Location","on","Lets members share GPS location while available."],
 ["Organisation","Search Placeholder","Search protocols, hospitals…","Hint text in the home-screen search box."],
 ["Organisation","Logo","(built-in)","Upload your own logo for the header, sign-in screens and install banner; one tap goes back to the built-in one."],
 ["Analytics tracking","Google Analytics ID","G-DEMO123456","GA4 property every phone reports to. Changing a set ID asks for confirmation."],
 ["Analytics tracking","Google Tag Manager ID","(empty)","Optional GTM container; leave empty to not use it."],
 ["Analytics tracking","Meta Pixel ID","(empty)","Optional Meta (Facebook) Pixel; leave empty to not use it."],
 ["Dispatch","Dispatch Label","Call Dispatch","Text on the blue home-screen button."],
 ["Dispatch","Dispatch Number","713-555-0100","The number it dials."],
 ["Medical Control","Medical Control Label","Call Medical Control","Text on the red home-screen button."],
 ["Medical Control","Medical Control Number","713-555-0111","The number it dials."],
 ["Text Home","Text Home","On","Shows the Text Home quick action."],
 ["Text Home","Text Home Message","Hi — I responded to a Hatzalah call…","The pre-written text sent to the member's home contact."],
 ["Scene timer","Scene Timer Minutes","10","Length of the reassessment timer."],
 ["Scene timer","Scene Timer Message","Time to reassess the scene.","What the alarm says."],
 ["Scene timer","Scene Reminder Minutes","45","When to remind a member the timer is still running."],
 ["Scene timer","Scene Reminder Message","Scene timer still running (45+ min)…","The reminder text."],
 ["Scene timer","Scene Timer Snooze Minutes","5","How long Snooze and +5 add."],
 ["Scene timer","Scene Alarm Repeats","5","How many times the alarm repeats."],
 ["CPR","CPR Cycle Minutes","2","Length of the compression cycle in the CPR Tracker."],
 ["Member options","Member Levels","EMT, AEMT, ALS, Doctor, PR","The level choices on a member record."],
 ["Member options","Member Types","Responder, Non Responder, Dispatcher, Medical Control, Service Unit","The type choices; type decides which screens a member gets."],
 ["Member options","Member Statuses","Primary, Backup, Observer, Dispatcher","The status pill choices on the home screen."],
 ["Ambulance checkoff","Ambulances","A1 Ambulance - 1, A2 Ambulance - 2","The ambulances offered in Ambulance Checkoff and State Equipment."],
 ["Jump bag","Jump Bag Reminder Days","30, 7, 0","When to remind a member to check their bag (days before the monthly check is due)."],
 ["Certifications","Certifications That Block Response","State EMT/Paramedic License, American Heart BLS, Jurisprudence","Expired = cannot respond (also set per type under Certification types)."],
 ["Certification emails","Cert Reminder Days","90","How far ahead reminders begin."],
 ["Certification emails","Cert Reminder Milestones","90, 60, 30, 14, 7, 3, 1","The days before expiry on which an email goes out."],
 ["Certification emails","Cert Email Subject (expiring)","Reminder: your {cert} expires in {days} days…","Subject of the expiring email. {name} {unit} {cert} {days} {date} are filled in."],
 ["Certification emails","Cert Email Body (expiring)","Hi {name} ({unit}), This is a reminder…","Body of the expiring email."],
 ["Certification emails","Cert Email Subject (expired)","Your {cert} has expired…","Subject when a blocking certification has expired."],
 ["Certification emails","Cert Email Body (expired)","Hi {name} ({unit}), Your {cert} has expired…","Body of that email."],
 ["Certification emails","Cert Email Subject (expired, non-blocking)","Action needed: your {cert} has expired…","Subject when a non-blocking certification has expired."],
 ["Certification emails","Cert Email Body (expired, non-blocking)","Hi {name} ({unit}), Your {cert} expired on {date}…","Body of that email."],
 ["Certification emails","Cert Email Subject (renewed)","Thank you — your {cert} is up to date","Subject of the thank-you email after a renewal."],
 ["Certification emails","Cert Email Body (renewed)","Hi {name} ({unit}), Thank you…","Body of the thank-you email."],
 ["Certification renewals","Renew Egnyte Step","off","Adds an “upload to Egnyte” step to the renew flow."],
 ["Instant renewal emails","Renewal Webhook URL","(per organization)","Where the app tells the email script that a renewal happened, so the thank-you goes out at once."],
 ["Instant renewal emails","Renewal Webhook Secret","(per organization)","Shared secret for that call."],
 ["Notifications","Push Worker URL","(per organization)","The push-notification service the app talks to."],
 ["Notifications","Push Public Key","(per organization)","Its public key."],
 ["Storage limits","Storage Limit DB MB","500","Database allowance shown in the Storage dialog."],
 ["Storage limits","Storage Limit Files MB","1024","Photo and document storage allowance."],
 ["Storage limits","Storage Limit Repo MB","1024","Code repository allowance."],
 ["Features","Availability","on","Shows the availability check and My Availability."],
 ["Features","RX Lookup","on","Shows the Rx button in the search bar."],
 ["Features","Guest Demo","on","Allows demo passcodes on the sign-in screen."],
 ["Features","Remember Device","yes","Keeps members signed in on their phone."],
 ["Links & images","ESO PCR URL","https://www.esosuite.net/login/hohems","Where the ESO PCR tile goes."],
 ["Links & images","Rule Of 9 Image","(uploaded image)","The Rule of 9s diagram in Vitals Reference."],
];

const TILES=[
 ["ESO PCR","Web link","Opens the ePCR system in the browser"],
 ["Pulsara","Another app","Opens the Pulsara app"],
 ["Hospitals","Built in","Hospital list with capabilities"],
 ["Protocols","Built in","The protocol book"],
 ["Equipment Finder","Built in","What is where on the ambulance"],
 ["Gatewise","Another app","Opens the Gatewise app (gates)"],
 ["Apartments Finder","Built in","Gate codes and site plans"],
 ["Certifications","Built in","Certifications and documents"],
 ["File Uploader","Built in","General document upload (switched off here)"],
 ["Poison Control","Phone number","Dials 1-800-222-1222"],
 ["Members Directory","Built in","Who's who"],
 ["ERG 2024","Built in","Emergency Response Guidebook"],
 ["Scheduler","Built in","Who is available now, by distance"],
 ["State Equipment","Built in · admin only","Required-equipment list and checks"],
 ["Task Book","Built in","Field training book"],
 ["Resources","Built in","Published documents"],
 ["My Jump Bag","Built in","Personal bag inventory"],
 ["Ambulance Checkoff","Built in","Vehicle checks and supply requests"],
 ["Admin","Built in · admin only","The admin area"],
];

/* ------------------------------------------------------------------ layout math (inches) */
const PAGE_H=11, PAD_T=0.55, PAD_B=0.5, HEAD=0.3, CAP=9.3;   // usable height for content
const PHONE_W=3.25, DESK_W=7.0, HEADING_H=1.15;
function imgInfo(file){ const d=sizeOf.default?sizeOf.default(fs.readFileSync(file)):sizeOf(fs.readFileSync(file)); return {w:d.width,h:d.height}; }
function phoneH(){ return PHONE_W*860/412 + 1.05; }                     // image + caption block
function deskItemH(file, capLines){ const i=imgInfo(file); return DESK_W*i.h/i.w + 0.30 + 0.15*Math.max(1,capLines||2); }

/* ------------------------------------------------------------------ page assembly */
const pages=[]; // {html, section}
function addPage(html, sec){ pages.push({html, sec}); return pages.length; }
function capHTML(s){ return '<div class="cap"><b>'+esc(s.title)+'</b><p>'+esc(s.blurb)+'</p></div>'; }
function headingHTML(sec){ return '<div class="sechead"><div class="num">Section '+sec.num+'</div><h2>'+esc(sec.title)+'</h2><p>'+esc(sec.intro)+'</p></div>'; }

function buildPhoneSection(sec){
  const shots=sec.shots.filter(s=>{ const ok=fs.existsSync(SHOTS+"/"+s.id+".png"); if(!ok) console.log("  (no capture yet: "+s.id+")"); return ok; }); let first=true; sec.page=pages.length+1;
  while(shots.length){
    const pair=shots.splice(0,2);
    let h=(first?headingHTML(sec):'')+'<div class="prow">'+pair.map(s=>'<div class="pcol"><div class="phone"><img src="shots/'+s.id+'.png"></div>'+capHTML(s)+'</div>').join("")+'</div>';
    addPage(h, sec); first=false;
  }
}
function buildDeskSection(sec){
  // expand tall shots into pieces
  const items=[]; sec.page=pages.length+1;
  sec.shots.forEach(s=>{
    const ps=pieces[s.id];
    if(ps){ ps.forEach((f,i)=>items.push({file:"pieces/"+f, abs:PIECES+"/"+f, title:s.title+(ps.length>1?" ("+(i+1)+" of "+ps.length+")":""), blurb:i===0?s.blurb:"(continued)"})); }
    else items.push({file:"shots/"+s.id+".png", abs:SHOTS+"/"+s.id+".png", title:s.title, blurb:s.blurb});
  });
  let cur=[], used=0, first=true;
  const flush=()=>{ if(!cur.length) return; addPage((first?headingHTML(sec):'')+cur.map(it=>'<div class="ditem"><div class="desk"><img src="'+it.file+'"></div>'+capHTML(it)+'</div>').join(""), sec); first=false; cur=[]; used=0; };
  items.forEach(it=>{
    const lines=Math.ceil(it.blurb.length/110);
    const h=deskItemH(it.abs, lines);
    const capLeft=CAP-(first?HEADING_H:0)-used;
    if(cur.length && h>capLeft){ flush(); }
    cur.push(it); used+=h;
  });
  flush();
}

/* cover */
addPage(`<div class="cover">
  <div class="cv-top"><img class="cv-logo" src="logo.png"><div class="cv-org">Hatzalah of Houston</div></div>
  <h1>Member App<br>Feature Catalog</h1>
  <div class="cv-sub">Every screen and every setting — on the phone and on the desktop</div>
  <div class="cv-meta">Version ${VERSION} · ${DATE}</div>
  <div class="cv-strip"><img src="shots/p-home.png"><img src="shots/p-quick.png"><img src="shots/p-cpr.png"><img src="shots/p-jumpbag.png"></div>
  <div class="cv-foot">Captured from the app’s built-in demo. All people, phone numbers and records shown are sample data.</div>
</div>`, null);
const CONTENTS_PAGE=addPage("", null); // filled at the end
/* at a glance */
addPage(`<div class="sechead"><div class="num">Before you start</div><h2>The app at a glance</h2>
<p>Hatzalah of Houston runs its volunteer EMS operation on this app: one install on every member’s phone, the same app in a desktop browser for admins, and nothing to download or update by hand. It is a progressive web app — it installs from the browser, works offline for the parts that matter on a call, and updates itself.</p></div>
<div class="glance">
 <div><h3>For every member</h3><ul>
  <li>One-tap calls to dispatch and medical control</li>
  <li>Availability and location sharing, scheduled ahead or right now</li>
  <li>Announcements with read-confirmation and polls, pushed to the phone</li>
  <li>Hospitals, protocols, ERG, apartment gate codes and site plans</li>
  <li>Members directory and the live Scheduler by distance</li>
  <li>Own profile, own certifications, own jump bag</li>
 </ul></div>
 <div><h3>On a call</h3><ul>
  <li>Scene Timer with alarm and notifications</li>
  <li>CPR Tracker with timestamped event log</li>
  <li>Vitals Reference, Call Notes, Medication Lookup</li>
  <li>Text Home in one tap</li>
  <li>Works without a signal; caches the protocol book</li>
 </ul></div>
 <div><h3>For admins</h3><ul>
  <li>Members, roles, levels and sign-in accounts</li>
  <li>Certification tracking with automatic reminder emails and in-app renewal</li>
  <li>Ambulance checks, jump bags and supply requests in one place</li>
  <li>Home-screen tiles, resources, hospitals, apartments — all editable, no developer needed</li>
  <li>Every text, number, logo and analytics ID the app uses is a setting</li>
  <li>Nightly backup to Google Sheets, storage dashboard, problem reports from members</li>
 </ul></div>
</div>
<div class="try"><h3>Try it yourself</h3><p>Open <b>houstonhatzalahapp.org</b> on a phone or a computer, tap <b>View demo</b> under the sign-in button, and enter a demo passcode (admins issue them under Admin → Guest codes). The demo is the full app on sample data: every tile and every admin section works, changes stay on your device, and <b>Start over</b> resets it.</p></div>
`, {title:"At a glance"});
addPage(`<div class="sechead"><div class="num">Before you start</div><h2>The home screen</h2><p>Every button on the home screen is a <b>tile</b>. Admins add, rename, reorder, switch off or restrict tiles under Admin → Tiles — a tile can be a built-in screen, a web link, a phone number or a shortcut into another app. These are the tiles in the demo.</p></div>
<div class="tilepage"><div class="phone"><img src="shots/p-home.png"></div><div class="tilelist"><table><tr><th>Tile</th><th>Type</th><th>Opens</th></tr>${TILES.map(t=>'<tr><td>'+esc(t[0])+'</td><td>'+esc(t[1])+'</td><td>'+esc(t[2])+'</td></tr>').join("")}</table></div></div>`, {title:"The home screen"});

sections.forEach((sec,i)=>{ sec.num=i+1; });
sections.forEach(sec=>{ if(sec.kind==="phone") buildPhoneSection(sec); else buildDeskSection(sec); });

/* settings reference */
const SET_SEC={num:sections.length+1,title:"Settings reference",intro:"Every setting under Admin → Settings, the value in the demo, and what it controls. Values with {name}, {unit}, {cert}, {days} and {date} are filled in per member when the email is sent.",page:pages.length+1};
sections.push(SET_SEC);
{
  const rowsPerPage=[15,18,18]; let idx=0, first=true, p=0;
  while(idx<SETTINGS.length){
    const chunk=SETTINGS.slice(idx, idx+rowsPerPage[Math.min(p,2)]); idx+=chunk.length; p++;
    let lastGroup="";
    const rows=chunk.map(r=>{ const g=r[0]!==lastGroup?r[0]:""; lastGroup=r[0]; return '<tr><td class="g">'+esc(g)+'</td><td class="k">'+esc(r[1])+'</td><td class="v">'+esc(r[2])+'</td><td>'+esc(r[3])+'</td></tr>'; }).join("");
    addPage((first?headingHTML(SET_SEC):'<h3 class="cont">Settings reference (continued)</h3>')+'<table class="set"><tr><th>Group</th><th>Setting</th><th>Value in the demo</th><th>What it controls</th></tr>'+rows+'</table>', SET_SEC);
    first=false;
  }
}
/* admin sections reference + closing */
const ADM=[["People","Members","Everyone with a record: identity, role, contact, certifications. Add, deactivate, download."],["People","Guest codes","Demo passcodes for visitors."],["Ambulances & gear","Supply requests","Restock requests from members and inventory checks."],["Ambulances & gear","Ambulance checks","Every submitted vehicle check."],["Ambulances & gear","Jump bags","Each responder’s bag status."],["Ambulances & gear","Jump bag items","The master item list."],["App content","Announcements","Notices, please-reads and polls, with responses."],["App content","Tiles","The home-screen buttons."],["App content","Resources","Published documents."],["App content","Settings","Every number and text the app uses."],["Certifications","Certification types","What is tracked and what blocks response."],["Certifications","Document types","What members can upload."],["Reference lists","Hospitals","The hospital list."],["Reference lists","Apartments","Complexes and gate codes."],["Reference lists","Task list","Task Book items."],["Reference lists","CPR buttons","The CPR Tracker buttons."],["Reference lists","Vitals","Vitals Reference values."]];
const END_SEC={num:sections.length+1,title:"Admin sections at a glance",intro:"Where each thing lives in the admin area, on the phone and on the desktop.",page:pages.length+1};
sections.push(END_SEC);
{
  let lastGroup="";
  addPage(headingHTML(END_SEC)+'<table class="set adm"><tr><th>Group</th><th>Section</th><th>What it manages</th></tr>'+ADM.map(r=>{ const g=r[0]!==lastGroup?r[0]:""; lastGroup=r[0]; return '<tr><td class="g">'+esc(g)+'</td><td class="k">'+esc(r[1])+'</td><td>'+esc(r[2])+'</td></tr>'; }).join("")+'</table>'+
  `<div class="how"><h3>How it is built</h3><p>A single web app served from GitHub Pages, a Supabase database and file storage, Google sign-in, a small Cloudflare worker for push notifications, and a Google Apps Script for the certification emails and the nightly Google Sheets backup. There is no app store listing to maintain: members install it from the browser and every phone updates itself. All of it runs on the free or lowest tiers of those services.</p>
  <p>Questions or a walkthrough: Joseph Eber, Hatzalah of Houston.</p></div>`, END_SEC);
}

/* contents */
{
  const toc=[{num:"",title:"The app at a glance",page:3},{num:"",title:"The home screen",page:4}].concat(sections.map(s=>({num:s.num,title:s.title,page:s.page})));
  pages[CONTENTS_PAGE-1].html='<div class="sechead"><div class="num">Contents</div><h2>What’s inside</h2><p>The first sections are phone screens as members see them, then the desktop admin, and the last two list every setting and every admin section. This edition covers version 1.8.1. Each screenshot has a short note on what the screen does and who uses it.</p></div><ol class="toc">'+
    toc.map(t=>'<li><span class="n">'+t.num+'</span><span class="t">'+esc(t.title)+'</span><span class="dots"></span><span class="p">'+t.page+'</span></li>').join("")+'</ol>'+
    '<div class="legend"><h3>Reading the screenshots</h3><p>Phone screens were captured at the size of a typical phone; desktop screens at 1366 pixels wide. The orange <b>DEMO MODE</b> bar at the top of every screen is only shown in the demo — members never see it. Names, phone numbers, addresses and certification numbers are invented.</p></div>';
}

/* ------------------------------------------------------------------ render */
const css=`
@page{size:Letter;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;font-family:Inter,"Inter Display",system-ui,sans-serif;color:#12233d;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:8.5in;height:11in;padding:${PAD_T}in 0.6in ${PAD_B}in;position:relative;overflow:hidden;page-break-after:always;background:#fff}
.page:last-child{page-break-after:auto}
.hdr{position:absolute;top:0.3in;left:0.6in;right:0.6in;display:flex;justify-content:space-between;font-size:7.5pt;color:#5f7089;letter-spacing:.02em;text-transform:uppercase;font-weight:600}
.ftr{position:absolute;bottom:0.28in;left:0.6in;right:0.6in;display:flex;justify-content:space-between;font-size:7.5pt;color:#5f7089}
.ftr .pn{font-weight:700;color:#143D75}
.body{padding-top:0.2in}
.sechead{margin:0 0 0.22in;padding-bottom:0.14in;border-bottom:2px solid #143D75}
.sechead .num{font-size:8pt;text-transform:uppercase;letter-spacing:.12em;color:#C8202E;font-weight:700;margin-bottom:3px}
.sechead h2{margin:0 0 6px;font-size:21pt;font-weight:800;color:#143D75;letter-spacing:-.01em}
.sechead p{margin:0;font-size:9.6pt;line-height:1.45;color:#3b4a63}
h3.cont{margin:0 0 0.15in;font-size:11pt;color:#143D75}
.prow{display:flex;gap:0.3in;justify-content:center}
.pcol{width:3.55in;display:flex;flex-direction:column;align-items:center}
.phone{width:${PHONE_W}in;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(18,35,61,.18);border:1px solid #d7dde6;background:#fff}
.phone img{display:block;width:100%}
.cap{width:100%;margin-top:0.1in}
.cap b{display:block;font-size:10.5pt;color:#143D75;margin-bottom:2px}
.cap p{margin:0;font-size:8.6pt;line-height:1.4;color:#3b4a63}
.ditem{margin:0 auto 0.14in;width:${DESK_W}in}
.desk{border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(18,35,61,.16);border:1px solid #d7dde6;background:#fff}
.desk img{display:block;width:100%}
.ditem .cap{margin-top:0.08in}
.ditem .cap b{font-size:10pt}
.ditem .cap p{font-size:8.4pt}
/* cover */
.page.cover-page{padding:0;background:#143D75}
.cover{height:100%;padding:0.8in 0.8in 0.6in;color:#fff;display:flex;flex-direction:column;background:linear-gradient(160deg,#143D75 0%,#0f2f5c 60%,#0b2447 100%)}
.cv-top{display:flex;align-items:center;gap:14px}
.cv-logo{width:0.7in;height:0.7in;border-radius:14px;background:#fff;padding:4px}
.cv-org{font-size:13pt;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.9}
.cover h1{font-size:40pt;line-height:1.05;margin:0.55in 0 0.15in;font-weight:800;letter-spacing:-.015em}
.cv-sub{font-size:13pt;opacity:.85;max-width:5.5in;line-height:1.4}
.cv-meta{margin-top:0.25in;font-size:10pt;opacity:.75;font-weight:600}
.cv-strip{margin-top:auto;display:flex;gap:0.18in;align-items:flex-end}
.cv-strip img{width:1.55in;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.25)}
.cv-strip img:nth-child(2){width:1.62in} .cv-strip img:nth-child(3){width:1.55in} .cv-strip img:nth-child(4){width:1.62in}
.cv-foot{margin-top:0.3in;font-size:8pt;opacity:.65}
/* toc */
.toc{list-style:none;padding:0;margin:0.1in 0 0}
.toc li{display:flex;align-items:baseline;gap:8px;padding:7px 0;border-bottom:1px solid #e2e6ec;font-size:11pt}
.toc .n{width:0.35in;color:#C8202E;font-weight:700;font-size:9pt}
.toc .t{font-weight:600;color:#12233d}
.toc .dots{flex:1;border-bottom:1px dotted #b8c0cc;margin:0 6px;transform:translateY(-3px)}
.toc .p{font-weight:700;color:#143D75;font-variant-numeric:tabular-nums}
.legend{margin-top:0.4in;background:#eef1f5;border-radius:10px;padding:12px 14px}
.legend h3,.try h3,.how h3,.tilelist h3{margin:0 0 4px;font-size:10.5pt;color:#143D75}
.legend p,.try p,.how p{margin:0;font-size:9pt;line-height:1.45;color:#3b4a63}
/* glance */
.glance{display:flex;gap:0.22in;margin-top:0.1in}
.glance>div{flex:1;background:#eef1f5;border-radius:10px;padding:10px 12px}
.glance h3{margin:0 0 4px;font-size:10pt;color:#143D75}
.glance ul{margin:0;padding-left:14px;font-size:8.4pt;line-height:1.4;color:#3b4a63}
.glance li{margin:0 0 3px}
.try{margin-top:0.18in;border:1.5px solid #143D75;border-radius:10px;padding:10px 14px}
.tilelist{flex:1}
.tilepage{display:flex;gap:0.3in;align-items:flex-start}
.tilepage .phone{width:2.6in;flex:0 0 auto}
table{border-collapse:collapse;width:100%;font-size:8.2pt}
.tilelist td,.tilelist th{padding:3px 6px;border-bottom:1px solid #e2e6ec;text-align:left;vertical-align:top}
.tilelist th{font-size:7.5pt;text-transform:uppercase;letter-spacing:.06em;color:#5f7089}
.tilelist td:first-child{font-weight:600;color:#143D75;width:1.5in}
table.set{font-size:8pt}
table.set th{font-size:7.3pt;text-transform:uppercase;letter-spacing:.06em;color:#5f7089;text-align:left;padding:4px 6px;border-bottom:1.5px solid #143D75}
table.set td{padding:5px 6px;border-bottom:1px solid #e2e6ec;vertical-align:top;line-height:1.35}
table.set td.g{font-weight:700;color:#C8202E;width:1.05in;font-size:7.5pt;text-transform:uppercase;letter-spacing:.04em;padding-top:7px}
table.set td.k{font-weight:600;color:#143D75;width:1.75in}
table.set td.v{color:#12233d;width:2.0in;font-family:"DejaVu Sans Mono",monospace;font-size:7.3pt}
table.set.adm td.k{width:1.6in}
.how{margin-top:0.35in;background:#eef1f5;border-radius:10px;padding:12px 14px}
.how p{margin:0 0 6px}
`;
let html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hatzalah of Houston — Member App Feature Catalog</title><style>'+css+'</style></head><body>';
pages.forEach((p,i)=>{
  const n=i+1;
  if(n===1){ html+='<div class="page cover-page">'+p.html+'</div>'; return; }
  const secTitle=p.sec?(p.sec.num?'Section '+p.sec.num+' · '+p.sec.title:p.sec.title):'';
  html+='<div class="page"><div class="hdr"><span>Hatzalah of Houston · Member app — feature catalog</span><span>'+esc(secTitle)+'</span></div><div class="body">'+p.html+'</div><div class="ftr"><span>Version '+VERSION+' · '+DATE+'</span><span class="pn">'+n+'</span></div></div>';
});
html+='</body></html>';
fs.copyFileSync(ROOT+"/logo.png", DIR+"/logo.png");
fs.writeFileSync(OUT_HTML, html);
console.log("pages:", pages.length);

(async()=>{
  const b=await chromium.launch(); const pg=await b.newPage();
  await pg.goto("file://"+OUT_HTML); await pg.waitForLoadState("networkidle"); await pg.waitForTimeout(800);
  // overflow check: any page whose content runs past the footer
  const over=await pg.evaluate(()=>[...document.querySelectorAll(".page")].map((p,i)=>{ const body=p.querySelector(".body"); if(!body) return null; const r=body.getBoundingClientRect(), pr=p.getBoundingClientRect(); const limit=pr.top+ (11-0.5)*96 - 0.28*96; return (r.bottom>limit)?{page:i+1,over:Math.round((r.bottom-limit)/96*100)/100}:null; }).filter(Boolean));
  console.log("overflow:", JSON.stringify(over));
  await pg.pdf({path:OUT_PDF, format:"Letter", printBackground:true, margin:{top:0,right:0,bottom:0,left:0}, preferCSSPageSize:true});
  await b.close(); console.log("pdf written", fs.statSync(OUT_PDF).size);
})().catch(e=>{ console.error(e); process.exit(1); });
