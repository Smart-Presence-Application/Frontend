import { Suspense, useEffect, useRef, type ReactNode } from "react"
import { isRouteErrorResponse, Link, Outlet, useLocation, useRouteError } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Construction, Home, LoaderCircle, LogIn, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"

import { Logo } from "@/components/common/logo"
import { PageLoader } from "@/components/common/page-loader"
import { Seo } from "@/components/common/seo"
import { Button } from "@/components/ui/button"
import { isPublicPath, useAuth } from "@/context/auth"
import { trackPageView } from "@/lib/analytics"
import { onMaintenance } from "@/lib/api"
import { systemApi } from "@/lib/endpoints"

export const SYSTEM_STATUS_KEY = ["system-status"]

/** The public website and login page stay open during maintenance, so a Super Admin can sign in and switch it off. */
const OPEN_DURING_MAINTENANCE = new Set(["/", "/login", "/privacy-policy"])

/** Whether the platform is in maintenance; refreshed often while it is. */
// eslint-disable-next-line react-refresh/only-export-components
export function useSystemStatus() {
  return useQuery({
    queryKey: SYSTEM_STATUS_KEY,
    queryFn: systemApi.status,
    staleTime: 30_000,
    refetchInterval: (query) => (query.state.data?.maintenance ? 30_000 : 5 * 60_000),
    refetchOnWindowFocus: true,
    retry: false,
  })
}

/**
 * Root route element. While maintenance mode is on, everyone except Super
 * Admins sees the maintenance screen; the login page stays open so a Super
 * Admin can sign in and switch it off. Any API call answered with "maintenance"
 * turns the screen on straight away, and a signed-in Super Admin still loading is
 * not flashed with it. Leaving the public website starts the session check if it was skipped. When it ends the app reloads to drop requests that failed
 * meanwhile. Also sends one analytics page view per route, after render so the new
 * page's <title> is in place.
 */
export function MaintenanceGate() {
  const queryClient = useQueryClient()
  const { user, loading, checkSession } = useAuth()
  const { pathname, search } = useLocation()
  const needsSession = !isPublicPath(pathname)
  const status = useSystemStatus()
  const maintenance = !!status.data?.maintenance
  const wasOn = useRef(false)

  useEffect(
    () =>
      onMaintenance((message) => {
        queryClient.setQueryData(SYSTEM_STATUS_KEY, { maintenance: true, message })
      }),
    [queryClient]
  )

  useEffect(() => {
    if (maintenance) wasOn.current = true
    else if (wasOn.current && status.isSuccess) window.location.reload()
  }, [maintenance, status.isSuccess])

  useEffect(() => {
    if (needsSession) checkSession()
  }, [needsSession, checkSession])

  useEffect(() => {
    const timer = setTimeout(() => trackPageView(pathname + search), 0)
    return () => clearTimeout(timer)
  }, [pathname, search])

  if (maintenance && loading && needsSession) return <PageLoader />
  if (maintenance && user?.role !== "SUPER_ADMIN" && !OPEN_DURING_MAINTENANCE.has(pathname)) {
    return <MaintenanceScreen message={status.data?.message} checking={status.isFetching} onRetry={() => void status.refetch()} />
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  )
}

function StatusScreen({
  icon: Icon,
  tone = "primary",
  title,
  children,
  actions,
  footer,
}: {
  icon: LucideIcon
  tone?: "primary" | "destructive"
  title: string
  children: ReactNode
  actions: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 text-foreground">
      <Seo title={`${title} | SmartPresence`} description="SmartPresence status" path="/" noIndex />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div aria-hidden="true" className="absolute top-1/3 left-1/2 -z-10 size-[32rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <Logo className="mb-8" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg rounded-3xl border bg-card/95 p-8 text-center shadow-2xl shadow-primary/10 backdrop-blur sm:p-10"
        role="alert"
      >
        <span
          className={
            tone === "destructive"
              ? "mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"
              : "mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          }
        >
          <Icon className="size-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <div className="mt-3 text-muted-foreground">{children}</div>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">{actions}</div>
      </motion.div>
      {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  )
}

function MaintenanceScreen({ message, checking, onRetry }: { message?: string; checking?: boolean; onRetry: () => void }) {
  return (
    <StatusScreen
      icon={Construction}
      title="We'll be right back"
      actions={
        <Button size="lg" onClick={onRetry} disabled={checking}>
          {checking ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
          {checking ? "Checking" : "Try again"}
        </Button>
      }
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 transition-colors hover:text-primary">
          <LogIn className="size-3.5" /> Administrator sign in
        </Link>
      }
    >
      <p>{message || "SmartPresence is undergoing scheduled maintenance. We'll be back shortly."}</p>
      <p className="mt-3 text-xs">This page checks again on its own and reopens the app as soon as we're back.</p>
    </StatusScreen>
  )
}

const RELOAD_KEY = "sp-chunk-reload"

/** A deploy replaced the code this tab was running; a fresh load fixes it. */
function isStaleChunk(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError|error loading dynamically/i.test(text)
}

/**
 * Replaces React Router's developer error page for every route. A stale chunk after a
 * deploy triggers one reload; if the code is still missing the screen shows instead of looping.
 */
export function RouteError() {
  const error = useRouteError()
  const staleChunk = isStaleChunk(error)

  useEffect(() => {
    if (!staleChunk) return
    try {
      if (sessionStorage.getItem(RELOAD_KEY)) return
      sessionStorage.setItem(RELOAD_KEY, "1")
    } catch {
      return
    }
    window.location.reload()
  }, [staleChunk])

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_KEY)
      } catch {}
    }, 10_000)
    return () => clearTimeout(timer)
  }, [])

  const notFound = isRouteErrorResponse(error) && error.status === 404
  const detail = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : String(error)

  return (
    <StatusScreen
      icon={staleChunk ? RefreshCw : TriangleAlert}
      tone={staleChunk ? "primary" : "destructive"}
      title={notFound ? "Page not found" : staleChunk ? "A new version is available" : "Something went wrong"}
      actions={
        <>
          <Button size="lg" onClick={() => window.location.reload()}>
            <RefreshCw /> Reload
          </Button>
          <Button size="lg" variant="outline" onClick={() => window.location.assign("/app")}>
            <Home /> Go to my portal
          </Button>
        </>
      }
    >
      <p>
        {notFound
          ? "This page does not exist."
          : staleChunk
            ? "SmartPresence was updated. Reload to get the latest version."
            : "This page hit an unexpected problem. Reloading usually fixes it; your data is safe."}
      </p>
      {import.meta.env.DEV && !notFound && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-muted p-3 text-left text-xs whitespace-pre-wrap">{detail}</pre>
      )}
    </StatusScreen>
  )
}
