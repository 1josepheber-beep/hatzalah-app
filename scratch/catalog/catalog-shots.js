// Screenshots for the feature catalog, taken from the demo (work copies). Phone + desktop.
const {chromium}=require("playwright"); const fs=require("fs"); const path=require("path");
const ROOT=process.env.HOH_ROOT||path.join(__dirname,"..",".."); const W=ROOT, R=ROOT, OUT=path.join(__dirname,"out","shots"); fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(W+"/index.html","utf8"); const SB="https://gcvbohdarppaolqhdnri.supabase.co";
const taken=[]; const log=(...a)=>console.log(...a);
async function openCtx(b, opts, asUnit){
  const ctx=await b.newContext(opts); const pg=await ctx.newPage();
  await pg.route("**/*",r=>{ const u=r.request().url();
    if(u==="https://houstonhatzalahapp.org/") return r.fulfill({contentType:"text/html",body:html});
    if(/\/demo\/demo-data\.js/.test(u)) return r.fulfill({contentType:"application/javascript",body:fs.readFileSync(W+"/demo/demo-data.js")});
    if(/\/demo\/sample\.pdf/.test(u)) return r.fulfill({contentType:"application/pdf",body:fs.readFileSync(W+"/demo/sample.pdf")});
    if(/\/demo\/sample-photo\.jpg/.test(u)) return r.fulfill({contentType:"image/jpeg",body:fs.readFileSync(W+"/demo/sample-photo.jpg")});
    if(/\/equipment\.html/.test(u)) return r.fulfill({contentType:"text/html",body:fs.readFileSync(W+"/equipment.html")});
    if(/houstonhatzalahapp\.org\//.test(u)){ const p=R+decodeURIComponent(new URL(u).pathname.split("?")[0]); if(fs.existsSync(p)&&fs.statSync(p).isFile()){ const ext=path.extname(p).slice(1); const ct={js:"application/javascript",png:"image/png",webp:"image/webp",jpg:"image/jpeg",html:"text/html",json:"application/json",webmanifest:"application/manifest+json"}[ext]||"application/octet-stream"; return r.fulfill({contentType:ct,body:fs.readFileSync(p)}); } return r.abort(); }
    // Tile pictures live in Supabase storage, which this machine can't reach. These are the
    // originals that were uploaded (repo tile-icons/), matched by tile. Resources has no
    // local copy, so it falls back to the tile's drawn icon.
    if(/storage\/v1\/object\/public\/image\/tiles\//.test(u)){ const n=u.split("/").pop();
      const map={"mtu5i0ywftod4.jpg":"eso.png","mtu5jsl4b57e1.jpg":"Pulsara1.png","mtt42yhsmrbww.jpg":"tile-equipment-finder.png","mtt4o1d2dbcs3.jpg":"tile-apartment-finder.png","mtt568t2mcmx4.jpg":"tile-certifications.png","mtt4csqp256ox.jpg":"tile-poison-control.png","mtu64l84f13hn.jpg":"ERG 2024.png","mtu6zwsrl34q1.jpg":"tile-state-equipment.png","mtu68rwfg728i.jpg":"tile-admin.png"};
      if(map[n]) return r.fulfill({contentType:"image/png",body:fs.readFileSync(R+"/tile-icons/"+map[n])}); return r.abort(); }
    if(u.indexOf(SB+"/rest/v1/rpc/guest_demo")===0) return r.fulfill({contentType:"application/json",body:JSON.stringify({ok:true,name:"Visiting org"})});
    if(u.indexOf(SB)===0){ log("  ! backend call:",u.slice(0,90)); return r.fulfill({status:403,contentType:"application/json",body:"{}"}); }
    if(/tile\.openstreetmap|basemaps|arcgis|tile\./.test(u)) return r.fulfill({contentType:"image/png",body:fs.readFileSync(R+"/badge-96.png")});
    return r.abort(); });
  await pg.addInitScript((u)=>{ localStorage.setItem("hoh_demo","demo"); localStorage.setItem("hoh_push_asked","1"); if(u) localStorage.setItem("hoh_demo_as",u); }, asUnit||"");
  await pg.goto("https://houstonhatzalahapp.org/"); await pg.waitForTimeout(2500);
  return {pg,ctx};
}
const tileJS=(label)=>`(()=>{ const all=[...document.querySelectorAll("#grid .tile")]; const t=all.find(t=>(t.querySelector(".lab")||t).textContent.trim()==="${label}")||all.find(t=>t.textContent.indexOf("${label}")>=0); if(!t) throw new Error("no tile ${label}"); t.click(); })()`;
async function shot(pg, id, opts){ opts=opts||{}; const f=OUT+"/"+id+".png"; if(opts.full){ await pg.screenshot({path:f, fullPage:true}); } else if(opts.el){ const h=await pg.$(opts.el); await h.screenshot({path:f}); } else { await pg.screenshot({path:f}); } taken.push(id); log("  shot", id); }
async function back(pg){ await pg.evaluate(()=>{ const s=[...document.querySelectorAll(".screen.open, .preader.open")].pop(); const bk=s&&s.querySelector(".back"); if(bk) bk.click(); }); await pg.waitForTimeout(350); }
async function home(pg){
  // the Scene Timer is its own overlay (#scene.open) — close it via Minimize (navBack), then force it shut if history was slow
  const sc=await pg.evaluate(()=>{ const s=document.getElementById("scene"); return !!(s&&s.classList.contains("open")); });
  if(sc){ await pg.evaluate(()=>document.getElementById("scMin").click()); await pg.waitForTimeout(500); await pg.evaluate(()=>{ const s=document.getElementById("scene"); if(s) s.classList.remove("open"); }); }
  for(let i=0;i<6;i++){ const open=await pg.evaluate(()=>!!document.querySelector(".screen.open, .preader.open")); if(!open) break; await back(pg); } await pg.evaluate(()=>{ document.querySelectorAll(".sheet-wrap:not(.hidden)").forEach(x=>x.classList.add("hidden")); }); await pg.waitForTimeout(200); }

(async()=>{
  const b=await chromium.launch();
  /* ---------------- phone ----------------
     Captured as the people who actually use each screen: a plain responder (H-101),
     a trainee for the Task Book (H-108), a service unit for ambulance checks and
     supplies (H-110), and the admin (H-100) only for the admin screens. */
  const PHONE={viewport:{width:412,height:860},deviceScaleFactor:2,hasTouch:true,isMobile:true};
  let pg,ctx;
  const asUnit=async(unit)=>{ if(ctx) await ctx.close(); ({pg,ctx}=await openCtx(b,PHONE,unit)); };
  if(process.env.ONLY!=="desktop"){
  // the new member sees every notice still pending: home + notices + quick actions as H-108
  await asUnit("H-108");
  await shot(pg,"p-home");
  await pg.evaluate(()=>document.getElementById("qActions").click()); await pg.waitForTimeout(300); await shot(pg,"p-quick"); await home(pg);
  // notices: the poll, then the confirm
  await pg.evaluate(()=>{ const c=[...document.querySelectorAll("#noticeStack *")].find(e=>/Updated SOP/.test(e.textContent)&&e.children.length<4); (c.closest("button, .cb-go, [data-ann]")||c).click(); }); await pg.waitForTimeout(500); await shot(pg,"p-notice-confirm");
  await pg.evaluate(()=>{ document.querySelectorAll(".nx-modal, .rsp-modal").forEach(m=>m.classList.add("hidden")); }); await home(pg);
  await pg.evaluate(tileJS("Task Book")); await pg.waitForTimeout(900); await shot(pg,"p-taskbook"); await home(pg);
  // everything else a responder uses, as H-101
  await asUnit("H-101");
  await pg.evaluate(()=>document.getElementById("availHdr").click()); await pg.waitForTimeout(600); await shot(pg,"p-availability"); await home(pg);
  await pg.evaluate(()=>document.getElementById("unitWrap").click()); await pg.waitForTimeout(600); await shot(pg,"p-profile");
  // Text Home set-up lives in the profile: open that fold and scroll it into view
  await pg.evaluate(()=>{ const d=[...document.querySelectorAll("details.pfold")].find(x=>/Text home/.test(x.querySelector("summary").textContent)); if(d){ d.open=true; d.scrollIntoView({block:"center"}); } }); await pg.waitForTimeout(300); await shot(pg,"p-texthome"); await home(pg);
  // tools
  for(const [id,btn] of [["p-vitals","qVitals"],["p-cpr","qCpr"],["p-notes","qNotes"],["p-scene","qScene"]]){
    await pg.evaluate(()=>document.getElementById("qActions").click()); await pg.waitForTimeout(200);
    await pg.evaluate((b)=>document.getElementById(b).click(), btn); await pg.waitForTimeout(700);
    await shot(pg,id); await home(pg);
  }
  await pg.evaluate(()=>document.getElementById("searchRx").click()); await pg.waitForTimeout(700); await shot(pg,"p-rx"); await home(pg);
  // the one search box: type, shoot the results, then open one
  const search=async(q)=>{ await pg.evaluate(()=>{ const s=document.getElementById("search"); s.value=""; s.dispatchEvent(new Event("input",{bubbles:true})); }); await pg.focus("#search"); await pg.type("#search", q, {delay:20}); await pg.waitForTimeout(900); };
  await search("stroke"); await shot(pg,"p-search-mixed");
  await search("Katz"); await shot(pg,"p-search-member");
  await search("7822 Bellfort"); await shot(pg,"p-search-address");
  await pg.evaluate(()=>{ const it=document.querySelector('#sresults .sr-item[data-t="aptm"], #sresults .sr-item[data-t="apt"]'); if(it) it.click(); }); await pg.waitForTimeout(1500); await shot(pg,"p-search-address-open"); await home(pg);
  await search("iGel"); await shot(pg,"p-search-item");
  await pg.evaluate(()=>{ const it=document.querySelector('#sresults .sr-item[data-t="e"]'); if(it) it.click(); }); await pg.waitForTimeout(1200); await shot(pg,"p-search-item-open"); await home(pg);
  await pg.evaluate(()=>{ const s=document.getElementById("search"); s.value=""; s.dispatchEvent(new Event("input",{bubbles:true})); });
  // tiles, as a responder
  const simple=[["Hospitals","p-hospitals",900],["Equipment Finder","p-equipment",900],["Apartments Finder","p-apartments",900],["Protocols","p-protocols",900],["ERG 2024","p-erg",900],["Certifications","p-certs",900],["Members Directory","p-directory",900],["Scheduler","p-scheduler",1800],["Resources","p-resources",900],["My Jump Bag","p-jumpbag",1000]];
  for(const [label,id,w] of simple){ await pg.evaluate(tileJS(label)); await pg.waitForTimeout(w); await shot(pg,id);
    if(id==="p-equipment"){ await pg.evaluate(()=>{ const c=document.querySelector("#cabGrid .cab-card"); if(c) c.click(); }); await pg.waitForTimeout(900); await shot(pg,"p-equipment-cabinet"); }
    if(id==="p-apartments"){ await pg.evaluate(()=>{ const c=document.querySelector("#aptBody .sr-item, #aptBody [data-slug], #aptBody button, #aptBody .apt"); if(c) c.click(); }); await pg.waitForTimeout(1200); await shot(pg,"p-apartment-plan"); }
    if(id==="p-protocols"){ await pg.evaluate(()=>{ const c=document.querySelector("#protoBody .sr-item, #protoBody [data-page], #protoBody button"); if(c) c.click(); }); await pg.waitForTimeout(1200); await shot(pg,"p-protocol-page"); }
    if(id==="p-certs"){ await pg.evaluate(()=>{ const u=document.querySelector("#certBody .cert-up"); if(u) u.click(); }); await pg.waitForTimeout(500); await shot(pg,"p-certs-renew"); await pg.evaluate(()=>{ ["certUpModal","certModal","certCalModal","certRemindModal"].forEach(function(i){ var m=document.getElementById(i); if(m) m.classList.add("hidden"); }); }); }
    if(id==="p-jumpbag"){ await pg.evaluate(()=>{ const p=document.querySelector('#jbBody .jb-pill[data-jump="fix"]'); if(p) p.click(); }); await pg.waitForTimeout(300); await shot(pg,"p-jumpbag-jump"); await pg.evaluate(()=>{ const p=document.querySelector('#jbBody .jb-pill[data-jump="fix"]'); if(p) p.click(); }); await pg.evaluate(()=>{ [...document.querySelectorAll("#jbBody .amb-tog")][1].click(); }); await pg.waitForTimeout(300); await pg.evaluate(()=>{ document.getElementById("jbBody").scrollTop=380; }); await pg.waitForTimeout(200); await shot(pg,"p-jumpbag-pouch"); await pg.evaluate(()=>{ document.getElementById("jbBody").scrollTop=0; document.getElementById("jbReqBtn").click(); }); await pg.waitForTimeout(300); await shot(pg,"p-jumpbag-restock"); }
    await home(pg);
  }
  // ambulance checks and supplies, as a service unit
  await asUnit("H-110");
  await pg.evaluate(tileJS("Ambulance Checkoff")); await pg.waitForTimeout(1000); await shot(pg,"p-checkoff");
  await pg.evaluate(()=>{ document.querySelector('#ambBody [data-amb]').click(); document.querySelector('#ambBody [data-type="weekly"]').click(); }); await pg.waitForTimeout(400); await pg.evaluate(()=>{ const s=document.querySelector("#ambBody .ebtn.primary, #ambBody #ambStart"); if(s) s.click(); }); await pg.waitForTimeout(600); await shot(pg,"p-checkoff-sections");
  await pg.evaluate(()=>{ const t=document.querySelector("#ambBody .amb-tog"); if(t) t.click(); }); await pg.waitForTimeout(300); await shot(pg,"p-checkoff-section");
  await pg.evaluate(()=>{ const b=document.getElementById("ambLeftBtn"); if(b) b.click(); }); await pg.waitForTimeout(300); await pg.evaluate(()=>{ const b=document.getElementById("ambLeftBtn"); if(b) b.scrollIntoView({block:"start"}); window.scrollTo(0,0); }); await pg.waitForTimeout(200); await shot(pg,"p-checkoff-left");
  await pg.evaluate(()=>{ const b=document.getElementById("ambLeftBtn"); if(b) b.click(); const s=document.getElementById("ambSubmit"); if(s) s.click(); }); await pg.waitForTimeout(400); await pg.evaluate(()=>{ const x=document.querySelector("#ambBody .amb-partial"); if(x) x.scrollIntoView({block:"center"}); }); await pg.waitForTimeout(200); await shot(pg,"p-checkoff-partial");
  await pg.evaluate(()=>{ const s=document.getElementById("ambSubmitPartial"); if(s) s.click(); }); await pg.waitForTimeout(1200); await pg.evaluate(()=>{ window.scrollTo(0,0); document.querySelectorAll(".screen.open, #ambBody, .scr-body").forEach(e=>{ e.scrollTop=0; }); }); await pg.waitForTimeout(200); await shot(pg,"p-checkoff-done");
  await pg.evaluate(()=>{ const d=document.getElementById("ambDone"); if(d) d.click(); }); await pg.waitForTimeout(500); await home(pg);
  await pg.evaluate(tileJS("Ambulance Checkoff")); await pg.waitForTimeout(1000); await pg.evaluate(()=>{ const c=document.getElementById("ambSupply"); if(c) c.click(); }); await pg.waitForTimeout(700); await shot(pg,"p-supply"); await pg.evaluate(()=>{ const r=document.querySelector("#srBody .amb-row"); if(r) r.click(); }); await pg.waitForTimeout(400); await shot(pg,"p-supply-detail"); await home(pg);
  // admin-only screens, as the admin
  await asUnit("H-100");
  await pg.evaluate(()=>{ const c=[...document.querySelectorAll("#noticeStack *")].find(e=>/Training night/.test(e.textContent)&&e.children.length<4); (c.closest("button, .cb-go, [data-ann]")||c).click(); }); await pg.waitForTimeout(500); await shot(pg,"p-notice-poll");
  await pg.evaluate(()=>{ document.querySelectorAll(".nx-modal, .rsp-modal").forEach(m=>m.classList.add("hidden")); }); await pg.waitForTimeout(200);
  await pg.evaluate(tileJS("State Equipment")); await pg.waitForTimeout(2500); await shot(pg,"p-state-equipment"); await home(pg);
  await pg.evaluate(tileJS("Admin")); await pg.waitForTimeout(1200); await shot(pg,"p-admin"); await pg.evaluate(()=>document.getElementById("admSecBtn").click()); await pg.waitForTimeout(300); await shot(pg,"p-admin-picker"); await pg.evaluate(()=>document.getElementById("admSecBack").click()); await pg.evaluate(()=>document.querySelector('#admList .adm-row[data-u="H-109"]').click()); await pg.waitForTimeout(500); await shot(pg,"p-admin-member"); await home(pg);
  await pg.evaluate(()=>document.getElementById("homeReport").click()); await pg.waitForTimeout(500); await shot(pg,"p-report");
  await ctx.close(); ctx=null; }
  if(process.env.ONLY==="phone"){ await b.close(); fs.writeFileSync(OUT+"/taken-phone.json", JSON.stringify(taken,null,1)); log("done phone", taken.length); return; }
  /* ---------------- desktop ---------------- */
  ({pg,ctx}=await openCtx(b,{viewport:{width:1366,height:800},deviceScaleFactor:1.5},"H-100"));
  await shot(pg,"d-home");
  await pg.evaluate(tileJS("Admin")); await pg.waitForTimeout(1200);
  await pg.evaluate(()=>document.querySelector('#admList .adm-row[data-u="H-109"]').click()); await pg.waitForTimeout(500); await shot(pg,"d-admin-members");
  await pg.evaluate(()=>document.querySelector('#admRight .adm-tab[data-tab="contact"]').click()); await pg.waitForTimeout(300); await shot(pg,"d-admin-member-contact");
  await pg.evaluate(()=>document.querySelector('#admRight .adm-tab[data-tab="certs"]').click()); await pg.waitForTimeout(400); await shot(pg,"d-admin-member-certs");
  await pg.evaluate(()=>document.getElementById("admUsageBtn").click()); await pg.waitForTimeout(400); await shot(pg,"d-admin-storage"); await pg.evaluate(()=>{ const b=document.getElementById("u_ok"); if(b) b.click(); });
  const secs=["Guest codes","Supply requests","Ambulance checks","Jump bags","Jump bag items","Announcements","Tiles","Resources","Settings","Certification types","Document types","Hospitals","Apartments","Task list","CPR buttons","Vitals"];
  for(const label of secs){
    await pg.evaluate((l)=>[...document.querySelectorAll("#admSecMenu .adm-secit")].find(x=>x.getAttribute("data-label")===l).click(), label); await pg.waitForTimeout(900);
    const id="d-admin-"+label.toLowerCase().replace(/[^a-z0-9]+/g,"-");
    if(label==="Settings"||label==="Tiles"||label==="Hospitals"||label==="Vitals"){ // tall: capture the whole pane
      await pg.setViewportSize({width:1366,height:800}); const h=await pg.evaluate(()=>{ const p=document.getElementById("admGenPane"); return p.scrollHeight; });
      await pg.setViewportSize({width:1366,height:Math.min(Math.max(800,h+140),6000)}); await pg.waitForTimeout(300); await shot(pg,id); await pg.setViewportSize({width:1366,height:800});
    } else await shot(pg,id);
    if(label==="Settings"){ // the two 1.8.1 cards, opened
      await pg.evaluate(()=>{ [...document.querySelectorAll("#admGenPane .adm-item")].forEach(x=>{ const t=x.querySelector(".adm-itemt").textContent.trim(); if(t==="Analytics tracking"||t==="Logo") x.classList.add("open"); }); const a=[...document.querySelectorAll("#admGenPane .adm-item")].find(x=>/Analytics tracking/.test(x.textContent)); a.scrollIntoView({block:"start"}); window.scrollBy(0,-70); });
      await pg.waitForTimeout(300); await shot(pg,"d-admin-settings-analytics");
      await pg.evaluate(()=>{ document.querySelectorAll("#admGenPane .adm-item").forEach(x=>x.classList.remove("open")); window.scrollTo(0,0); });
    }
    if(label==="Settings"){ // every setting opened up, one tall capture
      await pg.evaluate(()=>{ document.querySelectorAll("#admGenPane .adm-item").forEach(x=>x.classList.add("open")); }); await pg.waitForTimeout(300);
      const h2=await pg.evaluate(()=>document.getElementById("admGenPane").scrollHeight);
      await pg.setViewportSize({width:1366,height:Math.min(Math.max(800,h2+140),12000)}); await pg.waitForTimeout(300); await shot(pg,"d-admin-settings-all"); await pg.setViewportSize({width:1366,height:800});
      await pg.evaluate(()=>{ document.querySelectorAll("#admGenPane .adm-item").forEach(x=>x.classList.remove("open")); });
    }
    if(label==="Tiles"){ // one tile opened to show its fields
      await pg.evaluate(()=>{ const it=[...document.querySelectorAll("#admGenPane .adm-item")].find(x=>/Hospitals/.test(x.textContent)); if(it) it.classList.add("open"); window.scrollTo(0,0); }); await pg.waitForTimeout(300);
      await shot(pg,"d-admin-tile-edit");
      await pg.evaluate(()=>{ document.querySelectorAll("#admGenPane .adm-item").forEach(x=>x.classList.remove("open")); });
    }
    if(label==="Ambulance checks"){ await pg.evaluate(()=>{ const r=document.querySelector("#admGenPane .amb-row"); if(r) r.click(); }); await pg.waitForTimeout(600); await shot(pg,"d-admin-ambulance-check-detail"); }
    if(label==="Jump bags"){ await pg.evaluate(()=>{ const r=document.querySelector("#admGenPane .amb-row, #admGenPane .adm-row"); if(r) r.click(); }); await pg.waitForTimeout(600); await shot(pg,"d-admin-jump-bag-detail"); }
    if(label==="Supply requests"){ await pg.evaluate(()=>{ const r=document.querySelector("#admGenPane .amb-row"); if(r) r.click(); }); await pg.waitForTimeout(500); await shot(pg,"d-admin-supply-detail"); }
    if(label==="Announcements"){ await pg.evaluate(()=>{ const it=[...document.querySelectorAll("#admGenPane .adm-item")].find(x=>/Training night/.test(x.textContent)); if(it) it.classList.add("open"); }); await pg.waitForTimeout(400); await shot(pg,"d-admin-announcement-edit"); await pg.evaluate(()=>{ document.querySelectorAll("#admGenPane .adm-item").forEach(x=>x.classList.remove("open")); }); await pg.evaluate(()=>{ const c=document.querySelector("#admGenPane .adm-resp"); if(c) c.click(); }); await pg.waitForTimeout(500); await shot(pg,"d-admin-announcement-responses"); await pg.evaluate(()=>{ const c=document.getElementById("rspClose"); if(c) c.click(); const m=document.getElementById("rspModal"); if(m) m.classList.add("hidden"); const h=document.getElementById("admModalHost"); if(h) h.innerHTML=""; }); await pg.waitForTimeout(300); }
  }
  await ctx.close(); await b.close();
  fs.writeFileSync(OUT+"/taken.json", JSON.stringify(taken,null,1)); log("done", taken.length);
})().catch(e=>{ console.error(e); process.exit(1); });
