import { useEffect } from "react"
import { useNavigate } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useAuth } from "@/context/auth"
import { listOutbox, outboxSupported, requestOutboxSync } from "@/lib/outbox"
import { swSupported, type WorkerMessage } from "@/lib/pwa"

/** Which lists a push about `path` makes stale. */
function keysForPush(path: string) {
  if (path.startsWith("inbox")) return [["inbox"]]
  if (path.startsWith("alerts")) return [["parent-alerts"], ["parent-attendance"]]
  if (path.startsWith("teacher-attendance") || path.startsWith("my-attendance")) return [["teacher-attendance"], ["teacher-attendance-summary"], ["dashboard"]]
  return []
}

/**
 * This user's queued offline check-ins, refreshed whenever the worker reports a
 * change. The data is local, so it ignores network mode and never goes stale.
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

/**
 * Reacts to the service worker: refreshes lists when a push arrives, reports
 * offline uploads as they sync, follows notification taps, and kicks off an
 * upload when the app opens or the connection comes back. When the app is in
 * front the worker skips the system notification, so it is shown as a toast here.
 */
export function useWorkerEvents() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

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
      } else if (data.type === "OUTBOX") {
        void queryClient.invalidateQueries({ queryKey: ["outbox"] })
        if (data.event === "synced") {
          toast.success(data.kind === "check-out" ? "Offline check-out uploaded" : "Offline check-in uploaded", { description: data.message })
          void queryClient.invalidateQueries({ queryKey: ["teacher-attendance"] })
          void queryClient.invalidateQueries({ queryKey: ["teacher-attendance-summary"] })
        } else if (data.event === "failed") {
          toast.error(data.kind === "check-out" ? "Offline check-out was refused" : "Offline check-in was refused", { description: data.message })
        }
      }
    }

    const sync = () => void requestOutboxSync()
    navigator.serviceWorker.addEventListener("message", onMessage)
    window.addEventListener("online", sync)
    sync()
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage)
      window.removeEventListener("online", sync)
    }
  }, [navigate, queryClient])
}
