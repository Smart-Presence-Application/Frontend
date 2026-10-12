import type { ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight,
  ArrowRightLeft,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Home,
  IdCard,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  School,
  UserMinus,
  UserRound,
} from "lucide-react"
import { motion } from "motion/react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { EmptyState, ErrorState } from "@/components/admin/states"
import { ActiveBadge, DetailRow, PersonAvatar, Pill } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { teacherAttendanceApi, teachersApi } from "@/lib/endpoints"
import { classSectionLabel, formatDate, formatTime } from "@/lib/format"
import type { TeacherAttendanceRecord } from "@/lib/types"
import { cn } from "@/lib/utils"
import { GENDERS } from "./constants"
import { TeacherMenuItems } from "./teacher-actions"
import { useTeacherActions } from "./use-teacher-actions"
import { panelPath } from "@/lib/panel"

const DAY_TYPE: Record<string, string> = { FULL_DAY: "Full day", HALF_DAY: "Half day", ABSENT: "Absent" }

function Card({ title, icon: Icon, action, children, className, delay = 0 }: {
  title: string
  icon: typeof UserRound
  action?: ReactNode
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("overflow-hidden rounded-2xl border bg-card shadow-xs", className)}
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-primary" /> {title}
        </h2>
        {action}
      </header>
      {children}
    </motion.section>
  )
}

export default function TeacherDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const actions = useTeacherActions({ onDeleted: () => navigate(panelPath("/admin/teachers"), { replace: true }) })

  const query = useQuery({ queryKey: ["teacher", Number(id)], queryFn: () => teachersApi.get(id), enabled: !!id })
  const attendanceParams = { teacher: id, page_size: 5, ordering: "-date" }
  const attendance = useQuery({
    queryKey: ["teacher-attendance", attendanceParams],
    queryFn: () => teacherAttendanceApi.list(attendanceParams),
    enabled: !!id,
  })

  const t = query.data

  if (query.error && !t) {
    return (
      <>
        <PageHeader title="Teacher" backTo={panelPath("/admin/teachers")} />
        <div className="rounded-2xl border bg-card">
          <ErrorState error={query.error} onRetry={query.refetch} />
        </div>
      </>
    )
  }

  const attendanceColumns: Column<TeacherAttendanceRecord>[] = [
    { key: "date", header: "Date", cell: (r) => <span className="whitespace-nowrap">{formatDate(r.date)}</span> },
    { key: "in", header: "Check in", cell: (r) => formatTime(r.check_in_at) },
    { key: "out", header: "Check out", hideBelow: "sm", cell: (r) => formatTime(r.check_out_at) },
    {
      key: "day",
      header: "Day",
      hideBelow: "md",
      cell: (r) => (r.day_type ? <Pill tone={r.day_type === "ABSENT" ? "red" : r.day_type === "HALF_DAY" ? "amber" : "green"}>{DAY_TYPE[r.day_type]}</Pill> : "-"),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <Pill tone={r.status === "VERIFIED" ? "green" : "gray"} dot>{r.status === "VERIFIED" ? "Verified" : "Pending"}</Pill>,
    },
  ]

  const address = t ? [t.address, t.city, t.state, t.pincode, t.country].filter(Boolean).join(", ") : ""

  return (
    <>
      <PageHeader
        title={t?.name ?? "Teacher"}
        description={t ? `Employee ${t.employee_id} at ${t.school_name}` : "Loading teacher profile"}
        backTo={panelPath("/admin/teachers")}
        actions={
          t && (
            <>
              <Button variant="outline" className="h-9" onClick={() => actions.open("edit", t)}>
                <Pencil /> Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-lg" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <TeacherMenuItems teacher={t} onAction={actions.open} />
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Profile" icon={UserRound} className="lg:col-span-2">
          {!t ? (
            <div className="grid gap-4 p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="size-16 rounded-full" />
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <PersonAvatar name={t.name} src={t.profile_image} className="size-16 text-base ring-4 ring-primary/10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{t.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Pill tone="gray" className="font-mono">{t.employee_id}</Pill>
                    <ActiveBadge active={t.is_active} />
                    {!t.is_active && <span className="text-xs text-muted-foreground">Activate to email login details</span>}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
                <DetailRow label="Email" icon={Mail}>
                  <a href={`mailto:${t.email}`} className="hover:text-primary">
                    {t.email}
                  </a>
                </DetailRow>
                <DetailRow label="Mobile" icon={Phone}>
                  {t.phone_number}
                </DetailRow>
                <DetailRow label="School" icon={School}>
                  <Link to={panelPath(`/admin/schools/${t.school}`)} className="text-primary hover:underline">
                    {t.school_name}
                  </Link>
                </DetailRow>
                <DetailRow label="Joining date" icon={CalendarDays}>
                  {t.joining_date ? formatDate(t.joining_date) : null}
                </DetailRow>
                <DetailRow label="Gender" icon={IdCard}>
                  {GENDERS.find((g) => g.value === t.gender)?.label}
                </DetailRow>
                <DetailRow label="Address" icon={Home}>
                  {address}
                </DetailRow>
              </div>
            </div>
          )}
        </Card>

        <Card title="Class assignment" icon={BookOpen} delay={0.05}>
          {!t ? (
            <div className="grid gap-3 p-5">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 p-4 sm:p-5">
              {t.class_section_detail ? (
                <div className="relative overflow-hidden rounded-xl bg-primary/5 p-4 ring-1 ring-primary/15">
                  <div aria-hidden="true" className="absolute -top-8 -right-8 size-24 rounded-full bg-primary/10 blur-2xl" />
                  <p className="text-xs text-muted-foreground">Class teacher of</p>
                  <p className="mt-1 text-xl font-bold tracking-tight">{classSectionLabel(t.class_section_detail)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Academic year {t.class_section_detail.academic_year_name}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-center">
                  <p className="text-sm font-medium">Not assigned</p>
                  <p className="mt-1 text-xs text-muted-foreground">Assign a class section so this teacher can take attendance.</p>
                </div>
              )}
              {t.class_section ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => actions.open("transfer", t)}>
                    <ArrowRightLeft /> Transfer
                  </Button>
                  <Button variant="destructive" onClick={() => actions.open("revoke", t)}>
                    <UserMinus /> Revoke
                  </Button>
                </div>
              ) : (
                <Button onClick={() => actions.open("assign", t)}>
                  <BookOpen /> Assign class section
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card
          title="Recent attendance"
          icon={ClipboardCheck}
          className="lg:col-span-3"
          delay={0.1}
          action={
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to={panelPath(`/admin/teacher-attendance?teacher=${id}`)}>
                View all <ArrowRight />
              </Link>
            </Button>
          }
        >
          <DataTable
            columns={attendanceColumns}
            rows={attendance.data?.results}
            rowKey={(r) => r.id}
            loading={attendance.isFetching}
            error={attendance.error}
            onRetry={attendance.refetch}
            skeletonRows={3}
            empty={<EmptyState icon={ClipboardCheck} title="No attendance yet" description="Check-ins from the teacher app will appear here." className="py-10" />}
          />
        </Card>
      </div>

      {actions.dialogs}
    </>
  )
}
