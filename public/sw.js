/*
 * SmartPresence service worker.
 *
 * - Offline app: pages fall back to the cached app shell, built assets are
 *   cached on first use, and API reads are network-first with the last good
 *   response kept for offline use (cleared on sign-out).
 * - Offline check-in: photos queued in IndexedDB ("outbox") are uploaded when
 *   the connection returns, via Background Sync where the browser has it and
 *   otherwise when a page asks.
 * - Web Push: shows notifications and opens the right page when tapped.
 */

const VERSION = "v1"
const SHELL = `sp-shell-${VERSION}`
const ASSETS = `sp-assets-${VERSION}`
const DATA = "sp-data"
const MEDIA = "sp-media"
const SHELL_FILES = ["/", "/manifest.webmanifest", "/favicon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/badge-96.png"]

/** API reads that must never come from cache because they change the session. */
const NEVER_CACHE = ["/api/auth/login/", "/api/auth/logout/", "/api/auth/refresh/", "/api/parents/login/"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, ASSETS, DATA, MEDIA])
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key)
      await self.clients.claim()
    })()
  )
})

function cacheable(response) {
  return response && response.ok && response.type === "basic"
}

/** With `markCached`, a cached fallback carries an X-SP-Offline header so the app can say it is showing saved data. */
async function networkFirst(request, cacheName, { markCached = false } = {}) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (cacheable(response)) cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (!cached) throw error
    if (!markCached) return cached
    const headers = new Headers(cached.headers)
    headers.set("X-SP-Offline", "1")
    return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers })
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (cacheable(response)) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const refresh = fetch(request)
    .then((response) => {
      if (cacheable(response)) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || refresh
}

/** Every route serves the same SPA shell, so the latest copy is kept under "/". */
async function navigation(request) {
  try {
    const response = await fetch(request)
    if (cacheable(response)) (await caches.open(SHELL)).put("/", response.clone())
    return response
  } catch {
    return (await caches.match("/")) || Response.error()
  }
}

/**
 * Routes same-origin GETs to a caching strategy. Built assets are cache-first since
 * their names carry content hashes; anything unmatched (Vite dev modules, other
 * origins) goes straight to the network.
 */
self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith("/api/")) {
    if (NEVER_CACHE.some((p) => url.pathname.startsWith(p))) return
    event.respondWith(networkFirst(request, DATA, { markCached: true }))
  } else if (url.pathname.startsWith("/media/")) {
    event.respondWith(cacheFirst(request, MEDIA))
  } else if (request.mode === "navigate") {
    event.respondWith(navigation(request))
  } else if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSETS))
  } else if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest" || url.pathname === "/favicon.svg") {
    event.respondWith(staleWhileRevalidate(request, SHELL))
  }
})

/** CLEAR_DATA runs on sign-out so one user's saved data is never shown to the next. */
self.addEventListener("message", (event) => {
  const type = event.data && event.data.type
  if (type === "CLEAR_DATA") {
    event.waitUntil(Promise.all([caches.delete(DATA), caches.delete(MEDIA)]))
  } else if (type === "SYNC_OUTBOX") {
    event.waitUntil(processOutbox())
  }
})

const DB_NAME = "smartpresence"
const STORE = "outbox"

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const result = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(result && "result" in result ? result.result : undefined)
    t.onerror = () => reject(t.error)
  })
}

async function broadcast(message) {
  for (const client of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) client.postMessage(message)
}

/** fetch with the session cookies, rotating the access cookie once if it expired. */
async function authedFetch(url, init = {}) {
  const run = () => fetch(url, { credentials: "include", ...init })
  let response = await run()
  if (response.status === 401) {
    const refreshed = await fetch("/api/auth/refresh/", { method: "POST", credentials: "include" }).catch(() => null)
    if (refreshed && refreshed.ok) response = await run()
  }
  return response
}

function firstMessage(value) {
  if (typeof value === "string") return value
  if (Array.isArray(value)) for (const v of value) { const m = firstMessage(v); if (m) return m }
  if (value && typeof value === "object") for (const v of Object.values(value)) { const m = firstMessage(v); if (m) return m }
  return null
}

let running = null

function processOutbox() {
  running ??= drainOutbox().finally(() => {
    running = null
  })
  return running
}

/**
 * Uploads queued photos that belong to whoever is signed in now. It stops while
 * offline, on server errors or when signed out, keeping items queued; a photo the
 * server refuses (too old, already checked in) is kept as failed so the user sees why.
 */
async function drainOutbox() {
  const db = await openDb()
  const items = ((await tx(db, "readonly", (s) => s.getAll())) || [])
    .filter((item) => item.status !== "failed")
    .sort((a, b) => a.createdAt - b.createdAt)
  if (!items.length) return

  let me
  try {
    const res = await authedFetch("/api/auth/profile/", { cache: "no-store" })
    if (!res.ok || res.headers.get("X-SP-Offline")) return
    me = (await res.json()).data.user
  } catch {
    return
  }

  for (const item of items) {
    if (item.userId !== me.id) continue
    const form = new FormData()
    form.append("image", new File([item.image], `${item.kind}.jpg`, { type: item.image.type || "image/jpeg" }))
    form.append("captured_at", item.capturedAt)
    form.append("offline", "true")

    let res
    try {
      res = await authedFetch(`/api/teacher-attendance/${item.kind}/`, { method: "POST", body: form })
    } catch {
      break
    }
    const payload = await res.json().catch(() => null)

    if (res.ok) {
      await tx(db, "readwrite", (s) => s.delete(item.id))
      await broadcast({ type: "OUTBOX", event: "synced", kind: item.kind, message: (payload && payload.message) || "Synced." })
    } else if (res.status >= 500 || res.status === 401 || res.status === 403) {
      break
    } else {
      const error = firstMessage(payload && payload.errors) || (payload && payload.message) || "The server refused this photo."
      await tx(db, "readwrite", (s) => s.put({ ...item, status: "failed", error }))
      await broadcast({ type: "OUTBOX", event: "failed", kind: item.kind, message: error })
    }
  }
  await broadcast({ type: "OUTBOX", event: "changed" })
}

self.addEventListener("sync", (event) => {
  if (event.tag === "outbox") event.waitUntil(processOutbox())
})

/**
 * Tells open pages to refresh the matching lists. When someone is looking at a signed-in
 * panel the page pops the message up itself; otherwise a notification is shown, with a
 * fresh tag per alert unless the server groups them so every one pops up.
 */
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: "SmartPresence", body: event.data ? event.data.text() : "" }
  }
  const title = data.title || "SmartPresence"
  const body = data.body || ""
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      const inFront = windows.some(
        (c) => c.focused && c.visibilityState === "visible" && /^\/(admin|school|teacher|parent)(\/|$)/.test(new URL(c.url).pathname)
      )
      await broadcast({ type: "PUSH", path: data.path || "", url: data.url || "", title, body, popup: inFront })
      if (inFront) return
      await self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        tag: data.tag || `sp-${Date.now()}`,
        renotify: true,
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
        timestamp: Date.now(),
        data: { url: data.url || "/app" },
      })
    })()
  )
})

/** Focuses an open page and lets its router navigate, so nothing reloads; otherwise opens a window. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/app"
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      const client = windows.find((c) => new URL(c.url).origin === self.location.origin)
      if (client) {
        client.postMessage({ type: "NAVIGATE", url })
        return client.focus()
      }
      return self.clients.openWindow(url)
    })()
  )
})
