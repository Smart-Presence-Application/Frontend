import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { BarChart3, CalendarRange, Clock, School } from "lucide-react"
import { motion } from "motion/react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { DataTable, type Column } from "@/components/admin/data-table"
import { SchoolPicker } from "@/components/admin/pickers"
import { EmptyState } from "@/components/admin/states"
import { Panel, PersonCell, Pill } from "@/components/admin/ui-bits"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import type { useUrlState } from "@/hooks/use-url-state"
import { teacherAttendanceApi } from "@/lib/endpoints"
import { formatDate, formatNumber, isoDate } from "@/lib/format"
import type { TeacherSummaryRow } from "@/lib/types"

const chartConfig = {
  total_working_hours: { label: "Working hours", color: "var(--chart-1)" },
} satisfies ChartConfig

function monthStart() {
  const now = new Date()
  return isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
}

export function SummaryTab({ url }: { url: ReturnType<typeof useUrlState> }) {
  const school = Number(url.get("school")) || null
  const from = url.get("from", monthStart())
  const to = url.get("to", isoDate())
  const params = { school, date_from: from, date_to: to }

  const query = useQuery({
    queryKey: ["teacher-attendance-summary", params],
    queryFn: () => teacherAttendanceApi.summary(params),
    enabled: !!school,
    placeholderData: keepPreviousData,
  })
  const rows = query.data?.teachers

  const columns: Column<TeacherSummaryRow>[] = [
    {
      key: "teacher",
      header: "Teacher",
      cell: (r) => <PersonCell name={r.teacher_name} sub={<span className="font-mono">{r.employee_id}</span>} />,
    },
    {
      key: "hours",
      header: "Hours",
      cell: (r) => <span className="font-semibold tabular-nums">{formatNumber(r.total_working_hours)}h</span>,
    },
    { key: "days", header: "Working days", hideBelow: "sm", cell: (r) => <span className="tabular-nums">{r.total_working_days}</span> },
    { key: "full", header: "Full", hideBelow: "md", cell: (r) => <span className="tabular-nums">{r.total_full_days}</span> },
    { key: "half", header: "Half", hideBelow: "md", cell: (r) => <span className="tabular-nums">{r.total_half_days}</span> },
    { key: "absent", header: "Absent", hideBelow: "md", cell: (r) => <span className="tabular-nums">{r.total_absent_days}</span> },
    {
      key: "pending",
      header: "Pending",
      cell: (r) =>
        r.pending_verification > 0 ? (
          <Pill tone="amber">{r.pending_verification} to verify</Pill>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        ),
    },
  ]

  const totalHours = rows?.reduce((sum, r) => sum + r.total_working_hours, 0) ?? 0
  const pending = rows?.reduce((sum, r) => sum + r.pending_verification, 0) ?? 0

  return (
    <div className="grid gap-4">
      <Panel
        toolbar={
          <>
            <SchoolPicker value={school} onChange={(v) => url.set({ school: v, teacher: null })} className="h-9 w-full sm:w-60" />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Input
                type="date"
                aria-label="From date"
                title="From date"
                value={from}
                max={to}
                onChange={(e) => url.set({ from: e.target.value || null })}
                className="h-9 sm:w-38"
              />
              <Input
                type="date"
                aria-label="To date"
                title="To date"
                value={to}
                min={from}
                onChange={(e) => url.set({ to: e.target.value || null })}
                className="h-9 sm:w-38"
              />
            </div>
            {school && rows && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground sm:ml-auto">
                <CalendarRange className="size-4" />
                {formatDate(from)} to {formatDate(to)}
              </p>
            )}
          </>
        }
      >
        {!school ? (
          <EmptyState icon={School} title="Pick a school" description="The summary totals verified working hours and days for one school's teachers." />
        ) : (
          <>
            {rows && rows.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <BarChart3 className="size-4 text-primary" /> Working hours per teacher
                    </p>
                    <p className="text-xs text-muted-foreground">Only verified days count. Two half days make one working day.</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>
                      <span className="font-semibold tabular-nums">{formatNumber(Math.round(totalHours * 100) / 100)}</span>
                      <span className="text-muted-foreground"> hours total</span>
                    </span>
                    {pending > 0 && (
                      <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                        <Clock className="size-3.5" /> {pending} pending
                      </span>
                    )}
                  </div>
                </div>
                <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
                  <BarChart data={rows} margin={{ left: -16, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="teacher_name"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval={0}
                      tickFormatter={(v: string) => (rows.length > 8 ? v.split(" ")[0] : v).slice(0, 12)}
                    />
                    <YAxis tickLine={false} axisLine={false} width={44} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="total_working_hours" fill="var(--color-total_working_hours)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ChartContainer>
              </motion.div>
            )}
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.teacher}
              loading={query.isFetching}
              error={query.error}
              onRetry={query.refetch}
              onRowClick={(r) => url.set({ tab: "records", teacher: r.teacher, date_from: from, date_to: to })}
              empty={<EmptyState icon={BarChart3} title="No attendance in this period" description="Try a wider date range." />}
            />
          </>
        )}
      </Panel>
    </div>
  )
}
