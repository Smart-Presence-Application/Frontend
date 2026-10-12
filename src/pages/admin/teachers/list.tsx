import { useState } from "react"
import { useNavigate } from "react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Eye, GraduationCap, MoreHorizontal, Plus, Upload } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { EmptyState } from "@/components/admin/states"
import { ActiveBadge, ClearFiltersButton, FilterSelect, Panel, PersonCell, Pill, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useUrlState } from "@/hooks/use-url-state"
import { teachersApi } from "@/lib/endpoints"
import { classSectionLabel, formatDate } from "@/lib/format"
import type { Teacher } from "@/lib/types"
import { TeacherMenuItems } from "./teacher-actions"
import { TeacherBulkDialog } from "./teacher-bulk-dialog"
import { TeacherFormDialog } from "./teacher-form-dialog"
import { useTeacherActions } from "./use-teacher-actions"
import { panelPath } from "@/lib/panel"

const ORDERING = [
  { value: "user__name", label: "Name A to Z" },
  { value: "-user__name", label: "Name Z to A" },
  { value: "-joining_date", label: "Recently joined" },
  { value: "joining_date", label: "Earliest joined" },
  { value: "-created_at", label: "Newest added" },
]

export default function TeachersPage() {
  const navigate = useNavigate()
  const url = useUrlState()
  const [createOpen, setCreateOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const actions = useTeacherActions()

  const school = Number(url.get("school")) || null
  const classSection = Number(url.get("class_section")) || null
  const params = {
    page: url.page,
    page_size: url.pageSize,
    search: url.get("search"),
    school,
    class_section: school ? classSection : null,
    is_active: url.get("is_active"),
    is_assigned: url.get("is_assigned"),
    ordering: url.get("ordering", "employee_id"),
  }
  const query = useQuery({
    queryKey: ["teachers", params],
    queryFn: () => teachersApi.list(params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<Teacher>[] = [
    {
      key: "teacher",
      header: "Teacher",
      cell: (t) => <PersonCell name={t.name} sub={<span className="font-mono">{t.employee_id}</span>} to={panelPath(`/admin/teachers/${t.id}`)} />,
    },
    {
      key: "contact",
      header: "Contact",
      hideBelow: "md",
      cell: (t) => (
        <div className="max-w-56 text-sm">
          <p className="truncate">{t.email}</p>
          <p className="text-xs text-muted-foreground">{t.phone_number || "-"}</p>
        </div>
      ),
    },
    { key: "school", header: "School", hideBelow: "lg", cell: (t) => <span className="text-sm">{t.school_name}</span> },
    {
      key: "class",
      header: "Class",
      hideBelow: "sm",
      cell: (t) =>
        t.class_section_detail ? (
          <Pill tone="green">{classSectionLabel(t.class_section_detail)}</Pill>
        ) : (
          <Pill tone="amber">Unassigned</Pill>
        ),
    },
    { key: "joined", header: "Joined", hideBelow: "xl", cell: (t) => <span className="text-sm whitespace-nowrap">{formatDate(t.joining_date)}</span> },
    { key: "status", header: "Status", cell: (t) => <ActiveBadge active={t.is_active} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (t) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${t.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => navigate(panelPath(`/admin/teachers/${t.id}`))}>
              <Eye /> View details
            </DropdownMenuItem>
            <TeacherMenuItems teacher={t} onAction={actions.open} />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const filtered = !!(params.search || school || params.is_active || params.is_assigned)

  return (
    <>
      <PageHeader
        title="Teachers"
        icon={GraduationCap}
        description="Add teachers, control their access and assign them to class sections."
        actions={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(true)} className="h-9">
              <Upload /> Bulk upload
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="h-9 shadow-md shadow-primary/20">
              <Plus /> Add teacher
            </Button>
          </>
        }
      />

      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search name, employee ID, email" />
            <SchoolPicker
              value={school}
              onChange={(v) => url.set({ school: v, class_section: null })}
              placeholder="All schools"
              clearable
              className="w-full sm:w-52"
            />
            <ClassSectionSelect
              school={school}
              value={classSection}
              onChange={(v) => url.set({ class_section: v })}
              allowAll
              className="sm:w-48"
            />
            <FilterSelect
              label="Status"
              value={params.is_active}
              onChange={(v) => url.set({ is_active: v })}
              allLabel="All statuses"
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
            <FilterSelect
              label="Assignment"
              value={params.is_assigned}
              onChange={(v) => url.set({ is_assigned: v })}
              allLabel="Any assignment"
              options={[
                { value: "true", label: "Assigned" },
                { value: "false", label: "Unassigned" },
              ]}
            />
            <FilterSelect
              label="Sort by"
              value={url.get("ordering")}
              onChange={(v) => url.set({ ordering: v })}
              allLabel="Employee ID"
              options={ORDERING}
            />
            <ClearFiltersButton
              show={filtered}
              onClick={() => url.set({ search: null, school: null, class_section: null, is_active: null, is_assigned: null })}
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
          columns={columns}
          rows={query.data?.results}
          rowKey={(t) => t.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={(t) => navigate(panelPath(`/admin/teachers/${t.id}`))}
          empty={
            <EmptyState
              icon={GraduationCap}
              title={filtered ? "No teachers match these filters" : "No teachers yet"}
              description={filtered ? "Try a different search or clear the filters." : "Add teachers one by one or upload a CSV."}
              action={
                !filtered && (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus /> Add teacher
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      <TeacherFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={(t) => navigate(panelPath(`/admin/teachers/${t.id}`))} />
      <TeacherBulkDialog open={bulkOpen} onOpenChange={setBulkOpen} />
      {actions.dialogs}
    </>
  )
}
