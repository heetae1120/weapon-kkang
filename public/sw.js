// 홈 화면 설치용 최소 서비스 워커: 캐시하지 않고 항상 최신 파일을 받아옵니다 (업데이트가 바로 반영되도록)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
