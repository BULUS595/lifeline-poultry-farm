// Service Worker for Life-Line Poultry Solutions PWA
// Handles caching, offline functionality, and background sync

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`
};

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch(() => {
          // Some assets might fail, but don't break the installation
          console.warn('[Service Worker] Some assets failed to cache');
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first for API, cache first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external origins
  if (request.method !== 'GET') {
    return;
  }

  // API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAMES.api).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response or offline fallback
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Return offline page/response
              return new Response(
                JSON.stringify({ offline: true, message: 'You are offline' }),
                { headers: { 'Content-Type': 'application/json' }, status: 503 }
              );
            });
        })
    );
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(request)
          .then((response) => {
            // Cache new static assets
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAMES.static).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          })
          .catch(() => {
            // Return offline fallback for failed requests
            return new Response('Offline - resource not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAMES.static).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Background sync for data sync when online
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Trigger data sync via message to client
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            tag: 'sync-data'
          });
        });
      })
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Life-Line Poultry Solutions',
    icon: '/icon-192x192.png',
    badge: '/masked-icon.svg',
    tag: 'life-line-notification',
    requireInteraction: data.requireInteraction || false,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Life-Line', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
