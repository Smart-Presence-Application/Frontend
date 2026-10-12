import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, BellRing, CalendarDays, ImageUp, Inbox, KeyRound, LayoutDashboard, MailOpen, School, TriangleAlert, UsersRound } from "lucide-react"
import { motion } from "motion/react"

import { PageHeader } from "@/components/admin/page-header"
import { SchoolCalendarCard } from "@/components/common/school-calendar"
import { EmptyState } from "@/components/admin/states"
import { PersonAvatar, Pill } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth"
import { usePanel } from "@/context/panel"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { inboxApi, parentPortalApi } from "@/lib/endpoints"
import { classSectionLabel, isoDate, timeAgo } from "@/lib/format"
import { panelPath } from "@/lib/panel"
import { cn } from "@/lib/utils"
import type { ChildAttendance, Student } from "@/lib/types"
import { percentOf } from "../admin/attendance/utils"
import { AlertRow, PresencePill } from "./bits"
import { ChildPhotoDialog } from "./child-photo-dialog"

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

/** Parent home. Loads the last 30 days of confirmed attendance for every child, which fits in one page of results. */
export default function ParentDashboardPage() {
  const { user } = useAuth()
  const { parent } = usePanel()
  const students = parent?.students ?? []
  const [photoFor, setPhotoFor] = useState<Student>()

  const recentParams = { date_from: daysAgo(30), date_to: isoDate(), page_size: 100 }
  const recent = useQuery({
    queryKey: ["parent-attendance", recentParams],
    queryFn: () => parentPortalApi.attendance(recentParams),
    enabled: students.length > 0,
  })
  const alerts = useQuery({ queryKey: ["parent-alerts", "list", { page_size: 5 }], queryFn: () => parentPortalApi.alerts({ page_size: 5 }) })
  const notices = useQuery({ queryKey: ["inbox", "list", { page_size: 3 }], queryFn: () => inboxApi.list({ page_size: 3 }) })
  const markOne = useApiMutation((id: number) => parentPortalApi.markAlertsRead([id]), { invalidate: [["parent-alerts"]], toastSuccess: false })

  const byChild = new Map<number, ChildAttendance[]>()
  for (const r of recent.data?.results ?? []) byChild.set(r.student, [...(byChild.get(r.student) ?? []), r])

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name.split(" ")[0] ?? "there"}`}
        seoTitle="Dashboard"
        icon={LayoutDashboard}
        description={students.length ? "Here is how your children are doing at school." : "Your SmartPresence parent portal."}
        actions={
          students.length > 0 && (
            <Button asChild className="h-9 shadow-md shadow-primary/20">
              <Link to={panelPath("/admin/attendance")}>
                <CalendarDays /> View attendance
              </Link>
            </Button>
          )
        }
      />

      {parent && !parent.password_changed && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 sm:flex-row sm:items-center dark:text-amber-300"
        >
          <TriangleAlert className="size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Please change your password</p>
            <p className="mt-0.5">You are still using the password your school gave you. Set your own to keep your account safe.</p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to={panelPath("/admin/profile")}>
              <KeyRound /> Change password
            </Link>
          </Button>
        </motion.div>
      )}

      {students.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={UsersRound} title="No children linked yet" description="Ask your child's school to link them to your account." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {students.map((s, i) => (
            <ChildCard
              key={s.id}
              student={s}
              records={byChild.get(s.id) ?? []}
              loading={recent.isLoading}
              index={i}
              onUploadPhoto={() => setPhotoFor(s)}
            />
          ))}
        </div>
      )}
      <ChildPhotoDialog student={photoFor} open={!!photoFor} onOpenChange={(open) => !open && setPhotoFor(undefined)} />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-semibold">Latest attendance alerts</CardTitle>
            <CardDescription>Sent when the class teacher confirms the day</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link to={panelPath("/admin/alerts")}>
                  View all <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {alerts.isLoading ? (
              <div className="grid gap-3 px-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : alerts.data?.results.length ? (
              <ul className="divide-y">
                {alerts.data.results.map((a) => (
                  <li key={a.id}>
                    <AlertRow alert={a} onRead={() => !a.is_read && markOne.mutate(a.id)} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={BellRing} title="No alerts yet" description="You will get one each time your child's attendance is confirmed." />
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">School notices</CardTitle>
              <CardDescription>Announcements from the school</CardDescription>
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link to={panelPath("/admin/inbox")}>
                    View all <ArrowRight />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              {notices.isLoading ? (
                <div className="grid gap-3 px-4">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : notices.data?.results.length ? (
                <ul className="divide-y">
                  {notices.data.results.map((n) => (
                    <li key={n.id}>
                      <Link to={panelPath("/admin/inbox")} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Inbox className="size-4" />
                          {!n.is_read && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" aria-label="Unread" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={n.is_read ? "truncate text-sm text-muted-foreground" : "truncate text-sm font-semibold"}>{n.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {n.sender_name ?? "School"} · {timeAgo(n.created_at)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={MailOpen} title="No notices yet" description="Announcements from the school appear here." />
              )}
            </CardContent>
          </Card>
          <SchoolCalendarCard />
        </div>
      </div>
    </>
  )
}

/** A child's class, today's status and their last 30 days at a glance (oldest first). A first photo waits for the school to register it; later changes are registered straight away. */
function ChildCard({
  student,
  records,
  loading,
  index,
  onUploadPhoto,
}: {
  student: Student
  records: ChildAttendance[]
  loading: boolean
  index: number
  onUploadPhoto: () => void
}) {
  const today = records.find((r) => r.date === isoDate())
  const present = records.filter((r) => r.status === "PRESENT").length
  const pct = percentOf(present, records.length)
  const strip = [...records].reverse().slice(-14)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex h-full flex-col gap-2"
    >
      <Link
        to={panelPath(`/admin/attendance?student=${student.id}`)}
        className="group block flex-1 rounded-2xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="flex items-start gap-3">
          <PersonAvatar name={student.name} src={student.profile_image} className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{student.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {classSectionLabel(student.class_section_detail)} · Roll {student.roll_number}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <School className="size-3 shrink-0" /> {student.school_name}
            </p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
          <span className="text-sm text-muted-foreground">Today</span>
          {loading ? <Skeleton className="h-6 w-20" /> : today ? <PresencePill status={today.status} /> : <Pill tone="gray">Not confirmed yet</Pill>}
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Last 30 days</span>
            {loading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <span className="text-xl font-bold tabular-nums">{pct === null ? "-" : `${pct}%`}</span>
            )}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct ?? 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-primary"
            />
          </div>
          {strip.length > 0 && (
            <div className="mt-3 flex gap-1" aria-label="Recent school days">
              {strip.map((r) => (
                <span
                  key={r.id}
                  title={`${r.date}: ${r.status === "PRESENT" ? "present" : "absent"}`}
                  className={r.status === "PRESENT" ? "h-5 flex-1 rounded bg-primary/80" : "h-5 flex-1 rounded bg-destructive/80"}
                />
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {records.length ? `${present} of ${records.length} school days present` : "No confirmed school days yet"}
          </p>
        </div>
      </Link>
      <div className={cn("flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm", !student.face_registered && "border-dashed")}>
        <p className="flex-1 text-muted-foreground">
          {student.face_registered
            ? "Face registered for attendance."
            : student.has_profile_image
              ? "Photo sent. Waiting for the school to register the face."
              : "Add a photo so the school can register your child's face."}
        </p>
        <Button size="sm" variant={student.has_profile_image ? "outline" : "default"} className="shrink-0" onClick={onUploadPhoto}>
          <ImageUp /> {student.has_profile_image ? "Change photo" : "Upload photo"}
        </Button>
      </div>
    </motion.div>
  )
}
