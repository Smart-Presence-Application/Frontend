import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const

/**
 * Whether the user is in the middle of something a refresh must not disturb: an open
 * dialog, menu or picker (Radix only mounts them while open) or a focused field.
 */
function isBusy() {
  if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')) return true
  const el = document.activeElement as HTMLElement | null
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
}

/**
 * Refetches the data on screen once nothing has happened for `idleMs`, then again
 * every `idleMs` while it stays idle. It refetches queries instead of reloading the
 * page, so filters, scroll position and unsaved edits survive; it waits while a
 * dialog is open, a field has focus, a save is running or the tab is hidden.
 * Mounting counts as both activity and a fresh load.
 */
export function useIdleRefresh(idleMs = 60_000) {
  const queryClient = useQueryClient()
  const lastActivity = useRef(0)
  const lastRefresh = useRef(0)

  useEffect(() => {
    lastActivity.current = lastRefresh.current = Date.now()
    const mark = () => {
      lastActivity.current = Date.now()
    }
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, mark, { passive: true, capture: true })

    const timer = window.setInterval(() => {
      const now = Date.now()
      if (document.visibilityState !== "visible") return
      if (now - lastActivity.current < idleMs || now - lastRefresh.current < idleMs) return
      if (isBusy() || queryClient.isMutating() > 0 || queryClient.isFetching() > 0) return
      lastRefresh.current = now
      void queryClient.refetchQueries({ type: "active" })
    }, 5_000)

    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, mark, { capture: true })
      window.clearInterval(timer)
    }
  }, [idleMs, queryClient])
}
