import { Suspense, useEffect, useState } from "react"
import { Link, Navigate, Outlet, ScrollRestoration, useLocation } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Construction, ShieldAlert } from "lucide-react"
import { motion } from "motion/react"

import { useSystemStatus } from "@/components/common/app-status"
import { Logo } from "@/components/common/logo"
import { PageLoader } from "@/components/common/page-loader"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useAuth } from "@/context/auth"
import { useIdleRefresh } from "@/hooks/use-idle-refresh"
import { useWorkerEvents } from "@/hooks/use-worker-events"
import { PanelProvider, usePanel } from "@/context/panel"
import { ThemeProvider } from "@/context/theme"
import { ApiError } from "@/lib/api"
import { inboxApi, parentPortalApi, schoolsApi, teachersApi } from "@/lib/endpoints"
import { PANEL_BASE, type PanelKind } from "@/lib/panel"
import { DesktopSidebar, SchoolBadge, SidebarNav } from "./sidebar"
import { ConnectionBanner, InstallPrompt, NotificationPrompt, useAutoEnablePush } from "./pwa-banners"
import { Topbar } from "./topbar"

const COLLAPSE_KEY = "sp-sidebar-collapsed"

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1"
  } catch {
    return false
  }
}

const PANEL_ROLE = { super: "SUPER_ADMIN", school: "SCHOOL_ADMIN", teacher: "TEACHER", parent: "PARENT" } as const
const ROLE_PANEL = { SUPER_ADMIN: "super", SCHOOL_ADMIN: "school", TEACHER: "teacher", PARENT: "parent" } as const

/** Shared shell for every role's panel; `panel` decides who may enter and what they see. Anyone opening another role's panel is sent to their own. */
export default function AdminLayout({ panel = "super" }: { panel?: PanelKind }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (user.role !== PANEL_ROLE[panel]) return <Navigate to={PANEL_BASE[ROLE_PANEL[user.role]]} replace />

  return (
    <ThemeProvider>
      {panel === "school" ? (
        <SchoolScope />
      ) : panel === "teacher" ? (
        <TeacherScope />
      ) : panel === "parent" ? (
        <ParentScope />
      ) : (
        <PanelProvider kind="super">
          <Shell />
        </PanelProvider>
      )}
    </ThemeProvider>
  )
}

/** Loads the teacher's own record first, since every page is scoped to their school and class. */
function TeacherScope() {
  const { data: teacher, error, refetch } = useQuery({ queryKey: ["teacher", "me"], queryFn: teachersApi.me })
  if (error) {
    const unlinked = error instanceof ApiError && error.status === 404
    return (
      <Notice
        title={unlinked ? "No teacher profile yet" : "Could not load your profile"}
        text={unlinked ? "Your account is not linked to a teacher record. Ask your school admin to set it up." : error.message}
        action={unlinked ? undefined : () => refetch()}
      />
    )
  }
  if (!teacher) return <PageLoader />
  return (
    <PanelProvider kind="teacher" teacher={teacher}>
      <Shell />
    </PanelProvider>
  )
}

/** Loads the School Admin's school before rendering, since every page is scoped to it. */
function SchoolScope() {
  const { data: school, error, refetch } = useQuery({ queryKey: ["school", "me"], queryFn: schoolsApi.me })
  if (error) {
    const unlinked = error instanceof ApiError && error.status === 404
    return (
      <Notice
        title={unlinked ? "No school linked yet" : "Could not load your school"}
        text={
          unlinked
            ? "Your account is not set as the administrator of any school. Ask the SmartPresence team to link it."
            : error.message
        }
        action={unlinked ? undefined : () => refetch()}
      />
    )
  }
  if (!school) return <PageLoader />
  return (
    <PanelProvider kind="school" school={school}>
      <Shell />
    </PanelProvider>
  )
}

/** Loads the parent's profile and children first; every page is about them. */
function ParentScope() {
  const { data: parent, error, refetch } = useQuery({ queryKey: ["parent", "me"], queryFn: parentPortalApi.me })
  if (error) {
    const unlinked = error instanceof ApiError && error.status === 404
    return (
      <Notice
        title={unlinked ? "No parent profile yet" : "Could not load your profile"}
        text={unlinked ? "Your account is not linked to any student. Ask your child's school to set it up." : error.message}
        action={unlinked ? undefined : () => refetch()}
      />
    )
  }
  if (!parent) return <PageLoader />
  return (
    <PanelProvider kind="parent" parent={parent}>
      <Shell />
    </PanelProvider>
  )
}

/**
 * Panel chrome. Keeps data fresh while idle, reacts to the service worker, turns push
 * on in the installed app, and polls unread badges (inbox, plus alerts for parents).
 * Pages are keyed by path so each fades in; there is no exit animation since
 * <Outlet> already shows the next route.
 */
function Shell() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  useIdleRefresh()
  useWorkerEvents()
  useAutoEnablePush()

  const { data: unread = 0 } = useQuery({
    queryKey: ["inbox", "unread"],
    queryFn: () => inboxApi.unreadCount().then((d) => d.unread),
    refetchInterval: 60_000,
  })
  const isParent = usePanel().kind === "parent"
  const { data: alerts = 0 } = useQuery({
    queryKey: ["parent-alerts", "unread"],
    queryFn: () => parentPortalApi.alertsUnread().then((d) => d.unread),
    refetchInterval: 60_000,
    enabled: isParent,
  })
  const badges = { inbox: unread, alerts }

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0")
    } catch {}
  }, [collapsed])

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <a
        href="#admin-main"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <DesktopSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} badges={badges} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
          <SheetHeader className="h-16 justify-center border-b px-5">
            <SheetTitle asChild>
              <div>
                <Logo className="text-[1.7rem]" />
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Panel navigation</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SchoolBadge />
            <SidebarNav badges={badges} onNavigate={() => setMobileOpen(false)} layoutId="mobile" />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} badges={badges} />
        <ConnectionBanner />
        <MaintenanceBanner />
        <main id="admin-main" className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <InstallPrompt />
            <NotificationPrompt />
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
      <ScrollRestoration />
    </div>
  )
}

function Notice({ title, text, action }: { title: string; text: string; action?: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{text}</p>
        {action ? (
          <Button className="mt-6" onClick={action}>
            Try again
          </Button>
        ) : (
          <Button asChild className="mt-6">
            <Link to="/app">Go to my portal</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

/** Only Super Admins get past the maintenance screen, so remind them it is on. */
function MaintenanceBanner() {
  const { data } = useSystemStatus()
  if (!data?.maintenance) return null
  return (
    <div role="status" className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 sm:px-6 dark:text-amber-300">
      <Construction className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">Maintenance mode is on. Everyone except Super Admins sees the maintenance screen.</span>
      <Link to="/admin" className="shrink-0 font-medium underline-offset-4 hover:underline">
        Manage
      </Link>
    </div>
  )
}
