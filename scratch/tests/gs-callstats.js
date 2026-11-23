// Runs importCallStats() and callStatsStaleCheck() from the Apps Script with Gmail,
// Supabase and the gzip helper mocked. This is the job that keeps My Standing current:
// ESO mails the export at 5am, the script opens it at 6am and writes call_stats.
const ROOT=process.env.HOH_ROOT||require("path").join(__dirname,"..","..");
const fs=require("fs"), zlib=require("zlib");
const src=fs.readFileSync(ROOT+"/apps-script/Code.gs","utf8");
let pass=0, fail=0; const check=(l,ok)=>{ console.log((ok?"  PASS ":"  FAIL ")+l); ok?pass++:fail++; };
const ymd=(d)=>d.toISOString().slice(0,10);
const ago=(n)=>new Date(Date.now()-n*864e5).toISOString();

function blob(name, text, gz){
  const buf = gz ? zlib.gzipSync(Buffer.from(text,"utf8")) : Buffer.from(text,"utf8");
  const b={ getName:()=>name, getDataAsString:()=>buf.toString("utf8"), setContentType:()=>b, copyBlob:()=>b, __buf:buf };
  return b;
}
const x_=(q)=>decodeURIComponent(String(q||"").replace(/^unit=eq\./,""));
function msg(dateMs, atts){ return { getDate:()=>new Date(dateMs), getAttachments:()=>atts }; }

function run(o){
  o=o||{};
  const mails=[], upserts=[], patches=[], logs=[], props=Object.assign({},o.props||{});
  const tables=JSON.parse(JSON.stringify(o.tables||{}));
  const g={
    Logger:{log:(m)=>logs.push(String(m))},
    Session:{getScriptTimeZone:()=>"America/Chicago", getEffectiveUser:()=>({getEmail:()=>"yeber@houstonhatzalah.org"})},
    Utilities:{
      formatDate:(d,tz,fmt)=>{ d=new Date(d); return fmt==="yyyy-MM-dd"?ymd(d):d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); },
      parseCsv:(t)=>t.replace(/\r\n?/g,"\n").split("\n").filter(l=>l.length).map(l=>{
        const out=[]; let cur="", q=false;
        for(let i=0;i<l.length;i++){ const c=l[i];
          if(q){ if(c==='"'){ if(l[i+1]==='"'){ cur+='"'; i++; } else q=false; } else cur+=c; }
          else if(c==='"') q=true; else if(c===","){ out.push(cur); cur=""; } else cur+=c; }
        out.push(cur); return out; }),
      ungzip:(b)=>blob("x.csv", zlib.gunzipSync(b.__buf).toString("utf8"), false),
    },
    PropertiesService:{getScriptProperties:()=>({getProperty:(k)=>(k in props?String(props[k]):(k==="SB_SERVICE_KEY"?"svc":k==="ADMIN_EMAILS"?"admin@x.org":null)), setProperty:(k,v)=>{ props[k]=v; }})},
    GmailApp:{ search:()=>(o.threads||[]), sendEmail:(to,s,b,oo)=>mails.push({to,subject:s,body:b,oo}) },
    MailApp:{sendEmail:(m)=>mails.push(m)},
    ScriptApp:{getProjectTriggers:()=>[], newTrigger:()=>({timeBased:()=>({everyDays:()=>({atHour:()=>({create:()=>{}})})})}), deleteTrigger:()=>{}},
    UrlFetchApp:{fetch:(url,oo)=>{ oo=oo||{};
      const m=url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/), t=m&&m[1];
      if(oo.method==="post"){ upserts.push({t, q:(m[3]||""), rows:JSON.parse(oo.payload)}); return {getResponseCode:()=>201,getContentText:()=>""}; }
      if(oo.method==="patch"){ patches.push({t, q:(m[3]||""), body:JSON.parse(oo.payload)}); return {getResponseCode:()=>204,getContentText:()=>""}; }
      let rows=tables[t]||[]; const off=(url.match(/offset=(\d+)/)||[0,0])[1];
      const pm=url.match(/period=eq\.([^&]+)/); if(pm) rows=rows.filter(x=>String(x.period)===decodeURIComponent(pm[1]));
      if(/order=updated_at\.desc&limit=1/.test(url)) rows=rows.slice().sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at))).slice(0,1);
      return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(+off?[]:rows)}; } },
  };
  const api=new Function(...Object.keys(g),"mails_", src.replace(/^\s*\/\*\*[\s\S]*?\*\//,"")
    +"\n mailBoth=function(to,subject,body,bcc,brand){ mails_.push({to:String(to||''), bcc:String(bcc||''), subject:subject, body:body, brand:brand||null}); };"
    +"\nreturn {importCallStats, callStatsStaleCheck, dailyCallStats, csMatchUnit_, csNorm_, csRole_, standingsQuarterEnd, standingsDryRun, stPrevPeriod_};")(...Object.values(g), mails);
  return {api, mails, upserts, patches, logs, props, tables};
}

const roster=[
  {id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",active:"X",type:"Responder"},
  {id:2,unit:"H-22",first_name:"Joseph",last_name:"Fried",active:"X",type:"Responder"},
  {id:3,unit:"H-1",first_name:"David",last_name:"Fishman",active:"X",type:"Responder"},
  {id:4,unit:"H-40",first_name:"Mendel",last_name:"Traxler",active:"X",type:"Responder"},
  {id:5,unit:"D-1",first_name:"Dina",last_name:"Eber",active:"X",type:"Dispatcher"},
];
const HEAD="Crew Full Name,Crew Standard Role,Incident Number,ESO Record Created Date";
const CSV=[HEAD,
  "JOSEPH EBER,Lead,250453,2026-10-04 21:14:00",
  "MENDEL TRAXLER,Driver,250453,2026-10-04 21:14:00",
  "JOSEPH EBER,Other,250461,2026-11-02 08:00:00",
  "JOSEPH EBER,Other,250461,2026-11-02 08:00:00",     // the same crew on the same call twice
  "DAVID FISHMAN,,250461,2026-11-02 08:00:00",         // no role
  "JOSEPH EBER,Lead,250310,2026-07-19 10:00:00",       // Q3
  "A STRANGER,Lead,250999,2026-11-03 10:00:00",        // nobody on the roster
  "JOSEPH EBER,Lead,,",                                // no date at all
].join("\n");

// ===== 1. the happy path: a .csv.gz attachment becomes call_stats rows
let r=run({ tables:{roster, call_stats:[], call_stats_names:[], settings:[]},
  threads:[{getMessages:()=>[msg(Date.parse("2026-11-23T05:02:00Z"), [blob("eso-export-7aa8.csv.gz", CSV, true)])]}] });
let n=r.api.importCallStats();
const cs=r.upserts.filter(x=>x.t==="call_stats")[0];
const row=(name,period)=>cs.rows.find(x=>x.crew_name===name&&x.period===period);
check("the gzipped attachment is opened and turned into one row per responder per quarter  ("+n+" rows)", n===5 && cs && /on_conflict=crew_name%2Cperiod%2Csource/.test(cs.q));
check("Q4 for Joseph Eber: 2 calls, 1 lead + 1 other, the duplicate line counted once  "+JSON.stringify(row("JOSEPH EBER","2026-Q4")&&{t:row("JOSEPH EBER","2026-Q4").total,l:row("JOSEPH EBER","2026-Q4").lead,o:row("JOSEPH EBER","2026-Q4").other}),
  !!row("JOSEPH EBER","2026-Q4") && row("JOSEPH EBER","2026-Q4").total===2 && row("JOSEPH EBER","2026-Q4").lead===1 && row("JOSEPH EBER","2026-Q4").other===1 && row("JOSEPH EBER","2026-Q4").unit==="H-24");
check("earlier quarters come through on their own", !!row("JOSEPH EBER","2026-Q3") && row("JOSEPH EBER","2026-Q3").total===1 && row("JOSEPH EBER","2026-Q3").lead===1);
check("a blank role is counted as unknown, not dropped", !!row("DAVID FISHMAN","2026-Q4") && row("DAVID FISHMAN","2026-Q4").unknown===1 && row("DAVID FISHMAN","2026-Q4").total===1);
check("the driver is matched to his unit", !!row("MENDEL TRAXLER","2026-Q4") && row("MENDEL TRAXLER","2026-Q4").unit==="H-40");
check("a name that is nobody on the roster is kept with no unit, for an admin to link", !!row("A STRANGER","2026-Q4") && row("A STRANGER","2026-Q4").unit==="" && /not matched to a member: A STRANGER/.test(r.logs.join(" ")));
check("the line with no date is skipped and said so", /1 with no date skipped/.test(r.logs.join(" ")));
check("every row is written as source=eso with a fresh timestamp", cs.rows.every(x=>x.source==="eso"&&/^\d{4}-\d{2}-\d{2}T/.test(x.updated_at)));
const lk=r.upserts.filter(x=>x.t==="call_stats_names")[0];
check("newly matched names are saved as links so the next import is instant", !!lk && lk.rows.some(x=>x.crew_name==="JOSEPH EBER"&&x.unit==="H-24") && !lk.rows.some(x=>x.crew_name==="A STRANGER"));
check("the message is remembered so it is not imported twice", r.props.CS_LAST_MSG_MS===String(Date.parse("2026-11-23T05:02:00Z")));

// ===== 2. the same email again the next morning -> nothing
let r2=run({ tables:{roster, call_stats:[], call_stats_names:[], settings:[]},
  props:{CS_LAST_MSG_MS:String(Date.parse("2026-11-23T05:02:00Z"))},
  threads:[{getMessages:()=>[msg(Date.parse("2026-11-23T05:02:00Z"), [blob("eso-export-7aa8.csv.gz", CSV, true)])]}] });
check("an email already imported is left alone", r2.api.importCallStats()===0 && !r2.upserts.length && /no new ESO export/.test(r2.logs.join(" ")));

// ===== 3. a plain .csv attachment works too, and a saved link wins over the name guess
let r3=run({ tables:{roster, call_stats:[], call_stats_names:[{crew_name:"A STRANGER",unit:"H-22"}], settings:[]},
  threads:[{getMessages:()=>[msg(Date.now(), [blob("export.csv", CSV, false)])]}] });
r3.api.importCallStats();
const cs3=r3.upserts.filter(x=>x.t==="call_stats")[0];
check("an unzipped .csv is read the same way", !!cs3 && cs3.rows.length===5);
check("a name an admin linked by hand keeps that unit", cs3.rows.find(x=>x.crew_name==="A STRANGER").unit==="H-22");

// ===== 4. two members share a last name
const CSV4=[HEAD,"JOSEPH FRIED,Lead,1,2026-11-02 08:00:00","Y. EBER,Lead,2,2026-11-02 08:00:00"].join("\n");
let r4=run({ tables:{roster, call_stats:[], call_stats_names:[], settings:[]},
  threads:[{getMessages:()=>[msg(Date.now(), [blob("e.csv.gz", CSV4, true)])]}] });
r4.api.importCallStats();
const cs4=r4.upserts.filter(x=>x.t==="call_stats")[0];
check("first+last name picks the right one of two Josephs", cs4.rows.find(x=>x.crew_name==="JOSEPH FRIED").unit==="H-22");
check("a last name shared with a dispatcher and a different first initial is left unmatched", cs4.rows.find(x=>x.crew_name==="Y. EBER").unit==="");

// ===== 5. the stale check
let r5=run({ tables:{roster, settings:[], call_stats:[{updated_at:ago(2)}]} });
check("fresh numbers raise nothing", r5.api.callStatsStaleCheck()===false && !r5.mails.length);
let r6=run({ tables:{roster, settings:[], call_stats:[{updated_at:ago(12)}]} });
check("after 10 quiet days the admins get one email saying the numbers stopped", r6.api.callStatsStaleCheck()===true && r6.mails.length===1 && /stopped updating/i.test(r6.mails[0].subject) && /admin@x.org|/.test(r6.mails[0].bcc));
check("…and it says what to check, in order", /Query Builder/.test(r6.mails[0].body) && /licence/.test(r6.mails[0].body) && /Hatzalah address/.test(r6.mails[0].body));
let r7=run({ tables:{roster, settings:[], call_stats:[{updated_at:ago(12)}]}, props:{CS_STALE_ALERTED_MS:String(Date.now()-2*864e5)} });
check("it is not repeated every morning", r7.api.callStatsStaleCheck()===false && !r7.mails.length);
let r8=run({ tables:{roster, settings:[{setting:"Call Stats Stale Days",value:"3"}], call_stats:[{updated_at:ago(5)}]} });
check("the setting can make it stricter", r8.api.callStatsStaleCheck()===true);
let r9=run({ tables:{roster, settings:[], call_stats:[]} });
check("no numbers at all also counts as stale", r9.api.callStatsStaleCheck()===true && /never/.test(r9.mails[0].body));

// ===== 6. the daily wrapper survives a bad morning
let r10=run({ tables:{roster, settings:[], call_stats:[{updated_at:ago(1)}]}, threads:[{getMessages:()=>[msg(Date.now(), [blob("e.csv.gz","not,a,real\nfile",true)])]}] });
r10.api.dailyCallStats();
check("a file with the wrong columns is reported, not written, and does not stop the stale check",
  !r10.upserts.length && /missing the crew name or date column/.test(r10.logs.join(" ")));

// ===== 7. end of quarter: records what it would do while the switches are off
const SET=(o)=>[{setting:"Standings Primary Minimum",value:"8"},{setting:"Standings Backup Minimum",value:"5"},
  {setting:"Standings Notices",value:(o&&o.notices)||"Off"},{setting:"Standings Auto Downgrade",value:(o&&o.auto)||"Off"},
  {setting:"Standings Quarters Before Downgrade",value:(o&&o.quarters)||"2"}];
const ROS=[
  {id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",email:"j@x.org",active:"X",type:"Responder",status:"Primary"},
  {id:2,unit:"H-22",first_name:"Avi",last_name:"Katz",email:"a@x.org",active:"X",type:"Responder",status:"Primary"},
  {id:3,unit:"H-30",first_name:"Sara",last_name:"New",email:"s@x.org",active:"X",type:"Responder",status:"Observer"},
  {id:4,unit:"MD-1",first_name:"Lars",last_name:"Thestrup",email:"md@x.org",active:"X",type:"Medical Control",status:"Primary"},
  {id:5,unit:"D-1",first_name:"Dina",last_name:"Disp",email:"d@x.org",active:"X",type:"Dispatcher",status:"Backup"},
];
const CSROWS=(p)=>[{unit:"H-24",period:p,total:11,source:"eso"},{unit:"H-22",period:p,total:3,source:"eso"},{unit:"MD-1",period:p,total:0,source:"eso"}];
let s1=run({tables:{roster:ROS, settings:SET(), call_stats:CSROWS("2026-Q3"), standings_log:[]}});
s1.api.standingsQuarterEnd("2026-Q3");
const logRows=s1.upserts.filter(x=>x.t==="standings_log").map(x=>x.rows);
const find=(u)=>logRows.find(r=>r.unit===u);
check("one row recorded per responder with a minimum  ("+logRows.length+")", logRows.length===2 && !!find("H-24") && !!find("H-22"));
check("Medical Control, the dispatcher and the Observer are left out entirely", !find("MD-1") && !find("D-1") && !find("H-30"));
check("the one above the minimum is recorded as ok", find("H-24").action==="ok" && find("H-24").short===false && find("H-24").total===11);
check("the one below is recorded as would_notice, with the streak started  "+JSON.stringify({a:find("H-22").action,s:find("H-22").streak}), find("H-22").action==="would_notice" && find("H-22").short===true && find("H-22").streak===1 && find("H-22").need===8);
check("nothing is emailed and no status is touched while the switches are off", !s1.mails.length && !s1.upserts.some(x=>x.t==="roster"));

// a second bad quarter in a row -> would_downgrade, still nothing done
let s2=run({tables:{roster:ROS, settings:SET(), call_stats:CSROWS("2026-Q4"),
  standings_log:[{unit:"H-22",period:"2026-Q3",status:"primary",need:8,total:3,short:true,streak:1,action:"would_notice"}]}});
s2.api.standingsQuarterEnd("2026-Q4");
const q2row=s2.upserts.filter(x=>x.t==="standings_log").map(x=>x.rows).find(r=>r.unit==="H-22");
check("a second quarter in a row below the minimum reads would_downgrade, streak 2", q2row.action==="would_downgrade" && q2row.streak===2);
check("…and still nobody is emailed or moved", !s2.mails.length && !s2.upserts.some(x=>x.t==="roster"));

// switches on: the email goes out and the status moves
let s3=run({tables:{roster:ROS, settings:SET({notices:"On",auto:"On"}), call_stats:CSROWS("2026-Q4"),
  standings_log:[{unit:"H-22",period:"2026-Q3",status:"primary",need:8,total:3,short:true,streak:1,action:"notice"}]}});
s3.api.standingsQuarterEnd("2026-Q4");
const q3row=s3.upserts.filter(x=>x.t==="standings_log").map(x=>x.rows).find(r=>r.unit==="H-22");
check("with both switches on the row reads downgrade", q3row.action==="downgrade");
check("…the member's status is written as Backup, and only that member  "+JSON.stringify(s3.patches.map(x=>[x.q,x.body])), s3.patches.length===1 && x_(s3.patches[0].q)==="H-22" && s3.patches[0].body.status==="Backup" && Object.keys(s3.patches[0].body).length===1);
check("…the member is emailed, admins copied, saying it can be changed back", s3.mails.length===1 && /standing has changed to Backup/i.test(s3.mails[0].subject) && /speak with an administrator/i.test(s3.mails[0].body) && /can be changed back/.test(s3.mails[0].body));
check("…and the member above the minimum hears nothing", !s3.mails.some(m=>/j@x.org/.test(m.to)));

// notices on, downgrade off: an email but no change of standing
let s4=run({tables:{roster:ROS, settings:SET({notices:"On"}), call_stats:CSROWS("2026-Q4"),
  standings_log:[{unit:"H-22",period:"2026-Q3",status:"primary",need:8,total:3,short:true,streak:1,action:"notice"}]}});
s4.api.standingsQuarterEnd("2026-Q4");
check("notices on but downgrade off: they still hear about it, and nothing is moved", s4.mails.length===1 && /below the minimum/i.test(s4.mails[0].subject) && /Nothing happens from this on its own/.test(s4.mails[0].body) && !s4.patches.length);

// a quarter already recorded, and a member an admin excused
let s5=run({tables:{roster:ROS, settings:SET({notices:"On",auto:"On"}), call_stats:CSROWS("2026-Q4"),
  standings_log:[{unit:"H-22",period:"2026-Q4",status:"primary",need:8,total:3,short:true,streak:2,action:"excused",note:"out of town",by_whom:"Joseph Eber (H-24)"}]}});
s5.api.standingsQuarterEnd("2026-Q4");
const w5=s5.upserts.filter(x=>x.t==="standings_log").map(x=>x.rows);
check("a member an admin excused is left alone: no second row, no email, no downgrade", !w5.some(r=>r.unit==="H-22") && !s5.mails.length && !s5.upserts.some(x=>x.t==="roster"));
check("…and the rest of the quarter is still recorded", w5.some(r=>r.unit==="H-24"));

// the dry run touches nothing
let s6=run({tables:{roster:ROS, settings:SET(), call_stats:CSROWS("2026-Q3"), standings_log:[]}});
const dry=s6.api.standingsDryRun();
check("the dry run just lists who is short and writes nothing", !s6.upserts.length && !s6.mails.length && /H-22/.test(s6.logs.join(" ")) && Array.isArray(dry));

console.log("  ("+pass+" passed, "+fail+" failed)");
process.exit(fail?1:0);
