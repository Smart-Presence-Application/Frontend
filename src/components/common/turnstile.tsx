import { useEffect, useRef } from "react"

/**
 * Cloudflare Turnstile: an invisible-by-default spam check. The widget hands
 * back a token that the backend verifies with Cloudflare before accepting the
 * form. Without VITE_TURNSTILE_SITE_KEY it renders nothing (local development);
 * the backend skips the check too when it has no secret.
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

// eslint-disable-next-line react-refresh/only-export-components
export const turnstileEnabled = !!SITE_KEY

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loading: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile failed to load")))
    script.onerror = () => {
      loading = null
      reject(new Error("Turnstile failed to load"))
    }
    document.head.append(script)
  })
  return loading
}

/** Bump `resetKey` to get a fresh token for the next submission, since a token works only once. */
export function Turnstile({ onToken, resetKey }: { onToken: (token: string) => void; resetKey?: number }) {
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const callback = useRef(onToken)
  useEffect(() => {
    callback.current = onToken
  }, [onToken])

  useEffect(() => {
    if (!SITE_KEY || !container.current) return
    let cancelled = false

    loadTurnstile()
      .then((ts) => {
        if (cancelled || !container.current) return
        widget.current = ts.render(container.current, {
          sitekey: SITE_KEY,
          theme: "auto",
          size: "flexible",
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(""),
          "error-callback": () => callback.current(""),
        })
      })
      .catch(() => callback.current(""))

    return () => {
      cancelled = true
      if (widget.current) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [])

  useEffect(() => {
    if (resetKey && widget.current) {
      window.turnstile?.reset(widget.current)
      callback.current("")
    }
  }, [resetKey])

  if (!SITE_KEY) return null
  return <div ref={container} className="min-h-[65px]" />
}
