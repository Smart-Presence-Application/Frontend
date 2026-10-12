import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarCheck,
  ClipboardCheck,
  ClipboardPen,
  GraduationCap,
  LayoutDashboard,
  Layers,
  LogIn,
  LogOut,
  ScanFace,
  Sparkles,
  TriangleAlert,
  UsersRound,
} from "lucide-react"
import { motion } from "motion/react"

import { PageHeader } from "@/components/admin/page-header"
import { SchoolCalendarCard } from "@/components/common/school-calendar"
import { EmptyState } from "@/components/admin/states"
import { Pill, StatCard } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth"
import { usePanel } from "@/context/panel"
import { useOutbox } from "@/hooks/use-worker-events"
import { countOf, sessionsApi, teacherAttendanceApi } from "@/lib/endpoints"
import { classSectionLabel, formatDate, formatTime, isoDate } from "@/lib/format"
import { panelPath } from "@/lib/panel"
import { TeacherStatusPill } from "../admin/teacher-attendance/bits"
import { percentOf } from "../admin/attendance/utils"

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

/** Teacher home. Every list is scoped server-side to the teacher's own class section. */
export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const { teacher } = usePanel()
  const hasClass = !!teacher?.class_section
  const className = classSectionLabel(teacher?.class_section_detail)

  const counts = useQuery({
    queryKey: ["dashboard", "counts", "teacher"],
    queryFn: async () => {
      const [students, faces, parents, drafts] = await Promise.all([
        countOf("students/"),
        countOf("student-attendance/faces/", { registered: true }),
        countOf("parents/"),
        countOf("student-attendance/sessions/", { status: "DRAFT" }),
      ])
      return { students, faces, parents, drafts }
    },
    enabled: hasClass,
  })
  const sessions = useQuery({
    queryKey: ["sessions", { page_size: 6, ordering: "-date" }],
    queryFn: () => sessionsApi.list({ page_size: 6, ordering: "-date" }),
    enabled: hasClass,
  })
  const myDay = useQuery({ queryKey: ["teacher-attendance", "today"], queryFn: teacherAttendanceApi.today })

  const c = counts.data
  const todaySession = sessions.data?.results.find((s) => s.date === isoDate())

  const stats = [
    { label: "Students", value: c?.students, icon: GraduationCap, to: panelPath("/admin/students"), hint: `Enrolled in ${className}` },
    {
      label: "Faces registered",
      value: c ? `${c.faces}/${c.students}` : undefined,
      icon: ScanFace,
      to: panelPath("/admin/faces"),
      hint: c && c.students ? `${percentOf(c.faces, c.students)}% ready for AI attendance` : "Needed for AI attendance",
    },
    { label: "Parents", value: c?.parents, icon: UsersRound, to: panelPath("/admin/parents"), hint: "Linked to your students" },
    {
      label: "Drafts to lock",
      value: c?.drafts,
      icon: ClipboardPen,
      to: panelPath("/admin/attendance?status=DRAFT"),
      hint: "Lock to notify parents",
    },
  ]

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name.split(" ")[0] ?? "Teacher"}`}
        seoTitle="Dashboard"
        icon={LayoutDashboard}
        description={hasClass ? `${className} · ${teacher?.school_name}` : teacher?.school_name}
        actions={
          hasClass && (
            <>
              <Button asChild variant="outline" className="h-9">
                <Link to={panelPath("/admin/notifications/new")}>
                  <Bell /> Notify parents
                </Link>
              </Button>
              <Button asChild className="h-9 shadow-md shadow-primary/20">
                <Link to={panelPath("/admin/attendance")}>
                  <Sparkles /> Take attendance
                </Link>
              </Button>
            </>
          )
        }
      />

      {!hasClass && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">You are not assigned to a class yet</p>
            <p className="mt-0.5">Ask your school admin to assign you a class section. Until then you can check in, read your inbox and update your profile.</p>
          </div>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <MyDayCard record={myDay.data} loading={myDay.isLoading} />
        {hasClass && <ClassTodayCard loading={sessions.isLoading} session={todaySession} className={className} />}
      </div>

      {hasClass && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s, i) => (
              <StatCard key={s.label} {...s} index={i} loading={counts.isLoading} />
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="font-semibold">Recent attendance</CardTitle>
                <CardDescription>The latest sessions for {className}</CardDescription>
                <CardAction>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={panelPath("/admin/attendance")}>
                      View all <ArrowRight />
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="px-0">
                {sessions.isLoading ? (
                  <div className="grid gap-3 px-4">
                    {Array.from({ length: 4 }, (_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : sessions.data?.results.length ? (
                  <ul className="divide-y">
                    {sessions.data.results.map((s) => {
                      const pct = percentOf(s.present_count, s.total_students) ?? 0
                      return (
                        <li key={s.id}>
                          <Link to={panelPath(`/admin/attendance/${s.id}`)} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{formatDate(s.date)}</p>
                              <p className="text-xs text-muted-foreground">Taken by {s.created_by_name ?? "-"}</p>
                            </div>
                            <div className="hidden w-40 sm:block">
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
                  <EmptyState icon={ClipboardCheck} title="No attendance taken yet" description="Take your first attendance from a classroom photo or by hand." />
                )}
              </CardContent>
            </Card>
            <SchoolCalendarCard className="lg:col-span-2" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: panelPath("/admin/attendance"), icon: ClipboardCheck, title: "Take attendance", text: "Upload a classroom photo" },
              { to: panelPath("/admin/faces"), icon: ScanFace, title: "Register faces", text: "Enrol your students' faces" },
              { to: panelPath("/admin/parents"), icon: UsersRound, title: "Add parents", text: "Share login details" },
              { to: panelPath("/admin/notifications/new"), icon: Bell, title: "Notify parents", text: "Send an announcement" },
            ].map((q, i) => (
              <motion.div key={q.to + q.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
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
      )}
    </>
  )
}

/** The teacher's own check-in status for today. Photos taken offline count as done even before they upload. */
function MyDayCard({ record, loading }: { record: Awaited<ReturnType<typeof teacherAttendanceApi.today>> | undefined; loading: boolean }) {
  const { data: outbox = [] } = useOutbox()
  const pending = outbox.filter((i) => i.status !== "failed" && isoDate(new Date(i.capturedAt)) === isoDate())
  const queuedIn = pending.find((i) => i.kind === "check-in")
  const queuedOut = pending.find((i) => i.kind === "check-out")
  const inAt = record?.check_in_at ?? queuedIn?.capturedAt
  const outAt = record?.check_out_at ?? queuedOut?.capturedAt
  const step = !inAt ? "in" : !outAt ? "out" : "done"
  const waiting = (!record?.check_in_at && !!queuedIn) || (!record?.check_out_at && !!queuedOut)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">My day</CardTitle>
        <CardDescription>Your check-in and check-out for today</CardDescription>
        {record && (
          <CardAction>
            <TeacherStatusPill status={record.status} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-16" />
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {step === "done" ? <BadgeCheck className="size-6" /> : step === "out" ? <LogOut className="size-6" /> : <LogIn className="size-6" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {step === "in" ? "Not checked in yet" : step === "out" ? `Checked in at ${formatTime(inAt)}` : "Done for today"}
              </p>
              <p className="text-sm text-muted-foreground">
                {step === "done"
                  ? `${formatTime(inAt)} to ${formatTime(outAt)}`
                  : waiting
                    ? "Saved offline, waiting to upload."
                    : step === "out"
                    ? "Remember to check out before you leave."
                    : "Take a quick photo when you arrive."}
              </p>
            </div>
            <Button asChild variant={step === "done" ? "outline" : "default"}>
              <Link to={panelPath("/admin/my-attendance")}>
                {step === "in" ? <LogIn /> : step === "out" ? <LogOut /> : <CalendarCheck />}
                {step === "in" ? "Check in" : step === "out" ? "Check out" : "View history"}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Whether today's class attendance has been taken and locked. */
function ClassTodayCard({
  session,
  loading,
  className,
}: {
  session: Awaited<ReturnType<typeof sessionsApi.list>>["results"][number] | undefined
  loading: boolean
  className: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Class attendance today</CardTitle>
        <CardDescription>{className}</CardDescription>
        {session && (
          <CardAction>
            <Pill tone={session.status === "LOCKED" ? "green" : "amber"} dot>
              {session.status === "LOCKED" ? "Locked" : "Draft"}
            </Pill>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-16" />
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Layers className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {session ? `${session.present_count ?? 0} of ${session.total_students ?? 0} present` : "Not taken yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {!session
                  ? "Snap a classroom photo and let the AI mark it."
                  : session.status === "LOCKED"
                    ? "Locked and parents notified."
                    : "Review and lock it to notify parents."}
              </p>
            </div>
            <Button asChild variant={session?.status === "LOCKED" ? "outline" : "default"}>
              <Link to={panelPath(session ? `/admin/attendance/${session.id}` : "/admin/attendance")}>
                {session ? <ArrowRight /> : <Sparkles />}
                {session ? (session.status === "LOCKED" ? "Open" : "Review") : "Take attendance"}
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
