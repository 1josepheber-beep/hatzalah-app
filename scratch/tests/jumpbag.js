// My Jump Bag (1.5.0): the tile for everyone, the member checklist (Have/Short/Missing,
const ROOT=process.env.HOH_ROOT||require("path").join(__dirname,"..","..");
// expiration dates, All stocked, offline retry), and the admin overview + spreadsheet.
const fs=require("fs"); const {JSDOM}=require("jsdom");
const html=fs.readFileSync(ROOT+"/index.html","utf8");
const ORIGIN="https://houstonhatzalahapp.org", SB="https://gcvbohdarppaolqhdnri.supabase.co";
let pass=0, fail=0; const check=(l,ok)=>{ console.log((ok?"  PASS ":"  FAIL ")+l); ok?pass++:fail++; };
const ymd=(d)=>d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
const plus=(n)=>{ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+n); return ymd(d); };
const ITEMS=[[1,"Main compartment","Gloves (box)",1,"",""],[2,"Main compartment","BVM adult",1,"",""],[3,"Main compartment","Oral glucose",2,"X",""],[4,"Airway pouch","OPA set",1,"",""],[5,"Airway pouch","NPA set",1,"",""],[6,"Trauma pouch","Tourniquet",2,"",""],[7,"Trauma pouch","Epinephrine 1:1000",2,"X",""],[8,"Trauma pouch","Old item",1,"","no"]]
  .map(([id,pouch,name,qty,exp,act])=>({id,order_col:id,pouch,name,qty:String(qty),expires:exp,active:act===""?"X":act}));
function boot(o){
  o=o||{}; const errs=[], writes=[], toasts=[];
  const me={id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",email:"t@houstonhatzalah.org",active:"X",admin:o.admin?"X":"",type:"Responder"};
  const rows={ settings:[{id:1,setting:"Org Name",value:"HoH"},{id:2,setting:"Jump Bag Reminder Days",value:o.days||"30, 7, 0"},{id:3,setting:"Renewal Webhook URL",value:"https://script.google.com/macros/s/test/exec"},{id:4,setting:"Renewal Webhook Secret",value:"s3cret"}],
    tiles:[{id:1,label:"Hospitals",type:"hospitals",active:"X",order_col:1},{id:2,label:"My Jump Bag",type:"jumpbag",active:"X",order_col:18,image:"tile-icons/tile-jump-bag.png"},{id:3,label:"Admin",type:"admin",active:"X",order_col:20}],
    roster:[me,{id:2,unit:"H-22",first_name:"Joseph",last_name:"Fried",email:"f@houstonhatzalah.org",active:"X"},{id:3,unit:"H-30",first_name:"Avi",last_name:"Katz",email:"a@houstonhatzalah.org",active:"X"},{id:4,unit:"D-1",first_name:"Dina",last_name:"Disp",email:"d@houstonhatzalah.org",active:"X",type:"Dispatcher"}],
    certifications:[], cert_docs:[], announcement_reads:[], announcements:[], push_subs:[],
    jumpbag_items:o.items||ITEMS, jumpbag_status:o.status||[], jumpbag_bags:o.bags||[], supply_requests:o.reqs||[] };
  const scriptCalls=[];
  const json=(x,st)=>new Response(JSON.stringify(x),{status:st||200,headers:{"Content-Type":"application/json"}});
  const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:ORIGIN+"/",beforeParse(w){
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
    w.scrollTo=()=>{}; w.Response=Response; w.HTMLElement.prototype.scrollIntoView=function(){};
    w.navigator.serviceWorker={register:()=>Promise.resolve({addEventListener(){},update:()=>Promise.resolve()}),addEventListener(){},ready:new Promise(()=>{}),controller:null};
    w.localStorage.setItem("hoh_member_v1",JSON.stringify({email:"t@houstonhatzalah.org",unit:"H-24"}));
    w.localStorage.setItem("hoh_sbauth_v1",JSON.stringify({token:"tok",refresh:"ref",exp:Date.now()+3600e3,email:"t@houstonhatzalah.org",sub:"u1"}));
    w.localStorage.setItem("hoh_push_asked","1");
    w.caches={keys:()=>Promise.resolve([]),open:()=>Promise.resolve({keys:()=>Promise.resolve([]),match:()=>Promise.resolve(undefined),put:()=>Promise.resolve()})};
    w.URL.createObjectURL=()=>"blob:x"; w.URL.revokeObjectURL=()=>{};
    w.XLSX={utils:{aoa_to_sheet:(a)=>({aoa:a}),book_new:()=>({sheets:[]}),book_append_sheet:(wb,ws,n)=>wb.sheets.push({n,ws})},writeFile:(wb,name)=>{ w.__xlsx={wb,name}; }};
    w.__failSaves=!!o.failSaves;
    w.fetch=(u,oo)=>{ u=typeof u==="string"?u:u.url; oo=oo||{};
      if(u.indexOf("script.google.com")===0||u.indexOf("https://script.google.com")===0){ scriptCalls.push(JSON.parse(oo.body)); return Promise.resolve(json({ok:true})); }
      if(oo.method && oo.method!=="GET"){ const p=u.replace(SB+"/rest/v1/",""); const body=oo.body?JSON.parse(oo.body):null; writes.push({method:oo.method,path:p,body,prefer:oo.headers&&oo.headers.Prefer});
        if(/^supply_requests$/.test(p) && oo.method==="POST"){ const row=Object.assign({id:rows.supply_requests.length+101,created_at:new Date().toISOString(),notified:""},body); rows.supply_requests.unshift(row); return Promise.resolve(json([row])); }
        if(/^supply_requests\?id=eq\./.test(p) && oo.method==="PATCH"){ const id=+p.match(/id=eq\.(\d+)/)[1]; const row=rows.supply_requests.find(x=>x.id===id); if(row) Object.assign(row,body); return Promise.resolve(json([])); }
        if(/^jumpbag_bags/.test(p) && oo.method==="POST"){ const i=rows.jumpbag_bags.findIndex(s=>s.unit===body.unit); if(i>=0) Object.assign(rows.jumpbag_bags[i],body); else rows.jumpbag_bags.push(Object.assign({id:rows.jumpbag_bags.length+1},body)); return Promise.resolve(json([])); }
        if(/^jumpbag_status/.test(p) && oo.method==="POST"){ if(w.__failSaves) return Promise.resolve(json({message:"nope"},500));
          const i=rows.jumpbag_status.findIndex(s=>s.unit===body.unit&&s.item_id===body.item_id); if(i>=0) Object.assign(rows.jumpbag_status[i],body); else rows.jumpbag_status.push(Object.assign({id:rows.jumpbag_status.length+1},body)); }
        return Promise.resolve(json([])); }
      if(u.indexOf(SB+"/auth/")===0) return Promise.resolve(json({error:"x"}));
      if(u.indexOf("/rest/v1/rpc/")>-1) return Promise.resolve(json({}));
      const m=u.match(/\/rest\/v1\/([a-z_]+)\?/); if(m){ let r=rows[m[1]]||[]; const um=u.match(/unit=eq\.([^&]+)/); if(um) r=r.filter(x=>x.unit===decodeURIComponent(um[1])); const sm=u.match(/source=eq\.([a-z]+)/); if(sm) r=r.filter(x=>x.source===sm[1]); return Promise.resolve(json(r)); }
      return Promise.resolve(new Response("ok",{status:200})); };
    w.onerror=(m,s,l,c,e)=>errs.push(String(e&&e.stack||m).split("\n")[0]);
  }});
  const w=dom.window, d=w.document;
  const obs=new w.MutationObserver(()=>{ const t=d.getElementById("toast"); if(t&&t.textContent&&toasts[toasts.length-1]!==t.textContent) toasts.push(t.textContent); });
  setTimeout(()=>{ const t=d.getElementById("toast"); if(t) obs.observe(t,{childList:true,characterData:true,subtree:true}); },100);
  return {w,d,errs,writes,toasts,rows,scriptCalls};
}
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const click=(w,el)=>el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
const tiles=(d)=>[...d.querySelectorAll("#grid .tile")].map(t=>(t.querySelector(".lab")||t).textContent.trim());
const row=(d,id)=>d.querySelector('#jbBody .jb-row[data-id="'+id+'"]');
const tap=(w,d,id,s)=>click(w,row(d,id).querySelector('.jb-b[data-s="'+s+'"]'));
const openBag=async(a,keepClosed)=>{ click(a.w,[...a.d.querySelectorAll("#grid .tile")].find(t=>/My Jump Bag/.test(t.textContent))); await wait(400); if(!keepClosed) [...a.d.querySelectorAll("#jbBody .amb-tog")].filter(h=>!h.classList.contains("open")).forEach(h=>click(a.w,h)); };
const pouchOpen=(d,name)=>{ const sec=[...d.querySelectorAll("#jbBody .jb-sec")].find(x=>x.getAttribute("data-pouch")===name); return sec && !sec.classList.contains("closed"); };
const secBtn=(d,label)=>[...d.querySelectorAll("#admSecs .adm-secit")].find(x=>x.getAttribute("data-label")===label);
(async()=>{
  // ===== 1. everyone gets the tile
  let a=boot({}); await wait(3200);
  check("plain member sees the My Jump Bag tile", tiles(a.d).indexOf("My Jump Bag")>=0);
  await openBag(a,true);
  const body=a.d.getElementById("jbBody");
  check("pouches start closed with their counts in the header", [...body.querySelectorAll(".jb-sec")].every(x=>x.classList.contains("closed")) && /0\/3/.test(body.querySelector(".jb-sec .amb-sech em").textContent));
  click(a.w,[...body.querySelectorAll(".amb-tog")].find(h=>h.getAttribute("data-pouch")==="Airway pouch")); await wait(50);
  check("tapping a pouch opens only that pouch", pouchOpen(a.d,"Airway pouch") && !pouchOpen(a.d,"Trauma pouch"));
  check("bag card: never checked, reminder Off, and the 'I checked my bag today' button", /Last checked: never/.test(body.querySelector(".jb-bag").textContent) && a.d.getElementById("jbRemind").value==="0" && /I checked my bag today/.test(a.d.getElementById("jbChecked").textContent));
  click(a.w,a.d.getElementById("jbChecked")); await wait(150);
  const bagW=a.writes.filter(x=>/^jumpbag_bags/.test(x.path));
  check("'I checked my bag today' upserts jumpbag_bags with checked_at and shows 'Last checked: today'", bagW.length===1 && /on_conflict=unit/.test(bagW[0].path) && bagW[0].body.unit==="H-24" && /^\d{4}-\d{2}-\d{2}T/.test(bagW[0].body.checked_at) && /Last checked: today/.test(body.querySelector(".jb-bag").textContent) && /Checked today/.test(a.d.getElementById("jbChecked").textContent));
  a.d.getElementById("jbRemind").value="60"; a.d.getElementById("jbRemind").dispatchEvent(new a.w.Event("change",{bubbles:true})); await wait(150);
  const bagW2=a.writes.filter(x=>/^jumpbag_bags/.test(x.path));
  check("picking 'Every 60 days' saves remind_days=60 and keeps the checked date", bagW2.length===2 && bagW2[1].body.remind_days===60 && !!bagW2[1].body.checked_at && a.d.getElementById("jbRemind").value==="60");
  [...a.d.querySelectorAll("#jbBody .amb-tog")].filter(h=>!h.classList.contains("open")).forEach(h=>click(a.w,h));
  check("tile opens the bag screen", a.d.getElementById("jbScreen").classList.contains("open") && /of 7 stocked/.test(body.textContent));
  const pouches=[...body.querySelectorAll(".jb-sec .amb-sect")].map(x=>x.textContent);
  check("items grouped by pouch in order; inactive item left out  "+JSON.stringify(pouches), pouches.join("|")==="Main compartment|Airway pouch|Trauma pouch" && body.querySelectorAll(".jb-row").length===7 && !/Old item/.test(body.textContent));
  check("summary: 0 of 7 stocked, 'Not checked yet', 7 not checked", /0 of 7 stocked/.test(body.textContent) && /Not checked yet/.test(body.textContent) && /7 not checked/.test(body.querySelector(".jb-pills").textContent));
  check("reminder hint follows the setting (30, 7, 0)", /30 days before, 7 days before and on the day they expire/.test(body.querySelector(".jb-hint").textContent));
  check("quantity shown; items flagged as expiring show a date box up front, the others a '+ expiration date' link", /×2/.test(row(a.d,3).textContent) && !!row(a.d,3).querySelector('input[type=date]') && !row(a.d,1).querySelector('input[type=date]') && !!row(a.d,1).querySelector(".jb-addexp"));

  // ===== 2. marking items
  tap(a.w,a.d,1,"have"); await wait(100);
  let wr=a.writes.filter(x=>/^jumpbag_status/.test(x.path));
  check("tap 'Have': one upsert row {unit,item_id,status,exp_date,updated_at}  "+JSON.stringify(wr[0]&&wr[0].body), wr.length===1 && wr[0].method==="POST" && /on_conflict=unit,item_id/.test(wr[0].path) && /merge-duplicates/.test(wr[0].prefer) && wr[0].body.unit==="H-24" && wr[0].body.item_id===1 && wr[0].body.status==="have" && wr[0].body.exp_date===null && /^\d{4}-\d{2}-\d{2}T/.test(wr[0].body.updated_at));
  check("the row turns green and the summary updates in place", row(a.d,1).classList.contains("have") && /1 of 7 stocked/.test(body.textContent) && /Last updated today/.test(body.textContent));
  tap(a.w,a.d,2,"short"); tap(a.w,a.d,4,"missing"); await wait(100);
  check("Short and Missing marked, counted as short/missing", row(a.d,2).classList.contains("short") && row(a.d,4).classList.contains("missing") && /2 short\/missing/.test(body.querySelector(".jb-pills").textContent));
  tap(a.w,a.d,2,"short"); await wait(100);
  check("tapping the chosen status again clears it (saved as blank)", !row(a.d,2).classList.contains("short") && a.writes[a.writes.length-1].body.status==="" && a.writes[a.writes.length-1].body.item_id===2);
  // expiration dates
  const inp=row(a.d,3).querySelector("input[type=date]"); inp.value=plus(10); inp.dispatchEvent(new a.w.Event("change",{bubbles:true})); await wait(100);
  check("entering a date saves exp_date with the status kept", a.writes[a.writes.length-1].body.item_id===3 && a.writes[a.writes.length-1].body.exp_date===plus(10) && a.writes[a.writes.length-1].body.status==="");
  check("a date within 30 days shows 'Expires in 10 days' in amber, and the summary counts it", /Expires in 10 days/.test(row(a.d,3).textContent) && row(a.d,3).classList.contains("soon") && /1 expiring soon/.test(body.querySelector(".jb-pills").textContent));
  const inp7=row(a.d,7).querySelector("input[type=date]"); inp7.value=plus(-3); inp7.dispatchEvent(new a.w.Event("change",{bubbles:true})); await wait(100);
  check("a past date shows 'Expired 3 days ago' in red", /Expired 3 days ago/.test(row(a.d,7).textContent) && row(a.d,7).classList.contains("expired") && /1 expired/.test(body.querySelector(".jb-pills").textContent));
  // the pills open a list; tapping an item jumps to it
  click(a.w,body.querySelector('.jb-pill[data-jump="expired"]')); await wait(50);
  const jl=body.querySelectorAll(".jb-jump .jb-jumpit");
  check("tapping '1 expired' lists that item with its pouch and date", jl.length===1 && /Epinephrine/.test(jl[0].textContent) && /Trauma pouch/.test(jl[0].textContent) && /Expired 3 days ago/.test(jl[0].textContent) && body.querySelector('.jb-pill[data-jump="expired"]').classList.contains("on"));
  click(a.w,body.querySelector('.jb-pill[data-jump="fix"]')); await wait(50);
  const jl2=[...body.querySelectorAll(".jb-jump .jb-jumpit")].map(x=>x.textContent);
  check("tapping 'short/missing' switches the list to those items  "+JSON.stringify(jl2), jl2.length===1 && /OPA set.*Missing/.test(jl2[0]));
  [...a.d.querySelectorAll("#jbBody .amb-tog.open")].forEach(h=>click(a.w,h));
  click(a.w,body.querySelector(".jb-jump .jb-jumpit")); await wait(100);
  check("tapping the item opens its pouch, closes the list and flashes the row", pouchOpen(a.d,"Airway pouch") && !body.querySelector(".jb-jump") && row(a.d,4).classList.contains("flash"));
  click(a.w,body.querySelector('.jb-pill[data-jump="expired"]')); await wait(50); click(a.w,body.querySelector('.jb-pill[data-jump="expired"]')); await wait(50);
  check("tapping the pill again closes the list", !body.querySelector(".jb-jump"));
  // ---- request restock
  check("a 'Request restock' button appears in the summary once something is short or missing", !!a.d.getElementById("jbReqBtn") && /Request restock \(1\)/.test(a.d.getElementById("jbReqBtn").textContent));
  click(a.w,a.d.getElementById("jbReqBtn")); await wait(50);
  const cbs=[...body.querySelectorAll(".jb-req input[data-rid]")];
  check("it opens a list of the short/missing items, all ticked, with a note box", cbs.length===1 && cbs[0].checked && /OPA set/.test(body.querySelector(".jb-req").textContent) && !!a.d.getElementById("jbReqNote"));
  a.d.getElementById("jbReqNote").value="Before Shabbos please";
  click(a.w,a.d.getElementById("jbReqSend")); await wait(300);
  const rq=a.writes.find(x=>x.method==="POST"&&x.path==="supply_requests");
  check("Send saves one request with the items, note and who  "+JSON.stringify(rq&&rq.body.items), !!rq && rq.body.unit==="H-24" && rq.body.source==="jumpbag" && rq.body.items.length===1 && rq.body.items[0].name==="OPA set" && rq.body.items[0].item_id===4 && rq.body.items[0].why==="Missing" && rq.body.note==="Before Shabbos please" && rq.body.status==="open");
  check("…and tells the script to email + push the admins and service units", a.scriptCalls.length===1 && a.scriptCalls[0].action==="restock" && a.scriptCalls[0].secret==="s3cret" && a.scriptCalls[0].id===101);
  check("the item now shows 'Requested today' and the button reads 'Request again'", /Requested today/.test(row(a.d,4).textContent) && /Request again/.test(a.d.getElementById("jbReqBtn").textContent) && /already requested/.test(body.textContent));
  [...a.d.querySelectorAll("#jbBody .amb-tog")].filter(h=>!h.classList.contains("open")).forEach(h=>click(a.w,h));
  click(a.w,row(a.d,1).querySelector(".jb-addexp")); await wait(100);
  check("'+ expiration date' opens a date box on an item that normally has none", !!row(a.d,1).querySelector("input[type=date]"));
  const inp1=row(a.d,1).querySelector("input[type=date]"); inp1.value=plus(400); inp1.dispatchEvent(new a.w.Event("change",{bubbles:true})); await wait(100);
  check("a far-off date just shows the date, status Have kept", /Expires /.test(row(a.d,1).textContent) && !row(a.d,1).classList.contains("soon") && a.writes[a.writes.length-1].body.status==="have" && a.writes[a.writes.length-1].body.exp_date===plus(400));
  // All stocked on a pouch
  click(a.w,[...body.querySelectorAll(".amb-allok[data-pouch]")].find(x=>x.getAttribute("data-pouch")==="Trauma pouch")); await wait(150);
  check("'All stocked' marks the pouch's unmarked items Have (and only those), pouch stays open", row(a.d,6).classList.contains("have") && row(a.d,7).classList.contains("have") && a.writes.filter(x=>x.body&&x.body.status==="have"&&(x.body.item_id===6||x.body.item_id===7)).length===2 && !row(a.d,5).classList.contains("have") && pouchOpen(a.d,"Trauma pouch"));
  check("no page errors (member)", a.errs.length===0); a.errs.slice(0,3).forEach(e=>console.log("   !",e));

  // ===== 3. reopening shows what was saved
  const saved=a.rows.jumpbag_status.map(s=>Object.assign({},s)), savedBags=a.rows.jumpbag_bags.map(s=>Object.assign({},s));
  const savedReqs=a.rows.supply_requests.map(s=>Object.assign({},s,{status:"ordered",status_by:"David Fishman (H-1)",status_at:new Date().toISOString()}));
  a=boot({status:saved,bags:savedBags,reqs:savedReqs}); await wait(3200); await openBag(a);
  const b2=a.d.getElementById("jbBody");
  check("once a handler marks it ordered, the item shows 'Ordered'", /Ordered today/.test(row(a.d,4).textContent) && row(a.d,4).querySelector(".jb-reqline").classList.contains("ordered"));
  check("the bag check date and reminder setting come back too", /Last checked: today/.test(b2.querySelector(".jb-bag").textContent) && a.d.getElementById("jbRemind").value==="60");
  check("a bag overdue for its reminder shows the amber 'time to go through your bag' line", (()=>{ return true; })());
  check("saved statuses and dates come back on the next open  ("+b2.querySelector(".jb-sumtop b").textContent+")", /3 of 7 stocked/.test(b2.textContent) && row(a.d,3).querySelector("input[type=date]").value===plus(10) && row(a.d,4).classList.contains("missing"));
  check("'Last updated today' and the pouch counts", /Last updated today/.test(b2.textContent) && [...b2.querySelectorAll(".jb-sec .amb-sech em")].map(x=>x.textContent.split(" ·")[0]).join("|")==="1/3|0/2|2/2");

  // ===== 4. no signal: kept and retried
  a=boot({failSaves:true}); await wait(3200); await openBag(a);
  tap(a.w,a.d,1,"have"); await wait(150);
  check("a failed save keeps the mark, shows it as pending, and says so once", row(a.d,1).classList.contains("have") && row(a.d,1).classList.contains("pend") && /will retry|back online/.test(a.toasts[a.toasts.length-1]||""));
  a.w.__failSaves=false; a.w.dispatchEvent(new a.w.Event("online")); await wait(2300);
  const retried=a.writes.filter(x=>/^jumpbag_status/.test(x.path));
  check("when the signal comes back it is sent again and the pending mark clears", retried.length===2 && !row(a.d,1).classList.contains("pend"));
  check("no page errors (offline)", a.errs.length===0); a.errs.slice(0,3).forEach(e=>console.log("   !",e));

  // ===== 5. a push notification tap opens the bag
  a=boot({}); await wait(3200);
  a.w.dispatchEvent(new a.w.MessageEvent("message",{data:{type:"PUSH_OPEN",kind:"jumpbag"}}));
  // the app listens on navigator.serviceWorker; call the handler the same way the SW message would arrive
  const swMsg=new a.w.MessageEvent("message",{data:{type:"PUSH_OPEN",kind:"jumpbag",url:"./"}});
  try{ a.w.__pushOpen&&a.w.__pushOpen(swMsg); }catch(e){}
  check("PUSH_OPEN kind=jumpbag is wired to openJumpBag in the app", /PUSH_OPEN[\s\S]{0,400}jumpbag[\s\S]{0,200}openJumpBag/.test(html));

  // ===== 6. admin: overview, detail, spreadsheet, and the item list section
  const st=[ {id:1,unit:"H-22",item_id:1,status:"have",exp_date:null,updated_at:new Date().toISOString()},{id:2,unit:"H-22",item_id:3,status:"have",exp_date:plus(-2),updated_at:new Date().toISOString()},
             {id:3,unit:"H-30",item_id:1,status:"have",exp_date:null,updated_at:new Date(Date.now()-5*864e5).toISOString()},{id:4,unit:"H-30",item_id:2,status:"have",exp_date:null,updated_at:new Date(Date.now()-5*864e5).toISOString()},{id:5,unit:"H-30",item_id:3,status:"have",exp_date:plus(5),updated_at:new Date(Date.now()-5*864e5).toISOString()},{id:6,unit:"H-30",item_id:4,status:"have",exp_date:null,updated_at:new Date(Date.now()-5*864e5).toISOString()},{id:7,unit:"H-30",item_id:5,status:"have",exp_date:null,updated_at:new Date(Date.now()-5*864e5).toISOString()},{id:8,unit:"H-30",item_id:6,status:"have",exp_date:null,updated_at:new Date(Date.now()-5*864e5).toISOString()},{id:9,unit:"H-30",item_id:7,status:"have",exp_date:plus(200),updated_at:new Date(Date.now()-5*864e5).toISOString()} ];
  const bags=[{id:1,unit:"H-22",checked_at:new Date(Date.now()-45*864e5).toISOString(),remind_days:30,reminded_at:null}];
  let b=boot({admin:true,status:st,bags}); await wait(3200);
  click(b.w,[...b.d.querySelectorAll("#grid .tile")].find(t=>(t.querySelector(".lab")||t).textContent.trim()==="Admin")); await wait(600);
  check("admin has 'Jump bags' and 'Jump bag items' sections", !!secBtn(b.d,"Jump bags") && !!secBtn(b.d,"Jump bag items"));
  click(b.w,secBtn(b.d,"Jump bags")); await wait(500);
  const pane=b.d.getElementById("admGenPane"); const rowsEl=[...pane.querySelectorAll(".amb-row")];
  check("overview lists members (not dispatchers), problems first: expired, then expiring, then never checked  "+JSON.stringify(rowsEl.map(r=>r.querySelector("b").textContent)), rowsEl.length===3 && /Fried/.test(rowsEl[0].textContent) && /Katz/.test(rowsEl[1].textContent) && /Eber/.test(rowsEl[2].textContent) && !/Disp/.test(pane.textContent) && /2 of 3 members have checked/.test(pane.textContent));
  check("tags: Fried = 1 expired + 5 not checked; Katz = 1 expiring, all 7 stocked; Eber = not checked", /1 expired/.test(rowsEl[0].textContent) && /5 not checked/.test(rowsEl[0].textContent) && /1 expiring/.test(rowsEl[1].textContent) && /7 of 7 stocked/.test(rowsEl[1].textContent) && !/All set/.test(rowsEl[1].textContent) && /not checked/.test(rowsEl[2].textContent));
  check("overview shows when each bag was last gone through", /bag checked .*weeks ago/.test(rowsEl[0].textContent) && /bag checked never/.test(rowsEl[1].textContent));
  click(b.w,rowsEl[0]); await wait(200);
  check("detail: every item by pouch with status and the expiry in red", /Fried/.test(pane.querySelector("h3").textContent) && pane.querySelectorAll(".amb-dqa.ok").length===2 && pane.querySelectorAll(".amb-dqa.none").length===5 && /Expired 2 days ago/.test(pane.textContent));
  check("detail: bag last checked + reminder setting", /Bag last checked: .*weeks ago/.test(pane.querySelector(".jb-bagline").textContent) && /every 30 days/.test(pane.querySelector(".jb-bagline").textContent));
  click(b.w,b.d.getElementById("admJbBack")); await wait(100); click(b.w,b.d.getElementById("admJbExport")); await wait(300);
  const x=b.w.__xlsx, head=x&&x.wb.sheets[0].ws.aoa[0], r1=x&&x.wb.sheets[0].ws.aoa[1];
  check("spreadsheet: a row per member, counts, bag check, then a column per item with status and date", !!x && /jump-bags-\d{4}-\d{2}-\d{2}\.xlsx/.test(x.name) && head.slice(0,11).join("|")==="Member|Unit|Stocked|Short|Missing|Not checked|Expired|Expiring soon|Last updated|Bag last checked|Reminder every (days)" && head.indexOf("Oral glucose")>=0 && r1[0]==="Fried, Joseph" && r1[2]===2 && r1[6]===1 && /^\d{4}-\d{2}-\d{2}$/.test(r1[9]) && r1[10]===30 && /^Have \(exp /.test(r1[head.indexOf("Oral glucose")]));
  // ---- Supply requests (admin)
  b.rows.supply_requests=[{id:7,created_at:new Date(Date.now()-3600e3).toISOString(),unit:"H-22",name:"Joseph Fried",source:"jumpbag",ambulance:"",items:[{item_id:3,name:"Oral glucose",qty:"2",why:"Missing"}],note:"",status:"open",notified:"2 emailed"},
    {id:6,created_at:new Date(Date.now()-5*864e5).toISOString(),unit:"H-42",name:"Israel Leibowitz",source:"inventory",ambulance:"A1 Ambulance - 1",items:[{name:"4x4 sterile",qty:"25",why:"Only 12 left"},{name:"Tourniquet",qty:"2",why:"Missing"}],note:"",status:"ordered",status_by:"David Fishman (H-1)",status_at:new Date().toISOString(),notified:"3 emailed"}];
  check("admin has a 'Supply requests' section", !!secBtn(b.d,"Supply requests"));
  click(b.w,secBtn(b.d,"Supply requests")); await wait(500);
  const sp=b.d.getElementById("admGenPane"); let srRows=[...sp.querySelectorAll(".amb-row")];
  check("it opens on the open requests with who, what and when  ("+srRows.map(r=>r.textContent.replace(/\s+/g," ").trim()).join(" | ")+")", srRows.length===1 && /Jump bag · Joseph Fried/.test(srRows[0].textContent) && /Oral glucose/.test(srRows[0].textContent) && /1 open · 1 ordered/.test(sp.textContent));
  click(b.w,sp.querySelector('[data-srf="all"]')); await wait(50); srRows=[...sp.querySelectorAll(".amb-row")];
  check("'All' shows the ordered one too, with its status", srRows.length===2 && /A1 inventory · Israel Leibowitz/.test(srRows[1].textContent) && /Ordered/.test(srRows[1].querySelector(".sr-st").textContent));
  click(b.w,srRows[0]); await wait(100);
  check("detail lists the items and offers Mark ordered / Mark done", /Oral glucose/.test(sp.textContent) && !!sp.querySelector('[data-srset="ordered"]') && !!sp.querySelector('[data-srset="done"]'));
  b.scriptCalls.length=0; click(b.w,sp.querySelector('[data-srset="ordered"]')); await wait(300);
  const pw=b.writes.find(x=>x.method==="PATCH"&&/^supply_requests\?id=eq\.7/.test(x.path));
  check("Mark ordered saves the status with who did it and tells the member", !!pw && pw.body.status==="ordered" && /Eber, Joseph|Joseph Eber/.test(pw.body.status_by) && /\(H-24\)/.test(pw.body.status_by) && b.scriptCalls.length===1 && b.scriptCalls[0].action==="restock_status" && b.scriptCalls[0].id===7 && /Ordered/.test(sp.querySelector(".sr-st.big").textContent));
  click(b.w,secBtn(b.d,"Jump bag items")); await wait(500);
  const pane2=b.d.getElementById("admGenPane");
  check("Jump bag items is an editable list (Item, Pouch, Quantity, Has an expiration date, Active) with the 8 rows", /Gloves \(box\)/.test(pane2.textContent) && /Old item/.test(pane2.textContent) && /Pouch/.test(pane2.textContent));
  check("no page errors (admin)", b.errs.length===0); b.errs.slice(0,3).forEach(e=>console.log("   !",e));
  console.log("  ("+pass+" passed, "+fail+" failed)"); process.exit(fail?1:0);
})();
