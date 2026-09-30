// Sube VERSION para invalidar el precache y los assets guardados.
const VERSION = 'v1'
const CACHE = `gastos-${VERSION}`
const PRECACHE = [
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  // Se ignora sin respondWith: no GET, otro origen, server functions, auth, api, Authorization.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/_serverFn/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/') ||
    request.headers.has('Authorization')
  ) {
    return
  }

  // HTML con SSR: red primero y nunca se guarda (puede traer datos personales).
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
    return
  }

  // Assets con hash y archivos precacheados: cache-first.
  if (url.pathname.startsWith('/assets/') || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copia = res.clone()
              caches.open(CACHE).then((c) => c.put(request, copia))
            }
            return res
          }),
      ),
    )
  }
})
