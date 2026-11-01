const CACHE_PREFIX = 'jas-pwa'
const CACHE_VERSION = 'v11-user-controlled-updates'
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`
const CORE_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
]

const FORCE_CLEAR_PARAMS = [
  'clear-pwa-cache',
  'clearCache',
  'reset-pwa-cache',
  'resetApp',
]
const RESET_DONE_PARAM = 'pwa-cache-cleared'
const SCRIPT_STYLE_EXTENSIONS = /\.(?:css|js|mjs)$/i
const STATIC_ASSET_EXTENSIONS =
  /\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf)$/i

function isForceClearUrl(url) {
  return FORCE_CLEAR_PARAMS.some((param) => url.searchParams.has(param))
}

function buildResetRedirectUrl(url) {
  const cleanUrl = new URL(url.href)

  for (const param of FORCE_CLEAR_PARAMS) {
    cleanUrl.searchParams.delete(param)
  }

  cleanUrl.searchParams.set(RESET_DONE_PARAM, Date.now().toString())
  return cleanUrl.href
}

function safeNotificationTarget(value) {
  if (typeof value !== 'string') return '/notifications'
  const trimmed = value.trim()

  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(trimmed)
  ) {
    return '/notifications'
  }

  try {
    const parsed = new URL(trimmed, self.location.origin)
    if (parsed.origin !== self.location.origin) return '/notifications'
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/notifications'
  }
}

async function deleteOldJasCaches() {
  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)),
  )
}

async function deleteAllCacheStorage() {
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

async function deleteAllJasCaches() {
  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => caches.delete(key)),
  )
}

async function precacheCoreAssets() {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(
    CORE_ASSETS.map((asset) => new Request(asset, { cache: 'reload' })),
  )
}

async function putInCache(cacheKeyRequest, response) {
  if (!response || !response.ok) return

  const cache = await caches.open(CACHE_NAME)
  await cache.put(cacheKeyRequest, response.clone())
}

async function fetchNoStore(request) {
  return fetch(new Request(request, { cache: 'no-store' }))
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetchNoStore(request)
    await putInCache(request, response)
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl)
      if (fallback) return fallback
    }

    throw new Error('No network response or cached fallback available.')
  }
}

async function cacheFirstWithBackgroundRefresh(request, event) {
  const cached = await caches.match(request)

  const networkFetch = fetch(new Request(request, { cache: 'reload' }))
    .then(async (response) => {
      await putInCache(request, response)
      return response
    })
    .catch(() => null)

  if (cached) {
    event.waitUntil(networkFetch)
    return cached
  }

  const response = await networkFetch
  if (response) return response

  throw new Error('No network response or cached asset available.')
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheCoreAssets(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    deleteOldJasCaches()
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(
      deleteOldJasCaches()
        .catch(() => undefined)
        .then(() => self.skipWaiting()),
    )
    return
  }

  if (event.data?.type === 'PURGE_JAS_CACHES') {
    event.waitUntil(
      deleteAllJasCaches().then(() => {
        if (event.source) {
          event.source.postMessage({ type: 'JAS_CACHES_PURGED' })
        }
      }),
    )
    return
  }

  if (event.data?.type === 'CLEAR_JAS_CACHE') {
    event.waitUntil(
      deleteAllCacheStorage()
        .then(() => self.registration.unregister())
        .then(() => {
          if (event.source) {
            event.source.postMessage({ type: 'JAS_CACHE_CLEARED' })
          }
        }),
    )
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate' && isForceClearUrl(url)) {
    event.respondWith(
      deleteAllCacheStorage()
        .then(() => self.registration.unregister())
        .then(() => Response.redirect(buildResetRedirectUrl(url), 302)),
    )
    return
  }

  if (url.pathname === '/sw.js') {
    event.respondWith(fetchNoStore(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/offline.html'))
    return
  }

  const isManifest = url.pathname === '/manifest.json'
  const isOfflinePage = url.pathname === '/offline.html'
  const isMutablePublicAsset =
    url.pathname.startsWith('/jas/') || isManifest || isOfflinePage
  const isScriptOrStyle =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'worker' ||
    SCRIPT_STYLE_EXTENSIONS.test(url.pathname)
  const isStaticAsset = STATIC_ASSET_EXTENSIONS.test(url.pathname)

  if (isMutablePublicAsset || isScriptOrStyle) {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.startsWith('/assets/') || isStaticAsset) {
    event.respondWith(cacheFirstWithBackgroundRefresh(request, event))
  }
})

self.addEventListener('push', (event) => {
  let payload = {}

  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = {
        title: 'JAS Update',
        body: event.data.text(),
      }
    }
  }

  const title = payload.title || 'JAS Update'
  const options = {
    body:
      payload.body ||
      payload.message ||
      'You have a new update in the JAS member portal.',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || payload.notification_id || 'jas-update',
    data: {
      url: safeNotificationTarget(
        payload.url || payload.action_url || '/notifications',
      ),
      notification_id: payload.notification_id || null,
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(
    safeNotificationTarget(event.notification.data?.url),
    self.location.origin,
  ).href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client && client.url === targetUrl) {
            return client.focus()
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }

        return undefined
      }),
  )
})
