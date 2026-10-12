export const NAV_LINKS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "demo", label: "AI Demo" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How it works" },
  { id: "faq", label: "FAQs" },
] as const

export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? "hello@smartpresence.app"
