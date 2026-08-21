/* Hatzalah of Houston - service worker */
var CACHE="hoh-v1";
var SHELL=["./","./index.html"];
self.addEventListener("install",function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}));
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
        var copy=res.clone();
        caches.open(CACHE).then(function(c){c.put(req,copy);});
        return res;
      }).catch(function(){return caches.match(req);})
    );
    return;
  }
  // App shell: cache-first
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        if(url.origin===location.origin){
          var copy=res.clone();
          caches.open(CACHE).then(function(c){c.put(req,copy);});
        }
        return res;
      });
    })
  );
});