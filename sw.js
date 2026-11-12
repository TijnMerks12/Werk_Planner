const K='fjp-v2',A=['./','index.html','manifest.webmanifest','icon-180.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(K).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=K).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!='GET'||new URL(e.request.url).origin!=location.origin)return;
e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(K).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
