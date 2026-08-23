/* Hatzalah of Houston - service worker */
var CACHE="hoh-v4";
var SHELL=["./","./index.html","./proto_index.js","./placement.js"];
self.addEventListener("install",function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}).catch(function(){}));
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){if(k!==CACHE)return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch",function(e){
  var req=e.request;
  if(req.method!=="GET") return;
  var url=new URL(req.url);

  // Google Sheets data: network-first, fall back to last cached copy (offline)
  if(url.hostname.indexOf("docs.google.com")>-1){
    e.respondWith(
      fetch(req).then(function(res){
        var copy=res.clone(); caches.open(CACHE).then(function(c){c.put(req,copy);});
        return res;
      }).catch(function(){return caches.match(req);})
    );
    return;
  }

  // Protocol page images: CACHE-FIRST (they never change). Once viewed, they load
  // instantly and work fully offline; only fetch from network on first view.
  if(url.origin===location.origin && (url.pathname.indexOf("/protocols/")>-1||url.pathname.indexOf("/cabinets/")>-1)){
    e.respondWith(
      caches.match(req).then(function(hit){
        return hit || fetch(req).then(function(res){
          var copy=res.clone(); caches.open(CACHE).then(function(c){c.put(req,copy);});
          return res;
        });
      })
    );
    return;
  }

  // App's own files (HTML/JS/icons): NETWORK-FIRST so updates show up when online,
  // fall back to cache only when offline. This means no manual cache clearing.
  if(url.origin===location.origin){
    e.respondWith(
      fetch(req).then(function(res){
        var copy=res.clone(); caches.open(CACHE).then(function(c){c.put(req,copy);});
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){ return hit || caches.match("./index.html"); });
      })
    );
    return;
  }

  // Anything else: try cache, then network
  e.respondWith(caches.match(req).then(function(hit){ return hit || fetch(req); }));
});