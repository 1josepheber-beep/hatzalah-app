// Call statistics (1.16.0): the import parser + name matching, the member's My Standing
// with real counts and history, and Admin → Call stats. Reuses the jump bag harness boot.
const ROOT=process.env.HOH_ROOT||require("path").join(__dirname,"..","..");
const fs=require("fs"); const {JSDOM}=require("jsdom");
const html=fs.readFileSync(ROOT+"/index.html","utf8");
const ORIGIN="https://houstonhatzalahapp.org", SB="https://gcvbohdarppaolqhdnri.supabase.co";
let pass=0, fail=0; const check=(l,ok)=>{ console.log((ok?"  PASS ":"  FAIL ")+l); ok?pass++:fail++; };
const ITEMS=[{id:1,order_col:1,pouch:"Main compartment",name:"Gloves (box)",qty:"1",expires:"",active:"X"}];
const jb=fs.readFileSync(__dirname+"/jumpbag.js","utf8"); eval(jb.slice(jb.indexOf("function boot(o){"), jb.indexOf("const wait=")));
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
const click=(w,el)=>el.dispatchEvent(new w.MouseEvent("click",{bubbles:true}));
const secBtn=(d,label)=>[...d.querySelectorAll("#admSecs .adm-secit")].find(x=>x.getAttribute("data-label")===label);
const q=(d)=>{ const n=new Date(); return n.getFullYear()+"-Q"+(Math.floor(n.getMonth()/3)+1); };
const prevQ=(p,k)=>{ const m=/^(\d{4})-Q(\d)$/.exec(p); let i=+m[1]*4+(+m[2]-1)-k; return Math.floor(i/4)+"-Q"+((i%4)+1); };
const cur=q(), p1=prevQ(cur,1), p2=prevQ(cur,2);

(async()=>{
  // ===== 1. member: My Standing with real numbers
  const stats=[
    {id:1,unit:"H-24",crew_name:"JOSEPH EBER",period:cur,total:17,lead:3,driver:7,other:7,unknown:0,source:"eso",updated_at:"2026-11-22T17:00:00Z"},
    {id:2,unit:"H-24",crew_name:"JOSEPH EBER",period:p1,total:36,lead:6,driver:14,other:14,unknown:2,source:"eso",updated_at:"2026-11-22T17:00:00Z"},
    {id:3,unit:"H-24",crew_name:"JOSEPH EBER",period:p2,total:12,lead:5,driver:4,other:3,unknown:0,source:"eso",updated_at:"2026-11-22T17:00:00Z"},
    {id:4,unit:"H-22",crew_name:"JOSEPH FRIED",period:cur,total:4,lead:1,driver:1,other:2,unknown:0,source:"eso",updated_at:"2026-11-22T17:00:00Z"}];
  let a=boot({}); a.rows.roster[0].status="Primary"; a.rows.call_stats=stats.map(s=>Object.assign({},s)); a.rows.call_stats_names=[]; await wait(3200);
  click(a.w,a.d.getElementById("rstatus")); await wait(500);
  let sb=a.d.getElementById("standBody");
  if(!/calls this quarter/.test(sb.textContent)) console.log("   standBody:", sb.textContent.replace(/\s+/g," ").slice(0,300));
  check("My Standing shows this quarter's real count with the Lead / Driver / Other split", /17 calls this quarter/.test(sb.textContent) && /3\s*Lead/.test(sb.querySelector(".stand-roles").textContent.replace(/\s+/g," ")) && /7\s*Driver/.test(sb.querySelector(".stand-roles").textContent.replace(/\s+/g," ")));
  check("…measured against the Primary minimum (15): '2 above'", /2 above/.test(sb.textContent) && /min 15 for Primary/.test(sb.textContent));
  check("previous quarters listed with their counts, under-minimum ones in red", sb.querySelectorAll(".stand-histrow:not(.head)").length===2 && /36/.test(sb.querySelectorAll(".stand-histrow:not(.head)")[0].textContent) && sb.querySelectorAll(".stand-histrow:not(.head)")[1].querySelector(".low"));
  check("the footer says where the numbers come from and when", /Counts come from ESO records/.test(sb.textContent) && /updated Nov 22, 2026/.test(sb.textContent));
  check("no 'Coming soon' / example wording any more", !/Coming soon|not real yet|Example only/.test(sb.textContent));
  // under the minimum
  a=boot({}); a.rows.roster[0].status="Primary"; a.rows.call_stats=[Object.assign({},stats[0],{total:9,lead:2,driver:3,other:4})]; a.rows.call_stats_names=[]; await wait(3200);
  click(a.w,a.d.getElementById("rstatus")); await wait(500); sb=a.d.getElementById("standBody");
  check("under the minimum: '6 more needed' and the card is flagged", /6 more/.test(sb.textContent) && !!sb.querySelector(".stand-card.under"));
  // nothing on record
  a=boot({}); a.rows.roster[0].status="Primary"; a.rows.call_stats=[]; a.rows.call_stats_names=[]; await wait(3200);
  click(a.w,a.d.getElementById("rstatus")); await wait(500); sb=a.d.getElementById("standBody");
  check("no rows at all: a plain 'No data yet' screen with the tiers, no made-up numbers", /No data yet/.test(sb.textContent) && !/calls this quarter/.test(sb.textContent) && /15\+ calls/.test(sb.textContent));
  check("no page errors (member)", a.errs.length===0); a.errs.slice(0,3).forEach(e=>console.log("   !",e));

  // ===== 2. the parser and the name matching (through the page's own functions)
  const b=boot({admin:true}); b.rows.roster[0].status="Primary"; b.rows.roster[1].status="Primary"; b.rows.call_stats=stats.map(s=>Object.assign({},s)); b.rows.call_stats_names=[];
  b.rows.roster.push({id:9,unit:"H-42",first_name:"Israel",last_name:"Leibowitz",email:"i@x.org",active:"X",type:"Responder",status:"Primary"},
    {id:10,unit:"D-230",first_name:"Yitzchak",last_name:"Abramovitz",email:"ya@x.org",active:"No",type:"Dispatcher"},
    {id:11,unit:"H-44",first_name:"Yitzchak",last_name:"Abramovitz",email:"yb@x.org",active:"X",type:"Responder",status:"Backup"},
    {id:12,unit:"H-38",first_name:"Naftali",last_name:"Kraus",email:"nk@x.org",active:"No",type:"Responder"});
  await wait(3200);
  const w=b.w.HOH_TEST;
  console.log("   match:", ["JOSEPH EBER","Yisroel Leibowitz","NAFTALI KRAUSS","Yitzchak Abramovitz","ELIMELECH (ELI) FRIED","Joseph Eber, MD","TECHSUPPORT ESO"].map(n=>n+"="+w.csMatchUnit(n)).join(" "));
  check("names: exact, Yisroel/Israel by unique last name, Krauss/Kraus, the active responder over the inactive dispatcher, '(Eli)' and ', MD' ignored",
    w.csMatchUnit("JOSEPH EBER")==="H-24" && w.csMatchUnit("Yisroel Leibowitz")==="H-42" && w.csMatchUnit("NAFTALI KRAUSS")==="H-38" && w.csMatchUnit("Yitzchak Abramovitz")==="H-44" && w.csMatchUnit("ELIMELECH (ELI) FRIED")==="H-22" && w.csMatchUnit("Joseph Eber, MD")==="H-24" && w.csMatchUnit("TECHSUPPORT ESO")==="");
  const csv="Crew Full Name,ESO Record Created Date,Crew Standard Role,Incident Number\n"+
    "JOSEPH EBER,10/02/2026,Lead,26-0001\nJOSEPH EBER,10/02/2026,Lead,26-0001\nJOSEPH EBER,10/05/2026,Driver,26-0002\nJOSEPH EBER,11/01/2026,Other,26-0003\nJoseph Eber,11/02/2026,,26-0004\n"+
    "Yisroel Leibowitz,10/09/2026,Driver,26-0005\nTECHSUPPORT ESO,10/09/2026,Other,26-0006\n"+
    "JOSEPH EBER,09/28/2026,Lead,26-0000\n";
  const P=w.csParse(csv);
  const je=P.rows.find(r=>r.crew_name==="JOSEPH EBER"&&r.period==="2026-Q4");
  check("parser: one row per crew member per quarter, the same incident counted once, roles split, blank role = unknown, name spelling kept apart  "+JSON.stringify(je), !!je && je.total===3 && je.lead===1 && je.driver===1 && je.other===1 && P.rows.some(r=>r.crew_name==="Joseph Eber"&&r.unknown===1));
  check("parser: a file that starts mid-quarter leaves that quarter alone and says so", !P.rows.some(r=>r.period==="2026-Q3") && P.warnings.some(x=>/Q3 2026 is only partly covered/.test(x)));
  check("parser: units filled from the roster, unknown names reported, last-name-only matches flagged for a look", P.rows.find(r=>r.crew_name==="Yisroel Leibowitz").unit==="H-42" && P.unmatched.join()==="TECHSUPPORT ESO" && P.loose.length===1 && /Yisroel Leibowitz → Leibowitz, Israel \(H-42\)/.test(P.loose[0]));
  const pre=w.csParse("Crew Full Name\tQuarter\tRole\tCalls\nJOSEPH EBER\t2026-Q3\tLead\t6\nJOSEPH EBER\tQ3 2026\tDriver\t14\nJOSEPH EBER\t2026-Q3\tOther\t16");
  check("parser: a pre-counted tab-separated list with a Quarter column (both spellings)", pre.rows.length===1 && pre.rows[0].period==="2026-Q3" && pre.rows[0].total===36 && pre.rows[0].driver===14 && pre.format==="counts");
  check("parser: a useless paste gets a plain error", /header row/.test(w.csParse("hello").error) && /crew name column/.test(w.csParse("a,b\n1,2").error));

  // ===== 3. admin: Call stats section, import, link a name
  click(b.w,[...b.d.querySelectorAll("#grid .tile")].find(t=>/Admin/.test(t.textContent))); await wait(600);
  check("admin has a 'Call stats' section under People", !!secBtn(b.d,"Call stats"));
  click(b.w,secBtn(b.d,"Call stats")); await wait(500);
  const pane=b.d.getElementById("admGenPane");
  const rowsTxt=[...pane.querySelectorAll(".cs-row:not(.head)")].map(r=>[...r.children].map(c=>c.textContent.replace(/\s+/g," ").trim()).join(" | "));
  check("the table lists active responders for this quarter, most calls first, with Lead/Driver/Other  ("+rowsTxt.slice(0,2).join(" | ")+")", /^Eber, Joseph/.test(rowsTxt[0]) && /\| 17 \| 3 \| 7 \| 7$/.test(rowsTxt[0]) && rowsTxt.some(t=>/^Fried, Joseph/.test(t) && /\| 4 \| 1 \| 1 \| 2$/.test(t)));
  check("the under-minimum count in the header and red numbers for those under", /under minimum/.test(pane.querySelector(".adm-mh .u").textContent) && !!pane.querySelector(".cs-row .low"));
  click(b.w,[...pane.querySelectorAll('[data-csu]')].find(x=>x.getAttribute("data-csu")==="H-24")); await wait(200);
  check("tapping a member shows their quarter history", /Eber, Joseph/.test(pane.querySelector("h3").textContent) && pane.querySelectorAll(".cs-table.plain .cs-row:not(.head)").length===3 && /All time/.test(pane.textContent) && /65/.test(pane.textContent));
  click(b.w,pane.querySelector("#csBackLink")); await wait(100);
  click(b.w,pane.querySelector("#csImportBtn")); await wait(200);
  check("Import screen with a paste box and a source picker", !!pane.querySelector("#csPaste") && !!pane.querySelector("#csSource"));
  pane.querySelector("#csPaste").value=csv; click(b.w,pane.querySelector("#csParseBtn")); await wait(200);
  check("Check the data: a preview with counts, the partial-quarter warning, the loose match and the unmatched name", /responder-quarters/.test(pane.querySelector(".cs-preview").textContent) && /partly covered/.test(pane.querySelector(".cs-preview").textContent) && /please check: Yisroel Leibowitz/.test(pane.querySelector(".cs-preview").textContent) && /TECHSUPPORT ESO/.test(pane.querySelector(".cs-preview").textContent));
  b.writes.length=0; click(b.w,pane.querySelector("#csApplyBtn")); await wait(400);
  const up=b.writes.find(x=>/^call_stats\?on_conflict=crew_name,period,source/.test(x.path)); console.log("   writes:", b.writes.map(x=>x.method+" "+x.path+" "+(x.body&&x.body.length)).join(" ; "));
  const ln=b.writes.find(x=>/^call_stats_names\?on_conflict/.test(x.path));
  check("Import upserts the rows (unit filled, source eso) and saves the new name links", !!up && up.body.length===4 && up.body.every(r=>r.source==="eso"&&r.period==="2026-Q4") && up.body.find(r=>r.crew_name==="Yisroel Leibowitz").unit==="H-42" && /merge-duplicates/.test(up.prefer||"") && !!ln && ln.body.some(x=>x.crew_name==="Yisroel Leibowitz"&&x.unit==="H-42"));
  // an unlinked name in the stored data can be linked from the import screen
  b.rows.call_stats.push({id:9,unit:"",crew_name:"MOSHE K",period:cur,total:5,lead:1,driver:2,other:2,unknown:0,source:"eso",updated_at:"2026-11-22T17:00:00Z"});
  click(b.w,secBtn(b.d,"Call stats")); await wait(400);
  check("the table warns about names not linked to a member", /not linked to a member: MOSHE K/.test(pane.textContent));
  click(b.w,pane.querySelector("#csFixNames")); await wait(200);
  const sel=pane.querySelector('[data-cslink="MOSHE K"]'); check("…and the import screen offers a member picker for it", !!sel);
  b.writes.length=0; sel.value="H-22"; sel.dispatchEvent(new b.w.Event("change",{bubbles:true})); await wait(400);
  check("picking a member saves the link and moves that name's rows to the member", b.writes.some(x=>/^call_stats_names/.test(x.path) && x.body[0].unit==="H-22") && b.writes.some(x=>x.method==="PATCH" && /^call_stats\?crew_name=eq\.MOSHE%20K/.test(x.path) && x.body.unit==="H-22"));
  check("no page errors (admin)", b.errs.length===0); b.errs.slice(0,3).forEach(e=>console.log("   !",e));
  console.log("  ("+pass+" passed, "+fail+" failed)"); process.exit(fail?1:0);
})();
