import { Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, RadialBar, RadialBarChart, XAxis, YAxis } from "recharts"

import { EmptyState } from "@/components/admin/states"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/format"
import type { AttendanceSession } from "@/lib/types"

interface Counts {
  schools: number
  activeSchools: number
  facesRegistered: number
  teachers: number
  students: number
  parents: number
  schoolAdmins: number
}

const attendanceConfig = {
  present: { label: "Present", color: "var(--chart-1)" },
  absent: { label: "Absent", color: "var(--foreground)" },
} satisfies ChartConfig

const peopleConfig = {
  value: { label: "People" },
  admins: { label: "School admins", color: "var(--chart-5)" },
  teachers: { label: "Teachers", color: "var(--chart-3)" },
  students: { label: "Students", color: "var(--chart-1)" },
  parents: { label: "Parents", color: "var(--chart-2)" },
} satisfies ChartConfig

const schoolsConfig = { active: { label: "Active", color: "var(--chart-1)" } } satisfies ChartConfig

/** Dashboard charts, with bars ordered oldest first. The ring shows live schools for Super Admins and face-recognition coverage for a School Admin; only School Admins get the class attendance chart, since Super Admins oversee schools, not classes. */
export default function DashboardCharts({
  counts,
  sessions,
  loading,
  variant = "super",
}: {
  variant?: "super" | "school"
  counts?: Counts
  sessions?: AttendanceSession[]
  loading: boolean
}) {
  const attendance = [...(sessions ?? [])].reverse().map((s) => ({
    label: `${s.class_section_detail?.class_name ?? "?"}-${s.class_section_detail?.section_name ?? "?"}`,
    date: s.date,
    present: s.present_count ?? 0,
    absent: s.absent_count ?? 0,
  }))

  const isSchool = variant === "school"
  const people = counts
    ? [
        ...(isSchool ? [] : [{ key: "admins", name: "School admins", value: counts.schoolAdmins }]),
        { key: "teachers", name: "Teachers", value: counts.teachers },
        { key: "students", name: "Students", value: counts.students },
        { key: "parents", name: "Parents", value: counts.parents },
      ]
    : []

  const ringTotal = isSchool ? counts?.students : counts?.schools
  const ringValue = isSchool ? counts?.facesRegistered : counts?.activeSchools
  const activePct = ringTotal ? Math.round(((ringValue ?? 0) / ringTotal) * 100) : 0

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-5">
      {isSchool && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-semibold">Attendance in recent sessions</CardTitle>
            <CardDescription>Present and absent students in the last {attendance.length || ""} class sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : attendance.length ? (
              <ChartContainer config={attendanceConfig} className="aspect-auto h-64 w-full">
                <BarChart data={attendance} margin={{ left: -16, right: 4 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent labelFormatter={(_, p) => `Class ${p?.[0]?.payload?.label} on ${p?.[0]?.payload?.date}`} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="present" stackId="a" fill="var(--color-present)" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="absent" stackId="a" fill="var(--color-absent)" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyState title="No sessions to chart yet" description="Charts fill in once attendance is taken." className="h-64" />
            )}
          </CardContent>
        </Card>
      )}

      <div className={isSchool ? "grid gap-6 lg:col-span-2" : "grid gap-6 md:grid-cols-2 lg:col-span-5"}>
        <Card>
          <CardHeader>
            <CardTitle className="font-semibold">People on the platform</CardTitle>
            <CardDescription>Accounts by role</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ChartContainer config={peopleConfig} className="aspect-auto h-40 w-full">
                <BarChart data={people} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={96} />
                  <XAxis type="number" hide />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
                  <Bar dataKey="value" radius={6} barSize={18} label={{ position: "right", fontSize: 11, formatter: (v: unknown) => formatNumber(Number(v)) }}>
                    {people.map((p) => (
                      <Cell key={p.key} fill={`var(--color-${p.key})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            {loading ? (
              <Skeleton className="size-28 rounded-full" />
            ) : (
              <ChartContainer config={schoolsConfig} className="aspect-square h-28 shrink-0">
                <RadialBarChart data={[{ name: "active", value: activePct }]} innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" background cornerRadius={10} fill="var(--color-active)" />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-bold">
                    {activePct}%
                  </text>
                </RadialBarChart>
              </ChartContainer>
            )}
            <div>
              <p className="font-semibold">{isSchool ? "Face coverage" : "Schools live"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {!counts
                  ? "Loading"
                  : isSchool
                    ? `${counts.facesRegistered} of ${counts.students} students have a registered face for AI attendance.`
                    : `${counts.activeSchools} of ${counts.schools} schools are active and can sign in.`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
