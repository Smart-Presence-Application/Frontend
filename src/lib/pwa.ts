/** Talks to the service worker in public/sw.js. */

export const swSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator

export function registerServiceWorker() {
  if (!swSupported) return
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("Service worker registration failed", err)
    })
  })
}

/** Posts to the active worker once it is ready; a no-op without one. */
export async function postToServiceWorker(message: { type: string }) {
  if (!swSupported) return
  const registration = await navigator.serviceWorker.ready
  registration.active?.postMessage(message)
}

/** Forgets cached API data and images, so the next person on this device sees none of it. */
export function clearOfflineData() {
  return postToServiceWorker({ type: "CLEAR_DATA" })
}

/** Messages the service worker sends to open pages. */
export type WorkerMessage =
  | { type: "OUTBOX"; event: "synced" | "failed" | "changed"; kind?: "check-in" | "check-out"; message?: string }
  | { type: "PUSH"; path: string; url: string; title?: string; body?: string; popup?: boolean }
  | { type: "NAVIGATE"; url: string }

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let installEvent: InstallPromptEvent | null = null
const installListeners = new Set<() => void>()
const notifyInstall = () => installListeners.forEach((fn) => fn())

/**
 * Keeps the browser's install prompt for the Install button, and on install flags
 * the device so the installed app asks for notification permission on first launch.
 */
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    installEvent = event as InstallPromptEvent
    notifyInstall()
  })
  window.addEventListener("appinstalled", () => {
    try {
      localStorage.setItem("sp-app-installed", "1")
    } catch {}
    installEvent = null
    notifyInstall()
  })
}

export function canInstall() {
  return installEvent !== null
}

export function subscribeInstall(listener: () => void) {
  installListeners.add(listener)
  return () => {
    installListeners.delete(listener)
  }
}

export async function installApp() {
  if (!installEvent) return
  await installEvent.prompt()
  await installEvent.userChoice
  installEvent = null
  notifyInstall()
}
