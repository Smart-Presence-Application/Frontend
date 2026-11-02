export const NAV_LINKS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "demo", label: "AI Demo" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "faq", label: "FAQs" },
] as const

/** Standalone pages, linked from the navbar and footer but not part of the homepage. */
export const PAGE_LINKS = [
  { to: "/docs", label: "Docs" },
  { to: "/status", label: "Status" },
] as const

export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? "hello@smartpresence.app"
