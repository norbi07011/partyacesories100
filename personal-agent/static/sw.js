/* Studio Agent – service worker (aplikacja na telefonie). Interfejs z pamięci podręcznej, dane zawsze na żywo. */
const CACHE = 'studio-agent-v1';
const SHELL = ['/', '/static/app.css', '/static/app.js', '/static/charts.js', '/static/voice.js', '/static/icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname === '/login') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); if (r.ok) caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request)));
});
