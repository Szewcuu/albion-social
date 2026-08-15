const CACHE_PREFIX = 'albion-social-static-'
const CACHE_NAME = `${CACHE_PREFIX}v2`
const OFFLINE_URL = '/offline.html'
const STATIC_ASSETS = [OFFLINE_URL, '/favicon.ico', '/logo-256.webp', '/albion-bg.webp']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  if (url.origin !== self.location.origin) return

  // Dokumenty mogą zawierać prywatną zawartość użytkownika. Nigdy ich nie zapisujemy.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Żądania danych i przepływ logowania zawsze omijają Service Workera.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  const isPrecachedAsset = STATIC_ASSETS.includes(url.pathname)
  const isVersionedNextAsset = url.pathname.startsWith('/_next/static/')
  if (!isPrecachedAsset && !isVersionedNextAsset) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached

      return fetch(event.request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const cacheCopy = response.clone()
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy)))
        }
        return response
      })
    })
  )
})
