// Regression smoke test: boot as admin, open every screen and admin section, profile, scene timer, certifications; no page errors.
const ROOT=process.env.HOH_ROOT||require("path").join(__dirname,"..","..");
const fs=require("fs"); const {JSDOM}=require("jsdom");
const html=fs.readFileSync(ROOT+"/index.html","utf8");
const ORIGIN="https://houstonhatzalahapp.org", SB="https://gcvbohdarppaolqhdnri.supabase.co";
let pass=0, fail=0; const check=(l,ok)=>{ console.log((ok?"  PASS ":"  FAIL ")+l); ok?pass++:fail++; };
const errs=[], writes=[];
const tiles=[["Hospitals","hospitals"],["Protocols","protocols"],["Certifications","certifications"],["Members Directory","directory"],["Scheduler","board"],["Task Book","taskbook"],["Resources","resources"],["Ambulance Checkoff","ambcheck"],["Equipment Finder","placement"],["Apartments Finder","apartments"],["Admin","admin"]].map((t,i)=>({id:i+1,label:t[0],type:t[1],active:"X",order_col:i+1}));
const rows={ settings:[{id:1,setting:"Org Name",value:"HoH"},{id:2,setting:"Ambulances",value:"A1 Ambulance - 1"},{id:3,setting:"Member Types",value:"Responder, Non Responder, Dispatcher, Service Unit"},{id:4,setting:"Logo URL",value:""},{id:5,setting:"Google Analytics ID",value:"G-6Z479MLSKZ"},{id:6,setting:"Google Tag Manager ID",value:""},{id:7,setting:"Meta Pixel ID",value:""}], tiles,
  roster:[{id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",email:"t@houstonhatzalah.org",active:"X",admin:"X",type:"Responder",level:"ALS",status:"Primary",fto:"H-22"},{id:2,unit:"H-22",first_name:"Joseph",last_name:"Fried",email:"f@houstonhatzalah.org",active:"X",status:"Observer"}],
  certifications:[{id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",nremt_exp:"4/30/2029",hipaa_exp:"1/1/2027"}], cert_docs:[], announcement_reads:[], announcements:[{id:1,title:"Meeting",body:"8 pm",kind:"feature",active:"X",audience:"everyone",order_col:1}], push_subs:[],
  hospitals:[{id:1,hospital_name:"Memorial Hermann",phone_call:"7135551212",address_navigate:"6411 Fannin St"}], resources:[{id:1,title:"SOPs",file:"doc:resources/x.pdf",active:"X",order_col:1}], task_list:[{id:1,task_id:"T1",category:"Airway",task:"OPA",type:"skill",target:"1",order_col:1}], task_progress:[], apartments:[], apartment_markers:[], uploads:[], guests:[], cpr_buttons:[], vitals:[], schedule:[], availability:[], cabinets:[], cabinet_bins:[], equipment_items:[], equipment_meta:[], poll_tallies:[], ambulance_checks:[] };
const json=(x,st)=>new Response(JSON.stringify(x),{status:st||200,headers:{"Content-Type":"application/json"}});
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:ORIGIN+"/",beforeParse(w){
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{}; w.Response=Response; w.HTMLElement.prototype.scrollIntoView=function(){};
  w.navigator.serviceWorker={register:()=>Promise.resolve({addEventListener(){},update:()=>Promise.resolve()}),addEventListener(){},ready:new Promise(()=>{}),controller:null};
  w.localStorage.setItem("hoh_member_v1",JSON.stringify({email:"t@houstonhatzalah.org",unit:"H-24"}));
  w.localStorage.setItem("hoh_sbauth_v1",JSON.stringify({token:"tok",refresh:"ref",exp:Date.now()+3600e3,email:"t@houstonhatzalah.org",sub:"u1"}));
  w.localStorage.setItem("hoh_push_asked","1");
  w.caches={keys:()=>Promise.resolve([]),open:()=>Promise.resolve({keys:()=>Promise.resolve([]),match:()=>Promise.resolve(undefined),put:()=>Promise.resolve()})};
  w.URL.createObjectURL=()=>"blob:x"; w.URL.revokeObjectURL=()=>{}; w.AudioContext=undefined; w.webkitAudioContext=undefined;
  w.fetch=(u,o)=>{ u=typeof u==="string"?u:u.url; o=o||{};
    if(o.method && o.method!=="GET"){ writes.push({method:o.method,path:u.replace(SB+"/rest/v1/","")}); return Promise.resolve(json([])); }
    if(u.indexOf(SB+"/auth/")===0) return Promise.resolve(json({error:"x"}));
    if(u.indexOf("/rest/v1/rpc/")>-1) return Promise.resolve(json({}));
    if(u.indexOf("/rest/v1/")>-1 && u.indexOf("?")<0) return Promise.resolve(json({definitions:{}}));
    const m=u.match(/\/rest\/v1\/([a-z_]+)\?/); if(m) return Promise.resolve(json(rows[m[1]]||[]));
    return Promise.resolve(new Response("ok",{status:200})); };
  w.onerror=(m,s,l,c,e)=>errs.push(String(e&&e.stack||m).split("\n")[0]);
}});
const w=dom.window, d=w.document; const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const click=(el)=>el&&el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
const tile=(label)=>[...d.querySelectorAll("#grid .tile")].find(t=>(t.querySelector(".lab")||t).textContent.trim()===label);
const openScreen=()=>[...d.querySelectorAll(".screen.open, .preader.open")].map(x=>x.id).join(",");
(async()=>{
  await wait(3300);
  check("home renders all "+tiles.length+" tiles", d.querySelectorAll("#grid .tile").length===tiles.length);
  for(const t of tiles){ if(t.type==="admin") continue; const before=errs.length; click(tile(t.label)); await wait(500); const open=openScreen(); click(d.querySelector(".screen.open .back, .preader.open .back")||d.body); await wait(200);
    check("tile '"+t.label+"' opens a screen ("+open+") and closes without errors", !!open && errs.length===before); }
  // profile
  click(d.getElementById("unitWrap")); await wait(300); check("profile opens with the glove field", !!d.getElementById("profGlove")); click(d.getElementById("profSave")); await wait(300);
  check("profile save writes roster", writes.some(x=>x.method==="PATCH"&&/^roster/.test(x.path))); click(d.querySelector(".screen.open .back")); await wait(200);
  // scene timer
  click(d.getElementById("hdrLogo")); await wait(200); click(d.getElementById("scStart")); await wait(200);
  check("scene timer starts (no push configured here, so no background-alarm line)", d.getElementById("scene").classList.contains("open") && !d.getElementById("scStart").offsetParent && d.getElementById("scBg").textContent==="");
  click(d.getElementById("scEnd")); await wait(200); check("scene timer ends", !d.getElementById("scOn").textContent.trim() || !d.getElementById("scene").classList.contains("alarm"));
  // quick actions sheet (thumb-first)
  click(d.getElementById("qActions")); await wait(100);
  check("lightning opens the sheet: install banner on top, Text Home + Scene Timer, Vitals Reference + Call Notes, CPR biggest at the bottom", !d.getElementById("qMenu").classList.contains("hidden") && [...d.querySelectorAll("#qMenu .sheet > *")].map(x=>x.id||x.className).join(",")==="sheet-h,qInstall,qa-row,qa-row,qCpr,qCancel" && d.getElementById("qVitals").textContent.trim()==="Vitals Reference" && /CPR Tracker/.test(d.getElementById("qCpr").textContent));
  check("install banner shows in the browser (not installed), Text Home shows when the setting is on", d.getElementById("qInstall").style.display!=="none" && d.getElementById("qTextHome").style.display!=="none");
  click(d.getElementById("qScene")); await wait(100);
  check("Scene Timer in the sheet opens the same scene screen as the logo, and closes the sheet", d.getElementById("scene").classList.contains("open") && d.getElementById("qMenu").classList.contains("hidden"));
  click(d.getElementById("scMin")); await wait(100);
  click(d.getElementById("qActions")); await wait(50); click(d.getElementById("qCpr")); await wait(200);
  check("CPR Tracker opens from the big red button", d.getElementById("cprScreen").classList.contains("open"));
  click(d.getElementById("cprBack")); await wait(100);
  click(d.getElementById("qActions")); await wait(50); click(d.getElementById("qCancel")); await wait(50);
  check("Cancel closes the sheet", d.getElementById("qMenu").classList.contains("hidden"));
  // admin sections
  click(tile("Admin")); await wait(700); check("admin opens", d.getElementById("admScreen").classList.contains("open"));
  const secBtn=(label)=>[...d.querySelectorAll("#admSecs .adm-secit")].find(b=>b.getAttribute("data-label")===label);
  // the grouped section picker
  check("picker shows the current section (Members) with the active-member count", d.getElementById("admSecCur").textContent==="Members" && /^\d+$/.test((d.querySelector("#admSecBtn .adm-secn")||{textContent:""}).textContent));
  check("menu is closed until the picker is tapped", !d.getElementById("admSecs").classList.contains("open"));
  click(d.getElementById("admSecBtn")); await wait(50);
  check("tapping the picker opens the grouped menu: 5 groups, 17 sections, current one marked", d.getElementById("admSecs").classList.contains("open") && d.querySelectorAll("#admSecMenu .adm-secg").length===5 && d.querySelectorAll("#admSecMenu .adm-secit").length===17 && d.querySelector("#admSecMenu .adm-secit.on").getAttribute("data-sec")==="members");
  check("groups are in the agreed order with the renamed sections", [...d.querySelectorAll("#admSecMenu .adm-secg")].map(g=>g.textContent).join("|")==="People|Ambulances & gear|App content|Certifications|Reference lists" && !!secBtn("Certification types") && !!secBtn("Document types") && !secBtn("Upload Types"));
  click(d.getElementById("admSecBack")); await wait(50); check("tapping outside closes the menu", !d.getElementById("admSecs").classList.contains("open"));
  click(d.getElementById("admSecBtn")); await wait(50); click(secBtn("Announcements")); await wait(400);
  check("picking a section closes the menu, switches the title and the picker label", !d.getElementById("admSecs").classList.contains("open") && d.getElementById("admTitle").textContent==="Announcements" && d.getElementById("admSecCur").textContent==="Announcements" && d.querySelector("#admSecMenu .adm-secit.on").getAttribute("data-sec")==="announce");
  click(d.getElementById("admSecBtn")); await wait(20); d.dispatchEvent(new w.KeyboardEvent("keydown",{key:"Escape",bubbles:true})); await wait(20);
  check("Escape closes the menu", !d.getElementById("admSecs").classList.contains("open"));
  const labels=[...d.querySelectorAll("#admSecs .adm-secit")].map(b=>b.getAttribute("data-label"));
  check("admin has the Ambulance checks section", labels.indexOf("Ambulance checks")>=0);
  for(const label of labels){ const before=errs.length; click(secBtn(label)); await wait(500); check("admin section '"+label+"' renders without errors", errs.length===before && (d.getElementById("admGenPane").textContent.trim().length>0 || label==="Members")); }
  click(secBtn("Members")); await wait(300); click(d.querySelector('#admList .adm-row[data-u="H-24"]')); await wait(200);
  check("member detail has Type with Service Unit option and the Service unit switch", !!d.getElementById("adSvc") && [...d.getElementById("adTy").options].some(o=>o.value==="Service Unit"));
  // ---- 1.8.1: analytics settings + logo upload
  check("analytics bootstraps from the built-in GA id before settings load", typeof w.gtag==="function" && [...d.querySelectorAll("script")].some(x=>/gtag\/js\?id=G-6Z479MLSKZ/.test(x.src)));
  check("analytics ids are cached on the device after settings load", (()=>{ try{ return JSON.parse(w.localStorage.getItem("hoh_analytics")).ga==="G-6Z479MLSKZ"; }catch(e){ return false; } })());
  check("anaValid accepts the right shapes and rejects the wrong ones", w.HOH_TEST.anaValid("ga","G-ABC1234")&&w.HOH_TEST.anaValid("ga","")&&!w.HOH_TEST.anaValid("ga","UA-12345-1")&&w.HOH_TEST.anaValid("gtm","GTM-ABCD12")&&!w.HOH_TEST.anaValid("gtm","G-ABC1234")&&w.HOH_TEST.anaValid("pixel","123456789012345")&&!w.HOH_TEST.anaValid("pixel","12ab"));
  click(secBtn("Settings")); await wait(500);
  const anaCard=[...d.querySelectorAll("#admGenPane .adm-item")].find(x=>/Analytics tracking/.test(x.textContent));
  check("Settings shows an 'Analytics tracking' card with three ID boxes and a note", !!anaCard && anaCard.querySelectorAll("input[data-row]").length===3 && /Changing an ID/.test(anaCard.textContent));
  const gaInput=anaCard&&[...anaCard.querySelectorAll("input[data-row]")].find(i=>i.value==="G-6Z479MLSKZ");
  check("the GA box holds the current id and the GTM box shows a GTM- placeholder", !!gaInput && [...anaCard.querySelectorAll("input")].some(i=>i.placeholder==="GTM-XXXXXXX"));
  gaInput.value="UA-99999-1"; const wBefore=writes.length; click(d.getElementById("admGenSave")); await wait(200);
  check("a malformed GA id is refused with a plain message and nothing is written", /doesn\u2019t look right/.test(d.getElementById("admGenMsg").textContent) && writes.length===wBefore);
  gaInput.value="G-NEWID1234"; click(d.getElementById("admGenSave")); await wait(200);
  const cf=d.querySelector("#admModalHost .adm-modal h3");
  check("replacing an existing GA id asks 'Replace the current analytics ID?' before saving", !!cf && /Replace the current analytics ID/.test(cf.textContent) && writes.length===wBefore);
  click(d.querySelector('#admModalHost .adm-modal button[id$="_no"]')); await wait(100);
  check("'Keep the current ID' cancels without writing", !d.querySelector("#admModalHost .adm-modal") && writes.length===wBefore);
  click(d.getElementById("admGenSave")); await wait(100); click(d.querySelector('#admModalHost .adm-modal button[id$="_ok"]')); await wait(300);
  check("confirming writes the new id to the settings table", writes.some(x=>x.method==="PATCH" && /settings\?id=eq\.5/.test(x.path)));
  const logoCard=[...d.querySelectorAll("#admGenPane .adm-item")].find(x=>x.querySelector(".adm-itemt")&&x.querySelector(".adm-itemt").textContent.trim()==="Logo");
  check("the Logo URL row is shown as 'Logo' with an 'Upload your logo' button and no text box to type in", !!logoCard && /Upload your logo/.test(logoCard.textContent) && logoCard.querySelector('input[data-h="Value"]').readOnly);
  w.HOH_TEST.settings()["Logo URL"]="sb:misc/org-logo.png"; w.HOH_TEST.applyLogo();
  check("applyLogo swaps the header and sign-in logos to the uploaded file", d.querySelector("#hdrLogo img").getAttribute("src").indexOf("misc/org-logo.png")>0 && [...d.querySelectorAll(".logo img")].every(i=>i.getAttribute("src").indexOf("org-logo")>0));
  w.HOH_TEST.settings()["Logo URL"]=""; w.HOH_TEST.applyLogo();
  check("clearing it goes back to the built-in logo", d.querySelector("#hdrLogo img").getAttribute("src")==="logo.png");
  check("no page errors overall", errs.length===0); errs.slice(0,5).forEach(e=>console.log("   !",e));
  console.log("  ("+pass+" passed, "+fail+" failed)"); process.exit(fail?1:0);
})();
