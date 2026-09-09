/* Hatzalah of Houston - service worker */
var CACHE="hoh-v13.4";
var SHELL=["./","./index.html","./proto_index.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./ruleof9.webp"];
self.addEventListener("message",function(e){ if(e.data&&e.data.type==="SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("notificationclick",function(e){
  e.notification.close();
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(function(cs){
    for(var i=0;i<cs.length;i++){ if("focus" in cs[i]) return cs[i].focus(); }
    if(clients.openWindow) return clients.openWindow("./");
  }));
});
self.addEventListener("install",function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}).catch(function(){}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){if(k!==CACHE)return caches.delete(k);}));
  }).then(function(){
    // Drop the saved copy of the page and pull a fresh one, so a stale page can
    // never be served back after an update (that caused an apparent "revert").
    return caches.open(CACHE).then(function(c){
      return Promise.all([c.delete("./index.html"),c.delete("./")]).then(function(){
        return fetch("./index.html",{cache:"reload"}).then(function(res){
          if(res&&res.ok) return c.put("./index.html",res.clone());
        }).catch(function(){});
      });
    });
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET") return;
  var url=new URL(req.url);

  // Supabase data + uploaded images: NETWORK-FIRST, fall back to the last cached
  // copy when offline. This is what lets hospitals, certifications, equipment,
  // cabinets, vitals and the apartment list still work with no signal on a call.
  if(url.hostname.indexOf("supabase.co")>-1){
    e.respondWith(
      fetch(req).then(function(res){
        if(res && res.ok){ var copy=res.clone(); caches.open(CACHE).then(function(c){c.put(req,copy);}); }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          if(hit) return hit;
          // Nothing cached yet: hand back an empty list so the screen degrades
          // gracefully instead of hanging.
          return new Response("[]",{status:200,headers:{"Content-Type":"application/json"}});
        });
      })
    );
    return;
  }

  // Protocol page images: CACHE-FIRST (they never change). Once viewed, they load
  // instantly and work fully offline; only fetch from network on first view.
  if(url.origin===location.origin && (url.pathname.indexOf("/protocols/")>-1||url.pathname.indexOf("/cabinets/")>-1||url.pathname.indexOf("/erg/")>-1||url.pathname.indexOf("/apartments/")>-1)){
    e.respondWith(
      caches.match(req).then(function(hit){
        if(hit && hit.ok) return hit;
        return fetch(req).then(function(res){
          if(res && res.ok){ var copy=res.clone(); caches.open(CACHE).then(function(c){c.put(req,copy);}); }
          return res;
        }).catch(function(){ return hit; });
      })
    );
    return;
  }

  // App's own files (HTML/JS/icons): NETWORK-FIRST with no-store so a new deploy
  // always wins when online; fall back to cache only when offline.
  if(url.origin===location.origin){
    e.respondWith(
      fetch(req,{cache:"no-store"}).then(function(res){
        var copy=res.clone(); caches.open(CACHE).then(function(c){c.put(req,copy);});
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){ return hit || caches.match("./index.html"); });
      })
    );
    return;
  }

  // Cross-origin (map tiles, Leaflet, Google Maps/APIs, fonts): DON'T intercept.
  // Letting the browser fetch these natively keeps the installed PWA's service
  // worker from breaking the map and other third-party resources.
  return;
});