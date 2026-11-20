// Admin screens for the restock batch: Supply request detail ("Mark in stock") + Jump bag member detail ("Remind to restock"). Run from scratch/tests.
const {chromium}=require("playwright"); const fs=require("fs"); const path=require("path");
const ROOT=path.join(__dirname,"..",".."); const OUT=path.join(__dirname,"out","preview"); fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(ROOT+"/index.html","utf8"); const SB="https://gcvbohdarppaolqhdnri.supabase.co"; const errs=[];
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:412,height:860},deviceScaleFactor:2,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
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
  const pick=async(label)=>{ await pg.evaluate(()=>document.getElementById("admSecBtn").click()); await pg.waitForTimeout(300); await pg.evaluate((l)=>[...document.querySelectorAll("#admSecMenu .adm-secit")].find(x=>x.getAttribute("data-label")===l).click(), label); await pg.waitForTimeout(900); };
  await pick("Supply requests"); await pg.evaluate(()=>{ const r=document.querySelector("#admGenPane .amb-row"); if(r) r.click(); }); await pg.waitForTimeout(500);
  await pg.screenshot({path:OUT+"/supply-detail.png"});
  await pick("Jump bags"); await pg.evaluate(()=>{ const r=document.querySelector("#admGenPane .amb-row"); if(r) r.click(); }); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ const el=document.getElementById("admJbRemind"); if(el) el.scrollIntoView({block:"center"}); }); await pg.waitForTimeout(200);
  await pg.screenshot({path:OUT+"/jumpbag-remind.png"});
  await pg.evaluate(()=>document.getElementById("admJbRemind").click()); await pg.waitForTimeout(300);
  await pg.screenshot({path:OUT+"/jumpbag-remind-confirm.png"});
  console.log("page errors:", errs.length?errs:"none"); await b.close();
})();
