import { use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

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
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi
      .profile()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

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

  const value = useMemo(() => ({ user, loading, setUser, logout }), [user, loading, logout])
  return <AuthContext value={value}>{children}</AuthContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
