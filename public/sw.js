const CACHE_NAME = 'nxgen-v1';
const STATIC_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/components/Dashboard.tsx',
  '/src/components/DashboardView.tsx',
  '/src/components/PlaylistManager.tsx',
  '/src/components/SongLibrary.tsx',
  '/src/components/MinistryManager.tsx',
  '/src/components/UserManager.tsx',
  '/src/components/ProfileSettings.tsx',
  '/src/components/ui/offline-indicator.tsx',
  '/src/utils/offlineDetector.ts',
  '/src/utils/offlineCache.ts',
  '/src/utils/offlineSync.ts',
  '/src/blink/client.ts',
  '/src/lib/api.ts',
  '/src/styles/selection.css',
  'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FhhSSa5W1LyWiXUx8UIqiDL2RCSI3%2FB5i0b5ZE_400x400__27201fe1.jpg?alt=media&token=8c412c5e-df3e-4ae6-90aa-f004d3e8f016'
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
  if (request.method !== 'GET' || 
      url.origin !== self.location.origin ||
      url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network and cache
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response since it can only be used once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, serve offline page for HTML requests
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
          });
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
