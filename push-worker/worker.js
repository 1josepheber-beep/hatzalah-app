/* Hatzalah of Houston - push notification sender (Cloudflare Worker)
 *
 * The app on an admin's phone calls this with the admin's own sign-in
 * token and a message. The worker checks that the caller really is an
 * active admin, loads the phones that allowed notifications, encrypts
 * the message for each one (RFC 8291), signs the request (VAPID,
 * RFC 8292) and hands it to Apple / Google / Mozilla to deliver.
 *
 * Secrets (Settings -> Variables and Secrets on the worker):
 *   SUPABASE_URL          https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY  the service_role key (never the anon key)
 *   VAPID_PUBLIC          base64url, 65-byte uncompressed P-256 point
 *   VAPID_PRIVATE_JWK     the private key as JSON ({"kty":"EC",...})
 *   VAPID_SUBJECT         mailto:someone@houstonhatzalah.org
 *   ALLOWED_ORIGIN        https://houstonhatzalahapp.org
 *   CRON_KEY              any long random string; the nightly Apps Script sends it as X-Cron-Key
 */

var WORKER_VERSION = 4;            /* shown on GET, so a deploy can be checked */
var TTL_SECONDS = 86400;           /* keep trying to deliver for a day */
var RECORD_SIZE = 4096;

/* ---------- small helpers ---------- */
function b64u(bytes){
  var s=""; bytes=new Uint8Array(bytes);
  for(var i=0;i<bytes.length;i++) s+=String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function fromB64u(str){
  str=String(str||"").replace(/-/g,"+").replace(/_/g,"/");
  while(str.length%4) str+="=";
  var bin=atob(str), out=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}
function utf8(s){ return new TextEncoder().encode(s); }
function concat(){
  var n=0, i, a; for(i=0;i<arguments.length;i++) n+=arguments[i].length;
  var out=new Uint8Array(n), p=0;
  for(i=0;i<arguments.length;i++){ a=arguments[i]; out.set(a,p); p+=a.length; }
  return out;
}
async function hkdf(salt, ikm, info, bits){
  var key=await crypto.subtle.importKey("raw", ikm, {name:"HKDF"}, false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF", hash:"SHA-256", salt:salt, info:info}, key, bits));
}

/* ---------- RFC 8291: encrypt one message for one subscription ----------
   opts.asKeys / opts.salt let a test pin the ephemeral key and salt so the
   output can be compared with the RFC's worked example. */
async function encryptPayload(plaintext, p256dh, auth, opts){
  opts=opts||{};
  var uaPublic=fromB64u(p256dh), authSecret=fromB64u(auth);
  if(uaPublic.length!==65 || authSecret.length!==16) throw new Error("bad subscription keys");
  var asKeys = opts.asKeys || await crypto.subtle.generateKey({name:"ECDH", namedCurve:"P-256"}, true, ["deriveBits"]);
  var asPublic=new Uint8Array(await crypto.subtle.exportKey("raw", asKeys.publicKey));
  var uaKey=await crypto.subtle.importKey("raw", uaPublic, {name:"ECDH", namedCurve:"P-256"}, false, []);
  var ecdhSecret=new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH", public:uaKey}, asKeys.privateKey, 256));
  var keyInfo=concat(utf8("WebPush: info\0"), uaPublic, asPublic);
  var ikm=await hkdf(authSecret, ecdhSecret, keyInfo, 256);
  var salt = opts.salt || crypto.getRandomValues(new Uint8Array(16));
  var cek=await hkdf(salt, ikm, utf8("Content-Encoding: aes128gcm\0"), 128);
  var nonce=await hkdf(salt, ikm, utf8("Content-Encoding: nonce\0"), 96);
  var padded=concat(plaintext, new Uint8Array([2]));          /* 0x02 = last record */
  var aes=await crypto.subtle.importKey("raw", cek, {name:"AES-GCM"}, false, ["encrypt"]);
  var cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM", iv:nonce, tagLength:128}, aes, padded));
  var header=new Uint8Array(16+4+1+65);
  header.set(salt,0);
  header[16]=(RECORD_SIZE>>>24)&255; header[17]=(RECORD_SIZE>>>16)&255; header[18]=(RECORD_SIZE>>>8)&255; header[19]=RECORD_SIZE&255;
  header[20]=65; header.set(asPublic,21);
  return concat(header, cipher);
}

/* ---------- RFC 8292: VAPID authorization ---------- */
var vapidCache={};
async function vapidHeader(endpoint, env){
  var aud=new URL(endpoint).origin;
  var now=Math.floor(Date.now()/1000);
  var hit=vapidCache[aud];
  if(hit && hit.exp-now>600) return hit.value;
  var exp=now+12*3600;
  var jwk=JSON.parse(env.VAPID_PRIVATE_JWK);
  var key=await crypto.subtle.importKey("jwk", jwk, {name:"ECDSA", namedCurve:"P-256"}, false, ["sign"]);
  var head=b64u(utf8(JSON.stringify({typ:"JWT", alg:"ES256"})));
  var body=b64u(utf8(JSON.stringify({aud:aud, exp:exp, sub:env.VAPID_SUBJECT||"mailto:admin@houstonhatzalah.org"})));
  var sig=new Uint8Array(await crypto.subtle.sign({name:"ECDSA", hash:"SHA-256"}, key, utf8(head+"."+body)));
  var value="vapid t="+head+"."+body+"."+b64u(sig)+", k="+env.VAPID_PUBLIC;
  vapidCache[aud]={exp:exp, value:value};
  return value;
}

/* ---------- send one ---------- */
async function sendOne(sub, payloadBytes, env, opts){
  opts=opts||{};
  var body=await encryptPayload(payloadBytes, sub.p256dh, sub.auth);
  var res=await fetch(sub.endpoint, {
    method:"POST",
    headers:{ "Content-Type":"application/octet-stream", "Content-Encoding":"aes128gcm",
              "TTL":String(opts.ttl||TTL_SECONDS), "Urgency":opts.urgency||"normal",
              "Authorization": await vapidHeader(sub.endpoint, env) },
    body: body
  });
  return res.status;
}

/* ---------- Supabase helpers (service role: bypasses row security) ---------- */
function sbHeaders(env, extra){
  var h={ apikey:env.SUPABASE_SERVICE_KEY, Authorization:"Bearer "+env.SUPABASE_SERVICE_KEY };
  if(extra) for(var k in extra) h[k]=extra[k];
  return h;
}
async function sbGet(env, path){
  var r=await fetch(env.SUPABASE_URL+"/rest/v1/"+path, {headers:sbHeaders(env)});
  if(!r.ok) throw new Error("supabase "+r.status+" on "+path.split("?")[0]);
  return r.json();
}
function normUnit(u){ return String(u||"").toUpperCase().replace(/[^A-Z0-9]/g,""); }

/* Who is calling? The app sends the admin's own Supabase token. */
async function callerIsAdmin(req, env){
  var auth=req.headers.get("Authorization")||"";
  var m=auth.match(/^Bearer\s+(.+)$/i); if(!m) return null;
  var r=await fetch(env.SUPABASE_URL+"/auth/v1/user", {headers:{ apikey:env.SUPABASE_SERVICE_KEY, Authorization:"Bearer "+m[1] }});
  if(!r.ok) return null;
  var u=await r.json(); var email=String((u&&u.email)||"").trim().toLowerCase();
  if(!email) return null;
  var rows=await sbGet(env, "roster?select=unit,first_name,admin,active&email=ilike."+encodeURIComponent(email));
  var row=(rows||[])[0]; if(!row) return null;
  var active=!/^(no|off|false|0)$/i.test(String(row.active||"").trim());
  var admin=/^(x|yes|true)$/i.test(String(row.admin||"").trim());
  return (active && admin) ? row : null;
}

function cors(env, extra){
  var h={ "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN||"*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Cron-Key",
          "Access-Control-Max-Age": "86400" };
  if(extra) for(var k in extra) h[k]=extra[k];
  return h;
}
function json(env, obj, status){
  return new Response(JSON.stringify(obj), {status:status||200, headers:cors(env, {"Content-Type":"application/json"})});
}

/* ---------- Scene Timer alarms (runs once a minute from a Cron Trigger) ----------
   The app writes "ring this phone at this time" into scene_alarms when a
   responder starts or snoozes the timer, and deletes it on End. Each run takes
   the alarms due within the next minute, claims each one (so two overlapping
   runs never both ring), waits for the exact second, sends the push to that
   one phone, and removes the row. A phone's clock is frozen while the app is
   closed; this is what rings it anyway. */
var ALARM_LOOKAHEAD_MS = 70*1000;
var ALARM_TTL_SECONDS  = 180;      /* an alarm delivered minutes late is worse than none */
var ALARM_REPEAT_MS    = 60*1000;  /* ring again every minute until Snooze / End */
function sleep(ms){ return new Promise(function(res){ setTimeout(res, ms); }); }

async function fireAlarm(a, env, log, maxRepeats){
  /* claim it: only the run whose update actually changes the row goes on */
  var claim=await fetch(env.SUPABASE_URL+"/rest/v1/scene_alarms?id=eq."+encodeURIComponent(a.id)+"&sent_at=is.null",
    { method:"PATCH", headers:sbHeaders(env, {"Content-Type":"application/json", Prefer:"return=representation"}),
      body:JSON.stringify({sent_at:new Date().toISOString()}) });
  var got=claim.ok ? await claim.json() : [];
  if(!got || !got.length){ log.skipped++; return; }
  var wait=new Date(a.due_at).getTime()-Date.now();
  if(wait>0) await sleep(Math.min(wait, ALARM_LOOKAHEAD_MS+30000));
  var subs=await sbGet(env, "push_subs?select=id,unit,endpoint,p256dh,auth&endpoint=eq."+encodeURIComponent(a.endpoint)+"&limit=1");
  var sub=(subs||[])[0];
  var st=0, result="";
  if(sub){
    var payload=utf8(JSON.stringify({ title:String(a.title||"Scene Timer"), body:String(a.body||""), url:"./", tag:"scene-timer", kind:"scene-timer" }));
    var err="";
    try{ st=await sendOne(sub, payload, env, {ttl:ALARM_TTL_SECONDS, urgency:"high"}); }catch(e){ st=0; err=String((e&&e.message)||e); }
    if(st>=200 && st<300){ log.sent++; result="sent "+st; }
    else { log.failed++; log.errors[String(st)]=(log.errors[String(st)]||0)+1; result="failed "+(st||err||"?"); }
    if(st===404 || st===410){
      try{ await fetch(env.SUPABASE_URL+"/rest/v1/push_subs?id=eq."+encodeURIComponent(sub.id), {method:"DELETE", headers:sbHeaders(env,{Prefer:"return=minimal"})}); }catch(e){}
      result+=" (phone no longer registered - removed)";
    }
  } else { log.nophone++; result="no phone registered for this endpoint"; }
  /* Went through, and nobody has pressed Snooze or End yet: ring again in a
     minute, up to the admin's "Scene Alarm Repeats". Snooze and End rewrite
     or remove the row from the app, which ends the series. */
  var done=Number(a.repeats||0)+1, again=(st>=200 && st<300) && done<=Number(maxRepeats||0);
  var patch;
  if(again){
    patch={ due_at:new Date(new Date(a.due_at).getTime()+ALARM_REPEAT_MS).toISOString(), sent_at:null, repeats:done,
            result:result+" (ring "+done+" of "+(Number(maxRepeats)+1)+", again in a minute) at "+new Date().toISOString() };
    log.repeats++;
  } else {
    /* The row stays for a day with the outcome written on it, so a miss can be
       looked up in Supabase; the next timer on the same phone reuses the row. */
    patch={ result:result+(done>1?" (ring "+done+" of "+(Number(maxRepeats)+1)+", done)":"")+" at "+new Date().toISOString() };
  }
  try{ await fetch(env.SUPABASE_URL+"/rest/v1/scene_alarms?id=eq."+encodeURIComponent(a.id),
         {method:"PATCH", headers:sbHeaders(env,{"Content-Type":"application/json", Prefer:"return=minimal"}),
          body:JSON.stringify(patch)}); }catch(e){}
}

/* The admin's "Scene Alarm Repeats" setting: how many extra rings after the first (default 5). */
async function alarmRepeats(env){
  try{
    var rows=await sbGet(env, "settings?select=value&setting=eq."+encodeURIComponent("Scene Alarm Repeats")+"&limit=1");
    var v=parseInt(String((rows&&rows[0]&&rows[0].value)||"").trim(),10);
    return (isFinite(v) && v>=0) ? Math.min(v,30) : 5;
  }catch(e){ return 5; }
}
async function runAlarms(env){
  var log={due:0, sent:0, failed:0, skipped:0, nophone:0, repeats:0, errors:{}};
  var until=new Date(Date.now()+ALARM_LOOKAHEAD_MS).toISOString();
  var rows=await sbGet(env, "scene_alarms?select=id,unit,endpoint,due_at,title,body,repeats&sent_at=is.null&due_at=lte."+encodeURIComponent(until)+"&order=due_at.asc&limit=200");
  log.due=(rows||[]).length;
  var maxRepeats=rows.length ? await alarmRepeats(env) : 0;
  await Promise.all((rows||[]).map(function(a){ return fireAlarm(a, env, log, maxRepeats).catch(function(e){ log.failed++; log.errors[String(e&&e.message||e)]=1; }); }));
  /* yesterday's rows - sent ones kept for lookup, and leftovers from a phone that ended its timer with no signal */
  try{
    var old=new Date(Date.now()-86400000).toISOString();
    await fetch(env.SUPABASE_URL+"/rest/v1/scene_alarms?due_at=lt."+encodeURIComponent(old), {method:"DELETE", headers:sbHeaders(env,{Prefer:"return=minimal"})});
  }catch(e){}
  return log;
}

export default {
  /* Cron Trigger: "* * * * *" (every minute) */
  async scheduled(event, env, ctx){
    ctx.waitUntil(runAlarms(env).then(function(log){ if(log.due) console.log("scene alarms", JSON.stringify(log)); },
                                      function(e){ console.log("scene alarms failed", String(e&&e.message||e)); }));
  },

  async fetch(req, env){
    if(req.method==="OPTIONS") return new Response(null, {status:204, headers:cors(env)});
    if(req.method==="GET"){
      /* "?run=alarms" runs the once-a-minute check right now and shows what it did
         (handy when checking the setup; it only ever sends alarms that are due). */
      var u=new URL(req.url);
      if(u.searchParams.get("run")==="alarms"){
        try{ var log=await runAlarms(env); return json(env, {ok:true, service:"hoh-push", version:WORKER_VERSION, alarms:log}); }
        catch(e){ return json(env, {ok:false, service:"hoh-push", version:WORKER_VERSION, error:String((e&&e.message)||e)}, 500); }
      }
      return json(env, {ok:true, service:"hoh-push", version:WORKER_VERSION, publicKey:env.VAPID_PUBLIC||""});
    }
    if(req.method!=="POST") return json(env, {ok:false, error:"method"}, 405);
    var body; try{ body=await req.json(); }catch(e){ return json(env, {ok:false, error:"bad json"}, 400); }

    /* The nightly Apps Script has no admin sign-in; it shows the shared CRON_KEY
       secret instead (set on the worker AND as PUSH_CRON_KEY in the script). */
    var cronKey=req.headers.get("X-Cron-Key")||"";
    var admin=(cronKey && env.CRON_KEY && cronKey===env.CRON_KEY) ? {unit:"nightly script"} : await callerIsAdmin(req, env);
    if(!admin) return json(env, {ok:false, error:"not an admin"}, 403);

    var title=String(body.title||"").slice(0,120), text=String(body.body||"").slice(0,500);
    if(!title && !text) return json(env, {ok:false, error:"nothing to send"}, 400);
    var audience=String(body.audience||"everyone").trim();
    var url=String(body.url||"./");

    /* who gets it */
    var subs=await sbGet(env, "push_subs?select=id,unit,endpoint,p256dh,auth&order=id.asc&limit=5000");
    var want=null;
    if(/^unit:/i.test(audience)){
      var u=normUnit(audience.slice(5)); want=function(s){ return normUnit(s.unit)===u; };
    } else if(/^admins$/i.test(audience)){
      var roster=await sbGet(env, "roster?select=unit,admin,active");
      var adminUnits={};
      (roster||[]).forEach(function(r){ if(/^(x|yes|true)$/i.test(String(r.admin||"").trim()) && !/^(no|off|false|0)$/i.test(String(r.active||"").trim())) adminUnits[normUnit(r.unit)]=1; });
      want=function(s){ return !!adminUnits[normUnit(s.unit)]; };
    } else want=function(){ return true; };
    var targets=(subs||[]).filter(want);

    var payload=utf8(JSON.stringify({ title:title, body:text, url:url, tag:String(body.tag||("hoh-"+Date.now())), kind:String(body.kind||"announcement") }));
    var sent=0, failed=0, removed=0, errors={};
    var dead=[];
    /* a few at a time; the push services are quick */
    for(var i=0;i<targets.length;i+=20){
      var slice=targets.slice(i,i+20);
      var results=await Promise.all(slice.map(function(s){
        return sendOne(s, payload, env).then(function(st){ return {s:s, st:st}; }, function(err){ return {s:s, st:0, err:String(err&&err.message||err)}; });
      }));
      results.forEach(function(r){
        if(r.st>=200 && r.st<300) sent++;
        else { failed++; errors[String(r.st)]=(errors[String(r.st)]||0)+1;
               if(r.st===404 || r.st===410) dead.push(r.s.id); }
      });
    }
    /* phones that unsubscribed or wiped the app: drop them quietly */
    if(dead.length){
      try{
        var del=await fetch(env.SUPABASE_URL+"/rest/v1/push_subs?id=in.("+dead.join(",")+")", {method:"DELETE", headers:sbHeaders(env, {Prefer:"return=minimal"})});
        if(del.ok) removed=dead.length;
      }catch(e){}
    }
    return json(env, {ok:true, audience:audience, phones:targets.length, sent:sent, failed:failed, removed:removed, errors:errors, by:admin.unit});
  }
};

/* exported for tests */
export { encryptPayload, b64u, fromB64u, vapidHeader, runAlarms };
