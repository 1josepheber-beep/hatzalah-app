// Preview: Admin -> Certifications with the "How to renew" boxes. Run from scratch/tests.
const {chromium}=require("playwright"); const fs=require("fs"); const path=require("path");
const ROOT=path.join(__dirname,"..",".."); const OUT=path.join(__dirname,"out","preview"); fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(ROOT+"/index.html","utf8"); const SB="https://gcvbohdarppaolqhdnri.supabase.co"; const errs=[];
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1366,height:800},deviceScaleFactor:1.5}); const pg=await ctx.newPage();
  pg.on("pageerror",e=>errs.push(String(e)));
  await pg.route("**/*",r=>{ const u=r.request().url();
    if(u==="https://houstonhatzalahapp.org/") return r.fulfill({contentType:"text/html",body:html});
    if(/houstonhatzalahapp\.org\//.test(u)){ const p=ROOT+decodeURIComponent(new URL(u).pathname.split("?")[0]); if(fs.existsSync(p)&&fs.statSync(p).isFile()){ const ext=path.extname(p).slice(1); const ct={js:"application/javascript",png:"image/png",webp:"image/webp",jpg:"image/jpeg",html:"text/html",json:"application/json",webmanifest:"application/manifest+json"}[ext]||"application/octet-stream"; return r.fulfill({contentType:ct,body:fs.readFileSync(p)}); } return r.abort(); }
    if(u.indexOf(SB+"/rest/v1/rpc/guest_demo")===0) return r.fulfill({contentType:"application/json",body:JSON.stringify({ok:true,name:"Visiting org"})});
    if(u.indexOf(SB)===0) return r.fulfill({status:403,contentType:"application/json",body:"{}"});
    return r.abort(); });
  await pg.addInitScript(()=>{ localStorage.setItem("hoh_demo","demo"); localStorage.setItem("hoh_push_asked","1"); localStorage.setItem("hoh_demo_as","H-100"); });
  await pg.goto("https://houstonhatzalahapp.org/"); await pg.waitForTimeout(2500);
  await pg.evaluate(()=>{ const all=[...document.querySelectorAll("#grid .tile")]; all.find(t=>(t.querySelector(".lab")||t).textContent.trim()==="Admin").click(); }); await pg.waitForTimeout(1200);
  await pg.evaluate(()=>[...document.querySelectorAll("#admSecMenu .adm-secit")].find(x=>x.getAttribute("data-label")==="Certification types").click()); await pg.waitForTimeout(1200);
  const h=await pg.evaluate(()=>document.getElementById("admGenPane").scrollHeight);
  await pg.setViewportSize({width:1366,height:Math.min(h+140,2400)}); await pg.waitForTimeout(300);
  await pg.screenshot({path:OUT+"/admin-certnotes.png"});
  // type a note for Driver's License, save, and check it was written
  const res=await pg.evaluate(async()=>{
    const t=[...document.querySelectorAll("[data-certnote]")].find(x=>/drivers_license/.test(x.getAttribute("data-certnote")));
    if(!t) return "no box for drivers license: "+[...document.querySelectorAll("[data-certnote]")].map(x=>x.getAttribute("data-certnote")).join(",");
    t.value="Renew at any Texas DPS office or online at dps.texas.gov."; t.dispatchEvent(new Event("input",{bubbles:true}));
    document.getElementById("admGenSave").click(); await new Promise(r=>setTimeout(r,1200));
    const msg=document.getElementById("admGenMsg").textContent;
    // leave the section and come back: the box must be filled from what was saved
    [...document.querySelectorAll("#admSecMenu .adm-secit")].find(x=>x.getAttribute("data-label")==="Settings").click(); await new Promise(r=>setTimeout(r,800));
    [...document.querySelectorAll("#admSecMenu .adm-secit")].find(x=>x.getAttribute("data-label")==="Certification types").click(); await new Promise(r=>setTimeout(r,1000));
    const t2=[...document.querySelectorAll("[data-certnote]")].find(x=>/drivers_license/.test(x.getAttribute("data-certnote")));
    const t3=[...document.querySelectorAll("[data-certnote]")].find(x=>/coh_ambulance_permit/.test(x.getAttribute("data-certnote")));
    return {msg:msg, afterReload:t2&&t2.value, seededStill:t3&&t3.value.slice(0,40)};
  });
  console.log(JSON.stringify(res)); console.log("page errors:", errs.length?errs:"none");
  await b.close();
})();
