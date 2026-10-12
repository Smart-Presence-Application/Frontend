/**
 * Google Analytics 4 (gtag.js). Off unless VITE_GA_MEASUREMENT_ID is set.
 *
 * The app is a single-page app, so GA's automatic page view (on full page
 * loads only) is turned off and every route change is sent by
 * `trackPageView` instead; see RouteAnalytics in app-status.tsx.
 */

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** Loads gtag.js. gtag expects the arguments object itself, not an array. */
export function initAnalytics() {
  if (!GA_ID || typeof window === "undefined" || window.gtag) return

  const script = document.createElement("script")
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
  document.head.append(script)

  window.dataLayer = window.dataLayer ?? []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag("js", new Date())
  window.gtag("config", GA_ID, { send_page_view: false })
}

export function trackPageView(path: string, title = document.title) {
  if (!GA_ID || !window.gtag) return
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: title,
  })
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!GA_ID || !window.gtag) return
  window.gtag("event", name, params)
}
