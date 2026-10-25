/**
 * Sends everything saved on this device while offline: changes first (offline-queue.ts),
 * then check-in photos (outbox.ts). One run at a time; a request made while one is
 * running waits for it and then runs again, so nothing saved meanwhile is left behind.
 */

import { drainOutbox, type OutboxEvent } from "./outbox"
import { syncMutations } from "./offline-queue"

export interface SyncSummary {
  /** Something reached the server (or was refused), so cached data is out of date. */
  changed: boolean
  /** Items still waiting because the connection or the server was not there. */
  remaining: number
}

let running: Promise<SyncSummary> | null = null
let again = false

export function syncEverything(userId: number, onOutboxEvent?: (e: OutboxEvent) => void): Promise<SyncSummary> {
  if (running) {
    again = true
    return running
  }
  const once = async (): Promise<SyncSummary> => {
    const mutations = await syncMutations(userId)
    let photosChanged = false
    const photos = await drainOutbox(userId, (e) => {
      photosChanged = true
      onOutboxEvent?.(e)
    })
    return { changed: mutations.synced + mutations.failed > 0 || photosChanged, remaining: mutations.remaining + photos.remaining }
  }
  running = (async () => {
    let summary = await once()
    while (again) {
      again = false
      const next = await once()
      summary = { changed: summary.changed || next.changed, remaining: next.remaining }
    }
    return summary
  })().finally(() => {
    running = null
  })
  return running
}

const SYNC_EVENT = "sp-sync-request"

/** Asks the open app to sync now, e.g. from a "Retry now" button. */
export function requestSync() {
  window.dispatchEvent(new Event(SYNC_EVENT))
}

export function onSyncRequest(listener: () => void) {
  window.addEventListener(SYNC_EVENT, listener)
  return () => window.removeEventListener(SYNC_EVENT, listener)
}
