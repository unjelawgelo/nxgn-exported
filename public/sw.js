const CACHE_NAME = 'nxgen-v2';

// Install event - minimal caching
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
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

// Fetch event - network-first, cache as fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API calls
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // For HTML requests, try network first, then cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the successful response
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If no cache, return offline page
            return caches.match('/offline.html').then((offlineResponse) => {
              if (offlineResponse) {
                return offlineResponse;
              }
              // Final fallback - basic HTML
              return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Offline - NXGN</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body { 
                      font-family: system-ui; 
                      text-align: center; 
                      padding: 2rem;
                      background: #0f172a;
                      color: #e2e8f0;
                      min-height: 100vh;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      flex-direction: column;
                    }
                    .logo { 
                      font-size: 3rem; 
                      font-weight: bold; 
                      margin-bottom: 1rem;
                      background: #3b82f6;
                      color: white;
                      width: 80px;
                      height: 80px;
                      border-radius: 20px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      margin-bottom: 2rem;
                    }
                  </style>
                </head>
                <body>
                  <div class="logo">NXGN</div>
                  <h1>You're Offline</h1>
                  <p>Check your connection and try again.</p>
                  <button onclick="window.location.reload()" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.75rem 2rem;
                    border-radius: 8px;
                    margin-top: 1rem;
                    cursor: pointer;
                  ">Reload</button>
                </body>
                </html>
              `, {
                headers: { 'Content-Type': 'text/html' }
              });
            });
          });
        })
    );
  } else {
    // For non-HTML requests, don't intercept - let them fail naturally
    return;
  }
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
