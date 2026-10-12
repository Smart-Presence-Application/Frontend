import { useState } from "react"
import { Link } from "react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Camera, CameraOff, GraduationCap, ImageUp, MoreHorizontal, Pencil, Plus, ScanFace, Trash2, Upload, Users } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { EmptyState } from "@/components/admin/states"
import { ClearFiltersButton, FilterSelect, Panel, PersonCell, Pill, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePanel } from "@/context/panel"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useUrlState } from "@/hooks/use-url-state"
import { studentsApi } from "@/lib/endpoints"
import { classSectionLabel } from "@/lib/format"
import { panelPath } from "@/lib/panel"
import type { Student } from "@/lib/types"
import { StudentBulkDialog } from "./student-bulk-dialog"
import { StudentFormDialog } from "./student-form-dialog"
import { StudentPhotoDialog } from "./student-photo-dialog"
import { StudentPromoteDialog } from "./student-promote-dialog"

const ORDERING = [
  { value: "roll_number", label: "Roll number" },
  { value: "name", label: "Name A to Z" },
  { value: "-name", label: "Name Z to A" },
  { value: "student_id", label: "Student ID" },
  { value: "-created_at", label: "Newest enrolled" },
]

type Action = "create" | "bulk" | "edit" | "photo" | "delete" | "promote"

/** The face registry, filtered down to this one student. */
function faceRegistryPath(s: Student) {
  const query = new URLSearchParams({ school: String(s.school), class_section: String(s.class_section), search: s.student_id })
  return panelPath(`/admin/faces?${query}`)
}

/** Students list. Promoting students between years is left to the school, not teachers. */
export default function StudentsPage() {
  const url = useUrlState()
  const isTeacher = usePanel().kind === "teacher"
  const [action, setAction] = useState<Action | null>(null)
  const [target, setTarget] = useState<Student>()
  const close = () => setAction(null)
  const openFor = (next: Action, s?: Student) => {
    if (s) setTarget(s)
    setAction(next)
  }

  const school = Number(url.get("school")) || null
  const classSection = school ? Number(url.get("class_section")) || null : null
  const params = {
    page: url.page,
    page_size: url.pageSize,
    search: url.get("search"),
    school,
    class_section: classSection,
    has_profile_image: url.get("has_profile_image"),
    face_registered: url.get("face_registered"),
    ordering: url.get("ordering"),
  }
  const query = useQuery({
    queryKey: ["students", params],
    queryFn: () => studentsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useApiMutation((id: number) => studentsApi.remove(id), {
    invalidate: [["students"], ["parents"], ["dashboard"]],
    onSuccess: close,
  })

  const columns: Column<Student>[] = [
    {
      key: "student",
      header: "Student",
      cell: (s) => <PersonCell name={s.name} src={s.profile_image} sub={<span className="font-mono">{s.student_id}</span>} />,
    },
    { key: "roll", header: "Roll no.", hideBelow: "sm", cell: (s) => <span className="tabular-nums">{s.roll_number}</span> },
    { key: "school", header: "School", hideBelow: "lg", cell: (s) => <span className="text-sm">{s.school_name}</span> },
    {
      key: "class",
      header: "Class",
      hideBelow: "md",
      cell: (s) => <span className="text-sm whitespace-nowrap">{classSectionLabel(s.class_section_detail)}</span>,
    },
    {
      key: "photo",
      header: "Photo",
      cell: (s) =>
        s.has_profile_image ? (
          <Pill tone="green">
            <Camera className="size-3" /> Added
          </Pill>
        ) : (
          <Pill tone="amber">
            <CameraOff className="size-3" /> Missing
          </Pill>
        ),
    },
    {
      key: "face",
      header: "Face",
      cell: (s) =>
        s.face_registered ? (
          <Pill tone="green">
            <ScanFace className="size-3" /> Registered
          </Pill>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="gray" dot>
              Not registered
            </Pill>
            <Button asChild size="xs" variant="outline">
              <Link to={faceRegistryPath(s)} aria-label={`Register face for ${s.name}`}>
                <ScanFace /> Register
              </Link>
            </Button>
          </div>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (s) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => openFor("edit", s)}>
              <Pencil /> Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openFor("photo", s)}>
              <ImageUp /> {s.has_profile_image ? "Change photo" : "Add photo"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => openFor("delete", s)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const filtered = !!(params.search || school || params.has_profile_image || params.face_registered)
  const defaults = { school, class_section: classSection }

  return (
    <>
      <PageHeader
        title="Students"
        icon={Users}
        description={
          isTeacher
            ? "Enroll the students of your class and manage the photos used for face recognition."
            : "Enroll students, keep their class sections current and manage the photos used for face recognition."
        }
        actions={
          <>
            {!isTeacher && (
              <Button variant="outline" onClick={() => openFor("promote")} className="h-9">
                <GraduationCap /> Promote
              </Button>
            )}
            <Button variant="outline" onClick={() => openFor("bulk")} className="h-9">
              <Upload /> Bulk upload
            </Button>
            <Button onClick={() => openFor("create")} className="h-9 shadow-md shadow-primary/20">
              <Plus /> Add student
            </Button>
          </>
        }
      />

      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search name, student ID, roll no." />
            <SchoolPicker
              value={school}
              onChange={(v) => url.set({ school: v, class_section: null })}
              placeholder="All schools"
              clearable
              className="w-full sm:w-52"
            />
            <ClassSectionSelect school={school} value={classSection} onChange={(v) => url.set({ class_section: v })} allowAll className="sm:w-48" />
            <FilterSelect
              label="Photo"
              value={params.has_profile_image}
              onChange={(v) => url.set({ has_profile_image: v })}
              allLabel="Any photo status"
              options={[
                { value: "true", label: "Photo added" },
                { value: "false", label: "Photo missing" },
              ]}
            />
            <FilterSelect
              label="Face"
              value={params.face_registered}
              onChange={(v) => url.set({ face_registered: v })}
              allLabel="Any face status"
              options={[
                { value: "true", label: "Face registered" },
                { value: "false", label: "Not registered" },
              ]}
            />
            <FilterSelect
              label="Sort by"
              value={params.ordering}
              onChange={(v) => url.set({ ordering: v })}
              allLabel="Class, then roll no."
              options={ORDERING}
            />
            <ClearFiltersButton
              show={filtered}
              onClick={() => url.set({ search: null, school: null, class_section: null, has_profile_image: null, face_registered: null })}
            />
          </>
        }
        footer={
          query.data && (
            <Pagination
              count={query.data.count}
              page={url.page}
              pageSize={url.pageSize}
              onPageChange={(page) => url.set({ page })}
              onPageSizeChange={(size) => url.set({ page_size: size })}
            />
          )
        }
      >
        <DataTable
          columns={isTeacher ? columns.filter((c) => c.key !== "school") : columns}
          rows={query.data?.results}
          rowKey={(s) => s.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={
            <EmptyState
              icon={Users}
              title={filtered ? "No students match these filters" : "No students yet"}
              description={filtered ? "Try a different search or clear the filters." : "Enroll students one by one or upload a CSV per class."}
              action={
                !filtered && (
                  <Button onClick={() => openFor("create")}>
                    <Plus /> Add student
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      <StudentFormDialog open={action === "create"} onOpenChange={(o) => !o && close()} defaults={defaults} />
      <StudentFormDialog open={action === "edit"} onOpenChange={(o) => !o && close()} student={target} />
      <StudentBulkDialog open={action === "bulk"} onOpenChange={(o) => !o && close()} defaults={defaults} />
      <StudentPhotoDialog open={action === "photo"} onOpenChange={(o) => !o && close()} student={target} />
      {!isTeacher && <StudentPromoteDialog open={action === "promote"} onOpenChange={(o) => !o && close()} defaults={defaults} />}

      <ConfirmDialog
        open={action === "delete"}
        onOpenChange={(o) => !o && close()}
        destructive
        icon={Trash2}
        title={`Delete ${target?.name}?`}
        description="This permanently removes the student. Students referenced by attendance or other records cannot be deleted."
        confirmLabel="Delete student"
        loading={deleteMutation.isPending}
        onConfirm={() => target && deleteMutation.mutate(target.id)}
      />
    </>
  )
}
