/*
 * SmartPresence service worker.
 *
 * - Offline app: pages fall back to the cached app shell, every built asset
 *   of the current release is precached (so screens never opened before still
 *   load offline), and API reads are network-first with the last good response
 *   kept for offline use (cleared on sign-out).
 * - Offline changes: check-in photos ("outbox") and other changes
 *   ("mutations") saved in IndexedDB are sent when the connection returns. The
 *   open app does this itself (src/lib/sync.ts); Background Sync covers the
 *   time the app is closed. Web Locks shared with the app keep the two from
 *   sending the same item or refreshing the session at the same time.
 * - Web Push: shows notifications and opens the right page when tapped.
 */

const VERSION = "v2"
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
      .then(() => precache().catch(() => undefined))
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

/**
 * Caches every file of the current build listed in /precache-manifest.json (written by
 * the build, see vite.config.ts) and drops assets of older builds. Runs on install and
 * whenever a page asks, since a new release changes the list but not this file.
 */
async function precache() {
  const response = await fetch("/precache-manifest.json", { cache: "no-store" })
  if (!response.ok) return
  const { files = [] } = await response.json()
  const cache = await caches.open(ASSETS)
  const wanted = new Set(files.map((f) => new URL(f, self.location.origin).href))
  for (const request of await cache.keys()) if (!wanted.has(request.url)) await cache.delete(request)
  for (const url of wanted) {
    if (await cache.match(url)) continue
    try {
      const asset = await fetch(url)
      if (cacheable(asset)) await cache.put(url, asset)
    } catch {
      return
    }
  }
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
    event.waitUntil(processOutbox().catch(() => undefined))
  } else if (type === "PRECACHE") {
    event.waitUntil(precache().catch(() => undefined))
  }
})

/* Same database, version and upgrade as src/lib/idb.ts. */
const DB_NAME = "smartpresence"
const DB_VERSION = 2
const STORES = ["outbox", "mutations"]

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      for (const name of STORES) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: "id", autoIncrement: true })
      }
    }
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close()
      resolve(req.result)
    }
    req.onerror = () => reject(req.error)
  })
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const result = fn(t.objectStore(store))
    t.oncomplete = () => resolve(result && "result" in result ? result.result : undefined)
    t.onerror = () => reject(t.error)
  })
}

/** The same lock names the app uses (src/lib/locks.ts); runs unlocked where Web Locks are missing. */
function withLock(name, fn) {
  const locks = self.navigator && self.navigator.locks
  return locks && locks.request ? locks.request(name, fn) : fn()
}

/** Worth trying again later: server trouble, busy, or the session needs signing in again. */
function isTransient(status) {
  return status >= 500 || status === 401 || status === 408 || status === 425 || status === 429
}

async function broadcast(message) {
  for (const client of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) client.postMessage(message)
}

/**
 * fetch with the session cookies, rotating the access cookie once if it expired. The
 * refresh token is single use, so this takes turns with the app: after waiting for the
 * lock it first retries, in case the app has just refreshed.
 */
async function authedFetch(url, init = {}) {
  const run = () => fetch(url, { credentials: "include", ...init })
  let response = await run()
  if (response.status === 401) {
    response = await withLock("sp-auth-refresh", async () => {
      const again = await run()
      if (again.status !== 401) return again
      const refreshed = await fetch("/api/auth/refresh/", { method: "POST", credentials: "include" }).catch(() => null)
      return refreshed && refreshed.ok ? run() : again
    })
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

/**
 * Sends everything saved offline. Rejects while something is still waiting, so
 * Background Sync tries again later (with back-off) instead of giving up.
 */
function processOutbox() {
  running ??= (async () => {
    const me = await signedInUser()
    if (!me) throw new Error("Offline or signed out; try again later.")
    const left = (await drainMutations(me)) + (await drainOutbox(me))
    if (left > 0) throw new Error(`${left} item(s) still waiting to sync.`)
  })().finally(() => {
    running = null
  })
  return running
}

/** Whoever is signed in now, from the server (never the offline copy), or null. */
async function signedInUser() {
  try {
    const res = await authedFetch("/api/auth/profile/", { cache: "no-store" })
    if (!res.ok || res.headers.get("X-SP-Offline")) return null
    return (await res.json()).data.user
  } catch {
    return null
  }
}

async function pendingItems(db, store, me) {
  return ((await tx(db, store, "readonly", (s) => s.getAll())) || [])
    .filter((item) => item.status !== "failed" && item.userId === me.id)
    .sort((a, b) => a.createdAt - b.createdAt || a.id - b.id)
}

/** Sends one saved item: "sent", "refused" (with the reason) or "wait" to keep it for later. */
async function send(url, init) {
  let res
  try {
    res = await authedFetch(url, init)
  } catch {
    return { outcome: "wait" }
  }
  const payload = await res.json().catch(() => null)
  if (res.ok) return { outcome: "sent", message: payload && payload.message }
  if (isTransient(res.status)) return { outcome: "wait" }
  const error = firstMessage(payload && payload.errors) || (payload && payload.message) || "The server refused this change."
  return { outcome: "refused", error }
}

/**
 * Uploads queued photos that belong to whoever is signed in now, oldest first. It
 * stops while offline, on server errors or when signed out, keeping items queued; a
 * photo the server refuses (too old, already checked in) is kept as failed so the
 * user sees why. Returns how many are still waiting.
 */
function drainOutbox(me) {
  return withLock("sp-outbox", async () => {
    const db = await openDb()
    const items = await pendingItems(db, "outbox", me)
    let left = items.length

    for (const item of items) {
      const form = new FormData()
      form.append("image", new File([item.image], `${item.kind}.jpg`, { type: item.image.type || "image/jpeg" }))
      form.append("captured_at", item.capturedAt)
      form.append("offline", "true")

      const result = await send(`/api/teacher-attendance/${item.kind}/`, { method: "POST", body: form })
      if (result.outcome === "wait") break
      if (result.outcome === "sent") {
        await tx(db, "outbox", "readwrite", (s) => s.delete(item.id))
        await broadcast({ type: "OUTBOX", event: "synced", kind: item.kind, message: result.message || "Synced." })
      } else {
        await tx(db, "outbox", "readwrite", (s) => s.put({ ...item, status: "failed", error: result.error }))
        await broadcast({ type: "OUTBOX", event: "failed", kind: item.kind, message: result.error })
      }
      left--
    }
    await broadcast({ type: "OUTBOX", event: "changed" })
    return left
  })
}

/** Rebuilds a saved request body (see packBody in src/lib/offline-queue.ts). */
function unpackBody(body) {
  if (!body) return { headers: { Accept: "application/json" } }
  if ("json" in body) return { body: JSON.stringify(body.json), headers: { "Content-Type": "application/json", Accept: "application/json" } }
  const form = new FormData()
  for (const [name, value, filename] of body.form) {
    if (typeof value === "string") form.append(name, value)
    else form.append(name, value, filename)
  }
  return { body: form, headers: { Accept: "application/json" } }
}

function queryString(params) {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v === undefined || v === null || v === "") continue
      search.append(key, String(v))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

/** Sends this user's other saved changes, oldest first, by the same rules as the app. */
function drainMutations(me) {
  return withLock("sp-sync-mutations", async () => {
    const db = await openDb()
    const items = await pendingItems(db, "mutations", me)
    let left = items.length
    let changed = false

    for (const item of items) {
      const result = await send(`/api/${item.path}${queryString(item.params)}`, { method: item.method, ...unpackBody(item.body) })
      if (result.outcome === "wait") break
      if (result.outcome === "sent") await tx(db, "mutations", "readwrite", (s) => s.delete(item.id))
      else await tx(db, "mutations", "readwrite", (s) => s.put({ ...item, status: "failed", error: result.error }))
      changed = true
      left--
    }
    if (changed) await broadcast({ type: "QUEUE", event: "changed" })
    return left
  })
}

self.addEventListener("sync", (event) => {
  if (event.tag === "outbox" || event.tag === "mutations") event.waitUntil(processOutbox())
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
