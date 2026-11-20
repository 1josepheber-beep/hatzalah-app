// Previews for the "back in stock" and "remind to restock" emails, from the real Code.gs. Run from scratch/email:
//   node preview-restock.js   -> out/instock-*.png, out/remind.png
const fs=require("fs"), path=require("path"); const {chromium}=require("playwright");
const src=fs.readFileSync(path.join(__dirname,"..","..","apps-script","Code.gs"),"utf8");
const sent=[]; const tables={
  settings:[{id:1,setting:"Pickup Location",value:"the stock room"}],
  roster:[{id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",email:"j@x.org",active:"X",admin:"X"},{id:2,unit:"H-42",first_name:"Israel",last_name:"Leibowitz",email:"i@x.org",active:"X",service_unit:"X"},{id:3,unit:"H-1",first_name:"David",last_name:"Fishman",email:"d@x.org",active:"X",admin:"X"}],
  jumpbag_items:[{id:1,name:"Oral Glucose",qty:"2",active:"X"},{id:2,name:"Epi Kit",active:"X"},{id:3,name:"Nitrile gloves (L)",qty:"1 box",active:"X"},{id:4,name:"iGel (size 4)",active:"X"}],
  jumpbag_status:[{id:1,unit:"H-24",item_id:1,status:"have",exp_date:"2026-11-26"},{id:2,unit:"H-24",item_id:2,status:"missing"},{id:3,unit:"H-24",item_id:3,status:"short"},{id:4,unit:"H-24",item_id:4,status:"have",exp_date:"2026-11-01"}],
  supply_requests:[]
};
const g={
  PropertiesService:{getScriptProperties:()=>({getProperty:(k)=>({ADMIN_EMAILS:"admin@x.org",PUSH_CRON_KEY:"k"})[k]||null})},
  Session:{getScriptTimeZone:()=>"America/Chicago", getEffectiveUser:()=>({getEmail:()=>"app@houstonhatzalah.org"})},
  Utilities:{formatDate:(d,tz,fmt)=>{ d=new Date(d); return fmt==="yyyy-MM-dd"?d.toISOString().slice(0,10):d.toLocaleDateString("en-US",{month:fmt.indexOf("MMMM")>=0?"long":"short",day:"numeric",year:"numeric"}); }},
  MailApp:{sendEmail:(m)=>sent.push(m)}, Logger:{log:()=>{}},
  UrlFetchApp:{fetch:(url,o)=>{ o=o||{}; if(/workers\.dev/.test(url)) return {getResponseCode:()=>200,getContentText:()=>"{}"};
    const m=url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/); const t=m&&m[1]; if(o.method==="patch"||o.method==="post") return {getResponseCode:()=>204,getContentText:()=>""};
    let rows=tables[t]||[]; const idm=url.match(/id=eq\.(\d+)/); if(idm) rows=rows.filter(x=>String(x.id)===idm[1]); const um=url.match(/unit=eq\.([^&]+)/); if(um) rows=rows.filter(x=>x.unit===decodeURIComponent(um[1]));
    return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(rows)}; }},
};
const api=new Function(...Object.keys(g), src.replace(/^\s*\/\*\*[\s\S]*?\*\//,"")+"\nreturn {notifyRestockStatus, remindJumpBag};")(...Object.values(g));
tables.settings.push({id:2,setting:"push worker url",value:"https://x.workers.dev"});
tables.supply_requests=[{id:11,unit:"H-24",name:"Joseph Eber",source:"jumpbag",ambulance:"",items:[{name:"Test Strips",qty:"10",why:"Missing"},{name:"Lancets",qty:"10",why:"Short"}],status:"done",status_by:"David Fishman (H-1)"}];
api.notifyRestockStatus(11);
tables.supply_requests=[{id:12,unit:"H-42",name:"Israel Leibowitz",source:"inventory",ambulance:"A1 Ambulance - 1",items:[{name:"4x4 sterile",qty:"10",why:"Only 12 left"}],status:"done",status_by:"David Fishman (H-1)"}];
api.notifyRestockStatus(12);
api.remindJumpBag("H-24","David Fishman (H-1)");
const APP="https://houstonhatzalahapp.org"; const OUT=path.join(__dirname,"out"); fs.mkdirSync(OUT,{recursive:true});
const names=["instock-jumpbag","instock-ambulance","remind"]; const b64=fs.readFileSync(path.join(__dirname,"..","..","logo-email.png")).toString("base64");
(async()=>{ const b=await chromium.launch();
  for(let i=0;i<sent.length;i++){ const m=sent[i]; const html="<!DOCTYPE html><html><head><meta charset=utf-8></head><body style='margin:0;background:#eef1f5'>"+m.htmlBody.split(APP+"/logo-email.png").join("data:image/png;base64,"+b64)+"</body></html>";
    fs.writeFileSync(path.join(OUT,names[i]+".txt"),"To: "+m.to+"\nBcc: "+(m.bcc||"")+"\nSubject: "+m.subject+"\n\n"+m.body);
    const pg=await b.newPage({viewport:{width:700,height:900},deviceScaleFactor:2}); await pg.setContent(html); await pg.waitForTimeout(200);
    await pg.screenshot({path:path.join(OUT,names[i]+".png"),fullPage:true}); await pg.close(); console.log(names[i],"| to:",m.to,"| bcc:",m.bcc||"-","|",m.subject); }
  await b.close(); })();
