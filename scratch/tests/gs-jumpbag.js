// Runs dailyJumpBagCheck() from the Apps Script with Google's services mocked.
const ROOT=process.env.HOH_ROOT||require("path").join(__dirname,"..","..");
const fs=require("fs");
const src=fs.readFileSync(ROOT+"/apps-script/Code.gs","utf8");
let pass=0, fail=0; const check=(l,ok)=>{ console.log((ok?"  PASS ":"  FAIL ")+l); ok?pass++:fail++; };
const ymd=(d)=>d.toISOString().slice(0,10);
const plus=(n)=>{ const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+n); return ymd(d); };
const ago=(n)=>new Date(Date.now()-n*864e5).toISOString();
function run(data, props){
  const mails=[], pushes=[], inserts=[], patches=[], logs=[];
  const tables=JSON.parse(JSON.stringify(data));
  const g={
    Logger:{log:(m)=>logs.push(String(m))},
    Session:{getScriptTimeZone:()=>"America/Chicago"},
    Utilities:{formatDate:(d,tz,fmt)=>{ d=new Date(d); return fmt==="yyyy-MM-dd"?ymd(d):d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }},
    PropertiesService:{getScriptProperties:()=>({getProperty:(k)=>Object.assign({SB_SERVICE_KEY:"svc-key",ADMIN_EMAILS:"admin@x.org"},props||{})[k]||null})},
    UrlFetchApp:{fetch:(url,o)=>{ o=o||{};
      if(/workers\.dev/.test(url)){ pushes.push({url,headers:o.headers,payload:JSON.parse(o.payload)}); return {getResponseCode:()=>200,getContentText:()=>"{}"}; }
      const m=url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/); const t=m&&m[1];
      if(o.method==="post"){ inserts.push({t,row:JSON.parse(o.payload)}); return {getResponseCode:()=>201,getContentText:()=>""}; }
      if(o.method==="patch"){ patches.push({t,q:m[3],patch:JSON.parse(o.payload)}); return {getResponseCode:()=>204,getContentText:()=>""}; }
      let rows=tables[t]||[]; const off=(url.match(/offset=(\d+)/)||[0,0])[1]; const idm=url.match(/id=eq\.(\d+)/); if(idm) rows=rows.filter(x=>String(x.id)===idm[1]); if(/status=eq\.open/.test(url)) rows=rows.filter(x=>x.status==="open"); if(/notified=eq\.(&|$)/.test(url)) rows=rows.filter(x=>!x.notified); return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(+off?[]:rows)}; } },
    MailApp:{sendEmail:(o)=>mails.push(o)}, GmailApp:{sendEmail:(to,s,b,o)=>mails.push({to,subject:s,body:b,o})},
  };
  const api=new Function(...Object.keys(g),"mails_", src.replace(/^\s*\/\*\*[\s\S]*?\*\//,"")+"\n mailBoth=function(to,subject,body){ mails_.push({to,subject,body}); };\nreturn {dailyJumpBagCheck,notifyRestock,notifyRestockStatus,sweepRestockRequests,checkConfig,SB_KEY,ADMIN_EMAILS};")(...Object.values(g), mails);
  if(data.__call) data.__call(api); else api.dailyJumpBagCheck();
  return {mails,pushes,inserts,patches,logs};
}
const roster=[{id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",email:"j@x.org",personal_email:"j@gmail.com",active:"X"},{id:2,unit:"H-22",first_name:"Avi",last_name:"K",email:"a@x.org",active:"X"},{id:3,unit:"H-9",first_name:"Gone",last_name:"Guy",email:"g@x.org",active:"No"}];
const items=[{id:1,name:"Oral Glucose",expires:"X",active:"X"},{id:2,name:"Epi Kit",expires:"X",active:"X"},{id:3,name:"Gloves",expires:"",active:"X"},{id:4,name:"Old",expires:"X",active:"no"}];
const settings=[{setting:"Jump Bag Reminder Days",value:"30, 7, 0"},{setting:"Push Worker URL",value:"https://hoh-push.1josepheber.workers.dev"}];
// 1. a 10-day item -> the "30" milestone, once; expired item -> "expired"; missing item -> nothing; inactive member -> nothing
let r=run({settings,roster,jumpbag_items:items,jumpbag_reminders:[],jumpbag_bags:[],
  jumpbag_status:[{id:1,unit:"H-24",item_id:1,status:"have",exp_date:plus(10)},{id:2,unit:"H-24",item_id:2,status:"have",exp_date:plus(-3)},{id:3,unit:"H-22",item_id:1,status:"missing",exp_date:plus(2)},{id:4,unit:"H-9",item_id:1,status:"have",exp_date:plus(1)},{id:5,unit:"H-24",item_id:4,status:"have",exp_date:plus(1)}]},
  {PUSH_CRON_KEY:"k"});
check("one email to Joseph (both addresses) listing the expiring and the expired item", r.mails.length===1 && /j@x.org, j@gmail.com/.test(r.mails[0].to) && /Oral Glucose/.test(r.mails[0].body) && /Epi Kit .* expired/.test(r.mails[0].body) && /1 item expired, 1 item expiring soon/.test(r.mails[0].subject));
check("missing items, inactive items and inactive members are skipped", !r.mails.some(m=>/Gloves|Old/.test(m.body)) && !r.mails.some(m=>/a@x.org|g@x.org/.test(m.to)));
check("one push to unit:H-24 through the worker with the cron key header", r.pushes.length===1 && r.pushes[0].payload.audience==="unit:H-24" && r.pushes[0].payload.kind==="jumpbag" && r.pushes[0].headers["X-Cron-Key"]==="k");
check("both reminders logged with their milestone (30 and expired)", r.inserts.filter(x=>x.t==="jumpbag_reminders").length===2 && r.inserts.some(x=>x.row.milestone==="30"&&x.row.item_id===1) && r.inserts.some(x=>x.row.milestone==="expired"&&x.row.item_id===2));
// 2. the next night: already logged -> nothing (expired one only every 14 days)
const logged=r.inserts.map((x,i)=>Object.assign({id:i+1,when_at:new Date().toISOString()},x.row));
r=run({settings,roster,jumpbag_items:items,jumpbag_reminders:logged,jumpbag_bags:[],jumpbag_status:[{id:1,unit:"H-24",item_id:1,status:"have",exp_date:plus(10)},{id:2,unit:"H-24",item_id:2,status:"have",exp_date:plus(-3)}]},{PUSH_CRON_KEY:"k"});
check("the next night nothing is sent again", r.mails.length===0 && r.pushes.length===0);
// 3. 15 days later the expired item is chased again; the 7-day milestone for the other item fires too
const old=logged.map(x=>Object.assign({},x,{when_at:ago(15)}));
r=run({settings,roster,jumpbag_items:items,jumpbag_reminders:old,jumpbag_bags:[],jumpbag_status:[{id:1,unit:"H-24",item_id:1,status:"have",exp_date:plus(5)},{id:2,unit:"H-24",item_id:2,status:"have",exp_date:plus(-18)}]},{PUSH_CRON_KEY:"k"});
check("15 days on: expired item chased again, and the item now 5 days out hits the 7-day milestone", r.mails.length===1 && r.inserts.some(x=>x.row.milestone==="expired") && r.inserts.some(x=>x.row.milestone==="7"&&x.row.item_id===1));
// 4. bag check reminders: every 30 days, last checked 40 days ago -> reminder; checked 10 days ago -> none; never checked -> reminder; reminded 3 days ago -> none
r=run({settings,roster:roster.concat([{id:4,unit:"H-30",first_name:"Dov",last_name:"S",email:"d@x.org",active:"X"},{id:5,unit:"H-31",first_name:"Eli",last_name:"T",email:"e@x.org",active:"X"}]),jumpbag_items:items,jumpbag_reminders:[],jumpbag_status:[],
  jumpbag_bags:[{id:1,unit:"H-24",checked_at:ago(40),remind_days:30,reminded_at:null},{id:2,unit:"H-22",checked_at:ago(10),remind_days:30,reminded_at:null},{id:3,unit:"H-30",checked_at:null,remind_days:60,reminded_at:null},{id:4,unit:"H-31",checked_at:ago(100),remind_days:30,reminded_at:ago(3)}]},{PUSH_CRON_KEY:"k"});
check("bag reminders: 40 days/30 -> yes, 10 days -> no, never checked -> yes, reminded 3 days ago -> no  ("+r.mails.map(m=>m.to).join(" | ")+")", r.mails.length===2 && r.mails.some(m=>/j@x.org/.test(m.to)&&/40 days since/.test(m.body)&&/time to check your bag/.test(m.subject)) && r.mails.some(m=>/d@x.org/.test(m.to)&&/not marked it checked yet/.test(m.body)));
check("reminded_at stamped on those two bags only", r.patches.length===2 && r.patches.every(p=>p.t==="jumpbag_bags"&&p.patch.reminded_at) && r.patches.some(p=>/id=eq\.1$/.test(p.q)) && r.patches.some(p=>/id=eq\.3$/.test(p.q)));
// 5. items AND bag due the same night -> one combined email
r=run({settings,roster,jumpbag_items:items,jumpbag_reminders:[],jumpbag_bags:[{id:1,unit:"H-24",checked_at:ago(40),remind_days:30,reminded_at:null}],jumpbag_status:[{id:1,unit:"H-24",item_id:1,status:"have",exp_date:plus(10)}]},{PUSH_CRON_KEY:"k"});
check("items + bag due together: one email with both, one push", r.mails.length===1 && /Oral Glucose/.test(r.mails[0].body) && /whole bag/.test(r.mails[0].body) && r.pushes.length===1 && r.patches.length===1 && r.inserts.length===1);
// 6. no cron key property -> push skipped, email still sent, log still written
r=run({settings,roster,jumpbag_items:items,jumpbag_reminders:[],jumpbag_bags:[],jumpbag_status:[{id:1,unit:"H-24",item_id:1,status:"have",exp_date:plus(10)}]},{});
check("without PUSH_CRON_KEY the email still goes and the push is skipped with a log line", r.mails.length===1 && r.pushes.length===0 && r.logs.some(l=>/no PUSH_CRON_KEY/.test(l)) && r.inserts.length===1);
// ===== restock requests
const roster2=roster.concat([{id:5,unit:"H-42",first_name:"Israel",last_name:"Leibowitz",email:"i@x.org",active:"X",service_unit:"X"},{id:6,unit:"H-1",first_name:"David",last_name:"Fishman",email:"d@x.org",personal_email:"d@gmail.com",active:"X",admin:"X"},{id:7,unit:"H-9",first_name:"Gone",last_name:"Admin",email:"ga@x.org",active:"No",admin:"X"}]);
const req={id:11,created_at:new Date(Date.now()-20*60000).toISOString(),unit:"H-24",name:"Joseph Eber",source:"jumpbag",ambulance:"",items:[{item_id:36,name:"Test Strips",qty:"10",why:"Short"},{item_id:37,name:"Lancets",qty:"10",why:"Missing"}],note:"Need before Shabbos",status:"open",notified:""};
r=run({settings,roster:roster2,supply_requests:[req],__call:(api)=>api.notifyRestock(11)},{PUSH_CRON_KEY:"k"});
check("restock: one email to every active admin + service unit (all addresses), none to the inactive admin or plain members", r.mails.length===1 && /i@x.org/.test(r.mails[0].to) && /d@x.org/.test(r.mails[0].to) && /d@gmail.com/.test(r.mails[0].to) && !/ga@x.org|j@x.org|a@x.org/.test(r.mails[0].to) && /Restock needed: Jump bag — 2 items to order \(Joseph Eber\)/.test(r.mails[0].subject) && /Test Strips \(×10\) — Short/.test(r.mails[0].body) && /Need before Shabbos/.test(r.mails[0].body));
check("restock: a push to each handler unit with kind restock", r.pushes.length===2 && r.pushes.every(p=>p.payload.kind==="restock") && r.pushes.map(p=>p.payload.audience).sort().join()==="unit:H-1,unit:H-42");
check("restock: the row is stamped so it never goes twice", r.patches.length===1 && /^supply_requests/.test(r.patches[0].t) && /3 emailed, 2 pushed/.test(r.patches[0].patch.notified));
r=run({settings,roster:roster2,supply_requests:[Object.assign({},req,{notified:"3 emailed"})],__call:(api)=>api.notifyRestock(11)},{PUSH_CRON_KEY:"k"});
check("restock: an already-notified request sends nothing", r.mails.length===0 && r.pushes.length===0);
r=run({settings,roster:roster2,supply_requests:[Object.assign({},req,{status:"ordered",status_by:"David Fishman (H-1)"})],__call:(api)=>api.notifyRestockStatus(11)},{PUSH_CRON_KEY:"k"});
check("status: the member is emailed + pushed when it is marked ordered", r.mails.length===1 && /j@x.org, j@gmail.com/.test(r.mails[0].to) && /marked ordered/.test(r.mails[0].subject) && /by David Fishman/.test(r.mails[0].body) && r.pushes.length===1 && r.pushes[0].payload.audience==="unit:H-24");
r=run({settings,roster:roster2,supply_requests:[req,Object.assign({},req,{id:12,created_at:new Date().toISOString()})],__call:(api)=>api.sweepRestockRequests()},{PUSH_CRON_KEY:"k"});
check("nightly sweep: an unreported request older than 10 minutes is sent, a fresh one is left for the app", r.mails.length===1 && r.patches.length===1 && /id=eq\.11$/.test(r.patches[0].q));
r=run({settings,roster:roster2,supply_requests:[Object.assign({},req,{source:"inventory",ambulance:"A1 Ambulance - 1",items:[{name:"4x4 sterile",qty:"25",why:"Only 12 left"}]})],__call:(api)=>api.notifyRestock(11)},{PUSH_CRON_KEY:"k"});
check("inventory request: subject names the ambulance", /Restock needed: A1 inventory — 1 item to order/.test(r.mails[0].subject) && /A1 Ambulance - 1 inventory check/.test(r.mails[0].body));
// 7. secrets come from Script Properties, not the code
{ const r7=run({settings,roster,jumpbag_items:items,jumpbag_reminders:[],jumpbag_bags:[],jumpbag_status:[],__call:(api)=>{ check("SB_KEY and ADMIN_EMAILS are read from Script Properties", api.SB_KEY==="svc-key" && api.ADMIN_EMAILS==="admin@x.org"); api.checkConfig(); }},{PUSH_CRON_KEY:"k"});
  check("checkConfig() reports all properties set and Supabase answering", r7.logs.some(l=>/All Script Properties set/.test(l)) && r7.logs.some(l=>/Supabase answers/.test(l)));
  const r8=run({settings,roster,jumpbag_items:items,jumpbag_reminders:[],jumpbag_bags:[],jumpbag_status:[],__call:(api)=>api.checkConfig()},{PUSH_CRON_KEY:"",SB_SERVICE_KEY:"",ADMIN_EMAILS:""});
  check("checkConfig() names the missing properties", r8.logs.some(l=>/MISSING Script Properties: SB_SERVICE_KEY, ADMIN_EMAILS, PUSH_CRON_KEY/.test(l)));
  check("no key or address is typed into the script itself", !/eyJ[A-Za-z0-9_-]{20,}/.test(src) && !/yeber@|dfishman@/.test(src)); }
console.log("  ("+pass+" passed, "+fail+" failed)");
process.exit(fail?1:0);
