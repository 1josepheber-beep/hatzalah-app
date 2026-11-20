// Mock of how the certification reminder shows in a member's inbox: now vs after app@. Run from scratch/email.
const {chromium}=require("playwright"); const path=require("path");
const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#eef1f5;font-family:Inter,Arial,sans-serif;color:#1b2a3f;padding:28px}
h2{font-size:15px;margin:0 0 8px;color:#5b6b82;text-transform:uppercase;letter-spacing:.5px}
.box{background:#fff;border:1px solid #d9dfe8;border-radius:10px;padding:14px 18px;margin:0 0 26px}
.row{display:flex;align-items:center;gap:14px;padding:10px 0;border-bottom:1px solid #eef1f5}
.row:last-child{border-bottom:0}
.av{width:38px;height:38px;border-radius:50%;background:#1d3b73;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px;flex:none}
.av.y{background:#8a5a00}
.from{font-weight:800;width:300px;flex:none}
.from small{display:block;font-weight:500;color:#7a8799;font-size:12px}
.subj{flex:1;font-size:14px}
.subj b{font-weight:700}
.subj .tail{color:#b05a00;background:#fff3d6;border-radius:4px;padding:0 4px}
.when{color:#7a8799;font-size:12px;flex:none}
.note{font-size:13px;color:#5b6b82;margin:6px 0 0}
.reply{display:flex;align-items:center;gap:10px;font-size:14px;margin:8px 0}
.reply .arrow{font-size:20px;color:#1d3b73}
.pill{background:#e3edfb;color:#1d4e9a;border-radius:6px;padding:3px 8px;font-weight:700;font-size:12px}
.pill.g{background:#e5f3ea;color:#1f6b3a}
.pill.r{background:#fde8e8;color:#9b1c1c}
.q{font-weight:800;font-size:16px;margin:0 0 10px}
</style></head><body>

<h2>Question 1 — the sender and the subject</h2>
<div class="box">
  <div class="row"><div class="av y">Y</div><div class="from">Yossi Eber<small>yeber@houstonhatzalah.org</small></div>
    <div class="subj"><b>Reminder: your BLS expires in 30 days <span class="tail">— Hatzalah of Houston</span></b></div><div class="when">Now</div></div>
  <div class="row"><div class="av">H</div><div class="from">Hatzalah of Houston<small>app@houstonhatzalah.org</small></div>
    <div class="subj"><b>Reminder: your BLS expires in 30 days <span class="tail">— Hatzalah of Houston</span></b></div><div class="when">After, subject kept</div></div>
  <div class="row"><div class="av">H</div><div class="from">Hatzalah of Houston<small>app@houstonhatzalah.org</small></div>
    <div class="subj"><b>Reminder: your BLS expires in 30 days</b></div><div class="when">After, tail dropped</div></div>
  <p class="note">The orange part was added so people knew who it came from while the sender was your own name. Once the sender reads "Hatzalah of Houston" it says the same thing twice. Keep it or drop it — either way it's a text change in Admin → Settings, no code.</p>
</div>

<h2>Question 2 — where a member's reply goes</h2>
<div class="box">
  <p class="q">Member hits Reply: "I renewed it, where do I upload the card?"</p>
  <div class="reply"><span class="pill">Option A</span><span class="arrow">→</span> lands in the <b>app@</b> inbox <span class="pill r">someone has to check that inbox</span></div>
  <div class="reply"><span class="pill">Option B</span><span class="arrow">→</span> lands in <b>your</b> inbox (yeber@) <span class="pill g">email still shows From: Hatzalah of Houston</span></div>
  <p class="note">Option B is called "Reply-To": the email is sent as app@, but Gmail routes replies to you. The member never sees your address unless they reply.</p>
</div>
</body></html>`;
(async()=>{ const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:900,height:560},deviceScaleFactor:2}); await pg.setContent(html); await pg.waitForTimeout(200);
  await pg.screenshot({path:path.join(__dirname,"out","mock-from.png"),fullPage:true}); await b.close(); console.log("ok"); })();
