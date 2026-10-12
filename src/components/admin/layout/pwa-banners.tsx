import { useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { BellRing, CloudOff, CloudUpload, Download, LoaderCircle } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"

import { InstallButton, useInstall } from "@/components/common/install-button"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth"
import { usePanel } from "@/context/panel"
import { useOnline } from "@/hooks/use-online"
import { useOutbox } from "@/hooks/use-worker-events"
import { enablePush, getPushState, isInstalledApp, pushOptedOut, setPushOptOut } from "@/lib/push"

/** Push state for this device, shared by the prompt and the profile toggle. */
export function usePushState() {
  return useQuery({ queryKey: ["push-state"], queryFn: getPushState, networkMode: "always", staleTime: Infinity })
}

/** Turns push on from a click and reports the outcome. */
export function useEnablePush() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [pending, setPending] = useState(false)
  async function enable() {
    setPending(true)
    try {
      const state = await enablePush()
      queryClient.setQueryData(["push-state"], state)
      if (user && state !== "off") setPushOptOut(user.id, false)
      if (state === "on") toast.success("Notifications are on for this device")
      else if (state === "denied") toast.error("Notifications are blocked", { description: "Allow them for this site in your browser settings." })
    } catch (err) {
      toast.error("Could not turn on notifications", { description: err instanceof Error ? err.message : undefined })
    } finally {
      setPending(false)
    }
  }
  return { enable, pending }
}

/**
 * In the installed app notifications are on by default: on launch the browser's
 * permission prompt is shown (retried on the first tap where a browser only
 * allows it after one), and the device is subscribed once allowed. Turning
 * them off in My profile is remembered, so they are never forced back on.
 */
export function useAutoEnablePush() {
  const { user } = useAuth()
  const { data: state } = usePushState()
  const { enable } = useEnablePush()
  const tried = useRef(false)

  useEffect(() => {
    if (!user || state !== "off" || tried.current || !isInstalledApp() || pushOptedOut(user.id)) return
    tried.current = true

    void enable()
    if (Notification.permission !== "default") return
    const retry = () => {
      if (Notification.permission === "default") void enable()
    }
    window.addEventListener("pointerdown", retry, { once: true })
    return () => window.removeEventListener("pointerdown", retry)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, state])
}

/** Offline notice, plus how many check-ins are waiting to upload. */
export function ConnectionBanner() {
  const online = useOnline()
  const { data: outbox = [] } = useOutbox()
  const waiting = outbox.filter((i) => i.status !== "failed").length
  const show = !online || waiting > 0

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
          role="status"
        >
          <div
            className={
              online
                ? "flex items-center gap-2 border-b bg-primary/10 px-4 py-2 text-sm text-primary sm:px-6"
                : "flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 sm:px-6 dark:text-amber-300"
            }
          >
            {online ? <LoaderCircle className="size-4 shrink-0 animate-spin" /> : <CloudOff className="size-4 shrink-0" />}
            <span className="min-w-0 flex-1">
              {online
                ? `Uploading ${waiting} offline ${waiting === 1 ? "photo" : "photos"}…`
                : "You are offline. Showing the last saved data; changes need internet."}
              {!online && waiting > 0 && (
                <span className="ml-1 inline-flex items-center gap-1 font-medium">
                  <CloudUpload className="size-3.5" /> {waiting} waiting to upload
                </span>
              )}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const PROMPT_TEXT = {
  super: "Hear about new messages as soon as they arrive.",
  school: "Hear about new messages and teacher check-ins waiting for you.",
  teacher: "Hear about new messages and when your attendance is verified.",
  parent: "Hear about your child's attendance and school notices straight away.",
} as const

function dismissKey(userId?: number) {
  return `sp-push-prompt-dismissed-${userId ?? "anon"}`
}

const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000

/** Invitation to turn on push notifications on this device. "Not now" lasts a week, so nobody who dismissed it once silently misses alerts forever. */
export function NotificationPrompt() {
  const { user } = useAuth()
  const { kind } = usePanel()
  const { data: state } = usePushState()
  const { enable, pending } = useEnablePush()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return Date.now() - Number(localStorage.getItem(dismissKey(user?.id)) || 0) < DISMISS_FOR_MS
    } catch {
      return false
    }
  })

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(dismissKey(user?.id), String(Date.now()))
    } catch {}
  }

  const show = state === "off" && !dismissed

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="mb-6 flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BellRing className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Turn on notifications</p>
            <p className="text-sm text-muted-foreground">{PROMPT_TEXT[kind]} Works even when the app is closed.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={dismiss}>
              Not now
            </Button>
            <Button onClick={() => void enable()} disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <BellRing />} Turn on
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const INSTALL_TEXT = {
  super: "Open SmartPresence from your desktop or home screen, with notifications and offline use.",
  school: "Open SmartPresence from your desktop or home screen, with notifications and offline use.",
  teacher: "Check in and take attendance from your home screen, even offline.",
  parent: "Get your child's attendance alerts as notifications, straight from your home screen.",
} as const

/** Invites anyone whose browser can install the app to do so; "Not now" lasts a week. */
export function InstallPrompt() {
  const { user } = useAuth()
  const { kind } = usePanel()
  const { available } = useInstall()
  const key = `sp-install-prompt-dismissed-${user?.id ?? "anon"}`
  const [dismissed, setDismissed] = useState(() => {
    try {
      return Date.now() - Number(localStorage.getItem(key) || 0) < DISMISS_FOR_MS
    } catch {
      return false
    }
  })

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(key, String(Date.now()))
    } catch {}
  }

  return (
    <AnimatePresence>
      {available && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="mb-6 flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Download className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Install the SmartPresence app</p>
            <p className="text-sm text-muted-foreground">{INSTALL_TEXT[kind]}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={dismiss}>
              Not now
            </Button>
            <InstallButton>Install</InstallButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
