// Rate counter (1.24.0): stopwatch in the HR and RR boxes of Call Notes. Timed count (15/30/60) and tap-along.
const ROOT=process.env.HOH_ROOT||require("path").join(__dirname,"..","..");
const fs=require("fs"); const {JSDOM}=require("jsdom");
const html=fs.readFileSync(ROOT+"/index.html","utf8");
const ORIGIN="https://houstonhatzalahapp.org", SB="https://gcvbohdarppaolqhdnri.supabase.co";
let pass=0, fail=0; const check=(l,ok)=>{ console.log((ok?"  PASS ":"  FAIL ")+l); ok?pass++:fail++; };
const errs=[], writes=[], buzz=[]; let wakeAsked=0, wakeReleased=0, tones=0;
const rows={ settings:[{id:1,setting:"Org Name",value:"HoH"}], tiles:[{id:1,label:"Members Directory",type:"directory",active:"X",order_col:1}],
  roster:[{id:1,unit:"H-24",first_name:"Joseph",last_name:"Eber",email:"t@houstonhatzalah.org",active:"X",admin:"X"}],
  certifications:[], cert_docs:[], announcement_reads:[], announcements:[], push_subs:[] };
const json=(x,st)=>new Response(JSON.stringify(x),{status:st||200,headers:{"Content-Type":"application/json"}});
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:ORIGIN+"/",beforeParse(w){
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{}; w.Response=Response; w.HTMLElement.prototype.scrollIntoView=function(){};
  w.navigator.serviceWorker={register:()=>Promise.resolve({addEventListener(){},update:()=>Promise.resolve()}),addEventListener(){},ready:new Promise(()=>{}),controller:null};
  w.navigator.vibrate=(p)=>{ buzz.push(p); return true; };
  w.navigator.wakeLock={request:()=>{ wakeAsked++; return Promise.resolve({release(){ wakeReleased++; }}); }};
  const node=()=>({connect(){},start(){},stop(){},frequency:{value:0},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}});
  w.AudioContext=function(){ this.state="running"; this.currentTime=0; this.destination={}; this.resume=()=>{}; this.createOscillator=()=>{ tones++; return node(); }; this.createGain=()=>node(); };
  w.localStorage.setItem("hoh_member_v1",JSON.stringify({email:"t@houstonhatzalah.org",unit:"H-24"}));
  w.localStorage.setItem("hoh_sbauth_v1",JSON.stringify({token:"tok",refresh:"ref",exp:Date.now()+3600e3,email:"t@houstonhatzalah.org",sub:"u1"}));
  w.caches={keys:()=>Promise.resolve([]),open:()=>Promise.resolve({keys:()=>Promise.resolve([]),match:()=>Promise.resolve(undefined),put:()=>Promise.resolve()})};
  w.URL.createObjectURL=()=>"blob:x"; w.URL.revokeObjectURL=()=>{};
  w.fetch=(u,o)=>{ u=typeof u==="string"?u:u.url; o=o||{};
    if(o.method && o.method!=="GET"){ writes.push({method:o.method,path:u}); return Promise.resolve(json([])); }
    if(u.indexOf(SB+"/auth/")===0) return Promise.resolve(json({error:"x"}));
    if(u.indexOf("/rest/v1/rpc/")>-1) return Promise.resolve(json({}));
    const m=u.match(/\/rest\/v1\/([a-z_]+)\?/); if(m) return Promise.resolve(json(rows[m[1]]||[]));
    return Promise.resolve(new Response("ok",{status:200})); };
  w.onerror=(m,s,l,c,e)=>errs.push(String(e&&e.stack||m).split("\n")[0]);
}});
const w=dom.window, d=w.document; const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const $=(id)=>d.getElementById(id);
const click=(el)=>el.dispatchEvent(new w.MouseEvent("click",{bubbles:true,cancelable:true}));
const type=(el,v)=>{ el.value=v; el.dispatchEvent(new w.Event("input",{bubbles:true})); };
const hid=(el)=>el.classList.contains("hidden");
// a clock the test can move forward
const realNow=w.Date.now.bind(w.Date); let skew=0; w.Date.now=()=>realNow()+skew;
(async()=>{
  await wait(3200);
  click($("qActions")); await wait(100); click($("qNotes")); await wait(200);
  check("Call Notes opens", $("notesScreen").classList.contains("open"));
  check("HR and RR each have a stopwatch button", !!$("ntHrCnt") && !!$("ntRrCnt"));
  check("the other boxes (BP, SpO2, Temp, BGL) have none", d.querySelectorAll("#notesScreen .nt-cnt").length===2);
  check("counter is closed to begin with", hid($("rcSheet")));

  // --- respirations, timed ---
  click($("ntRrCnt")); await wait(100);
  check("RR stopwatch opens the counter, titled for respirations", !hid($("rcSheet")) && $("rcTitle").textContent==="Count respirations");
  check("respirations default to 30 seconds", d.querySelector("#rcSeg button.on").getAttribute("data-s")==="30" && $("rcClock").textContent==="0:30");
  check("the count box is hidden until time is up", hid($("rcAfter")));
  check("tapping the stopwatch did not type into the RR box", $("ntRr").value==="");
  click($("rcGo")); await wait(300);
  check("Start begins the countdown and the button becomes Stop", $("rcGo").textContent==="Stop" && /^0:(30|29)$/.test($("rcClock").textContent));
  check("the screen is kept awake while counting", wakeAsked===1);
  skew+=10000; await wait(300);
  check("the clock follows real time (10 s later shows about 0:20)", /^0:(20|19)$/.test($("rcClock").textContent));
  check("no buzz before time is up", buzz.length===0);
  skew+=21000; await wait(400);
  check("at 30 seconds it buzzes and beeps", buzz.length===1 && Array.isArray(buzz[0]) && tones===2);
  check("then shows Time's up and asks for the count", /Time.s up/.test($("rcClock").textContent) && !hid($("rcAfter")) && /breaths/.test($("rcQ").textContent));
  check("the screen lock is let go", wakeReleased===1);
  click($("rcUse")); await wait(50);
  check("Use with nothing entered asks for the count and stays open", /Enter your count/.test($("rcErr").textContent) && !hid($("rcSheet")));
  type($("rcN"),"8"); await wait(50);
  check("8 breaths in 30 s = 16 a minute", $("rcMult").textContent==="2" && $("rcRate").textContent==="16" && $("rcUse").textContent==="Use 16 for RR" && $("rcErr").textContent==="");
  type($("rcN"),"abc"); await wait(20);
  check("letters are not a count", $("rcRate").textContent==="–");
  type($("rcN"),"8"); click($("rcUse")); await wait(200);
  check("Use puts 16 in the RR box and closes the counter", $("ntRr").value==="16" && hid($("rcSheet")));
  check("Call Notes is still open underneath", $("notesScreen").classList.contains("open"));
  check("HR box untouched", $("ntHr").value==="");

  // --- pulse, timed ---
  click($("ntHrCnt")); await wait(100);
  check("HR stopwatch opens the counter, titled for pulse, 15 seconds", $("rcTitle").textContent==="Count pulse" && $("rcClock").textContent==="0:15" && hid($("rcAfter")));
  click(d.querySelector('#rcSeg button[data-s="60"]')); await wait(50);
  check("60 seconds can be picked", $("rcClock").textContent==="1:00");
  click(d.querySelector('#rcSeg button[data-s="15"]')); await wait(50);
  click($("rcGo")); await wait(250); click($("rcGo")); await wait(100);
  check("Stop cancels the count and resets the clock", $("rcGo").textContent==="Start" && $("rcClock").textContent==="0:15" && hid($("rcAfter")));
  skew+=20000; await wait(400);
  check("a stopped count never buzzes", buzz.length===1);
  click($("rcGo")); await wait(250); skew+=15500; await wait(400);
  type($("rcN"),"19");
  check("19 beats in 15 s = 76 a minute", /beats/.test($("rcQ").textContent) && $("rcMult").textContent==="4" && $("rcRate").textContent==="76");
  click($("rcAgain")); await wait(50);
  check("Count again goes back to Start with an empty count", $("rcGo").textContent==="Start" && !hid($("rcGo")) && hid($("rcAfter")) && $("rcN").value==="");
  click($("rcGo")); await wait(250); skew+=15500; await wait(400); type($("rcN"),"19"); click($("rcUse")); await wait(200);
  check("Use puts 76 in the HR box, RR keeps its 16", $("ntHr").value==="76" && $("ntRr").value==="16");

  // --- tap along ---
  click($("ntRrCnt")); await wait(100); click($("rcToTap")); await wait(50);
  check("Tap along swaps to the tap screen", hid($("rcTimed")) && !hid($("rcTap")) && $("rcTapRate").textContent==="–");
  click($("rcTapUse")); await wait(20);
  check("Use before tapping asks for at least 3 taps", /at least 3/.test($("rcTapErr").textContent));
  click($("rcTapBtn")); skew+=4000; click($("rcTapBtn")); await wait(20);
  check("two taps is not enough for a rate", $("rcTapRate").textContent==="–" && /Keep tapping/.test($("rcTapHint").textContent));
  skew+=4000; click($("rcTapBtn")); skew+=4000; click($("rcTapBtn")); await wait(20);
  check("a breath every 4 seconds reads 15 a minute", /^15\b/.test($("rcTapRate").textContent) && $("rcTapUse").textContent==="Use 15 for RR");
  click($("rcTapReset")); await wait(20);
  check("Reset clears the taps", $("rcTapRate").textContent==="–");
  click($("rcTapBtn")); skew+=3000; click($("rcTapBtn")); skew+=3000; click($("rcTapBtn")); click($("rcTapUse")); await wait(200);
  check("Use from tap along fills RR (20)", $("ntRr").value==="20" && hid($("rcSheet")));
  click($("ntHrCnt")); await wait(100);
  check("the counter remembers you last used tap along", !hid($("rcTap")) && $("rcTitle").textContent==="Count pulse");
  click($("rcToTimed")); await wait(50);
  check("Timed count swaps back, pulse still 15 s", !hid($("rcTimed")) && $("rcClock").textContent==="0:15");
  click($("rcGo")); await wait(250); click($("rcX")); await wait(200);
  check("closing with X mid-count shuts the counter and leaves HR alone", hid($("rcSheet")) && $("ntHr").value==="76");
  const b=buzz.filter(Array.isArray).length; skew+=20000; await wait(400);
  check("a closed counter never buzzes", buzz.filter(Array.isArray).length===b);
  check("Call Notes still open after closing the counter", $("notesScreen").classList.contains("open"));

  // --- the entry still saves as before ---
  click($("ntAdd")); await wait(100);
  const line=d.querySelector("#ntSets .nt-set-v"); 
  check("Save entry records the counted values", !!line && /HR 76, RR 20/.test(line.textContent));
  const sent=writes.filter(x=>!/\/rpc\/|\/auth\//.test(x.path)); if(sent.length) console.log("   !",JSON.stringify(sent));
  check("nothing was saved to the server by any of this (the app's own check-in aside)", sent.length===0);
  check("no page errors", errs.length===0); errs.slice(0,3).forEach(e=>console.log("   !",e));
  console.log("  ("+pass+" passed, "+fail+" failed)"); process.exit(fail?1:0);
})();
