import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolved: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = "sp-theme"
const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStored(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === "light" || value === "dark" ? value : "system"
  } catch {
    return "system"
  }
}

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches

/**
 * Light/dark/system theme for the admin panel. The dark class is removed on unmount
 * because the marketing pages are light only. If storage is unavailable (private
 * mode) the choice still applies for this visit.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStored)
  const [prefersDark, setPrefersDark] = useState(systemDark)

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setPrefersDark(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark")
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute("content", resolved === "dark" ? "#0b0f0d" : "#16a34a")
    return () => {
      document.documentElement.classList.remove("dark")
      meta?.setAttribute("content", "#16a34a")
    }
  }, [resolved])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }, [])

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme])
  return <ThemeContext value={value}>{children}</ThemeContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = use(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}
