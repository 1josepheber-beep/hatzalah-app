// 1.7.2 guards: a stuck waiting worker is nudged, automatic restarts are rate-limited, and the worker aborts hung fetches.
const ROOT=process.env.HOH_ROOT||require("path").join(__dirname,"..","..");
const fs=require("fs"); const {JSDOM}=require("jsdom"); const vm=require("vm");
const html=fs.readFileSync(ROOT+"/index.html","utf8");
const ORIGIN="https://houstonhatzalahapp.org", SB="https://gcvbohdarppaolqhdnri.supabase.co";
let pass=0, fail=0; const check=(l,ok)=>{ console.log((ok?"  PASS ":"  FAIL ")+l); ok?pass++:fail++; };
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const json=(x)=>new Response(JSON.stringify(x),{status:200,headers:{"Content-Type":"application/json"}});
const rows={ settings:[{id:1,setting:"Org Name",value:"HoH"}], tiles:[{id:1,label:"Hospitals",type:"hospitals",active:"X",order_col:1}],
  roster:[{id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",email:"t@houstonhatzalah.org",active:"X",type:"Responder"}], certifications:[], cert_docs:[], announcement_reads:[], announcements:[], push_subs:[] };

async function boot(opts){
  const posted=[], swListeners={}, errs=[];
  const waiting = opts.waiting ? {postMessage:(m)=>posted.push(m)} : null;
  const reg={waiting, installing:null, active:{}, addEventListener(){}, update:()=>Promise.resolve()};
  const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:ORIGIN+"/",beforeParse(w){
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
    w.scrollTo=()=>{}; w.Response=Response; w.HTMLElement.prototype.scrollIntoView=function(){};
    Object.defineProperty(w.HTMLImageElement.prototype,"complete",{get:()=>true,configurable:true});   /* jsdom never loads pictures */
    w.navigator.serviceWorker={register:()=>Promise.resolve(reg),addEventListener:(t,f)=>{ swListeners[t]=f; },ready:new Promise(()=>{}),controller:{postMessage(){}}};
    w.localStorage.setItem("hoh_member_v1",JSON.stringify({email:"t@houstonhatzalah.org",unit:"H-24"}));
    w.localStorage.setItem("hoh_sbauth_v1",JSON.stringify({token:"tok",refresh:"ref",exp:Date.now()+3600e3,email:"t@houstonhatzalah.org",sub:"u1"}));
    w.localStorage.setItem("hoh_push_asked","1");
    if(opts.lastRestart) w.localStorage.setItem("hoh_last_restart", String(opts.lastRestart));
    w.caches={keys:()=>Promise.resolve([]),open:()=>Promise.resolve({keys:()=>Promise.resolve([]),match:()=>Promise.resolve(undefined),put:()=>Promise.resolve()})};
    w.URL.createObjectURL=()=>"blob:x"; w.URL.revokeObjectURL=()=>{}; w.AudioContext=undefined; w.webkitAudioContext=undefined;
    w.fetch=(u,o)=>{ u=typeof u==="string"?u:u.url; o=o||{};
      if(o.method && o.method!=="GET") return Promise.resolve(json([]));
      if(u.indexOf(SB+"/auth/")===0) return Promise.resolve(json({error:"x"}));
      if(u.indexOf("/rest/v1/rpc/")>-1) return Promise.resolve(json({}));
      if(u.indexOf("/rest/v1/")>-1 && u.indexOf("?")<0) return Promise.resolve(json({definitions:{}}));
      const m=u.match(/\/rest\/v1\/([a-z_]+)\?/); if(m) return Promise.resolve(json(rows[m[1]]||[]));
      return Promise.resolve(new Response("ok",{status:200})); };
    w.onerror=(m,s,l,c,e)=>errs.push(String(e&&e.stack||m).split("\n")[0]);
  }});
  const w=dom.window, d=w.document;
  w.dispatchEvent(new w.Event("load")); await wait(900);
  const diag=()=>JSON.parse(w.localStorage.getItem("hoh_diag_v1")||"[]").map(x=>x.k+" "+x.d);
  return {w,d,posted,swListeners,errs,diag};
}

(async()=>{
  // 1. a worker stuck in "waiting" gets told to take over
  let a=await boot({waiting:true});
  check("a waiting worker is sent SKIP_WAITING at start-up, and the log says so", a.posted.some(m=>m&&m.type==="SKIP_WAITING") && a.diag().some(l=>/nudged the waiting worker/.test(l)));

  // 2. "update ready" from a worker with a different version: first one restarts (fresh, idle), and records the time
  a=await boot({waiting:false}); await wait(3300);   /* past the "just opened" quiet period */
  a.swListeners.message({data:{type:"UPDATE_READY",version:"9.9.9"}}); await wait(400);
  const log1=a.diag();
  check("the first update message restarts the app (after the quiet-start checks) and stamps the restart time", log1.some(l=>/^restart for update/.test(l)) && !!a.w.localStorage.getItem("hoh_last_restart"));

  // 3. a second message straight after is held, the bar shows, no second restart
  const before=log1.filter(l=>/^restart /.test(l)).length;
  a.swListeners.message({data:{type:"UPDATE_READY",version:"9.9.9"}}); await wait(300);
  const log2=a.diag();
  check("a second update message within two minutes is held ('restarted recently') and shows the bar instead", log2.some(l=>/update .*held: restarted recently/.test(l)) && log2.filter(l=>/^restart /.test(l)).length===before && !a.d.getElementById("updBar").classList.contains("hidden"));

  // 4. a message naming the version already on screen does nothing at all
  a=await boot({waiting:false});
  const ver=a.w.document.body.innerHTML.match(/Version (\d+\.\d+\.\d+)/)[1];
  a.swListeners.message({data:{type:"UPDATE_READY",version:ver}}); await wait(4000);
  check("an update message for the version already showing is ignored (no restart, no bar)", !a.diag().some(l=>/^restart |^update /.test(l)) && a.d.getElementById("updBar").classList.contains("hidden"));

  // 5. coming back to the app with an update pending: allowed once, then held
  a=await boot({waiting:true, lastRestart:Date.now()-10000}); await wait(3300);
  Object.defineProperty(a.d,"hidden",{get:()=>false,configurable:true});
  a.d.dispatchEvent(new a.w.Event("visibilitychange")); await wait(200);
  check("re-opening the app 10 s after a restart does not restart again; the bar waits for a tap", a.diag().some(l=>/held: restarted recently/.test(l)) && !a.diag().some(l=>/^restart /.test(l)) && !a.d.getElementById("updBar").classList.contains("hidden"));
  check("no page errors", a.errs.length===0); a.errs.slice(0,3).forEach(e=>console.log("   !",e));

  // 6. the worker's timed fetch really aborts
  const sw=fs.readFileSync(ROOT+"/sw.js","utf8");
  let aborted=false;
  const ctx={ self:{addEventListener(){}, skipWaiting(){}, registration:{}, clients:{}}, caches:{}, clients:{}, location:{origin:ORIGIN, href:ORIGIN+"/sw.js"}, console,
    setTimeout, clearTimeout, Promise, URL, Headers, Response, Error,
    AbortController: class { constructor(){ this.signal={aborted:false}; } abort(){ aborted=true; this.signal.aborted=true; } },
    Request: class { constructor(input, init){ this.url=typeof input==="string"?input:input.url; this.signal=init&&init.signal; } },
    fetch:(req)=>new Promise((res,rej)=>{ const s=req.signal; if(s){ const iv=setInterval(()=>{ if(s.aborted){ clearInterval(iv); rej(new Error("AbortError")); } },10); } /* never resolves otherwise */ }) };
  ctx.self.addEventListener=()=>{}; vm.createContext(ctx);
  vm.runInContext(sw+"\n;this.__timedFetch=timedFetch; this.__slow=SLOW_FILE_MS; this.__net=NET_TIMEOUT_MS;", ctx);
  const t0=Date.now(); let err=null; try{ await ctx.__timedFetch(new ctx.Request(SB+"/rest/v1/roster?select=*"), 300); }catch(e){ err=e; }
  check("the worker's timed fetch rejects as 'slow' on time and ABORTS the underlying request", err && err.message==="slow" && (Date.now()-t0)<1000 && aborted);
  check("data requests keep the 4 s limit; files get a 60 s limit; the page re-check and photo fetches now use timedFetch", ctx.__net===4000 && ctx.__slow===60000 && (sw.match(/timedFetch\(/g)||[]).length>=6 && !/\n\s+fetch\(req\)\.then\(function\(res\)\{\n\s+if\(res && \(res\.ok \|\| res\.type === "opaque"\)\)/.test(sw));
  console.log("  ("+pass+" passed, "+fail+" failed)"); process.exit(fail?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
