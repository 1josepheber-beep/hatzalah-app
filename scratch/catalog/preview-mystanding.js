// My Standing with "Show Total Calls" on — the real app (not demo mode) against a mocked database.
const {chromium}=require("playwright"); const fs=require("fs"); const path=require("path");
const ROOT=path.join(__dirname,"..",".."); const OUT=path.join(__dirname,"out","preview"); fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(ROOT+"/index.html","utf8"); const SB="https://gcvbohdarppaolqhdnri.supabase.co"; const errs=[];
const MIME={js:"application/javascript",css:"text/css",png:"image/png",jpg:"image/jpeg",svg:"image/svg+xml",json:"application/json",html:"text/html",webmanifest:"application/manifest+json",webp:"image/webp"};
const SHOW=process.argv[2]!=="off";
const now=new Date().toISOString();
const rows={
  settings:[{id:1,setting:"Org Name",value:"Hatzalah of Houston"},{id:2,setting:"Standings Primary Minimum",value:"8"},{id:3,setting:"Standings Backup Minimum",value:"5"},
    {id:4,setting:"Standings Notices",value:"Off"},{id:5,setting:"Standings Auto Downgrade",value:"Off"},{id:6,setting:"Standings Quarters Before Downgrade",value:"2"},
    {id:7,setting:"Standings Show Total Calls",value:SHOW?"On":"Off"}],
  tiles:[{id:1,label:"Hospitals",type:"hospitals",active:"X",order_col:1}],
  roster:[{id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",email:"t@houstonhatzalah.org",active:"X",admin:"",type:"Responder",status:"Primary",cleared_primary:"X"}],
  call_stats:[["2026-Q4",18,3,7,8,0],["2026-Q3",35,5,14,14,2],["2026-Q2",46,15,16,14,1],["2026-Q1",48,14,22,12,0]].map((r,i)=>({id:i+1,unit:"H-24",crew_name:"JOSEPH EBER",period:r[0],total:r[1],lead:r[2],driver:r[3],other:r[4],unknown:r[5],source:"eso",updated_at:now})),
  call_totals:JSON.parse(process.env.TOTALS||'[]'),
  certifications:[],cert_docs:[],announcement_reads:[],announcements:[],push_subs:[],standings_log:[],call_stats_names:[]
};
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:412,height:1100},deviceScaleFactor:2,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
  pg.on("pageerror",e=>errs.push(String(e)));
  await pg.route("**/*",r=>{ const u=r.request().url();
    if(u==="https://houstonhatzalahapp.org/") return r.fulfill({contentType:"text/html",body:html});
    if(/houstonhatzalahapp\.org\//.test(u)){ const p=ROOT+decodeURIComponent(new URL(u).pathname.split("?")[0]); if(fs.existsSync(p)&&fs.statSync(p).isFile()){ const ext=path.extname(p).slice(1); return r.fulfill({contentType:MIME[ext]||"application/octet-stream",body:fs.readFileSync(p)}); } return r.fulfill({status:404,body:""}); }
    if(u.indexOf(SB+"/auth/")===0) return r.fulfill({status:400,contentType:"application/json",body:'{"error":"x"}'});
    if(u.indexOf("/rest/v1/rpc/")>-1) return r.fulfill({contentType:"application/json",body:"{}"});
    if(r.request().method()!=="GET" && u.indexOf(SB)===0) return r.fulfill({contentType:"application/json",body:"[]"});
    const m=u.match(/\/rest\/v1\/([a-z_]+)\?/);
    if(m){ let x=rows[m[1]]||[]; const um=u.match(/unit=eq\.([^&]+)/); if(um) x=x.filter(z=>z.unit===decodeURIComponent(um[1])); return r.fulfill({contentType:"application/json",body:JSON.stringify(x)}); }
    if(u.indexOf(SB)===0) return r.fulfill({contentType:"application/json",body:"[]"});
    return r.abort(); });
  await pg.addInitScript(()=>{ localStorage.setItem("hoh_member_v1",JSON.stringify({email:"t@houstonhatzalah.org",unit:"H-24"}));
    localStorage.setItem("hoh_sbauth_v1",JSON.stringify({token:"tok",refresh:"ref",exp:Date.now()+3600e3,email:"t@houstonhatzalah.org",sub:"u1"})); localStorage.setItem("hoh_push_asked","1"); });
  await pg.goto("https://houstonhatzalahapp.org/"); await pg.waitForTimeout(3500);
  await pg.evaluate(()=>{ const e=document.getElementById("rstatus"); if(e) e.click(); }); await pg.waitForTimeout(1500);
  const info=await pg.evaluate(()=>({open:document.getElementById("standScreen").classList.contains("open"), org:(document.querySelector("#standBody .stand-org")||{}).textContent||null, demo:!!document.querySelector(".demo-bar,.demobar"), txt:document.getElementById("standBody").textContent.slice(0,80)}));
  console.log(info);
  const el=await pg.$("#standBody .stand-prev"); await el.screenshot({path:OUT+"/mystanding-"+(SHOW?"on":"off")+".png"});
  console.log("page errors:", errs.length?errs:"none"); await b.close();
})();
