/* Hatzalah of Houston - service worker */

/* Two caches, on purpose.

   SHELL is versioned. It holds the app's own files, and it gets wiped on every
   new version so a stale page can never come back after an update.

   DATA is NOT versioned, and is never deleted on update. It holds the things
   that are expensive to fetch and slow to lose: protocol pages, ERG pages,
   cabinet and apartment photos, and the last good copy of every Supabase
   response. Before this split, every deploy emptied the lot, so anyone who
   updated the app started again from nothing and had no offline copy until
   they had re-opened each screen with a signal. */
var VERSION = "16.0";
var SHELL   = "hoh-shell-" + VERSION;
var DATA    = "hoh-data";          /* deliberately has no version in the name */

var SHELL_FILES = ["./","./index.html","./proto_index.js","./manifest.webmanifest",
                   "./icon-192.png","./icon-512.png","./ruleof9.webp"];

/* A dead-slow connection is worse than no connection: fetch() will sit there
   for 30 seconds or more instead of failing, so the screen just hangs. Give the
   network a short window, then serve what we already have. */
var NET_TIMEOUT_MS = 4000;

function timedFetch(req, ms){
  return new Promise(function(resolve, reject){
    var settled = false;
    var timer = setTimeout(function(){ if(!settled){ settled = true; reject(new Error("slow")); } }, ms);
    fetch(req).then(function(res){
      if(settled) return;
      settled = true; clearTimeout(timer); resolve(res);
    }, function(err){
      if(settled) return;
      settled = true; clearTimeout(timer); reject(err);
    });
  });
}

self.addEventListener("message",function(e){
  if(e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("notificationclick",function(e){
  e.notification.close();
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(function(cs){
    for(var i=0;i<cs.length;i++){ if("focus" in cs[i]) return cs[i].focus(); }
    if(clients.openWindow) return clients.openWindow("./");
  }));
});

self.addEventListener("install",function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(function(c){ return c.addAll(SHELL_FILES); }).catch(function(){}));
});

self.addEventListener("activate",function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k === SHELL || k === DATA) return null;   /* keep the current shell and ALL saved content */
        return caches.delete(k);                     /* only older shells go */
      }));
    }).then(function(){
      /* Re-pull the page itself so an update always takes effect immediately. */
      return caches.open(SHELL).then(function(c){
        return Promise.all([c.delete("./index.html"), c.delete("./")]).then(function(){
          return fetch("./index.html",{cache:"reload"}).then(function(res){
            if(res && res.ok) return c.put("./index.html", res.clone());
          }).catch(function(){});
        });
      });
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch",function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);

  if(url.hostname.indexOf("supabase.co") > -1){

    /* Signed document links carry a one-time token, so every request is a
       different URL and caching them would only waste space. These genuinely
       need a connection. */
    if(url.pathname.indexOf("/object/sign/") > -1 || url.search.indexOf("token=") > -1){
      return;
    }

    /* Photos from the public bucket - tile icons, member photos, cabinet
       pictures. These arrive through <img> tags, which are cross-origin
       "no-cors" requests, so the browser hands back an OPAQUE response:
       status 0, res.ok false. Checking res.ok therefore threw every single
       image away and nothing was ever saved. Accept opaque here, and serve
       cache-first since an uploaded file never changes under the same name. */
    if(url.pathname.indexOf("/object/public/") > -1){
      e.respondWith(
        caches.match(req.url, {ignoreVary:true}).then(function(hit){
          if(hit) return hit;
          return fetch(req).then(function(res){
            if(res && (res.ok || res.type === "opaque")){
              var copy = res.clone();
              caches.open(DATA).then(function(c){ c.put(req.url, copy); });
            }
            return res;
          }).catch(function(){ return hit; });
        })
      );
      return;
    }

    /* Everything else from Supabase - the roster, hospitals, certifications,
       equipment, cabinets, apartments - tries the network briefly, then falls
       back to the last good copy. */
    e.respondWith(
      timedFetch(req, NET_TIMEOUT_MS).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          /* Key on the URL alone. Supabase sends a Vary header and the
             Authorization token changes between sessions, so matching on the
             full Request could never find what we had already saved. */
          caches.open(DATA).then(function(c){ c.put(req.url, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req.url, {cacheName:DATA, ignoreVary:true}).then(function(hit){
          if(hit) return hit;
          return caches.match(req.url, {ignoreVary:true}).then(function(any){
            if(any) return any;
            /* Nothing saved yet. Hand back an empty list so the screen shows its
               "nothing here" state instead of spinning forever. */
            return new Response("[]",{status:200,headers:{"Content-Type":"application/json"}});
          });
        });
      })
    );
    return;
  }

  /* Protocol, ERG, cabinet and apartment images never change once published, so
     serve them from disk the moment we have them. */
  if(url.origin === location.origin &&
     (url.pathname.indexOf("/protocols/") > -1 || url.pathname.indexOf("/cabinets/") > -1 ||
      url.pathname.indexOf("/erg/") > -1 || url.pathname.indexOf("/apartments/") > -1)){
    e.respondWith(
      caches.match(req.url, {ignoreVary:true}).then(function(hit){
        if(hit && hit.ok) return hit;
        return fetch(req).then(function(res){
          if(res && (res.ok || res.type === "opaque")){
            var copy = res.clone();
            caches.open(DATA).then(function(c){ c.put(req.url, copy); });
          }
          return res;
        }).catch(function(){ return hit; });
      })
    );
    return;
  }

  /* The app's own files: newest wins when there is a signal, cache when there
     is not. Also time-limited, so a crawling connection can't leave someone
     staring at a blank screen. */
  if(url.origin === location.origin){
    e.respondWith(
      timedFetch(new Request(req, {cache:"no-store"}), NET_TIMEOUT_MS).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(SHELL).then(function(c){ c.put(req.url, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req.url, {ignoreVary:true}).then(function(hit){
          return hit || caches.match("./index.html", {ignoreVary:true});
        });
      })
    );
    return;
  }

  /* Cross-origin (map tiles, Leaflet, Google, fonts): left alone on purpose.
     Intercepting these breaks the map inside an installed app. */
  return;
});
