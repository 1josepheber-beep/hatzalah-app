// Preview for the Standings setting + My Standing screen (1.9.0). Run from scratch/tests:
//   node ../catalog/preview-standings.js      -> scratch/catalog/out/preview/*.png
const {chromium}=require("playwright"); const fs=require("fs"); const path=require("path");
const ROOT=path.join(__dirname,"..",".."); const OUT=path.join(__dirname,"out","preview"); fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(ROOT+"/index.html","utf8"); const SB="https://gcvbohdarppaolqhdnri.supabase.co";
const errs=[];
async function openCtx(b, opts, asUnit, demoStatus){
  const ctx=await b.newContext(opts); const pg=await ctx.newPage();
  pg.on("pageerror",e=>errs.push(String(e)));
  await pg.route("**/*",r=>{ const u=r.request().url();
    if(u==="https://houstonhatzalahapp.org/") return r.fulfill({contentType:"text/html",body:html});
    if(/\/demo\/demo-data\.js/.test(u)){
      let js=fs.readFileSync(ROOT+"/demo/demo-data.js","utf8");
      if(demoStatus){ // make the viewed member carry this status
        js=js.replace(new RegExp('("unit":"'+asUnit+'"[^}]*?"status":")[^"]*(")'), "$1"+demoStatus+"$2");
      }
      return r.fulfill({contentType:"application/javascript",body:js});
    }
    if(/houstonhatzalahapp\.org\//.test(u)){ const p=ROOT+decodeURIComponent(new URL(u).pathname.split("?")[0]); if(fs.existsSync(p)&&fs.statSync(p).isFile()){ const ext=path.extname(p).slice(1); const ct={js:"application/javascript",png:"image/png",webp:"image/webp",jpg:"image/jpeg",html:"text/html",json:"application/json",webmanifest:"application/manifest+json"}[ext]||"application/octet-stream"; return r.fulfill({contentType:ct,body:fs.readFileSync(p)}); } return r.abort(); }
    if(u.indexOf(SB+"/rest/v1/rpc/guest_demo")===0) return r.fulfill({contentType:"application/json",body:JSON.stringify({ok:true,name:"Visiting org"})});
    if(u.indexOf(SB)===0) return r.fulfill({status:403,contentType:"application/json",body:"{}"});
    return r.abort(); });
  await pg.addInitScript((u)=>{ localStorage.setItem("hoh_demo","demo"); localStorage.setItem("hoh_push_asked","1"); if(u) localStorage.setItem("hoh_demo_as",u); }, asUnit||"");
  await pg.goto("https://houstonhatzalahapp.org/"); await pg.waitForTimeout(2500);
  return {pg,ctx};
}
(async()=>{
  const b=await chromium.launch();
  const PHONE={viewport:{width:412,height:860},deviceScaleFactor:2,hasTouch:true,isMobile:true};
  // My Standing as three members with different statuses (header badge -> screen)
  for(const [unit,status,name] of [["H-101","Primary","primary"],["H-101","Backup","backup"],["H-101","Observer","observer"]]){
    const {pg,ctx}=await openCtx(b,PHONE,unit,status);
    await pg.evaluate(()=>document.getElementById("rstatus").click()); await pg.waitForTimeout(600);
    await pg.screenshot({path:OUT+"/standing-"+name+".png", fullPage:false});
    const txt=await pg.evaluate(()=>document.getElementById("standBody").innerText.replace(/\n+/g," | "));
    console.log(name+":", txt.slice(0,400));
    await ctx.close();
  }
  // Admin -> Settings -> Standings card (desktop), then a bad value to show the check
  const {pg,ctx}=await openCtx(b,{viewport:{width:1366,height:800},deviceScaleFactor:1.5},"H-100");
  await pg.evaluate(()=>{ const all=[...document.querySelectorAll("#grid .tile")]; const t=all.find(t=>(t.querySelector(".lab")||t).textContent.trim()==="Admin"); t.click(); }); await pg.waitForTimeout(1200);
  await pg.evaluate(()=>[...document.querySelectorAll("#admSecMenu .adm-secit")].find(x=>x.getAttribute("data-label")==="Settings").click()); await pg.waitForTimeout(900);
  await pg.evaluate(()=>{ const a=[...document.querySelectorAll("#admGenPane .adm-item")].find(x=>x.querySelector(".adm-itemt").textContent.trim()==="Standings"); a.classList.add("open"); a.scrollIntoView({block:"start"}); window.scrollBy(0,-70); });
  await pg.waitForTimeout(300); await pg.screenshot({path:OUT+"/settings-standings.png"});
  // type a Primary minimum lower than Backup and press save
  const ok=await pg.evaluate(()=>{ const lbls=[...document.querySelectorAll("#admGenPane label.adm-f")]; const f=lbls.find(l=>/Primary Minimum/.test(l.textContent)); const inp=f&&f.querySelector("input"); if(!inp) return "no input"; inp.value="4"; inp.dispatchEvent(new Event("input",{bubbles:true})); document.getElementById("admGenSave").click(); return "clicked"; });
  await pg.waitForTimeout(500);
  const msg=await pg.evaluate(()=>document.getElementById("admGenMsg").textContent);
  console.log("save check:", ok, "->", msg);
  await pg.screenshot({path:OUT+"/settings-standings-check.png"});
  await ctx.close(); await b.close();
  console.log("page errors:", errs.length? errs : "none");
})();
