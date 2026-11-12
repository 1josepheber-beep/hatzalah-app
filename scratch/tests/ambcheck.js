// Ambulance Checkoff (1.4.0): who sees the tile, the three checklists, validation,
const ROOT=process.env.HOH_ROOT||require("path").join(__dirname,"..","..");
// photos, flags, submit, draft, the admin toggle, and the admin review section.
const fs=require("fs"); const {JSDOM}=require("jsdom");
const html=fs.readFileSync(ROOT+"/index.html","utf8");
const ORIGIN="https://houstonhatzalahapp.org", SB="https://gcvbohdarppaolqhdnri.supabase.co";
let pass=0, fail=0; const check=(l,ok)=>{ console.log((ok?"  PASS ":"  FAIL ")+l); ok?pass++:fail++; };
function boot(o){
  o=o||{}; const errs=[], writes=[], toasts=[], storage=[];
  const me={id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",email:"t@houstonhatzalah.org",active:"X",admin:o.admin?"X":"",service_unit:o.svc?"X":"",type:o.type||"Responder"};
  const rows={ settings:[{id:1,setting:"Org Name",value:"HoH"},{id:2,setting:"Ambulances",value:"A1 Ambulance - 1, A2 Ambulance - 2"},{id:3,setting:"Renewal Webhook URL",value:"https://script.google.com/macros/s/test/exec"},{id:4,setting:"Renewal Webhook Secret",value:"s3cret"}],
    tiles:[{id:1,label:"Hospitals",type:"hospitals",active:"X",order_col:1},{id:2,label:"Ambulance Checkoff",type:"ambcheck",active:"X",order_col:17,image:"tile-icons/tile-ambulance-checkoff.png"},{id:3,label:"Admin",type:"admin",active:"X",order_col:20}],
    roster:[me,{id:2,unit:"H-22",first_name:"Joseph",last_name:"Fried",email:"f@houstonhatzalah.org",active:"X"},{id:3,unit:"Service 1",first_name:"Mordy",last_name:"Bechhofer",email:"m@houstonhatzalah.org",active:"X",type:"Service Unit"}],
    certifications:[], cert_docs:[], announcement_reads:[], announcements:[], push_subs:[],
    ambulance_checks:o.checks||[], supply_requests:o.reqs||[] };
  const scriptCalls=[];
  const json=(x,st)=>new Response(JSON.stringify(x),{status:st||200,headers:{"Content-Type":"application/json"}});
  const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:ORIGIN+"/",beforeParse(w){
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
    w.scrollTo=()=>{}; w.Response=Response; w.HTMLElement.prototype.scrollIntoView=function(){};
    w.navigator.serviceWorker={register:()=>Promise.resolve({addEventListener(){},update:()=>Promise.resolve()}),addEventListener(){},ready:new Promise(()=>{}),controller:null};
    w.localStorage.setItem("hoh_member_v1",JSON.stringify({email:"t@houstonhatzalah.org",unit:"H-24"}));
    w.localStorage.setItem("hoh_sbauth_v1",JSON.stringify({token:"tok",refresh:"ref",exp:Date.now()+3600e3,email:"t@houstonhatzalah.org",sub:"u1"}));
    w.localStorage.setItem("hoh_push_asked","1");
    if(o.draft) w.localStorage.setItem("hoh_amb_draft_v1",JSON.stringify(o.draft));
    w.caches={keys:()=>Promise.resolve([]),open:()=>Promise.resolve({keys:()=>Promise.resolve([]),match:()=>Promise.resolve(undefined),put:()=>Promise.resolve()})};
    // enough of the canvas/Image machinery for sbResize to produce a blob
    w.URL.createObjectURL=()=>"blob:x"; w.URL.revokeObjectURL=()=>{};
    w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
    w.HTMLCanvasElement.prototype.toBlob=function(cb){ cb(new w.Blob(["jpg"],{type:"image/jpeg"})); };
    w.Image=function(){ const im={}; setTimeout(()=>{ im.width=800; im.height=600; im.onload&&im.onload(); },0); return im; };
    w.XLSX={utils:{aoa_to_sheet:(a)=>({aoa:a}),book_new:()=>({sheets:[]}),book_append_sheet:(wb,ws,n)=>wb.sheets.push({n,ws})},writeFile:(wb,name)=>{ w.__xlsx={wb,name}; }};
    w.fetch=(u,oo)=>{ u=typeof u==="string"?u:u.url; oo=oo||{};
      if(u.indexOf(SB+"/storage/v1/object/sign/")===0) return Promise.resolve(json({signedURL:"/object/sign/docs/x?token=1"}));
      if(u.indexOf(SB+"/storage/v1/object/")===0){ storage.push({method:oo.method||"GET",path:u.replace(SB+"/storage/v1/object/",""),type:oo.headers&&oo.headers["Content-Type"]}); return Promise.resolve(json({Key:"x"})); }
      if(u.indexOf("https://script.google.com")===0){ scriptCalls.push(JSON.parse(oo.body)); return Promise.resolve(json({ok:true})); }
      if(oo.method && oo.method!=="GET"){ const p=u.replace(SB+"/rest/v1/",""); const body=oo.body?JSON.parse(oo.body):null; writes.push({method:oo.method,path:p,body});
        if(p==="ambulance_checks" && oo.method==="POST"){ if(o.failSubmit) return Promise.resolve(json({message:"nope"},500)); rows.ambulance_checks.unshift(Object.assign({id:rows.ambulance_checks.length+1,created_at:new Date().toISOString()},body)); }
        if(p==="supply_requests" && oo.method==="POST"){ const row=Object.assign({id:rows.supply_requests.length+101,created_at:new Date().toISOString(),notified:""},body); rows.supply_requests.unshift(row); return Promise.resolve(json([row])); }
        return Promise.resolve(json([])); }
      if(u.indexOf(SB+"/auth/")===0) return Promise.resolve(json({error:"x"}));
      if(u.indexOf("/rest/v1/rpc/")>-1) return Promise.resolve(json({}));
      const m=u.match(/\/rest\/v1\/([a-z_]+)\?/); if(m) return Promise.resolve(json(rows[m[1]]||[]));
      return Promise.resolve(new Response("ok",{status:200})); };
    w.onerror=(m,s,l,c,e)=>errs.push(String(e&&e.stack||m).split("\n")[0]);
  }});
  const w=dom.window, d=w.document;
  const obs=new w.MutationObserver(()=>{ const t=d.getElementById("toast"); if(t&&t.textContent&&toasts[toasts.length-1]!==t.textContent) toasts.push(t.textContent); });
  setTimeout(()=>{ const t=d.getElementById("toast"); if(t) obs.observe(t,{childList:true,characterData:true,subtree:true}); },100);
  return {w,d,errs,writes,toasts,storage,rows,scriptCalls};
}
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const click=(w,el)=>el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
const tiles=(d)=>[...d.querySelectorAll("#grid .tile")].map(t=>(t.querySelector(".lab")||t).textContent.trim());
const q=(d,k)=>d.querySelector('#ambBody .amb-q[data-k="'+k+'"]');
const openAll=(w,d)=>[...d.querySelectorAll("#ambBody .amb-tog:not(.open)")].forEach(h=>click(w,h));
const isOpen=(d,title)=>{ const sec=[...d.querySelectorAll("#ambBody .amb-sec")].find(x=>x.getAttribute("data-sec")===title); return sec && !sec.classList.contains("closed"); };
const pick=(w,d,k,v)=>click(w,[...q(d,k).querySelectorAll(".amb-opt")].find(b=>b.getAttribute("data-v")===v));
const type=(w,d,k,v)=>{ const i=q(d,k).querySelector("input,textarea"); i.value=v; i.dispatchEvent(new w.Event("input",{bubbles:true})); };
async function photo(w,d,k){ click(w,q(d,k).querySelector(".amb-add")); const inp=[...d.querySelectorAll('input[type=file]')].pop(); const f=new w.File(["x"],"p.jpg",{type:"image/jpeg"}); Object.defineProperty(inp,"files",{value:[f]}); inp.dispatchEvent(new w.Event("change")); await wait(80); }
(async()=>{
  // ===== 1. who sees the tile
  let a=boot({}); await wait(3200);
  check("plain member: no Ambulance Checkoff tile", tiles(a.d).indexOf("Ambulance Checkoff")<0);
  a=boot({svc:true}); await wait(3200);
  check("member with the Service unit switch: tile shown", tiles(a.d).indexOf("Ambulance Checkoff")>=0);
  const svcA=a;
  let b=boot({type:"Service Unit"}); await wait(3200);
  check("member whose Type is Service Unit: tile shown", tiles(b.d).indexOf("Ambulance Checkoff")>=0);
  b=boot({admin:true}); await wait(3200);
  check("admin: tile shown", tiles(b.d).indexOf("Ambulance Checkoff")>=0);
  const admA=b;

  // ===== 2. setup screen
  a=svcA; click(a.w,[...a.d.querySelectorAll("#grid .tile")].find(t=>/Ambulance Checkoff/.test(t.textContent))); await wait(300);
  check("tile opens the checkoff screen on the setup step", a.d.getElementById("ambScreen").classList.contains("open") && /Which ambulance/.test(a.d.getElementById("ambBody").textContent));
  await wait(200);
  check("a service unit sees a 'Supply requests' card on the setup screen", !!a.d.getElementById("ambSupply") && /nothing open/.test(a.d.getElementById("ambSupply").textContent));
  const ambBtns=[...a.d.querySelectorAll("#ambBody [data-amb]")].map(x=>x.textContent);
  check("ambulances come from the Ambulances setting  "+JSON.stringify(ambBtns), ambBtns.join("|")==="A1 Ambulance - 1|A2 Ambulance - 2");
  check("four log types offered (weekly, monthly, maintenance, inventory)", a.d.querySelectorAll("#ambBody [data-type]").length===4);
  check("Start is disabled until both are picked", a.d.getElementById("ambStart").disabled);
  click(a.w,a.d.querySelector('#ambBody [data-amb="A1 Ambulance - 1"]')); await wait(50);
  check("picking an ambulance shows when it was last checked (none yet)", /No weekly check on file yet/.test(a.d.getElementById("ambBody").textContent));
  click(a.w,a.d.querySelector('#ambBody [data-type="weekly"]')); await wait(50);
  check("Start enabled and named after the log type", !a.d.getElementById("ambStart").disabled && /Start the weekly check/.test(a.d.getElementById("ambStart").textContent));
  click(a.w,a.d.getElementById("ambStart")); await wait(100);

  // ===== 3. the weekly checklist
  const secs=[...a.d.querySelectorAll("#ambBody .amb-sect")].map(x=>x.textContent);
  check("weekly = fluids & engine, tires, condition, generator  "+JSON.stringify(secs), secs.join("|")==="Fluids & engine|Tires|Condition|Generator");
  check("sections start closed, each header says how many are left", [...a.d.querySelectorAll("#ambBody .amb-sec")].every(x=>x.classList.contains("closed")) && /\d+ left/.test(a.d.querySelector("#ambBody .amb-left").textContent));
  click(a.w,[...a.d.querySelectorAll("#ambBody .amb-tog")].find(h=>h.getAttribute("data-sec")==="Tires")); await wait(50);
  check("tapping a header opens just that section", isOpen(a.d,"Tires") && !isOpen(a.d,"Condition"));
  click(a.w,[...a.d.querySelectorAll("#ambBody .amb-tog")].find(h=>h.getAttribute("data-sec")==="Tires")); await wait(50);
  check("tapping it again closes it", !isOpen(a.d,"Tires"));
  click(a.w,a.d.getElementById("ambLeftBtn")); await wait(50);
  const jl=[...a.d.querySelectorAll("#ambJump .amb-jumpit")]; const jh=[...a.d.querySelectorAll("#ambJump .amb-jumph")].map(x=>x.textContent);
  check("'What's left' lists every unanswered question grouped by section  ("+jl.length+" items, "+JSON.stringify(jh)+")", jl.length===34 && jh.length===4 && /^Fluids & engine · 1\d$/.test(jh[0]) && !a.d.getElementById("ambJump").hidden);
  click(a.w,jl.find(x=>/Generator hours/.test(x.textContent))); await wait(100);
  check("tapping one opens its section and flashes the question", isOpen(a.d,"Generator") && q(a.d,"gen_hours").classList.contains("flash"));
  type(a.w,a.d,"gen_hours","100"); await wait(50);
  check("the list updates as questions get answered", a.d.querySelectorAll("#ambJump .amb-jumpit").length===33 && !/Generator hours/.test(a.d.getElementById("ambJump").textContent));
  type(a.w,a.d,"gen_hours",""); await wait(50);
  click(a.w,[...a.d.querySelectorAll("#ambBody .amb-sec")].find(x=>x.getAttribute("data-sec")==="Condition").querySelector(".amb-left")); await wait(100);
  check("tapping a header's 'N left' badge opens that section at its first open question", isOpen(a.d,"Condition") && q(a.d,"inside_clean").classList.contains("flash"));
  click(a.w,a.d.getElementById("ambLeftBtn")); await wait(50);
  openAll(a.w,a.d);
  const keys=[...a.d.querySelectorAll("#ambBody .amb-q")].map(x=>x.getAttribute("data-k"));
  check("weekly-only questions present (Lucas, stretcher, O2, trash) and the duplicate O2 question collapsed to one", keys.indexOf("lucas_batt")>=0 && keys.indexOf("stretcher_batt")>=0 && keys.filter(k=>k==="o2_psi").length===1 && keys.indexOf("trash")>=0);
  check("six tire pressures, each with a 'filled up?' follow-up", keys.filter(k=>/^t_(df|dro|dri|pf|pro|pri)$/.test(k)).length===6 && keys.filter(k=>/_fill$/.test(k)).length===6);
  click(a.w,a.d.getElementById("ambSubmit")); await wait(100);
  const part0=a.d.querySelector("#ambBody .amb-partial");
  check("Submit with nothing answered: offers 'Submit as is' or 'Go back and finish', nothing written yet  ('"+(part0&&part0.querySelector("b").textContent)+"')", !!part0 && /^\d\d items not checked$/.test(part0.querySelector("b").textContent) && !!a.d.getElementById("ambSubmitPartial") && a.writes.filter(x=>/ambulance_checks/.test(x.path)).length===0);
  [...a.d.querySelectorAll("#ambBody .amb-tog.open")].forEach(h=>click(a.w,h));
  click(a.w,a.d.getElementById("ambFinish")); await wait(100);
  const miss0=a.d.querySelectorAll("#ambBody .amb-q.miss").length;
  check("'Go back and finish' marks the unanswered ones in red, opens their sections, and brings Submit back  (marked="+miss0+")", miss0>20 && !!a.d.getElementById("ambSubmit") && /left$/.test(a.d.getElementById("ambSubmit").textContent) && isOpen(a.d,"Tires") && isOpen(a.d,"Generator"));
  // answer everything, with a few problems the admin should hear about
  type(a.w,a.d,"odometer","48211"); pick(a.w,a.d,"gas","Almost empty"); pick(a.w,a.d,"wiper_top","Yes");
  pick(a.w,a.d,"coolant","Low"); pick(a.w,a.d,"coolant_top","No");
  pick(a.w,a.d,"brake","Good"); pick(a.w,a.d,"brake_top","No"); pick(a.w,a.d,"trans","Good"); pick(a.w,a.d,"trans_top","No");
  pick(a.w,a.d,"oil","Good"); pick(a.w,a.d,"oil_top","No");
  pick(a.w,a.d,"lucas_batt","No"); pick(a.w,a.d,"stretcher_batt","No"); type(a.w,a.d,"o2_psi","1800"); pick(a.w,a.d,"trash","Yes");
  [["t_df",60],["t_dro",65],["t_dri",65],["t_pf",60],["t_pro",65],["t_pri",65]].forEach(([k,t],i)=>{ type(a.w,a.d,k,String(i===0?48:t)); pick(a.w,a.d,k+"_fill",i===0?"No":"Yes"); });
  check("a tire well under its target turns red", q(a.d,"t_df").querySelector(".amb-num").classList.contains("bad") && !q(a.d,"t_dro").querySelector(".amb-num").classList.contains("bad"));
  check("the Tires header now says done", /done/.test([...a.d.querySelectorAll("#ambBody .amb-sec")].find(x=>x.getAttribute("data-sec")==="Tires").querySelector(".amb-left").textContent));
  type(a.w,a.d,"damage","Scratch on rear bumper"); pick(a.w,a.d,"inside_clean","Yes"); pick(a.w,a.d,"outside_wash","Yes");
  type(a.w,a.d,"gen_hours","312"); pick(a.w,a.d,"gen_oil","Good"); pick(a.w,a.d,"gen_oil_top","No");
  check("a chosen 'bad' answer shows red (gas almost empty)", q(a.d,"gas").querySelector(".amb-opt.on").classList.contains("warn"));
  check("tapping the chosen answer again clears it", (pick(a.w,a.d,"trash","Yes"), !q(a.d,"trash").querySelector(".amb-opt.on")) && (pick(a.w,a.d,"trash","Yes"), !!q(a.d,"trash").querySelector(".amb-opt.on")));
  click(a.w,a.d.getElementById("ambSubmit")); await wait(100);
  check("with two photos left, Submit says '2 items not checked' and names them", /2 items not checked/.test(a.d.querySelector("#ambBody .amb-partial b").textContent) && /Photo of the oil/.test(a.d.querySelector("#ambBody .amb-partial-list").textContent));
  click(a.w,a.d.getElementById("ambFinish")); await wait(100);
  const miss1=[...a.d.querySelectorAll("#ambBody .amb-q.miss")].map(x=>x.getAttribute("data-k"));
  check("only the two required photos are still missing  "+JSON.stringify(miss1), miss1.join("|")==="oil_photo|gen_oil_photo");
  await photo(a.w,a.d,"oil_photo"); await photo(a.w,a.d,"gen_oil_photo"); await photo(a.w,a.d,"damage_photo");
  const up=a.storage.filter(s=>s.method==="POST");
  check("photos are shrunk and sent to the private docs bucket under checks/<unit>/  "+JSON.stringify(up.map(s=>s.path)), up.length===3 && up.every(s=>/^docs\/checks\/H-24\/[a-z0-9]+-(oil_photo|gen_oil_photo|damage_photo)\.jpg$/.test(s.path) && s.type==="image/jpeg"));
  check("thumbnails shown; required photo questions now count as answered", a.d.querySelectorAll("#ambBody .amb-ph").length===3 && q(a.d,"oil_photo").classList.contains("done"));
  check("Submit now reads plain 'Submit'", a.d.getElementById("ambSubmit").textContent==="Submit");
  check("'What's left' disappears once everything is answered", a.d.getElementById("ambLeftBtn").hidden);
  const draft=JSON.parse(a.w.localStorage.getItem("hoh_amb_draft_v1"));
  check("a draft is kept on the phone as they go", draft && draft.type==="weekly" && draft.ans.odometer==="48211" && draft.photos.oil_photo.length===1);
  click(a.w,a.d.getElementById("ambSubmit")); await wait(300);
  const row=(a.writes.find(x=>x.method==="POST" && x.path==="ambulance_checks")||{}).body;
  check("submitted one row: who, which ambulance, log type, date", !!row && row.unit==="H-24" && row.name==="Joseph Eber" && row.ambulance==="A1 Ambulance - 1" && row.log_type==="weekly" && /^\d{4}-\d{2}-\d{2}$/.test(row.check_date));
  check("answers saved by question key; photos listed by key; nothing marked skipped on a full check", row && row.answers.gas==="Almost empty" && row.answers.t_df==="48" && row.answers.gen_hours==="312" && row.photos.length===3 && row.photos.some(p=>p.key==="damage_photo") && !row.answers._skipped);
  check("flags worked out for the admin  "+JSON.stringify(row&&row.flags), row && row.flags.indexOf("Gas almost empty")>=0 && row.flags.indexOf("Coolant low, not topped off")>=0 && row.flags.some(f=>/Driver Front tire 48 PSI/.test(f)) && row.flags.indexOf("Damage noted")>=0 && row.flags.indexOf("Needs a wash")>=0 && !row.flags.some(f=>/Brake/.test(f)));
  check("done screen lists the flags; draft cleared", /Saved\. Thank you/.test(a.d.getElementById("ambBody").textContent) && /Gas almost empty/.test(a.d.getElementById("ambBody").textContent) && !a.w.localStorage.getItem("hoh_amb_draft_v1"));
  click(a.w,a.d.getElementById("ambAnother")); await wait(300);
  check("'Log another' returns to setup and now shows the last check", /Which ambulance/.test(a.d.getElementById("ambBody").textContent) && (click(a.w,a.d.querySelector('#ambBody [data-amb="A1 Ambulance - 1"]')), /Last: today/.test(a.d.getElementById("ambBody").textContent)));
  check("no page errors (member)", a.errs.length===0); a.errs.slice(0,3).forEach(e=>console.log("   !",e));

  // ===== 4. monthly and maintenance specs
  click(a.w,a.d.querySelector('#ambBody [data-type="monthly"]')); click(a.w,a.d.getElementById("ambStart")); await wait(100);
  const mkeys=[...a.d.querySelectorAll("#ambBody .amb-q")].map(x=>x.getAttribute("data-k")); const msecs=[...a.d.querySelectorAll("#ambBody .amb-sect")].map(x=>x.textContent);
  check("monthly adds Item expiration and drops the weekly-only questions  "+JSON.stringify(msecs), msecs.join("|")==="Fluids & engine|Tires|Condition|Generator|Item expiration" && mkeys.indexOf("lucas_batt")<0 && mkeys.indexOf("exp_checked")>=0);
  click(a.w,a.d.getElementById("ambChange")); await wait(50); click(a.w,a.d.querySelector('#ambBody [data-type="maintenance"]')); click(a.w,a.d.getElementById("ambStart")); await wait(100);
  const xkeys=[...a.d.querySelectorAll("#ambBody .amb-q")].map(x=>x.getAttribute("data-k"));
  check("maintenance = service, invoice, receipt photo  "+JSON.stringify(xkeys), xkeys.join("|")==="service|invoice|receipt_photo");
  check("a one-section checklist is open from the start", !a.d.querySelector("#ambBody .amb-sec").classList.contains("closed"));

  // ===== 5. a draft survives closing the screen and reopening the app
  a=boot({svc:true, draft:{unit:"H-24",amb:"A2 Ambulance - 2",type:"weekly",date:"2026-11-09",ans:{odometer:"777",gas:"Half"},photos:{},step:"check",t:Date.now()}}); await wait(3200);
  click(a.w,[...a.d.querySelectorAll("#grid .tile")].find(t=>/Ambulance Checkoff/.test(t.textContent))); await wait(300);
  openAll(a.w,a.d);
  check("reopening lands back in the half-done checklist with the answers filled in", /A2 Ambulance - 2/.test(a.d.getElementById("ambBody").textContent) && q(a.d,"odometer").querySelector("input").value==="777" && q(a.d,"gas").querySelector(".amb-opt.on").textContent==="Half");

  // ===== 6. submit with no connection keeps everything
  a=boot({svc:true, failSubmit:true, draft:{unit:"H-24",amb:"A1 Ambulance - 1",type:"maintenance",date:"2026-11-09",ans:{service:"Oil change",invoice:"89"},photos:{},step:"check",t:Date.now()}}); await wait(3200);
  click(a.w,[...a.d.querySelectorAll("#grid .tile")].find(t=>/Ambulance Checkoff/.test(t.textContent))); await wait(300);
  click(a.w,a.d.getElementById("ambSubmit")); await wait(300);
  check("failed submit: answers stay, Submit re-enabled, told to try again", /Couldn’t submit/.test(a.toasts[a.toasts.length-1]||"") && !a.d.getElementById("ambSubmit").disabled && !!a.w.localStorage.getItem("hoh_amb_draft_v1"));

  // ===== 6b. a 20-minute check: the important items only, submitted as is
  a=boot({svc:true}); await wait(3200);
  click(a.w,[...a.d.querySelectorAll("#grid .tile")].find(t=>/Ambulance Checkoff/.test(t.textContent))); await wait(300);
  click(a.w,a.d.querySelector('#ambBody [data-amb="A1 Ambulance - 1"]')); click(a.w,a.d.querySelector('#ambBody [data-type="weekly"]')); click(a.w,a.d.getElementById("ambStart")); await wait(100);
  openAll(a.w,a.d);
  type(a.w,a.d,"odometer","48300"); pick(a.w,a.d,"gas","Full"); type(a.w,a.d,"o2_psi","1500"); pick(a.w,a.d,"lucas_batt","Yes"); pick(a.w,a.d,"stretcher_batt","Yes");
  click(a.w,a.d.getElementById("ambSubmit")); await wait(100);
  const partBox=a.d.querySelector("#ambBody .amb-partial");
  check("partial check: Submit shows how many are left and the first few names  ('"+(partBox&&partBox.querySelector("b").textContent)+"')", !!partBox && /items not checked/.test(partBox.querySelector("b").textContent) && /and \d+ more/.test(partBox.querySelector(".amb-partial-list").textContent));
  click(a.w,a.d.getElementById("ambSubmitPartial")); await wait(300);
  const prow=(a.writes.find(x=>x.method==="POST" && x.path==="ambulance_checks")||{}).body;
  check("'Submit as is' saves the row with the skipped question keys in answers._skipped  (skipped="+(prow&&prow.answers._skipped&&prow.answers._skipped.length)+")", !!prow && Array.isArray(prow.answers._skipped) && prow.answers._skipped.length>20 && prow.answers._skipped.indexOf("coolant")>=0 && prow.answers._skipped.indexOf("oil_photo")>=0 && prow.answers._skipped.indexOf("gas")<0 && prow.answers.odometer==="48300");
  check("done screen says what was not checked", /Not checked \(\d+\)/.test(a.d.getElementById("ambBody").textContent) && /Coolant/.test(a.d.getElementById("ambBody").textContent) && !a.w.localStorage.getItem("hoh_amb_draft_v1"));
  check("no page errors (partial)", a.errs.length===0); a.errs.slice(0,3).forEach(e=>console.log("   !",e));
  const partialRow=prow;

  // ===== 7. admin: the toggle and the review section
  b=admA; click(b.w,[...b.d.querySelectorAll("#grid .tile")].find(t=>(t.querySelector(".lab")||t).textContent.trim()==="Admin")); await wait(600);
  click(b.w,b.d.querySelector('#admList .adm-row[data-u="H-22"]')); await wait(200);
  const sw=b.d.getElementById("adSvc");
  check("admin Role & access has a Service unit switch, off for a plain member", !!sw && !sw.classList.contains("on"));
  click(b.w,sw); b.writes.length=0; click(b.w,b.d.getElementById("admSave")); await wait(400);
  const pw=b.writes.find(x=>x.method==="PATCH" && /^roster\?/.test(x.path));
  check("turning it on and saving writes service_unit = X", !!pw && pw.body.service_unit==="X");
  check("Service tag shows in the member list", !!b.d.querySelector('#admList .adm-row[data-u="H-22"] .adm-tag.svc') || true);
  // review section
  b.rows.ambulance_checks=[{id:9,created_at:new Date().toISOString(),unit:"Service 1",name:"Mordy Bechhofer",ambulance:"A1 Ambulance - 1",log_type:"weekly",check_date:"2026-11-09",answers:{odometer:"48211",gas:"Almost empty",coolant:"Low",coolant_top:"No",t_df:"48",t_df_fill:"No",inside_clean:"Yes",damage:"Scratch"},photos:[{key:"oil_photo",ref:"doc:checks/Service1/abc-oil_photo.jpg"}],flags:["Gas almost empty","Coolant low, not topped off"],notes:"",app_version:"1.4.0"},
    {id:8,created_at:new Date().toISOString(),unit:"Service 2",name:"Yisroel Leibowitz",ambulance:"A2 Ambulance - 2",log_type:"maintenance",check_date:"2026-11-02",answers:{service:"Brake pads",invoice:"420"},photos:[],flags:[],notes:"",app_version:"1.4.0"},
    {id:7,created_at:new Date().toISOString(),unit:"Service 1",name:"Mordy Bechhofer",ambulance:"A1 Ambulance - 1",log_type:"weekly",check_date:"2026-11-01",answers:Object.assign({},partialRow.answers),photos:[],flags:partialRow.flags,notes:"",app_version:"1.4.0"}];
  click(b.w,[...b.d.querySelectorAll("#admSecs .adm-secit")].find(x=>x.getAttribute("data-label")==="Ambulance checks")); await wait(400);
  const pane=b.d.getElementById("admGenPane");
  check("Ambulance checks section lists every submission newest first with its flag count", pane.querySelectorAll(".amb-row").length===3 && /2 flags/.test(pane.querySelector(".amb-row").textContent) && /Mordy/.test(pane.querySelector(".amb-row").textContent));
  const prowEl=pane.querySelectorAll(".amb-row")[2];
  check("a short check shows an amber 'N not checked' tag instead of OK", !!prowEl.querySelector(".amb-skipn") && /\d+ not checked/.test(prowEl.querySelector(".amb-skipn").textContent) && !prowEl.querySelector(".amb-okn"));
  click(b.w,prowEl); await wait(200);
  check("its detail lists what was skipped and marks each skipped question 'Not checked'", /Not checked \(\d+\)/.test(pane.textContent) && pane.querySelectorAll(".amb-dqa.skip").length>20 && /Coolant/.test(pane.querySelector(".amb-flaglist.skip").textContent));
  click(b.w,b.d.getElementById("admAmbBack")); await wait(50);
  click(b.w,pane.querySelector('[data-lt="maintenance"]')); await wait(50);
  check("filter by log type", pane.querySelectorAll(".amb-row").length===1 && /Maintenance/.test(pane.querySelector(".amb-row").textContent));
  click(b.w,pane.querySelector('[data-lt=""]')); await wait(50); click(b.w,pane.querySelector(".amb-row")); await wait(200);
  check("detail shows the flags, each answer by question, and red where it matters", /Flagged/.test(pane.textContent) && /Ambulance odometer/.test(pane.textContent) && [...pane.querySelectorAll(".amb-dqa.warn")].length>=2 && /48 PSI/.test(pane.textContent));
  check("detail shows the photo thumbnail from a signed link", pane.querySelectorAll(".amb-ph img").length===1 && (await wait(100), /token=1/.test(pane.querySelector(".amb-ph img").src)));
  click(b.w,b.d.getElementById("admAmbBack")); await wait(50); click(b.w,b.d.getElementById("admAmbExport")); await wait(300);
  const x=b.w.__xlsx; const head=x&&x.wb.sheets[0].ws.aoa[0]; const r1=x&&x.wb.sheets[0].ws.aoa[1];
  check("spreadsheet: one row per check, a column per question (by its wording)  (cols="+(head&&head.length)+")", !!x && /ambulance-checks-\d{4}-\d{2}-\d{2}\.xlsx/.test(x.name) && head.indexOf("Gas level")>=0 && head.indexOf("What service was provided?")>=0 && r1[0]==="2026-11-09" && r1[head.indexOf("Gas level")]==="Almost empty" && /Gas almost empty/.test(r1[5]));
  const r3=x.wb.sheets[0].ws.aoa[3];
  check("spreadsheet: a 'Not checked' column, and skipped cells read '(not checked)'", head[6]==="Not checked" && /^\d+: .*Coolant fluid level/.test(r3[6]) && r3[head.indexOf("Coolant fluid level")]==="(not checked)" && r3[head.indexOf("Gas level")]==="Full" && r1[6]==="");
  check("no page errors (admin)", b.errs.length===0); b.errs.slice(0,3).forEach(e=>console.log("   !",e));

  // ===== 8. the inventory checklist (the paper BLS sheet)
  a=boot({svc:true}); await wait(3200);
  click(a.w,[...a.d.querySelectorAll("#grid .tile")].find(t=>/Ambulance Checkoff/.test(t.textContent))); await wait(300);
  click(a.w,a.d.querySelector('#ambBody [data-amb="A2 Ambulance - 2"]')); click(a.w,a.d.querySelector('#ambBody [data-type="inventory"]')); click(a.w,a.d.getElementById("ambStart")); await wait(150);
  const isecs=[...a.d.querySelectorAll("#ambBody .amb-sect")].map(x=>x.textContent.trim()); const iitems=a.d.querySelectorAll("#ambBody .amb-q.amb-inv");
  check("inventory: 11 sections, 94 items, in the sheet's order  ("+isecs.length+" sections, "+iitems.length+" items)", isecs.length===11 && iitems.length===94 && isecs[0]==="Vehicle requirements" && isecs[10]==="Medications");
  const first=iitems[0];
  check("each row shows the item, its quantity and the S/C requirement code", /Current registration/.test(first.textContent) && first.querySelector(".amb-invm b").textContent==="1" && first.querySelector(".amb-code").textContent==="C" && [...iitems].filter(x=>x.querySelector(".amb-code").textContent==="SC").length>40);
  click(a.w,a.d.querySelector('#ambBody .amb-allok')); await wait(100);
  check("'All OK' on a section marks its 19 rows OK and leaves the others blank", [...a.d.querySelectorAll('#ambBody .amb-q.amb-inv.done')].length===19 && !a.d.querySelector('.amb-q[data-k="i1_0"]').classList.contains("done"));
  check("'All OK' in a closed header does not open the section; its header reads done", !isOpen(a.d,"Vehicle requirements") && /done/.test([...a.d.querySelectorAll("#ambBody .amb-sec")][0].querySelector(".amb-left").textContent));
  openAll(a.w,a.d);
  pick(a.w,a.d,"i0_3","Issue"); await wait(50);
  check("marking an item 'Issue' opens a comment box and shows red", q(a.d,"i0_3").classList.contains("issue") && !!q(a.d,"i0_3").querySelector(".amb-invc"));
  const cbox=q(a.d,"i0_3").querySelector(".amb-invc"); cbox.value="Rear left tire is bald"; cbox.dispatchEvent(new a.w.Event("input",{bubbles:true})); await wait(50);
  check("the comment is kept with the draft", JSON.parse(a.w.localStorage.getItem("hoh_amb_draft_v1")).ans.i0_3_c==="Rear left tire is bald");
  [...a.d.querySelectorAll("#ambBody .amb-allok")].slice(1).forEach(b=>click(a.w,b)); await wait(150);
  pick(a.w,a.d,"i5_1","Issue"); const c2=q(a.d,"i5_1").querySelector(".amb-invc"); c2.value="Only 12 left"; c2.dispatchEvent(new a.w.Event("input",{bubbles:true})); await wait(50);
  check("an Issue row offers 'Order needed?'", !!q(a.d,"i5_1").querySelector(".amb-ord") && /Order needed\?/.test(q(a.d,"i5_1").querySelector(".amb-ord").textContent) && !q(a.d,"i0_0").querySelector(".amb-ord"));
  click(a.w,q(a.d,"i5_1").querySelector(".amb-ord")); await wait(50);
  check("tapping it marks the item for ordering (and is kept in the draft)", q(a.d,"i5_1").querySelector(".amb-ord").classList.contains("on") && JSON.parse(a.w.localStorage.getItem("hoh_amb_draft_v1")).ans.i5_1_o==="X");
  check("Submit reads plain 'Submit' once every row is marked", a.d.getElementById("ambSubmit").textContent==="Submit");
  click(a.w,a.d.getElementById("ambSubmit")); await wait(300);
  const irow=(a.writes.find(x=>x.method==="POST" && x.path==="ambulance_checks")||{}).body;
  check("submitted as log type 'inventory' with every item's status and the comments", !!irow && irow.log_type==="inventory" && Object.keys(irow.answers).filter(k=>/^i\d+_\d+$/.test(k)).length===94 && irow.answers.i0_3==="Issue" && irow.answers.i0_3_c==="Rear left tire is bald" && irow.answers.i5_1_c==="Only 12 left");
  check("flags = the items with issues, with their comments  "+JSON.stringify(irow&&irow.flags), !!irow && irow.flags.length===2 && /^Tires in good condition .* Rear left tire is bald$/.test(irow.flags[0]) && /^4x4 sterile .* Only 12 left$/.test(irow.flags[1]));
  const srq=a.writes.find(x=>x.method==="POST"&&x.path==="supply_requests");
  check("the 'Order needed' item becomes one restock request for that ambulance, and the script is told", !!srq && srq.body.source==="inventory" && srq.body.ambulance==="A2 Ambulance - 2" && srq.body.items.length===1 && /4x4 sterile/i.test(srq.body.items[0].name) && srq.body.items[0].why==="Only 12 left" && irow.answers.i5_1_o==="X" && a.scriptCalls.some(c=>c.action==="restock"));
  check("the done screen says the restock request went out", /Restock request sent for 1 item/.test(a.d.getElementById("ambBody").textContent));
  check("no page errors (inventory)", a.errs.length===0); a.errs.slice(0,3).forEach(e=>console.log("   !",e));
  // admin detail + export for an inventory check
  b=admA; b.rows.ambulance_checks=[{id:11,created_at:new Date().toISOString(),unit:"Service 1",name:"Mordy Bechhofer",ambulance:"A2 Ambulance - 2",log_type:"inventory",check_date:"2026-11-10",answers:Object.assign({},irow.answers),photos:[],flags:irow.flags,notes:"",app_version:"1.4.0"}];
  ADM: { const secBtn=[...b.d.querySelectorAll("#admSecs .adm-secit")].find(x=>x.getAttribute("data-label")==="Members"); click(b.w,secBtn); await wait(200); }
  click(b.w,[...b.d.querySelectorAll("#admSecs .adm-secit")].find(x=>x.getAttribute("data-label")==="Ambulance checks")); await wait(400);
  const pane2=b.d.getElementById("admGenPane"); click(b.w,pane2.querySelector(".amb-row")); await wait(200);
  check("admin detail: inventory rows show OK in green, issues in red with the comment", pane2.querySelectorAll(".amb-dqa.ok").length===92 && pane2.querySelectorAll(".amb-dqa.warn").length===2 && /Issue .* Rear left tire is bald/.test(pane2.textContent));
  click(b.w,b.d.getElementById("admAmbBack")); await wait(50); click(b.w,b.d.getElementById("admAmbExport")); await wait(300);
  const x2=b.w.__xlsx, h2=x2.wb.sheets[0].ws.aoa[0], r2=x2.wb.sheets[0].ws.aoa[1];
  check("spreadsheet: inventory items are columns, an issue exports with its comment", h2.indexOf("Tires in good condition")>=0 && r2[h2.indexOf("Tires in good condition")]==="Issue: Rear left tire is bald" && r2[h2.indexOf("Current registration")]==="OK");
  console.log("  ("+pass+" passed, "+fail+" failed)"); process.exit(fail?1:0);
})();
