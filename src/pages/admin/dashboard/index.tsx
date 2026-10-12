import { lazy, Suspense } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight,
  Bell,
  CalendarRange,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Presentation,
  ScanFace,
  School,
  Send,
  Timer,
  UsersRound,
} from "lucide-react"
import { motion } from "motion/react"

import { PageHeader } from "@/components/admin/page-header"
import { SchoolCalendarCard } from "@/components/common/school-calendar"
import { EmptyState } from "@/components/admin/states"
import { ActiveBadge, Pill, StatCard } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth"
import { usePanel } from "@/context/panel"
import { countOf, schoolsApi, sessionsApi, teachersApi } from "@/lib/endpoints"
import { classSectionLabel, formatDate } from "@/lib/format"
import { panelPath } from "@/lib/panel"

import { RecentActivityCard } from "./recent-activity-card"

/** Recharts is the heaviest dependency here, so charts load after the numbers. */
const DashboardCharts = lazy(() => import("./charts"))

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

/** Admin dashboard. Lists are scoped server-side, so the same counts describe one school for a School Admin. Super Admins see the newest schools and platform activity; School Admins see the newest teachers, class attendance and their school's calendar. */
export default function DashboardPage() {
  const { user } = useAuth()
  const panel = usePanel()
  const isSchool = panel.kind === "school"

  const counts = useQuery({
    queryKey: ["dashboard", "counts", panel.kind],
    queryFn: async () => {
      const [
        schools,
        activeSchools,
        facesRegistered,
        teachers,
        students,
        parents,
        schoolAdmins,
        inactiveUsers,
        draftSessions,
        pendingTeacherDays,
        notifications,
      ] = await Promise.all([
        isSchool ? Promise.resolve(1) : countOf("schools/"),
        isSchool ? Promise.resolve(1) : countOf("schools/", { status: "ACTIVE" }),
        isSchool ? countOf("student-attendance/faces/", { registered: true }) : Promise.resolve(0),
        countOf("teachers/"),
        countOf("students/"),
        countOf("parents/"),
        isSchool ? Promise.resolve(0) : countOf("auth/users/", { role: "SCHOOL_ADMIN" }),
        countOf("auth/users/", { is_active: false }),
        countOf("student-attendance/sessions/", { status: "DRAFT" }),
        countOf("teacher-attendance/records/", { status: "DRAFT" }),
        countOf("notifications/"),
      ])
      return { schools, activeSchools, facesRegistered, teachers, students, parents, schoolAdmins, inactiveUsers, draftSessions, pendingTeacherDays, notifications }
    },
  })

  const recent = useQuery({
    queryKey: ["dashboard", "recent", panel.kind],
    queryFn: async () =>
      isSchool
        ? (await teachersApi.list({ ordering: "-created_at", page_size: 5 })).results.map((t) => ({
            id: t.id,
            title: t.name,
            sub: `${t.employee_id} · ${classSectionLabel(t.class_section_detail)}`,
            to: panelPath(`/admin/teachers/${t.id}`),
            active: t.is_active,
          }))
        : (await schoolsApi.list({ ordering: "-created_at", page_size: 5 })).results.map((s) => ({
            id: s.id,
            title: s.name,
            sub: `${s.code}${s.city ? ` · ${s.city}` : ""}`,
            to: panelPath(`/admin/schools/${s.id}`),
            active: s.status === "ACTIVE",
          })),
  })
  const recentSessions = useQuery({
    queryKey: ["dashboard", "recent-sessions"],
    queryFn: () => sessionsApi.list({ page_size: 10 }),
    enabled: isSchool,
  })

  const c = counts.data
  const stats = [
    isSchool
      ? {
          label: "Faces registered",
          value: c?.facesRegistered,
          icon: ScanFace,
          to: panelPath("/admin/faces"),
          hint: c ? `${c.facesRegistered} of ${c.students} students can be recognised` : undefined,
          tone: "dark" as const,
        }
      : {
          label: "Schools",
          value: c?.schools,
          icon: School,
          to: panelPath("/admin/schools"),
          hint: c ? `${c.activeSchools} active, ${c.schools - c.activeSchools} inactive` : undefined,
          tone: "dark" as const,
        },
    {
      label: "Teachers",
      value: c?.teachers,
      icon: Presentation,
      to: panelPath("/admin/teachers"),
      hint: isSchool ? "On your staff" : "Across all schools",
    },
    { label: "Students", value: c?.students, icon: GraduationCap, to: panelPath("/admin/students"), hint: "Enrolled in class sections" },
    { label: "Parents", value: c?.parents, icon: UsersRound, to: panelPath("/admin/parents"), hint: "Linked to their children" },
  ]

  const attention = [
    {
      label: "Draft attendance sessions",
      value: c?.draftSessions,
      icon: ClipboardCheck,
      to: panelPath("/admin/attendance?status=DRAFT"),
      text: "Not yet locked, so parents have not been notified.",
    },
    {
      label: "Teacher days to verify",
      value: c?.pendingTeacherDays,
      icon: Timer,
      to: panelPath("/admin/teacher-attendance?status=DRAFT"),
      text: "Check-ins waiting for an admin to verify.",
    },
    {
      label: "Inactive accounts",
      value: c?.inactiveUsers,
      icon: UsersRound,
      to: panelPath("/admin/users?is_active=false"),
      text: "Users who cannot sign in right now.",
    },
  ]

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name.split(" ")[0] ?? "Admin"}`}
        seoTitle="Dashboard"
        icon={LayoutDashboard}
        description={
          isSchool ? `Here is how ${panel.school?.name} is doing today.` : "Here is how SmartPresence is running across every school today."
        }
        actions={
          <>
            <Button asChild variant="outline" className="h-9">
              <Link to={panelPath("/admin/notifications/new")}>
                <Send /> Send notification
              </Link>
            </Button>
            <Button asChild className="h-9 shadow-md shadow-primary/20">
              <Link to={panelPath(isSchool ? "/admin/teachers" : "/admin/schools")}>
                <Plus /> {isSchool ? "Add teacher" : "Add school"}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} loading={counts.isLoading} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {attention.map((a, i) => (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
          >
            <Link
              to={a.to}
              className="group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <a.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  {counts.isLoading ? <Skeleton className="h-6 w-8" /> : <span className="text-xl font-bold tabular-nums">{a.value ?? "-"}</span>}
                  <span className="truncate text-sm font-medium">{a.label}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{a.text}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          </motion.div>
        ))}
      </div>

      <Suspense
        fallback={
          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Skeleton className="h-80 rounded-2xl lg:col-span-3" />
            <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          </div>
        }
      >
        <DashboardCharts counts={c} variant={isSchool ? "school" : "super"} sessions={recentSessions.data?.results} loading={counts.isLoading || recentSessions.isLoading} />
      </Suspense>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {isSchool && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="font-semibold">Recent attendance</CardTitle>
              <CardDescription>{isSchool ? "Latest class sessions in your school" : "Latest class sessions from every school"}</CardDescription>
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link to={panelPath("/admin/attendance")}>
                    View all <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              {recentSessions.isLoading ? (
                <div className="grid gap-3 px-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : recentSessions.data?.results.length ? (
                <ul className="divide-y">
                  {recentSessions.data.results.slice(0, 6).map((s) => {
                    const pct = s.total_students ? Math.round(((s.present_count ?? 0) / s.total_students) * 100) : 0
                    return (
                      <li key={s.id}>
                        <Link to={panelPath(`/admin/attendance/${s.id}`)} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {classSectionLabel(s.class_section_detail)} <span className="text-muted-foreground">· {s.school_name}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(s.date)}</p>
                          </div>
                          <div className="hidden w-32 sm:block">
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="h-full rounded-full bg-primary"
                              />
                            </div>
                            <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
                              {s.present_count ?? 0}/{s.total_students ?? 0} present
                            </p>
                          </div>
                          <Pill tone={s.status === "LOCKED" ? "green" : "amber"} dot>
                            {s.status === "LOCKED" ? "Locked" : "Draft"}
                          </Pill>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <EmptyState icon={ClipboardCheck} title="No attendance taken yet" description="Sessions appear here once a class is marked." />
              )}
            </CardContent>
          </Card>
        )}

        <div className={isSchool ? "grid content-start gap-6 lg:col-span-2" : "grid content-start gap-6 md:grid-cols-2 lg:col-span-5"}>
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">{isSchool ? "Newest teachers" : "Newest schools"}</CardTitle>
              <CardDescription>{isSchool ? "Recently added to your staff" : "Recently onboarded"}</CardDescription>
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link to={panelPath(isSchool ? "/admin/teachers" : "/admin/schools")}>
                    View all <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              {recent.isLoading ? (
                <div className="grid gap-3 px-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : recent.data?.length ? (
                <ul className="divide-y">
                  {recent.data.map((item) => (
                    <li key={item.id}>
                      <Link to={item.to} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          {isSchool ? <Presentation className="size-4" /> : <School className="size-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.sub}</p>
                        </div>
                        <ActiveBadge active={item.active} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={isSchool ? Presentation : School} title={isSchool ? "No teachers yet" : "No schools yet"} />
              )}
            </CardContent>
          </Card>
          {isSchool ? <SchoolCalendarCard /> : <RecentActivityCard />}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: panelPath("/admin/attendance"), icon: ClipboardCheck, title: "Take attendance", text: "Upload a classroom photo" },
          { to: panelPath("/admin/faces"), icon: ScanFace, title: "Register faces", text: "Enrol student face data" },
          { to: panelPath("/admin/notifications/new"), icon: Bell, title: "Notify people", text: c ? `${c.notifications} sent so far` : isSchool ? "Teachers and parents" : "Admins, teachers, parents" },
          isSchool
            ? { to: panelPath("/admin/academics"), icon: CalendarRange, title: "Academic setup", text: "Years, classes, holidays" }
            : { to: panelPath("/admin/schools"), icon: CalendarRange, title: "Academic setup", text: "Open a school to manage its years and classes" },
        ].map((q, i) => (
          <motion.div key={q.to} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
            <Link
              to={q.to}
              className="group flex h-full items-center gap-3 rounded-2xl border border-dashed bg-card/60 p-4 transition-all hover:border-solid hover:border-primary/50 hover:bg-card hover:shadow-md"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <q.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{q.title}</p>
                <p className="truncate text-xs text-muted-foreground">{q.text}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </>
  )
}
