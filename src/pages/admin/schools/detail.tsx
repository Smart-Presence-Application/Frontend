import { useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import {
  CalendarRange,
  Camera,
  ClipboardCheck,
  GraduationCap,
  Hash,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Percent,
  Phone,
  Power,
  PowerOff,
  Presentation,
  School,
  Trash2,
  UsersRound,
} from "lucide-react"
import { motion } from "motion/react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { PageHeader } from "@/components/admin/page-header"
import { ErrorState } from "@/components/admin/states"
import { ActiveBadge, DetailRow, PersonAvatar, StatCard } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { toFormData } from "@/lib/api"
import { countOf, schoolsApi } from "@/lib/endpoints"
import { formatDate } from "@/lib/format"
import { AcademicsTabs } from "../academics/academics-tabs"
import { SchoolFormDialog } from "./school-form-dialog"
import { panelPath } from "@/lib/panel"

/** One school for Super Admins, including its academic setup, which they manage here rather than on a separate page. */
export default function SchoolDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const logoInput = useRef<HTMLInputElement>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: school, error, refetch, isLoading } = useQuery({
    queryKey: ["school", id],
    queryFn: () => schoolsApi.get(id),
  })

  const counts = useQuery({
    queryKey: ["school", id, "counts"],
    queryFn: async () => {
      const [teachers, students, parents, sessions] = await Promise.all([
        countOf("teachers/", { school: id }),
        countOf("students/", { school: id }),
        countOf("parents/", { school: id }),
        countOf("student-attendance/sessions/", { school: id }),
      ])
      return { teachers, students, parents, sessions }
    },
  })

  const active = school?.status === "ACTIVE"
  const statusMutation = useApiMutation(() => schoolsApi.setStatus(id, active ? "INACTIVE" : "ACTIVE"), {
    invalidate: [["school", id], ["schools"], ["dashboard"]],
    onSuccess: () => setStatusOpen(false),
  })
  const deleteMutation = useApiMutation(() => schoolsApi.remove(id), {
    invalidate: [["schools"], ["dashboard"]],
    onSuccess: () => navigate(panelPath("/admin/schools"), { replace: true }),
  })
  const logoMutation = useApiMutation((file: File) => schoolsApi.update(id, toFormData({ logo: file })), {
    invalidate: [["school", id]],
  })

  if (error) return <ErrorState error={error} onRetry={refetch} />

  if (isLoading || !school) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }

  const stats = [
    { label: "Teachers", value: counts.data?.teachers, icon: Presentation, to: panelPath(`/admin/teachers?school=${id}`) },
    { label: "Students", value: counts.data?.students, icon: GraduationCap, to: panelPath(`/admin/students?school=${id}`) },
    { label: "Parents", value: counts.data?.parents, icon: UsersRound, to: panelPath(`/admin/parents?school=${id}`) },
    { label: "Attendance sessions", value: counts.data?.sessions, icon: ClipboardCheck, to: panelPath(`/admin/attendance?school=${id}`) },
  ]

  return (
    <>
      <PageHeader
        title={school.name}
        seoTitle={`${school.name} school`}
        description={`School code ${school.code}`}
        backTo={panelPath("/admin/schools")}
        actions={
          <>
            <Button variant="outline" className="h-9" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            <Button variant={active ? "outline" : "default"} className="h-9" onClick={() => setStatusOpen(true)}>
              {active ? <PowerOff /> : <Power />}
              {active ? "Deactivate" : "Activate"}
            </Button>
            <Button variant="destructive" size="icon-lg" onClick={() => setDeleteOpen(true)} aria-label="Delete school">
              <Trash2 />
            </Button>
          </>
        }
      />

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
                <div className="group relative">
                  <span className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    {school.logo ? <img src={school.logo} alt={`${school.name} logo`} className="size-full object-cover" /> : <School className="size-7" />}
                  </span>
                  <button
                    type="button"
                    onClick={() => logoInput.current?.click()}
                    disabled={logoMutation.isPending}
                    aria-label="Change school logo"
                    className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-110"
                  >
                    {logoMutation.isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                  </button>
                  <input
                    ref={logoInput}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) logoMutation.mutate(file)
                      e.target.value = ""
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg font-semibold">{school.name}</CardTitle>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <ActiveBadge active={active} />
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
              <DetailRow label="Created" icon={CalendarRange}>
                {formatDate(school.created_at)}
              </DetailRow>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-semibold">School admin</CardTitle>
              <CardDescription>Manages this school's teachers, students and attendance.</CardDescription>
            </CardHeader>
            <CardContent>
              {school.admin ? (
                <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <PersonAvatar name={school.admin.name} src={school.admin.profile_image} className="size-12" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{school.admin.name}</p>
                      <ActiveBadge active={school.admin.is_active} />
                    </div>
                  </div>
                  <div className="divide-y rounded-xl border px-3">
                    <DetailRow label="Email">{school.admin.email}</DetailRow>
                    <DetailRow label="Mobile">{school.admin.phone_number}</DetailRow>
                  </div>
                  {!active && (
                    <p className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
                      Activating the school creates a fresh password for this admin and emails it to them.
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <Button asChild variant="outline">
                      <Link to={panelPath(`/admin/users?search=${encodeURIComponent(school.admin.email ?? school.admin.name)}`)}>Manage account</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <a href="#academics">
                        <CalendarRange /> Academic setup
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No admin is linked to this school.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.section
        id="academics"
        aria-labelledby="academics-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mt-8 scroll-mt-24"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarRange className="size-4" />
          </span>
          <div>
            <h2 id="academics-title" className="text-lg font-semibold">
              Academics
            </h2>
            <p className="text-sm text-muted-foreground">Academic years, classes, sections, holidays and working days for {school.name}.</p>
          </div>
        </div>
        <AcademicsTabs school={id} />
      </motion.section>

      <SchoolFormDialog open={editOpen} onOpenChange={setEditOpen} school={school} />

      <ConfirmDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        icon={active ? PowerOff : Power}
        destructive={active}
        title={active ? `Deactivate ${school.name}?` : `Activate ${school.name}?`}
        description={
          active
            ? "The school admin loses access and receives a deactivation email."
            : "A new password is generated for the school admin and emailed to them with their login details."
        }
        confirmLabel={active ? "Deactivate" : "Activate and email"}
        loading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate()}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        destructive
        icon={Trash2}
        title={`Delete ${school.name}?`}
        description="This permanently removes the school. It cannot be undone."
        confirmLabel="Delete school"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  )
}
