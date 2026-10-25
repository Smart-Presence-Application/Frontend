/**
 * Check-in and check-out photos taken without internet, kept in IndexedDB
 * until they are uploaded. The open app uploads them itself (drainOutbox) as
 * soon as the connection is back; the service worker does the same through
 * Background Sync when the app is closed (drainOutbox in public/sw.js, which
 * shares this database and record shape). A shared lock keeps the two from
 * sending the same photo twice. Only the owning user's session uploads an item.
 */

import { ApiError, request, toFormData } from "./api"
import { idbSupported, run } from "./idb"
import { withLock } from "./locks"
import { isTransient } from "./offline-queue"
import { registerBackgroundSync } from "./pwa"

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

export const outboxSupported = idbSupported

/** How long one photo upload may take before the connection counts as dead. */
export const UPLOAD_TIMEOUT_MS = 45_000

export async function listOutbox(userId: number): Promise<OutboxItem[]> {
  if (!outboxSupported) return []
  const items = await run<OutboxItem[]>("outbox", "readonly", (s) => s.getAll() as IDBRequest<OutboxItem[]>)
  return items.filter((i) => i.userId === userId).sort((a, b) => a.createdAt - b.createdAt)
}

export async function addToOutbox(item: Omit<OutboxItem, "id" | "createdAt">) {
  await run("outbox", "readwrite", (s) => s.add({ ...item, createdAt: Date.now() }))
  await registerBackgroundSync("outbox")
}

export function removeFromOutbox(id: number) {
  return run("outbox", "readwrite", (s) => s.delete(id))
}

export type OutboxEvent = { event: "synced" | "failed"; kind: OutboxKind; message: string }

/**
 * Uploads this user's queued photos, oldest first. It stops when the connection or
 * the server is not there (the photo stays queued for the next try); a photo the
 * server refuses (too old, already checked in) is kept as failed so the user sees why.
 */
export function drainOutbox(userId: number, onEvent?: (e: OutboxEvent) => void): Promise<{ remaining: number }> {
  return withLock("sp-outbox", async () => {
    const items = (await listOutbox(userId)).filter((i) => i.status !== "failed")
    let remaining = items.length

    for (const item of items) {
      const form = toFormData({
        image: new File([item.image], `${item.kind}.jpg`, { type: item.image.type || "image/jpeg" }),
        captured_at: item.capturedAt,
        offline: "true",
      })
      try {
        const { message } = await request(`teacher-attendance/${item.kind}/`, { method: "POST", body: form, timeoutMs: UPLOAD_TIMEOUT_MS })
        await removeFromOutbox(item.id)
        onEvent?.({ event: "synced", kind: item.kind, message: message || "Synced." })
      } catch (err) {
        if (!(err instanceof ApiError) || isTransient(err.status)) break
        await run("outbox", "readwrite", (s) => s.put({ ...item, status: "failed", error: err.detail }))
        onEvent?.({ event: "failed", kind: item.kind, message: err.detail })
      }
      remaining--
    }
    return { remaining }
  })
}
