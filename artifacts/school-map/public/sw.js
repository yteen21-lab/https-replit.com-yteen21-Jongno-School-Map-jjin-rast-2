/* Service Worker — Youth Protection Tobacco Retail Monitoring Map
 * Network-first 전략: 항상 최신 데이터를 우선 사용, 오프라인 시 캐시로 폴백.
 * 카카오 지도·API 서버는 캐시하지 않음 (동적 데이터). */

const CACHE_NAME = 'yp-tobacco-map-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

/* 설치: 정적 에셋 사전 캐시 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

/* 활성화: 구 버전 캐시 정리 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch: 카카오 API 및 서버 API는 항상 네트워크 우선 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  /* 카카오 API, 서버 API — 캐시 우회 */
  if (
    url.hostname.includes('kakao') ||
    url.hostname.includes('daum') ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  /* 정적 에셋 — 캐시 우선, 없으면 네트워크 */
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request).then((response) => {
        /* 성공적 응답이면 캐시에 저장 */
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
    )
  );
});
