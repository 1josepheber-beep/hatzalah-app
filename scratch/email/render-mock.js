// Renders an email mock-up to PNG (desktop + phone widths). Run from scratch/email:
//   node render-mock.js mock-permit.html
const {chromium}=require("playwright"); const fs=require("fs"); const path=require("path");
(async()=>{
  const file=process.argv[2]||"mock-permit.html"; const base=file.replace(/\.html$/,"");
  let html=fs.readFileSync(path.join(__dirname,file),"utf8");
  // inline the logo so the mock renders without the live site
  const b64=fs.readFileSync(path.join(__dirname,"..","..","logo-email.png")).toString("base64");
  html=html.split("https://houstonhatzalahapp.org/logo-email.png").join("data:image/png;base64,"+b64);
  const b=await chromium.launch();
  for(const [w,name] of [[700,"desktop"],[400,"phone"]]){
    const pg=await b.newPage({viewport:{width:w,height:900},deviceScaleFactor:2});
    await pg.setContent(html); await pg.waitForTimeout(300);
    await pg.screenshot({path:path.join(__dirname,base+"-"+name+".png"), fullPage:true}); await pg.close();
  }
  await b.close(); console.log("rendered", base);
})();
