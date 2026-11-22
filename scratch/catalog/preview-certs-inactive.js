// Admin Certifications: inactive members hidden behind a toggle. Demo data. Run from scratch/catalog.
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
  await pg.evaluate(()=>{ const all=[...document.querySelectorAll("#grid .tile")]; all.find(t=>(t.querySelector(".lab")||t).textContent.trim()==="Certifications").click(); }); await pg.waitForTimeout(1500);
  const info=await pg.evaluate(()=>{ const t=document.getElementById("certInactiveToggle"); if(t) t.scrollIntoView({block:"center"}); return {toggle:t?t.textContent:null, members:document.querySelectorAll("#certBody .cert-mem").length}; });
  console.log(info);
  await pg.screenshot({path:OUT+"/certs-inactive-1.png"});
  await pg.evaluate(()=>{ const t=document.getElementById("certInactiveToggle"); if(t) t.click(); }); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ const m=document.querySelector("#certBody .cert-mem.inactive"); if(m) m.scrollIntoView({block:"center"}); });
  await pg.screenshot({path:OUT+"/certs-inactive-2.png"});
  console.log("after:", await pg.evaluate(()=>({members:document.querySelectorAll("#certBody .cert-mem").length, inactive:document.querySelectorAll("#certBody .cert-mem.inactive").length})));
  console.log("page errors:", errs.length?errs:"none"); await b.close();
})();
