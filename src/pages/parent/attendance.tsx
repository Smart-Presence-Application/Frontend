import { useQuery } from "@tanstack/react-query"
import { CalendarDays, ChevronLeft, ChevronRight, CircleCheck, CircleX, ClipboardCheck, Percent } from "lucide-react"
import { motion } from "motion/react"

import { PageHeader } from "@/components/admin/page-header"
import { EmptyState, ErrorState } from "@/components/admin/states"
import { Panel, StatCard } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePanel } from "@/context/panel"
import { useUrlState } from "@/hooks/use-url-state"
import { parentPortalApi } from "@/lib/endpoints"
import { classSectionLabel, formatDate, isoDate } from "@/lib/format"
import type { ChildAttendance } from "@/lib/types"
import { cn } from "@/lib/utils"
import { percentOf } from "../admin/attendance/utils"
import { ChildPicker, PresencePill } from "./bits"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })

/** "2026-10" for the month containing `date`. */
function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function parseMonth(key: string) {
  const [y, m] = key.split("-").map(Number)
  return y && m ? new Date(y, m - 1, 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
}

/** A child's attendance month by month. A month holds at most 31 school days per child, so one page of results covers it. */
export default function ChildAttendancePage() {
  const { parent } = usePanel()
  const url = useUrlState()
  const students = parent?.students ?? []
  const selected = students.find((s) => s.id === Number(url.get("student"))) ?? students[0]

  const current = monthKey()
  const month = parseMonth(url.get("month", current))
  const key = monthKey(month)
  const first = isoDate(month)
  const last = isoDate(new Date(month.getFullYear(), month.getMonth() + 1, 0))
  const shift = (by: number) => url.set({ month: monthKey(new Date(month.getFullYear(), month.getMonth() + by, 1)) })

  const params = { student: selected?.id, date_from: first, date_to: last, page_size: 31 }
  const query = useQuery({
    queryKey: ["parent-attendance", params],
    queryFn: () => parentPortalApi.attendance(params),
    enabled: !!selected,
  })
  const records = query.data?.results ?? []
  const byDate = new Map(records.map((r) => [r.date, r]))
  const present = records.filter((r) => r.status === "PRESENT").length
  const absent = records.length - present
  const pct = percentOf(present, records.length)

  if (!selected) {
    return (
      <>
        <PageHeader title="Attendance" icon={ClipboardCheck} />
        <EmptyState icon={ClipboardCheck} title="No children linked yet" description="Ask your child's school to link them to your account." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        icon={ClipboardCheck}
        description={`${selected.name} · ${classSectionLabel(selected.class_section_detail)} · ${selected.school_name}`}
      />

      <div className="mb-6">
        <ChildPicker students={students} value={selected.id} onChange={(id) => url.set({ student: id })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Days present" value={present} icon={CircleCheck} index={0} loading={query.isLoading} hint={monthFmt.format(month)} />
        <StatCard label="Days absent" value={absent} icon={CircleX} index={1} loading={query.isLoading} hint={monthFmt.format(month)} />
        <StatCard
          label="Attendance"
          value={pct === null ? "-" : `${pct}%`}
          icon={Percent}
          index={2}
          loading={query.isLoading}
          hint={records.length ? `Of ${records.length} recorded school days` : "No school days recorded yet"}
        />
      </div>

      <Panel
        className="mt-6"
        toolbar={
          <div className="flex w-full items-center gap-2">
            <Button variant="outline" size="icon-lg" onClick={() => shift(-1)} aria-label="Previous month">
              <ChevronLeft />
            </Button>
            <p className="min-w-40 text-center font-semibold" aria-live="polite">
              {monthFmt.format(month)}
            </p>
            <Button variant="outline" size="icon-lg" onClick={() => shift(1)} disabled={key >= current} aria-label="Next month">
              <ChevronRight />
            </Button>
            {key !== current && (
              <Button variant="ghost" size="sm" onClick={() => url.set({ month: null })}>
                This month
              </Button>
            )}
            <div className="ml-auto hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
              <Legend className="bg-primary" label="Present" />
              <Legend className="bg-destructive" label="Absent" />
              <Legend className="bg-muted ring-1 ring-foreground/10" label="No record" />
            </div>
          </div>
        }
      >
        {query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : query.isLoading ? (
          <div className="grid grid-cols-7 gap-1.5 p-4 sm:gap-2">
            {Array.from({ length: 35 }, (_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : (
          <Calendar month={month} byDate={byDate} />
        )}
      </Panel>

      <Panel className="mt-6" toolbar={<h2 className="font-semibold">Day by day</h2>}>
        {records.length ? (
          <ul className="divide-y">
            {records.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-4 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <CalendarDays className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatDate(r.date)}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.remarks || `Class ${r.class_name} - ${r.section_name}`}</p>
                </div>
                <PresencePill status={r.status} />
              </li>
            ))}
          </ul>
        ) : (
          !query.isLoading && (
            <EmptyState
              icon={CalendarDays}
              title="No attendance this month"
              description="Days appear here once the class teacher has confirmed and locked them."
            />
          )
        )}
      </Panel>
    </>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", className)} />
      {label}
    </span>
  )
}

/** Monday-first month grid, with blank cells before the 1st. */
function Calendar({ month, byDate }: { month: Date; byDate: Map<string, ChildAttendance> }) {
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const lead = (month.getDay() + 6) % 7
  const today = isoDate()

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted-foreground sm:gap-2 sm:text-xs">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = isoDate(new Date(month.getFullYear(), month.getMonth(), i + 1))
          const r = byDate.get(date)
          const future = date > today
          const cell = (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.008, 0.25) }}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-medium tabular-nums",
                r?.status === "PRESENT" && "bg-primary text-primary-foreground shadow-sm shadow-primary/25",
                r?.status === "ABSENT" && "bg-destructive text-white shadow-sm shadow-destructive/25",
                !r && (future ? "text-muted-foreground/40" : "bg-muted/60 text-muted-foreground"),
                date === today && "ring-2 ring-foreground ring-offset-2 ring-offset-card"
              )}
              aria-label={`${formatDate(date)}: ${r ? (r.status === "PRESENT" ? "present" : "absent") : "no record"}`}
            >
              {i + 1}
              {r && <span className="hidden text-[9px] font-semibold uppercase opacity-80 sm:block">{r.status === "PRESENT" ? "P" : "A"}</span>}
            </motion.div>
          )
          return r?.remarks ? (
            <Tooltip key={date}>
              <TooltipTrigger asChild>{cell}</TooltipTrigger>
              <TooltipContent>{r.remarks}</TooltipContent>
            </Tooltip>
          ) : (
            <div key={date}>{cell}</div>
          )
        })}
      </div>
    </div>
  )
}
