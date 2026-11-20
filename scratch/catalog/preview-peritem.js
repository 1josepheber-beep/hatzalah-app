// Per-item marking on a supply request (admin detail) + the member's bag line once one
// item is in stock. Runs on the demo data. Run from scratch/catalog (global playwright).
const {chromium}=require("playwright"); const fs=require("fs"); const path=require("path");
const ROOT=path.join(__dirname,"..",".."); const OUT=path.join(__dirname,"out","preview"); fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(ROOT+"/index.html","utf8"); const SB="https://gcvbohdarppaolqhdnri.supabase.co"; const errs=[];
const SEED=`;(function(){ var it=window.HOH_DEMO_DATA.jumpbag_items, m=it[29], s=it[37], h=3600e3, now=Date.now();
  window.HOH_DEMO_DATA.supply_requests.unshift({id:99,created_at:new Date(now-2*24*h).toISOString(),unit:"H-100",name:"Demo Admin",source:"jumpbag",ambulance:"",
    items:[{item_id:m.id,name:m.name,qty:m.qty,why:"Missing",status:"done",status_by:"David Fishman (H-1)",status_at:new Date(now+60e3).toISOString()},
           {item_id:s.id,name:s.name,qty:s.qty,why:"Short",status:"ordered",status_by:"David Fishman (H-1)",status_at:new Date(now-20*h).toISOString()}],
    note:"",status:"ordered",status_by:"David Fishman (H-1)",status_at:new Date(now-h).toISOString(),notified:"3 emailed"}); })();`;
const MIME={js:"application/javascript",css:"text/css",png:"image/png",jpg:"image/jpeg",svg:"image/svg+xml",json:"application/json",html:"text/html",webmanifest:"application/manifest+json"};
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:412,height:860},deviceScaleFactor:2,hasTouch:true,isMobile:true}); const pg=await ctx.newPage();
  pg.on("pageerror",e=>errs.push(String(e)));
  await pg.route("**/*",r=>{ const u=r.request().url();
    if(u==="https://houstonhatzalahapp.org/") return r.fulfill({contentType:"text/html",body:html});
    if(/houstonhatzalahapp\.org\//.test(u)){ const p=ROOT+decodeURIComponent(new URL(u).pathname.split("?")[0]); if(fs.existsSync(p)&&fs.statSync(p).isFile()){ const ext=path.extname(p).slice(1); let body=fs.readFileSync(p);
        if(/demo-data\.js$/.test(p)) body=body.toString()+SEED; // a request for the demo viewer (H-100) with one item in stock and one ordered
        return r.fulfill({contentType:MIME[ext]||"application/octet-stream",body}); } return r.fulfill({status:404,body:""}); }
    if(u.indexOf(SB+"/rest/v1/rpc/guest_demo")===0) return r.fulfill({contentType:"application/json",body:JSON.stringify({ok:true,name:"Visiting org"})});
    if(u.indexOf(SB)===0) return r.fulfill({status:403,contentType:"application/json",body:"{}"});
    return r.abort(); });
  await pg.addInitScript(()=>{ localStorage.setItem("hoh_demo","demo"); localStorage.setItem("hoh_push_asked","1"); localStorage.setItem("hoh_demo_as","H-100"); });
  await pg.goto("https://houstonhatzalahapp.org/"); await pg.waitForTimeout(2500);
  await pg.evaluate(()=>{ const all=[...document.querySelectorAll("#grid .tile")]; all.find(t=>(t.querySelector(".lab")||t).textContent.trim()==="Admin").click(); }); await pg.waitForTimeout(1200);
  const pick=async(label)=>{ await pg.evaluate(()=>document.getElementById("admSecBtn").click()); await pg.waitForTimeout(300); await pg.evaluate((l)=>[...document.querySelectorAll("#admSecMenu .adm-secit, #admSecs .adm-secit")].find(x=>x.getAttribute("data-label")===l).click(), label); await pg.waitForTimeout(700); };
  await pick("Supply requests");
  // the first open request with 2+ items
  await pg.evaluate(()=>{ const rows=[...document.querySelectorAll("#admGenPane .amb-row")]; (rows.find(r=>/Yosef Green/.test(r.textContent))||rows[0]).click(); }); await pg.waitForTimeout(500);
  await pg.screenshot({path:OUT+"/peritem-1-open.png"});
  // mark the first line ordered
  await pg.evaluate(()=>document.querySelector('#admGenPane [data-sritem="0"][data-srto="ordered"]').click()); await pg.waitForTimeout(700);
  await pg.screenshot({path:OUT+"/peritem-2-one-ordered.png"});
  // then the second line in stock
  await pg.evaluate(()=>document.querySelector('#admGenPane [data-sritem="1"][data-srto="done"]').click()); await pg.waitForTimeout(700);
  await pg.screenshot({path:OUT+"/peritem-3-mixed.png"});
  const listTxt=await pg.evaluate(()=>{ document.getElementById("srBackLink").click(); return new Promise(res=>setTimeout(()=>{ document.querySelector('#admGenPane [data-srf="all"]').click(); setTimeout(()=>res([...document.querySelectorAll("#admGenPane .amb-row .sr-st")].map(x=>x.textContent)),100); },100)); });
  await pg.screenshot({path:OUT+"/peritem-4-list.png"});
  console.log("list chips:", listTxt);
  // member view: open My Jump Bag as the member who asked (the demo request's unit)
  await pg.goto("https://houstonhatzalahapp.org/"); await pg.waitForTimeout(2500);
  await pg.evaluate(()=>{ const all=[...document.querySelectorAll("#grid .tile")]; all.find(t=>(t.querySelector(".lab")||t).textContent.trim()==="My Jump Bag").click(); }); await pg.waitForTimeout(1500);
  await pg.evaluate(()=>{ [...document.querySelectorAll("#jbBody .amb-tog")].filter(h=>!h.classList.contains("open")).forEach(h=>h.click()); const l=document.querySelector("#jbBody .jb-reqline.done"); if(l) l.scrollIntoView({block:"center"}); }); await pg.waitForTimeout(400);
  await pg.screenshot({path:OUT+"/peritem-5-member.png"});
  console.log("member lines:", await pg.evaluate(()=>[...document.querySelectorAll("#jbBody .jb-reqline")].map(x=>x.textContent)));
  console.log("page errors:", errs.length?errs:"none"); await b.close();
})();
