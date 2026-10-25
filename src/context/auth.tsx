import { use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { ApiError, authApi, onSessionExpired, type User } from "@/lib/api"
import { setQueueUser } from "@/lib/offline-queue"
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
 *
 * The last signed-in user is remembered on the device, so when the app opens with no
 * connection (and no saved profile) it still shows that user's panel with saved data,
 * instead of the login page. Only an answer from the server signs the user out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const started = useRef(false)

  const setUser = useCallback((next: User | null) => {
    rememberUser(next)
    setQueueUser(next?.id ?? null)
    setUserState(next)
  }, [])

  const checkSession = useCallback(() => {
    if (started.current) return
    started.current = true
    authApi
      .profile()
      .then((data) => setUser(data.user))
      .catch((err) => setUser(err instanceof ApiError ? null : rememberedUser()))
      .finally(() => setLoading(false))
  }, [setUser])

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
  }, [setUser])

  const logout = useCallback(async () => {
    try {
      await disablePush().catch(() => {})
      await authApi.logout()
    } finally {
      setUser(null)
      queryClient.clear()
      void clearOfflineData()
    }
  }, [setUser])

  const value = useMemo(() => ({ user, loading, setUser, logout, checkSession }), [user, loading, setUser, logout, checkSession])
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

/** The signed-in user, kept on the device for opening the app offline. Cleared on sign-out. */
const USER_KEY = "sp-user"

// eslint-disable-next-line react-refresh/only-export-components
export function rememberedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function rememberUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {}
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
