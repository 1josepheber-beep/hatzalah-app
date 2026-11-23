// Admin → Call statistics: the End of quarter panel (switches off) and the jump to Settings. Demo data.
const {chromium}=require("playwright"); const fs=require("fs"); const path=require("path");
const ROOT=path.join(__dirname,"..",".."); const OUT=path.join(__dirname,"out","preview"); fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(ROOT+"/index.html","utf8"); const SB="https://gcvbohdarppaolqhdnri.supabase.co"; const errs=[];
const MIME={js:"application/javascript",css:"text/css",png:"image/png",jpg:"image/jpeg",svg:"image/svg+xml",json:"application/json",html:"text/html",webmanifest:"application/manifest+json"};
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:412,height:900},deviceScaleFactor:2,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
  pg.on("pageerror",e=>errs.push(String(e)));
  await pg.route("**/*",r=>{ const u=r.request().url();
    if(u==="https://houstonhatzalahapp.org/") return r.fulfill({contentType:"text/html",body:html});
    if(/houstonhatzalahapp\.org\//.test(u)){ const p=ROOT+decodeURIComponent(new URL(u).pathname.split("?")[0]); if(fs.existsSync(p)&&fs.statSync(p).isFile()){ const ext=path.extname(p).slice(1); return r.fulfill({contentType:MIME[ext]||"application/octet-stream",body:fs.readFileSync(p)}); } return r.fulfill({status:404,body:""}); }
    if(u.indexOf(SB+"/rest/v1/rpc/guest_demo")===0) return r.fulfill({contentType:"application/json",body:JSON.stringify({ok:true,name:"Visiting org"})});
    if(u.indexOf(SB)===0) return r.fulfill({status:403,contentType:"application/json",body:"{}"});
    return r.abort(); });
  await pg.addInitScript(()=>{ localStorage.setItem("hoh_demo","demo"); localStorage.setItem("hoh_push_asked","1"); localStorage.setItem("hoh_demo_as","H-100"); });
  await pg.goto("https://houstonhatzalahapp.org/"); await pg.waitForTimeout(2600);
  await pg.evaluate(()=>{ [...document.querySelectorAll("#grid .tile")].find(t=>(t.querySelector(".lab")||t).textContent.trim()==="Admin").click(); }); await pg.waitForTimeout(1200);
  await pg.evaluate(()=>{ const b=[...document.querySelectorAll("#admSecs .adm-secit")].find(x=>x.getAttribute("data-label")==="Call stats"); if(b) b.click(); }); await pg.waitForTimeout(1400);
  await pg.evaluate(()=>{ const h=document.getElementById("csEndQh"); if(h) h.click(); }); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ const e=document.querySelector(".cs-endq"); if(e) e.scrollIntoView({block:"start"}); }); await pg.waitForTimeout(300);
  await pg.screenshot({path:OUT+"/endq-1.png"});
  // the jump to the Standings settings card
  await pg.evaluate(()=>{ const b=document.querySelector('[data-setcard="Standings"]'); if(b) b.click(); }); await pg.waitForTimeout(2200);
  await pg.screenshot({path:OUT+"/endq-2.png"});
  console.log(await pg.evaluate(()=>({ back:!!document.getElementById("admSetBack"), open:!![...document.querySelectorAll(".adm-gsec")].find(x=>x.querySelector(".adm-itemt").textContent.trim()==="Standings" && x.classList.contains("open")) })));
  console.log("page errors:", errs.length?errs:"none"); await b.close();
})();
