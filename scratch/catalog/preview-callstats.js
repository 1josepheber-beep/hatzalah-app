// Call statistics: the member's My Standing with real counts, Admin → Call stats table, member history, Import. Demo data. Run from scratch/catalog.
const {chromium}=require("playwright"); const fs=require("fs"); const path=require("path");
const ROOT=path.join(__dirname,"..",".."); const OUT=path.join(__dirname,"out","preview"); fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(ROOT+"/index.html","utf8"); const SB="https://gcvbohdarppaolqhdnri.supabase.co"; const errs=[];
const MIME={js:"application/javascript",css:"text/css",png:"image/png",jpg:"image/jpeg",svg:"image/svg+xml",json:"application/json",html:"text/html",webmanifest:"application/manifest+json"};
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:412,height:860},deviceScaleFactor:2,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
  pg.on("pageerror",e=>errs.push(String(e)));
  await pg.route("**/*",r=>{ const u=r.request().url();
    if(u==="https://houstonhatzalahapp.org/") return r.fulfill({contentType:"text/html",body:html});
    if(/houstonhatzalahapp\.org\//.test(u)){ const p=ROOT+decodeURIComponent(new URL(u).pathname.split("?")[0]); if(fs.existsSync(p)&&fs.statSync(p).isFile()){ const ext=path.extname(p).slice(1); return r.fulfill({contentType:MIME[ext]||"application/octet-stream",body:fs.readFileSync(p)}); } return r.fulfill({status:404,body:""}); }
    if(u.indexOf(SB+"/rest/v1/rpc/guest_demo")===0) return r.fulfill({contentType:"application/json",body:JSON.stringify({ok:true,name:"Visiting org"})});
    if(u.indexOf(SB)===0) return r.fulfill({status:403,contentType:"application/json",body:"{}"});
    return r.abort(); });
  await pg.addInitScript(()=>{ localStorage.setItem("hoh_demo","demo"); localStorage.setItem("hoh_push_asked","1"); localStorage.setItem("hoh_demo_as","H-100"); });
  await pg.goto("https://houstonhatzalahapp.org/"); await pg.waitForTimeout(2500);
  // member: My Standing (tap the status badge)
  await pg.evaluate(()=>document.getElementById("rstatus").click()); await pg.waitForTimeout(800);
  await pg.screenshot({path:OUT+"/callstats-1-standing.png",fullPage:false});
  await pg.evaluate(()=>{ const h=document.querySelector("#standBody .stand-hist"); if(h) h.scrollIntoView({block:"start"}); }); await pg.waitForTimeout(200);
  await pg.screenshot({path:OUT+"/callstats-1b-history.png"});
  await pg.evaluate(()=>document.getElementById("standBack").click()); await pg.waitForTimeout(300);
  // admin
  await pg.evaluate(()=>{ const all=[...document.querySelectorAll("#grid .tile")]; all.find(t=>(t.querySelector(".lab")||t).textContent.trim()==="Admin").click(); }); await pg.waitForTimeout(1200);
  const pick=async(label)=>{ await pg.evaluate(()=>document.getElementById("admSecBtn").click()); await pg.waitForTimeout(300); await pg.evaluate((l)=>[...document.querySelectorAll("#admSecMenu .adm-secit, #admSecs .adm-secit")].find(x=>x.getAttribute("data-label")===l).click(), label); await pg.waitForTimeout(700); };
  await pick("Call stats");
  await pg.screenshot({path:OUT+"/callstats-2-admin.png"});
  await pg.evaluate(()=>document.querySelector('#admGenPane [data-csu]').click()); await pg.waitForTimeout(400);
  await pg.screenshot({path:OUT+"/callstats-3-member.png"});
  await pg.evaluate(()=>document.getElementById("csBackLink").click()); await pg.waitForTimeout(200);
  await pg.evaluate(()=>document.getElementById("csImportBtn").click()); await pg.waitForTimeout(300);
  await pg.evaluate(()=>{ document.getElementById("csPaste").value="Crew Full Name,ESO Record Created Date,Crew Standard Role,Incident Number\nDEMO ADMIN,10/02/2026,Lead,26-0001\nDEMO ADMIN,10/05/2026,Driver,26-0002\nAVI BERGER,10/09/2026,Other,26-0003\nTECHSUPPORT ESO,10/09/2026,Other,26-0004\n"; document.getElementById("csParseBtn").click(); }); await pg.waitForTimeout(300);
  await pg.screenshot({path:OUT+"/callstats-4-import.png"});
  console.log("page errors:", errs.length?errs:"none"); await b.close();
})();
