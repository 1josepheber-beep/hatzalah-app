// Demo mode: the whole app on sample data. Every tile, every admin section, saves that stick in memory,
const ROOT=process.env.HOH_ROOT||require("path").join(__dirname,"..","..");
// and not one request to the real database or the script while the demo runs.
const fs=require("fs"); const {JSDOM}=require("jsdom");
const html=fs.readFileSync(ROOT+"/index.html","utf8");
const demoSrc=fs.readFileSync(ROOT+"/demo/demo-data.js","utf8");
const ORIGIN="https://houstonhatzalahapp.org", SB="https://gcvbohdarppaolqhdnri.supabase.co";
let pass=0, fail=0; const check=(l,ok)=>{ console.log((ok?"  PASS ":"  FAIL ")+l); ok?pass++:fail++; };
const errs=[], net=[];
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:ORIGIN+"/",beforeParse(w){
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{}; w.Response=Response; w.HTMLElement.prototype.scrollIntoView=function(){};
  Object.defineProperty(w.HTMLImageElement.prototype,"complete",{get:()=>true,configurable:true});
  w.navigator.serviceWorker={register:()=>Promise.resolve({addEventListener(){},update:()=>Promise.resolve()}),addEventListener(){},ready:new Promise(()=>{}),controller:null};
  w.localStorage.setItem("hoh_demo","demo");
  w.caches={keys:()=>Promise.resolve([]),open:()=>Promise.resolve({keys:()=>Promise.resolve([]),match:()=>Promise.resolve(undefined),put:()=>Promise.resolve()})};
  w.URL.createObjectURL=()=>"blob:demo"; w.URL.revokeObjectURL=()=>{}; w.AudioContext=undefined; w.webkitAudioContext=undefined;
  new Function("window", demoSrc)(w);   /* the data file, already loaded */
  w.fetch=(u,o)=>{ u=typeof u==="string"?u:u.url; o=o||{};
    if(u.indexOf(SB+"/rest/v1/rpc/guest_demo")===0) return Promise.resolve(new Response(JSON.stringify({ok:true,name:"Visiting org"}),{status:200,headers:{"Content-Type":"application/json"}}));
    if(/^https?:/.test(u) && !/\/demo\/sample/.test(u)) net.push((o.method||"GET")+" "+u.slice(0,90));
    if(/\/demo\/sample\.pdf$/.test(u)) return Promise.resolve(new Response("%PDF-demo",{status:200,headers:{"Content-Type":"application/pdf"}}));
    return Promise.resolve(new Response("",{status:200})); };
  w.onerror=(m,s,l,c,e)=>errs.push(String(e&&e.stack||m).split("\n")[0]);
}});
const w=dom.window, d=w.document; const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const click=(el)=>{ if(!el) throw new Error("nothing to click"); el.dispatchEvent(new w.MouseEvent("click",{bubbles:true,cancelable:true})); };
const tile=(label)=>{ const all=[...d.querySelectorAll("#grid .tile")]; return all.find(t=>(t.querySelector(".lab")||t).textContent.trim()===label) || all.find(t=>t.textContent.trim().replace(/\s+/g," ").indexOf(label)>=0); };
const openScreen=()=>d.querySelector(".screen.open, .preader.open");
const back=async()=>{ const s=openScreen(); if(!s) return; const b=s.querySelector(".back"); if(b) click(b); await wait(150); };

(async()=>{
  await wait(1600);
  const DB=()=>w.HOH_DEMO_DEBUG().db, ME=()=>w.HOH_DEMO_DEBUG().me;
  check("demo starts as a guest on sample data: DEMO bar on, viewer is Demo Admin H-100 with admin rights", d.body.classList.contains("demo") && !!w.HOH_DEMO_DEBUG() && ME().unit==="H-100" && ME().admin===true);
  const labels=[...d.querySelectorAll("#grid .tile")].map(t=>t.textContent.trim().replace(/\s+/g," "));
  check("the home grid shows the real tile layout from the sample data ("+labels.length+" tiles) and three per row", labels.length>=16 && labels.some(l=>/My Jump Bag/.test(l)) && labels.some(l=>/Admin/.test(l)) && d.getElementById("grid").classList.contains("cols3"));
  check("sample announcements show on the home screen", d.querySelectorAll("#noticeStack .notice, #noticeStack [data-ann], #noticeStack .nx").length>=1 || /Quick Actions|Training night|SOP/.test(d.getElementById("noticeStack").textContent));
  // every screen-opening tile
  const tiles=[["Hospitals",t=>/Memorial Hermann/.test(t)],["Equipment Finder",t=>/Airway|Trauma|Cabinet/i.test(t)],["Apartments Finder",t=>/Westbury|Creekbend|Fondren/i.test(t)],["Protocols",t=>t.length>20],["Certifications",t=>/NREMT|BLS|Driver/.test(t)],
    ["Members Directory",t=>/Berger|Friedman|Katz/.test(t)],["ERG 2024",t=>t.length>20],["Scheduler",t=>/H-102|Friedman|Primary|Backup/.test(t)],["State Equipment",t=>true],["Task Book",t=>/Orientation|Adler|Personnel/.test(t)],
    ["Resources",t=>/Standard Operating|Radio quick/.test(t)],["My Jump Bag",t=>/of 75 stocked|Trauma/.test(t)],["Ambulance Checkoff",t=>/A1 Ambulance|Weekly|weekly/i.test(t)]];
  for(const [label,ok] of tiles){
    const before=errs.length; const t=tile(label); if(!t){ check("tile '"+label+"' exists", false); continue; }
    click(t); await wait(900);
    const s=openScreen(); const text=s?s.textContent.replace(/\s+/g," "):"";
    check("tile '"+label+"' opens with sample content", !!s && ok(text) && errs.length===before);
    await back(); await wait(100);
  }
  // writes that stick
  click(tile("My Jump Bag")); await wait(800);
  const pouch=[...d.querySelectorAll("#jbBody .amb-tog")][0]; click(pouch); await wait(100);
  const row=d.querySelector("#jbBody .jb-row"); const name=row.querySelector(".jb-nm")?row.querySelector(".jb-nm").textContent:row.textContent.slice(0,20);
  click(row.querySelector('.jb-b[data-s="missing"]')); await wait(300);
  const stRow=DB().jumpbag_status.find(r=>r.unit==="H-100" && String(r.item_id)===String(row.getAttribute("data-id")));
  check("marking a jump bag item Missing is saved in the demo database (not the network)", stRow && stRow.status==="missing" && d.querySelector("#jbBody .jb-row").classList.contains("missing"));
  click(d.getElementById("jbReqBtn")); await wait(100); click(d.getElementById("jbReqSend")); await wait(400);
  check("a restock request from the jump bag lands in the demo supply_requests table", DB().supply_requests.some(r=>r.unit==="H-100" && r.status==="open" && r.source==="jumpbag"));
  await back();
  // the demo never talks to the real backend
  check("no request left the page for the database, storage or the script while in the demo (only the passcode check)", net.length===0); net.slice(0,5).forEach(n=>console.log("   !",n));
  // quick actions + scene timer + CPR
  click(d.getElementById("qActions")); await wait(50); click(d.getElementById("qCpr")); await wait(200);
  check("CPR Tracker opens in the demo", d.getElementById("cprScreen").classList.contains("open")); click(d.getElementById("cprBack")); await wait(100);
  // admin: every section
  click(tile("Admin")); await wait(900);
  check("admin opens in the demo with the sample roster", d.getElementById("admScreen").classList.contains("open") && d.querySelectorAll("#admList .adm-row").length>=10);
  const secs=[...d.querySelectorAll("#admSecs .adm-secit")].map(b=>b.getAttribute("data-label"));
  for(const label of secs){
    const before=errs.length; click([...d.querySelectorAll("#admSecs .adm-secit")].find(b=>b.getAttribute("data-label")===label)); await wait(500);
    const pane=label==="Members"?d.getElementById("admMembersPane"):d.getElementById("admGenPane");
    const txt=pane.textContent.replace(/\s+/g," ");
    const hasRows = label==="Members" ? d.querySelectorAll("#admList .adm-row").length>=10 : (pane.querySelectorAll(".adm-row, .amb-row, tr, .adm-field, .adm-rowline, .cprx-b, input, select").length>=1 && !/Loading…/.test(txt));
    check("admin section '"+label+"' shows sample rows", hasRows && errs.length===before && !/Couldn’t load/.test(txt));
  }
  // an admin edit that sticks: supply request -> ordered
  click([...d.querySelectorAll("#admSecs .adm-secit")].find(b=>b.getAttribute("data-label")==="Supply requests")); await wait(400);
  const openRow=[...d.querySelectorAll("#admGenPane .amb-row")].find(r=>/OPEN/i.test(r.textContent)); click(openRow); await wait(200);
  click(d.querySelector('#admGenPane [data-srset="ordered"]')); await wait(300);
  check("marking a supply request Ordered sticks in the demo", DB().supply_requests.some(r=>r.status==="ordered" && /Demo Admin/.test(r.status_by)));
  // a member edit that sticks
  click([...d.querySelectorAll("#admSecs .adm-secit")].find(b=>b.getAttribute("data-label")==="Members")); await wait(300);
  click(d.querySelector('#admList .adm-row[data-u="H-101"]')); await wait(300);
  click(d.querySelector('#admRight .adm-tab[data-tab="contact"]')); await wait(200);
  const ph=d.getElementById("adPh"); if(ph){ ph.value="713-555-0999"; ph.dispatchEvent(new w.Event("input",{bubbles:true})); }
  const saveBtn=[...d.querySelectorAll("#admRight button")].find(b=>/Save changes/.test(b.textContent)); click(saveBtn); await wait(400);
  check("editing a member's phone saves to the demo roster", DB().roster.find(r=>r.unit==="H-101").phone==="713-555-0999");
  // start over / exit
  check("the demo bar offers Start over and Exit demo", !!d.getElementById("demoRestart") && !!d.getElementById("demoExit"));
  check("no page errors", errs.length===0); errs.slice(0,6).forEach(e=>console.log("   !",e));
  check("still no real network calls after the admin round", net.length===0); net.slice(0,5).forEach(n=>console.log("   !",n));
  console.log("  ("+pass+" passed, "+fail+" failed)"); process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
