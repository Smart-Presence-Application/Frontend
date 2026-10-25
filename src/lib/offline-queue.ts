/**
 * Changes made without internet (adding a student, marking attendance, sending a
 * notice...), kept in IndexedDB and sent to the server in the order they were made
 * once the connection is back. Each item belongs to the user who made it and is only
 * sent while that user is signed in.
 *
 * Some requests are never saved for later: AI features (face registration and AI
 * attendance) need the server there and then, sign-in and push set up the session or
 * the device, password changes must not sit on the device, and teacher check-ins
 * have their own photo outbox (outbox.ts).
 */

import { ApiError, request, type QueryParams } from "./api"
import { idbSupported, run } from "./idb"
import { withLock } from "./locks"
import { registerBackgroundSync } from "./pwa"

type FormEntry = [name: string, value: string | Blob, filename?: string]
type StoredBody = { form: FormEntry[] } | { json: unknown } | undefined

export interface QueuedMutation {
  id: number
  userId: number
  method: string
  path: string
  params?: QueryParams
  body: StoredBody
  createdAt: number
  status?: "failed"
  error?: string
}

const NEVER_QUEUE: RegExp[] = [
  /^auth\/(login|logout|refresh)\//,
  /^parents\/login\//,
  /change-password\/$/,
  /reset-password\/$/,
  /^student-attendance\/(verify|faces|jobs)\//,
  /^students\/\d+\/image\/$/,
  /^parents\/me\/students\/\d+\/photo\/$/,
  /^teacher-attendance\/check-(in|out)\//,
  /^notifications\/push\//,
  /^system\//,
  /^website\/contact\//,
]

const normalize = (path: string) => path.replace(/^\//, "").split("?")[0]

/** Whether a request may be saved and sent later. Reads never are; they come from the offline cache. */
export function canQueue(method: string, path: string) {
  if (!idbSupported || method.toUpperCase() === "GET") return false
  const clean = normalize(path)
  return !NEVER_QUEUE.some((pattern) => pattern.test(clean))
}

/** Who is signed in; set by AuthProvider. Nothing is saved for later while signed out. */
let queueUser: number | null = null

export function setQueueUser(id: number | null) {
  queueUser = id
}

export function getQueueUser() {
  return queueUser
}

const listeners = new Set<() => void>()

/** Called whenever the saved changes change (added, sent, refused or discarded). */
export function onQueueChange(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const notify = () => listeners.forEach((fn) => fn())

function packBody(body: unknown): StoredBody {
  if (body === undefined) return undefined
  if (body instanceof FormData) {
    const form: FormEntry[] = []
    body.forEach((value, name) => form.push(typeof value === "string" ? [name, value] : [name, value, (value as File).name]))
    return { form }
  }
  return { json: body }
}

function unpackBody(body: StoredBody): unknown {
  if (!body) return undefined
  if ("json" in body) return body.json
  const form = new FormData()
  for (const [name, value, filename] of body.form) {
    if (typeof value === "string") form.append(name, value)
    else form.append(name, value, filename)
  }
  return form
}

export async function enqueueMutation(item: { userId: number; method: string; path: string; params?: QueryParams; body?: unknown }) {
  await run("mutations", "readwrite", (s) =>
    s.add({
      userId: item.userId,
      method: item.method.toUpperCase(),
      path: normalize(item.path),
      params: item.params,
      body: packBody(item.body),
      createdAt: Date.now(),
    })
  )
  notify()
  void registerBackgroundSync("mutations")
}

export async function listMutations(userId: number): Promise<QueuedMutation[]> {
  if (!idbSupported) return []
  const items = await run<QueuedMutation[]>("mutations", "readonly", (s) => s.getAll() as IDBRequest<QueuedMutation[]>)
  return items.filter((i) => i.userId === userId).sort((a, b) => a.createdAt - b.createdAt || a.id - b.id)
}

export async function discardMutation(id: number) {
  await run("mutations", "readwrite", (s) => s.delete(id))
  notify()
}

/** Statuses worth trying again later: the server is down, busy, or the session needs signing in again. */
export function isTransient(status: number) {
  return status >= 500 || status === 401 || status === 408 || status === 425 || status === 429
}

export interface SyncResult {
  synced: number
  failed: number
  remaining: number
}

/**
 * Sends this user's saved changes, oldest first. It stops at the first one that
 * cannot be sent right now (no connection, server trouble, signed out) and keeps it
 * and everything after it for the next try. One the server refuses (say, a roll
 * number already taken) is kept as failed with the reason, for the user to discard.
 */
export function syncMutations(userId: number): Promise<SyncResult> {
  return withLock("sp-sync-mutations", async () => {
    const pending = (await listMutations(userId)).filter((i) => i.status !== "failed")
    const result: SyncResult = { synced: 0, failed: 0, remaining: pending.length }

    for (const item of pending) {
      try {
        await request(item.path, { method: item.method, params: item.params, body: unpackBody(item.body), noQueue: true })
        await run("mutations", "readwrite", (s) => s.delete(item.id))
        result.synced++
      } catch (err) {
        if (!(err instanceof ApiError) || isTransient(err.status)) break
        await run("mutations", "readwrite", (s) => s.put({ ...item, status: "failed", error: err.detail }))
        result.failed++
      }
      result.remaining--
    }

    if (result.synced || result.failed) notify()
    return result
  })
}

/** A short description of a saved change for the list the user sees. */
export function describeMutation(item: Pick<QueuedMutation, "method" | "path">) {
  const verb = item.method === "DELETE" ? "Delete" : item.method === "POST" ? "Save" : "Update"
  const where = item.path
    .split("/")
    .filter((p) => p && !/^\d+$/.test(p))
    .map((p) => p.replace(/-/g, " "))
    .join(" › ")
  return `${verb} · ${where}`
}
