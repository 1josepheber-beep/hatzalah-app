// Glove size (1.3.2): profile field, profile save, admin field + save, directory chip, export column.
const ROOT=process.env.HOH_ROOT||require("path").join(__dirname,"..","..");
const fs=require("fs"); const {JSDOM}=require("jsdom");
const html=fs.readFileSync(ROOT+"/index.html","utf8");
const ORIGIN="https://houstonhatzalahapp.org", SB="https://gcvbohdarppaolqhdnri.supabase.co";
let pass=0, fail=0; const check=(l,ok)=>{ console.log((ok?"  PASS ":"  FAIL ")+l); ok?pass++:fail++; };
const errs=[], writes=[];
const rows={ settings:[{id:1,setting:"Org Name",value:"HoH"}], tiles:[{id:1,label:"Admin",type:"admin",active:"X",order_col:1},{id:2,label:"Members Directory",type:"directory",active:"X",order_col:2}],
  roster:[{id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",email:"t@houstonhatzalah.org",active:"X",admin:"X",t_shirt_size:"L",glove_size:"L"},
          {id:2,unit:"H-22",first_name:"Joseph",last_name:"Fried",email:"f@houstonhatzalah.org",active:"X",glove_size:"M"}],
  certifications:[], cert_docs:[], announcement_reads:[], announcements:[], push_subs:[] };
const json=(x,st)=>new Response(JSON.stringify(x),{status:st||200,headers:{"Content-Type":"application/json"}});
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:ORIGIN+"/",beforeParse(w){
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{}; w.Response=Response; w.HTMLElement.prototype.scrollIntoView=function(){};
  w.navigator.serviceWorker={register:()=>Promise.resolve({addEventListener(){},update:()=>Promise.resolve()}),addEventListener(){},ready:new Promise(()=>{}),controller:null};
  w.localStorage.setItem("hoh_member_v1",JSON.stringify({email:"t@houstonhatzalah.org",unit:"H-24"}));
  w.localStorage.setItem("hoh_sbauth_v1",JSON.stringify({token:"tok",refresh:"ref",exp:Date.now()+3600e3,email:"t@houstonhatzalah.org",sub:"u1"}));
  w.caches={keys:()=>Promise.resolve([]),open:()=>Promise.resolve({keys:()=>Promise.resolve([]),match:()=>Promise.resolve(undefined),put:()=>Promise.resolve()})};
  w.URL.createObjectURL=()=>"blob:x"; w.URL.revokeObjectURL=()=>{};
  w.fetch=(u,o)=>{ u=typeof u==="string"?u:u.url; o=o||{};
    if(o.method && o.method!=="GET"){ writes.push({method:o.method,path:u.replace(SB+"/rest/v1/",""),body:o.body?JSON.parse(o.body):null}); return Promise.resolve(json([])); }
    if(u.indexOf(SB+"/auth/")===0) return Promise.resolve(json({error:"x"}));
    if(u.indexOf("/rest/v1/rpc/")>-1) return Promise.resolve(json({}));
    const m=u.match(/\/rest\/v1\/([a-z_]+)\?/); if(m) return Promise.resolve(json(rows[m[1]]||[]));
    return Promise.resolve(new Response("ok",{status:200})); };
  w.onerror=(m,s,l,c,e)=>errs.push(String(e&&e.stack||m).split("\n")[0]);
}});
const w=dom.window, d=w.document; const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const click=(el)=>el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
(async()=>{
  await wait(3200);
  // profile
  click(d.getElementById("unitWrap")); await wait(300);
  const g=d.getElementById("profGlove");
  check("profile has a Glove size field, preset from the roster (L)", !!g && g.value==="L");
  check("glove options are the exam-glove sizes", g && [...g.options].map(o=>o.value).join(",")===",XS,S,M,L,XL,2XL,Other");
  g.value="M"; click(d.getElementById("profSave")); await wait(300);
  const pw=writes.find(x=>x.method==="PATCH" && /^roster\?unit=eq\.H-24/.test(x.path));
  check("saving the profile sends glove_size", !!pw && pw.body.glove_size==="M" && pw.body.t_shirt_size==="L");
  // admin
  click([...d.querySelectorAll("#grid .tile")].find(t=>/Admin/.test(t.textContent))); await wait(600);
  click(d.querySelector('#admList .adm-row[data-u="H-22"]')); await wait(200);
  const tabs=[...d.querySelectorAll("#admRight .adm-tab")]; const ct=tabs.find(t=>/Contact/.test(t.textContent)); if(ct) click(ct); await wait(200);
  const ag=d.getElementById("adGl");
  check("admin Contact & personal shows Gloves, preset (M)", !!ag && ag.value==="M");
  ag.value="XL"; writes.length=0; click(d.getElementById("admSave")); await wait(400);
  const aw=writes.find(x=>x.method==="PATCH" && /^roster\?/.test(x.path));
  check("admin save sends glove_size", !!aw && aw.body.glove_size==="XL");
  // export header
  const src=fs.readFileSync(ROOT+"/index.html","utf8");
  check("spreadsheet export includes a Glove Size column next to Coat Size", /"Coat Size","Glove Size"/.test(src));
  // directory chip (admin sees sizes)
  click(d.querySelector(".back, #admBack") || d.body); await wait(100);
  check("no page errors", errs.length===0); errs.slice(0,3).forEach(e=>console.log("   !",e));
  console.log("  ("+pass+" passed, "+fail+" failed)"); process.exit(fail?1:0);
})();
