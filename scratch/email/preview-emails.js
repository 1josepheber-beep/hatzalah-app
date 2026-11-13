// Renders the real Apps Script email layout (brandHtml in apps-script/Code.gs) for a
// few email kinds, so the design can be checked before deploying. Run from scratch/email:
//   node preview-emails.js      -> out/*.html and out/*.png
const fs=require("fs"), path=require("path"); const {chromium}=require("playwright");
const src=fs.readFileSync(path.join(__dirname,"..","..","apps-script","Code.gs"),"utf8");
const sent=[];
const g={
  PropertiesService:{getScriptProperties:()=>({getProperty:(k)=>({ADMIN_EMAILS:"admin@x.org"})[k]||null})},
  Session:{getScriptTimeZone:()=>"America/Chicago", getEffectiveUser:()=>({getEmail:()=>"app@houstonhatzalah.org"})},
  Utilities:{formatDate:(d,tz,fmt)=>{ d=new Date(d); return fmt==="yyyy-MM-dd"?d.toISOString().slice(0,10):d.toLocaleDateString("en-US",{month:fmt.indexOf("MMMM")>=0?"long":"short",day:"numeric",year:"numeric"}); }},
  MailApp:{sendEmail:(m)=>sent.push(m)}, Logger:{log:()=>{}}, UrlFetchApp:{fetch:()=>({getResponseCode:()=>200,getContentText:()=>"[]"})},
};
const api=new Function(...Object.keys(g), src.replace(/^\s*\/\*\*[\s\S]*?\*\//,"")+"\nreturn {mailBoth, brandHtml, certNote, getSet};")(...Object.values(g));
const APP="https://houstonhatzalahapp.org";
const howto="To renew it in our system: open the Hatzalah of Houston app ("+APP+"), tap Certifications, enter the new expiration date, and upload a copy of your renewed certification when prompted.";
const closing="Thank you very much for your attention to this matter.\n\nSincerely,\nHatzalah of Houston Administration";
const S={"cert note (coh_ambulance_permit_exp)":"The permit application is in the app under Resources. Fill it in and submit it to the City of Houston before the expiration date.",
         "cert note (epi_training_exp)":"Renew it at EMS1 Academy: https://olt.ems1academy.com/login"};
// 1. permit, 30 days out
api.mailBoth("joseph@x.org","Reminder: your COH Ambulance Permit expires in 30 days — Hatzalah of Houston",
  "Hi Joseph Eber (H-24),\n\nThis is a reminder that your COH Ambulance Permit will expire in 30 days, on December 12, 2026. Please remember to renew it before the expiration date.\n\n"+howto+"\n\n"+closing,
  "admin@x.org", {kind:"Certification reminder", strip:"Expires in 30 days", stripColor:"gold",
    facts:[["Certification","COH Ambulance Permit"],["Expires","Dec 12, 2026","· 30 days"]],
    note:{title:"How to renew", text:api.certNote(S,"coh_ambulance_permit_exp")},
    footer:"You are receiving this because you are an active Hatzalah of Houston member. Reminders go out 90, 60, 30, 14, 7, 3, 1 days before a certification expires, then weekly once it has lapsed."});
// 2. epi training, expired (blocking)
api.mailBoth("joseph@x.org","Your Epi Training has expired — Hatzalah of Houston",
  "Hi Joseph Eber (H-24),\n\nYour Epi Training has expired. You are not permitted to respond to medical emergencies until your certification has been renewed, is up to date, and has been updated in our system.\n\n"+howto+"\n\nSincerely,\nHatzalah of Houston Administration",
  "admin@x.org", {kind:"Certification reminder", strip:"Expired 7 days ago", stripColor:"red",
    facts:[["Certification","Epi Training"],["Expired","Nov 5, 2026"]],
    note:{title:"How to renew", text:api.certNote(S,"epi_training_exp")}});
// 3. renewed
api.mailBoth("joseph@x.org","Your American Heart BLS is up to date — Hatzalah of Houston",
  "Hi Joseph Eber (H-24),\n\nThank you — your American Heart BLS has been updated in our system and now expires March 3, 2028.\n\nYou are cleared to respond to medical emergencies.\n\nSincerely,\nHatzalah of Houston Administration",
  "admin@x.org", {kind:"Certification renewed", strip:"Up to date", stripColor:"green", facts:[["Certification","American Heart BLS"],["New expiration","March 3, 2028"]]});
// 4. restock
api.mailBoth("","Restock needed: A1 inventory — 2 items to order (Joseph Eber)",
  "Joseph Eber (H-24) marked these for ordering on the A1 Ambulance - 1 inventory check:\n\n• 4x4 sterile (×10) — Only 12 left\n• Test Strips (×2) — Short\n\nNote: Need before Shabbos\n\nWhoever orders it: open the app → Ambulance Checkoff → Supply requests and mark it Ordered, so nobody orders it twice.\n"+APP+"\n\nSent Nov 12, 2026 6:10 PM",
  "i@x.org, d@x.org", {kind:"Supply request", strip:"Restock needed", stripColor:"gold", facts:[["Requested by","Joseph Eber (H-24)"],["For","A1 Ambulance - 1"]]});
// 5. jump bag
api.mailBoth("joseph@x.org","Jump bag: 1 item expired, 1 item expiring soon",
  "Hi Joseph,\n\nFrom your jump bag in the app:\n\n• Epi Kit — expired Nov 1, 2026\n• Oral Glucose — expires Dec 1, 2026 (in 19 days)\n\nOnce you have replaced an item, open the app → My Jump Bag and enter the new expiration date so the reminders stop.\n"+APP+"\n\nThank you,\nHatzalah of Houston Administration",
  "", {kind:"Jump bag", strip:"1 item expired", stripColor:"red"});

const OUT=path.join(__dirname,"out"); fs.mkdirSync(OUT,{recursive:true});
const names=["permit-30d","epi-expired","bls-renewed","restock","jumpbag"];
const b64=fs.readFileSync(path.join(__dirname,"..","..","logo-email.png")).toString("base64");
(async()=>{
  const b=await chromium.launch();
  for(let i=0;i<sent.length;i++){
    const m=sent[i]; const html="<!DOCTYPE html><html><head><meta charset=utf-8><title>"+m.subject+"</title></head><body style='margin:0;background:#eef1f5'>"+m.htmlBody.split(APP+"/logo-email.png").join("data:image/png;base64,"+b64)+"</body></html>";
    fs.writeFileSync(path.join(OUT,names[i]+".html"),html); fs.writeFileSync(path.join(OUT,names[i]+".txt"),"To: "+m.to+"\nBcc: "+(m.bcc||"")+"\nSubject: "+m.subject+"\n\n"+m.body);
    const pg=await b.newPage({viewport:{width:700,height:900},deviceScaleFactor:2}); await pg.setContent(html); await pg.waitForTimeout(200);
    await pg.screenshot({path:path.join(OUT,names[i]+".png"),fullPage:true}); await pg.close();
    console.log(names[i],"to:",m.to,"bcc:",m.bcc||"-");
  }
  await b.close();
})();
