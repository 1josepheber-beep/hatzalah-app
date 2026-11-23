// My Jump Bag: only items ticked "has an expiration date" show a date box; a date can be cleared. Demo data.
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
  await pg.evaluate(()=>{ [...document.querySelectorAll("#grid .tile")].find(t=>/My Jump Bag/.test(t.textContent)).click(); }); await pg.waitForTimeout(1500);
  const info=await pg.evaluate(()=>{
    const secs=[...document.querySelectorAll("#jbBody .amb-tog")];
    secs.forEach(h=>{ if(!h.classList.contains("open")) h.click(); });
    const out=[];
    document.querySelectorAll("#jbBody .jb-sec").forEach(sec=>{ const rows=[...sec.querySelectorAll(".jb-row")];
      out.push({p:sec.getAttribute("data-pouch"), dated:rows.filter(r=>r.querySelector(".jb-exp")).length, plain:rows.filter(r=>!r.querySelector(".jb-exp")).length}); });
    return out;
  }); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ const sec=[...document.querySelectorAll("#jbBody .jb-sec")].find(s=>{ const rows=[...s.querySelectorAll(".jb-row")]; return rows.some(r=>r.querySelector(".jb-exp")) && rows.some(r=>!r.querySelector(".jb-exp")); }); if(sec) sec.scrollIntoView({block:"center"}); });
  await pg.screenshot({path:OUT+"/jbexp-1.png"});
  console.log(info, await pg.evaluate(()=>({withDate:document.querySelectorAll("#jbBody .jb-sec:not(.closed) .jb-exp").length, clears:document.querySelectorAll("#jbBody .jb-expclr").length, addexp:document.querySelectorAll("#jbBody .jb-addexp").length})));
  console.log("page errors:", errs.length?errs:"none"); await b.close();
})();
