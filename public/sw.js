// Minimal service worker for PWA - doesn't interfere with app loading
const CACHE_NAME = 'nxgen-v3';

// Install event - just activate immediately
self.addEventListener('install', (event) => {
  console.log('SW installed');
  self.skipWaiting();
});

// Activate event - take control immediately
self.addEventListener('activate', (event) => {
  console.log('SW activated');
  self.clients.claim();
});

// Fetch event - only handle offline HTML fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Only intercept HTML requests when offline
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Network failed - serve cached version or offline page
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return a simple offline page
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
                button {
                  background: #3b82f6;
                  color: white;
                  border: none;
                  padding: 0.75rem 2rem;
                  border-radius: 8px;
                  margin-top: 1rem;
                  cursor: pointer;
                  font-size: 1rem;
                }
              </style>
            </head>
            <body>
              <div class="logo">NXGN</div>
              <h1>You're Offline</h1>
              <p>Check your internet connection and try again.</p>
              <button onclick="window.location.reload()">Reload App</button>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
    );
  }
  // For all other requests, don't intercept
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
