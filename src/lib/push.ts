/** Web Push: subscribe this device so the backend can notify it even when the app is closed. */

import { pushApi } from "./endpoints"
import { swSupported } from "./pwa"

const pushSupported = swSupported && typeof window !== "undefined" && "PushManager" in window && "Notification" in window

type PushState = "unsupported" | "denied" | "off" | "on"

function keyToBytes(base64url: string) {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported) return "unsupported"
  if (Notification.permission === "denied") return "denied"
  return (await currentSubscription()) && Notification.permission === "granted" ? "on" : "off"
}

/** Must run from a click: browsers only show the permission prompt for a user gesture. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported) return "unsupported"
  const permission = await Notification.requestPermission()
  if (permission !== "granted") return permission === "denied" ? "denied" : "off"

  const key = await pushApi.publicKey()
  if (!key) throw new Error("Push notifications are not set up on the server yet.")

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) }))
  await pushApi.subscribe(subscription.toJSON())
  return "on"
}

/** Stops pushes to this device; used by the toggle and on sign-out. */
export async function disablePush() {
  if (!pushSupported) return
  const subscription = await currentSubscription()
  if (!subscription) return
  try {
    await pushApi.unsubscribe(subscription.endpoint)
  } finally {
    await subscription.unsubscribe()
  }
}

/** Set by pwa.ts on the browser's "appinstalled" event (it cannot import this module). */
const INSTALLED_KEY = "sp-app-installed"
const optOutKey = (userId: number) => `sp-push-opt-out-${userId}`

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === "1"
  } catch {
    return false
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, "1")
    else localStorage.removeItem(key)
  } catch {}
}

/** Running as the installed app (home screen / desktop window) rather than a browser tab. */
export function isInstalledApp() {
  if (typeof window === "undefined") return false
  const standalone = ["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"].some(
    (mode) => window.matchMedia(`(display-mode: ${mode})`).matches
  )
  return standalone || (navigator as Navigator & { standalone?: boolean }).standalone === true || readFlag(INSTALLED_KEY)
}

/** A user who turned notifications off on this device is never switched back on automatically. */
export function pushOptedOut(userId: number) {
  return readFlag(optOutKey(userId))
}

export function setPushOptOut(userId: number, optedOut: boolean) {
  writeFlag(optOutKey(userId), optedOut)
}
