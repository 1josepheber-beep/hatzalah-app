// Mock of the quarter-end standings notice, through the real brandHtml() in Code.gs. Run from scratch/email.
const fs=require("fs"), path=require("path"); const {chromium}=require("playwright");
const src=fs.readFileSync(path.join(__dirname,"..","..","apps-script","Code.gs"),"utf8");
const sent=[];
const g={ PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})}, Session:{getScriptTimeZone:()=>"America/Chicago", getEffectiveUser:()=>({getEmail:()=>"app@x.org"})},
  Utilities:{formatDate:(d)=>new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}, MailApp:{sendEmail:(m)=>sent.push(m)}, Logger:{log:()=>{}},
  UrlFetchApp:{fetch:()=>({getResponseCode:()=>200,getContentText:()=>"[]"})} };
const api=new Function(...Object.keys(g), src.replace(/^\s*\/\*\*[\s\S]*?\*\//,"")+"\nreturn {mailBoth};")(...Object.values(g));
const body="Hi Joseph,\n\nThe fourth quarter of 2026 has closed. You ran 11 calls (2 Lead, 5 Driver, 4 Other); the minimum to keep Primary standing is 15.\n\nNothing changes today. An administrator will be in touch to talk it through — if there is something we should know, reply to this email.\n\nIf the same happens next quarter, your standing moves to Backup automatically. An administrator can override that at any time.\n\nYou can see your calls any time in the app → tap your standing badge.\n\nThank you,\nHatzalah of Houston Administration";
api.mailBoth("j@x.org","Q4 2026 standing: below the Primary minimum",body,"",{kind:"Standings", strip:"Q4 2026 — below minimum", stripColor:"gold", facts:[["Your standing","Primary"],["Calls in Q4","11 of 15"],["Next check","Apr 7, 2027"]]});
const APP="https://houstonhatzalahapp.org"; const b64=fs.readFileSync(path.join(__dirname,"..","..","logo-email.png")).toString("base64");
(async()=>{ const b=await chromium.launch(); const m=sent[0];
  const html="<!DOCTYPE html><html><head><meta charset=utf-8></head><body style='margin:0;background:#eef1f5'>"+m.htmlBody.split(APP+"/logo-email.png").join("data:image/png;base64,"+b64)+"</body></html>";
  const pg=await b.newPage({viewport:{width:700,height:900},deviceScaleFactor:2}); await pg.setContent(html); await pg.waitForTimeout(200);
  await pg.screenshot({path:path.join(__dirname,"out","standing-notice.png"),fullPage:true}); await b.close(); console.log("ok", m.subject); })();
