/**
 * Check-in and check-out photos taken without internet, kept in IndexedDB
 * until the service worker uploads them (see drainOutbox in public/sw.js,
 * which shares this database and record shape). Only the owning user's session
 * uploads an item.
 */

import { postToServiceWorker, swSupported } from "./pwa"

type OutboxKind = "check-in" | "check-out"

export interface OutboxItem {
  id: number
  kind: OutboxKind
  image: Blob
  capturedAt: string
  createdAt: number
  userId: number
  status?: "failed"
  error?: string
}

const DB_NAME = "smartpresence"
const STORE = "outbox"

export const outboxSupported = swSupported && typeof indexedDB !== "undefined"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(req.result)
    t.onerror = () => reject(t.error)
  })
}

export async function listOutbox(userId: number): Promise<OutboxItem[]> {
  if (!outboxSupported) return []
  const items = await run<OutboxItem[]>("readonly", (s) => s.getAll() as IDBRequest<OutboxItem[]>)
  return items.filter((i) => i.userId === userId).sort((a, b) => a.createdAt - b.createdAt)
}

export async function addToOutbox(item: Omit<OutboxItem, "id" | "createdAt">) {
  await run("readwrite", (s) => s.add({ ...item, createdAt: Date.now() }))
  await requestOutboxSync()
}

export function removeFromOutbox(id: number) {
  return run("readwrite", (s) => s.delete(id))
}

/**
 * Asks the worker to upload now, and registers a Background Sync so it also happens
 * if the page closes. Background Sync is Chromium only, so the message covers the rest.
 */
export async function requestOutboxSync() {
  if (!outboxSupported) return
  try {
    const registration = await navigator.serviceWorker.ready
    const sync = (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync
    await sync?.register("outbox")
  } catch {}
  if (navigator.onLine) await postToServiceWorker({ type: "SYNC_OUTBOX" })
}
