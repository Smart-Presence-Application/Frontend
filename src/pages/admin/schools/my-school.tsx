import { useRef } from "react"
import { Link } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Building2,
  CalendarRange,
  Camera,
  ClipboardCheck,
  GraduationCap,
  Hash,
  Info,
  LoaderCircle,
  Mail,
  MapPin,
  Percent,
  Phone,
  Presentation,
  School,
  Timer,
  UsersRound,
} from "lucide-react"
import { motion } from "motion/react"

import { PageHeader } from "@/components/admin/page-header"
import { ActiveBadge, DetailRow, StatCard } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePanel } from "@/context/panel"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { countOf, schoolsApi } from "@/lib/endpoints"
import { formatDate } from "@/lib/format"
import { panelPath } from "@/lib/panel"

/** School Admin's view of the school they manage. Details are maintained by the SmartPresence team. */
export default function MySchoolPage() {
  const { school } = usePanel()
  const queryClient = useQueryClient()
  const logoInput = useRef<HTMLInputElement>(null)

  const counts = useQuery({
    queryKey: ["school", "me", "counts"],
    queryFn: async () => {
      const [teachers, students, parents, sessions] = await Promise.all([
        countOf("teachers/"),
        countOf("students/"),
        countOf("parents/"),
        countOf("student-attendance/sessions/"),
      ])
      return { teachers, students, parents, sessions }
    },
  })

  const logo = useApiMutation((file: File) => schoolsApi.updateMyLogo(file), {
    onSuccess: (updated) => queryClient.setQueryData(["school", "me"], updated),
  })

  if (!school) return null

  const stats = [
    { label: "Teachers", value: counts.data?.teachers, icon: Presentation, to: panelPath("/admin/teachers") },
    { label: "Students", value: counts.data?.students, icon: GraduationCap, to: panelPath("/admin/students") },
    { label: "Parents", value: counts.data?.parents, icon: UsersRound, to: panelPath("/admin/parents") },
    { label: "Attendance sessions", value: counts.data?.sessions, icon: ClipboardCheck, to: panelPath("/admin/attendance") },
  ]

  const shortcuts = [
    { to: panelPath("/admin/academics"), icon: CalendarRange, title: "Academic setup", text: "Years, classes, sections and holidays" },
    { to: panelPath("/admin/teacher-attendance?tab=settings"), icon: Timer, title: "Working hours", text: "Full and half day rules for teachers" },
    { to: panelPath("/admin/faces"), icon: Camera, title: "Face registry", text: "Students ready for AI attendance" },
  ]

  return (
    <>
      <PageHeader title="School profile" icon={Building2} description="Your school's details as registered with SmartPresence." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} loading={counts.isLoading} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="border-b">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    {school.logo ? <img src={school.logo} alt={`${school.name} logo`} className="size-full object-cover" /> : <School className="size-8" />}
                  </span>
                  <button
                    type="button"
                    onClick={() => logoInput.current?.click()}
                    disabled={logo.isPending}
                    aria-label="Change school logo"
                    className="absolute -right-1.5 -bottom-1.5 flex size-8 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-110"
                  >
                    {logo.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}
                  </button>
                  <input
                    ref={logoInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) logo.mutate(file)
                      e.target.value = ""
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-xl font-semibold">{school.name}</CardTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <ActiveBadge active={school.status === "ACTIVE"} />
                    <span className="font-mono text-xs text-muted-foreground">{school.code}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-x-8 sm:grid-cols-2">
              <DetailRow label="Email" icon={Mail}>
                <a href={`mailto:${school.email}`} className="hover:text-primary">
                  {school.email}
                </a>
              </DetailRow>
              <DetailRow label="Phone" icon={Phone}>
                {school.phone}
              </DetailRow>
              <DetailRow label="Address" icon={MapPin}>
                {[school.address, school.city, school.state, school.pincode, school.country].filter(Boolean).join(", ")}
              </DetailRow>
              <DetailRow label="Attendance threshold" icon={Percent}>
                {school.attendance_threshold}%
              </DetailRow>
              <DetailRow label="School code" icon={Hash}>
                <span className="font-mono">{school.code}</span>
              </DetailRow>
              <DetailRow label="On SmartPresence since" icon={CalendarRange}>
                {formatDate(school.created_at)}
              </DetailRow>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Quick setup</CardTitle>
              <CardDescription>Everything your school runs on</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {shortcuts.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="group flex items-center gap-3 rounded-xl border p-3 transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <s.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{s.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.text}</span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3 rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Need to change the school name, contact details or attendance threshold? Contact the SmartPresence team; you can update the logo
              yourself.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to={panelPath("/admin/profile")}>Manage my admin account</Link>
          </Button>
        </motion.div>
      </div>
    </>
  )
}
