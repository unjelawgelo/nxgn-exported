const CACHE_NAME = 'nxgen-v1';
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external API calls
  if (request.method !== 'GET') {
    return;
  }

  // For API calls, don't intercept - let them fail naturally
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // For same-origin requests, try network first, then cache
        if (url.origin === self.location.origin) {
          return fetch(request)
            .then((response) => {
              // Only cache successful responses to static assets
              if (response.ok && 
                  (request.url.includes('.js') || 
                   request.url.includes('.css') || 
                   request.url.includes('.svg') ||
                   request.url.includes('.png') ||
                   request.url.includes('.jpg') ||
                   request.url.includes('.ico'))) {
                
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseToCache);
                  });
              }
              return response;
            })
            .catch(() => {
              // If network fails for HTML requests, serve offline page
              if (request.headers.get('accept')?.includes('text/html')) {
                return caches.match('/offline.html');
              }
              // For other assets, return error
              return new Response('Offline', { status: 503 });
            });
        }

        // For external resources (like images), try network
        return fetch(request);
      })
      .catch(() => {
        // Final fallback for HTML requests
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/offline.html');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});

// Handle background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-sync') {
    event.waitUntil(handleOfflineSync());
  }
});

async function handleOfflineSync() {
  // Get queued operations from localStorage and sync them
  try {
    const offlineOps = localStorage.getItem('nxgn_offline_operations');
    if (offlineOps) {
      const operations = JSON.parse(offlineOps);
      console.log('Service Worker: Syncing', operations.length, 'offline operations');
      
      // Sync operations would be handled here
      // For now, just clear the queue
      localStorage.removeItem('nxgn_offline_operations');
    }
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}
