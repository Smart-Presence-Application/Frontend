import { useEffect } from "react"
import { useNavigate } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useAuth } from "@/context/auth"
import { listMutations, onQueueChange } from "@/lib/offline-queue"
import { listOutbox, outboxSupported, type OutboxEvent } from "@/lib/outbox"
import { swSupported, type WorkerMessage } from "@/lib/pwa"
import { onSyncRequest, syncEverything } from "@/lib/sync"

/** How often to retry while something is waiting and the device says it is online. */
const RETRY_EVERY_MS = 30_000

/** Which lists a push about `path` makes stale. */
function keysForPush(path: string) {
  if (path.startsWith("inbox")) return [["inbox"]]
  if (path.startsWith("alerts")) return [["parent-alerts"], ["parent-attendance"]]
  if (path.startsWith("teacher-attendance") || path.startsWith("my-attendance")) return [["teacher-attendance"], ["teacher-attendance-summary"], ["dashboard"]]
  return []
}

/**
 * This user's queued offline check-ins, refreshed whenever an upload changes them.
 * The data is local, so it ignores network mode and never goes stale.
 */
export function useOutbox() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["outbox", user?.id],
    queryFn: () => listOutbox(user!.id),
    enabled: !!user && outboxSupported,
    networkMode: "always",
    staleTime: Infinity,
  })
}

/** This user's changes saved while offline, waiting to sync (or refused by the server). */
export function useOfflineQueue() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["offline-queue", user?.id],
    queryFn: () => listMutations(user!.id),
    enabled: !!user && outboxSupported,
    networkMode: "always",
    staleTime: Infinity,
  })
}

function toastOutbox(e: OutboxEvent) {
  if (e.event === "synced") toast.success(e.kind === "check-out" ? "Offline check-out uploaded" : "Offline check-in uploaded", { description: e.message })
  else toast.error(e.kind === "check-out" ? "Offline check-out was refused" : "Offline check-in was refused", { description: e.message })
}

/**
 * Reacts to the service worker: refreshes lists when a push arrives, reports
 * offline uploads it made, and follows notification taps. When the app is in
 * front the worker skips the system notification, so it is shown as a toast here.
 *
 * Also keeps this device in sync: whatever was saved offline is sent when the app
 * opens, when the connection comes back, when the app returns to the screen and,
 * while anything is still waiting, every RETRY_EVERY_MS. After something reaches the
 * server every query is refetched, so the app shows the server's data again.
 */
export function useWorkerEvents() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (!swSupported) return

    function onMessage(event: MessageEvent<WorkerMessage>) {
      const data = event.data
      if (!data || typeof data !== "object") return
      if (data.type === "PUSH") {
        for (const queryKey of keysForPush(data.path)) void queryClient.invalidateQueries({ queryKey })
        void queryClient.invalidateQueries({ queryKey: ["inbox", "unread"] })
        void queryClient.invalidateQueries({ queryKey: ["parent-alerts", "unread"] })
        if (data.popup && data.title) {
          toast.info(data.title, {
            description: data.body,
            duration: 8000,
            action: data.url ? { label: "View", onClick: () => navigate(data.url) } : undefined,
          })
        }
      } else if (data.type === "NAVIGATE") {
        navigate(data.url)
      } else if (data.type === "QUEUE") {
        void queryClient.invalidateQueries({ queryKey: ["offline-queue"] })
        void queryClient.invalidateQueries()
      } else if (data.type === "OUTBOX") {
        void queryClient.invalidateQueries({ queryKey: ["outbox"] })
        if (data.event === "synced" || data.event === "failed") {
          toastOutbox({ event: data.event, kind: data.kind ?? "check-in", message: data.message ?? "" })
          void queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] })
          void queryClient.invalidateQueries({ queryKey: ["teacher-attendance-summary"] })
        }
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage)
    return () => navigator.serviceWorker.removeEventListener("message", onMessage)
  }, [navigate, queryClient])

  useEffect(() => {
    if (!userId || !outboxSupported) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    const schedule = (ms: number) => {
      clearTimeout(timer)
      if (!stopped) timer = setTimeout(() => void sync(), ms)
    }

    async function sync() {
      clearTimeout(timer)
      if (stopped || !navigator.onLine) return
      try {
        const summary = await syncEverything(userId!, (e) => {
          toastOutbox(e)
          void queryClient.invalidateQueries({ queryKey: ["outbox"] })
        })
        if (summary.changed) {
          void queryClient.invalidateQueries()
          if (summary.remaining === 0) toast.success("Everything saved offline is now synced")
        }
        if (summary.remaining > 0) schedule(RETRY_EVERY_MS)
      } catch {
        schedule(RETRY_EVERY_MS)
      }
    }

    const onVisible = () => document.visibilityState === "visible" && void sync()
    // Something was just saved for later, perhaps on a connection that is up but not
    // working: try again shortly rather than waiting for an "online" event.
    const stopQueue = onQueueChange(() => {
      void queryClient.invalidateQueries({ queryKey: ["offline-queue"] })
      schedule(2_000)
    })
    const stopRequests = onSyncRequest(() => void sync())
    window.addEventListener("online", sync)
    document.addEventListener("visibilitychange", onVisible)
    void sync()

    return () => {
      stopped = true
      clearTimeout(timer)
      stopQueue()
      stopRequests()
      window.removeEventListener("online", sync)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [userId, queryClient])
}
