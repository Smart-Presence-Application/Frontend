/**
 * The app's IndexedDB database, shared with the service worker (public/sw.js
 * opens the same name and version with the same upgrade). "outbox" holds
 * offline check-in photos; "mutations" holds other changes made offline.
 */

export const DB_NAME = "smartpresence"
export const DB_VERSION = 2
export const STORES = ["outbox", "mutations"] as const
export type StoreName = (typeof STORES)[number]

export const idbSupported = typeof indexedDB !== "undefined"

let opening: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      for (const name of STORES) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: "id", autoIncrement: true })
      }
    }
    req.onsuccess = () => {
      const db = req.result
      // Another tab or the worker upgrading the database closes this connection; reopen next time.
      db.onversionchange = () => {
        db.close()
        opening = null
      }
      resolve(db)
    }
    req.onerror = () => {
      opening = null
      reject(req.error)
    }
  })
  return opening
}

export async function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode)
    const req = fn(t.objectStore(store))
    t.oncomplete = () => resolve(req.result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

/** Test hook: forget the open connection so a fresh database is used. */
export function resetDbForTests() {
  opening = null
}
