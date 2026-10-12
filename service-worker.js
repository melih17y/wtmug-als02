/* service-worker.js – App shell cache-first
   v99: Eski önbelleği zorla temizler ve yeni sürümü devreye alır.
*/
const CACHE_NAME = 'pwa-test-v99';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

/* ---- INSTALL: yeni sürümü önbelleğe al ---- */
self.addEventListener('install', event => {
  console.log('[SW] install – v99');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.warn('[SW] cache addAll hata:', err))
  );
  // Yeni SW hemen devreye girsin
  self.skipWaiting();
});

/* ---- ACTIVATE: eski cache'leri sil ---- */
self.addEventListener('activate', event => {
  console.log('[SW] activate – v99');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] eski cache siliniyor:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

/* ---- FETCH: cache-first, ama HTML için network-first ---- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Sadece kendi origin'imiz
  if (url.origin !== self.location.origin) return;

  // HTML ve SW dosyaları için: NETWORK-FIRST (güncel kodu garantile)
  const isHTML = req.destination === 'document'
              || url.pathname.endsWith('.html')
              || url.pathname.endsWith('/');
  const isSW = url.pathname.endsWith('service-worker.js');

  if (isHTML || isSW){
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(()=>{});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // Diğer dosyalar (CSS, JS, ikonlar): CACHE-FIRST
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      });
    }).catch(() => caches.match('./index.html'))
  );
});