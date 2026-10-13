import { use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { authApi, onSessionExpired, type User } from "@/lib/api"
import { clearOfflineData } from "@/lib/pwa"
import { disablePush } from "@/lib/push"
import { queryClient } from "@/lib/query-client"
import { AuthContext } from "./auth-context"

/**
 * Holds the signed-in user. Cookies are HttpOnly, so the profile call is the only
 * way to know whether a session exists. When the refresh cookie expires the user is
 * dropped so guarded routes redirect to login. Logout disables push first (while
 * still signed in, so the server can drop this device's subscription) and always
 * clears the query cache, since different roles may share this browser.
 *
 * The check is skipped on public pages for browsers that have never signed in, so
 * visitors to the website do not trigger a failed profile and refresh call each.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const started = useRef(false)

  const checkSession = useCallback(() => {
    if (started.current) return
    started.current = true
    authApi
      .profile()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (hasSignedIn() || !isPublicPath(window.location.pathname)) checkSession()
  }, [checkSession])

  useEffect(() => {
    if (user) rememberSignedIn(true)
    else if (!loading) rememberSignedIn(false)
  }, [user, loading])

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setUser(null)
      queryClient.clear()
      void clearOfflineData()
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await disablePush().catch(() => {})
      await authApi.logout()
    } finally {
      setUser(null)
      queryClient.clear()
      void clearOfflineData()
    }
  }, [])

  const value = useMemo(() => ({ user, loading, setUser, logout, checkSession }), [user, loading, logout, checkSession])
  return <AuthContext value={value}>{children}</AuthContext>
}

/** The public website: it never needs to know who is signed in. */
const PUBLIC_PATHS = new Set(["/", "/privacy-policy"])

// eslint-disable-next-line react-refresh/only-export-components
export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname)
}

/** Readable hint that this browser has a session; the session itself lives in HttpOnly cookies. */
const SIGNED_IN_KEY = "sp-signed-in"

function hasSignedIn() {
  try {
    return localStorage.getItem(SIGNED_IN_KEY) === "1"
  } catch {
    return true
  }
}

function rememberSignedIn(on: boolean) {
  try {
    if (on) localStorage.setItem(SIGNED_IN_KEY, "1")
    else localStorage.removeItem(SIGNED_IN_KEY)
  } catch {}
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
