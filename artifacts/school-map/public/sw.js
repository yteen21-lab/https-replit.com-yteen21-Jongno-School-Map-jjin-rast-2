/* Service Worker — Youth Protection Tobacco Retail Monitoring Map
 * 전략: HTML은 항상 네트워크 우선 (Vite 해시 번들 변경 대응)
 * 카카오 지도·API 서버는 캐시하지 않음 (동적 데이터). */

const CACHE_NAME = 'yp-tobacco-map-v4';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

/* 설치: 이미지/manifest만 사전 캐시 (JS는 해시 때문에 제외) */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

/* 활성화: 구 버전 캐시 모두 정리 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch 전략 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  /* 카카오 API, 서버 API, chrome-extension — 캐시 우회 */
  if (
    url.hostname.includes('kakao') ||
    url.hostname.includes('daum') ||
    url.pathname.startsWith('/api/') ||
    url.protocol === 'chrome-extension:'
  ) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  /* HTML 파일 (/, /index.html 등) — 항상 네트워크 우선 */
  if (
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* JS/CSS (Vite 해시 번들) — 캐시 우선, 없으면 네트워크 후 캐시 저장 */
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  /* 그 외 정적 에셋 — 캐시 우선 */
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
    )
  );
});
