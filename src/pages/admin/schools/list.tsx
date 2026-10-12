import { useState } from "react"
import { useNavigate } from "react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Eye, MoreHorizontal, Plus, Power, PowerOff, School, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState } from "@/components/admin/states"
import { ActiveBadge, ClearFiltersButton, FilterSelect, Panel, Pill, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useUrlState } from "@/hooks/use-url-state"
import { schoolsApi } from "@/lib/endpoints"
import type { SchoolListItem } from "@/lib/types"
import { SchoolFormDialog } from "./school-form-dialog"
import { panelPath } from "@/lib/panel"

const ORDERING = [
  { value: "name", label: "Name A to Z" },
  { value: "-name", label: "Name Z to A" },
  { value: "-created_at", label: "Newest first" },
  { value: "created_at", label: "Oldest first" },
  { value: "city", label: "City" },
]

export default function SchoolsPage() {
  const navigate = useNavigate()
  const url = useUrlState()
  const [createOpen, setCreateOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<SchoolListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolListItem | null>(null)

  const params = {
    page: url.page,
    page_size: url.pageSize,
    search: url.get("search"),
    status: url.get("status"),
    ordering: url.get("ordering", "-created_at"),
  }
  const query = useQuery({
    queryKey: ["schools", params],
    queryFn: () => schoolsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const statusMutation = useApiMutation(
    (s: SchoolListItem) => schoolsApi.setStatus(s.id, s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"),
    { invalidate: [["schools"], ["school"], ["dashboard"]], onSuccess: () => setStatusTarget(null) }
  )
  const deleteMutation = useApiMutation((id: number) => schoolsApi.remove(id), {
    invalidate: [["schools"], ["dashboard"]],
    onSuccess: () => setDeleteTarget(null),
  })

  const columns: Column<SchoolListItem>[] = [
    {
      key: "name",
      header: "School",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <School className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{s.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      hideBelow: "md",
      cell: (s) => (
        <div className="text-sm">
          <p className="truncate">{s.email}</p>
          <p className="text-xs text-muted-foreground">{s.phone}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      hideBelow: "lg",
      cell: (s) => <span className="text-sm">{[s.city, s.state].filter(Boolean).join(", ") || "-"}</span>,
    },
    { key: "admin", header: "Admin", hideBelow: "lg", cell: (s) => s.admin_name ?? "-" },
    {
      key: "threshold",
      header: "Threshold",
      hideBelow: "xl",
      cell: (s) => <Pill tone="gray">{s.attendance_threshold}%</Pill>,
    },
    { key: "status", header: "Status", cell: (s) => <ActiveBadge active={s.status === "ACTIVE"} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (s) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => navigate(panelPath(`/admin/schools/${s.id}`))}>
              <Eye /> View details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setStatusTarget(s)}>
              {s.status === "ACTIVE" ? <PowerOff /> : <Power />}
              {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(s)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const filtered = !!(params.search || params.status)

  return (
    <>
      <PageHeader
        title="Schools"
        icon={School}
        description="Onboard schools, manage their admins and control access."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="h-9 shadow-md shadow-primary/20">
            <Plus /> Add school
          </Button>
        }
      />

      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search name, code, email, phone" />
            <FilterSelect
              label="Status"
              value={params.status}
              onChange={(v) => url.set({ status: v })}
              allLabel="All statuses"
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
            <FilterSelect
              label="Sort by"
              value={url.get("ordering")}
              onChange={(v) => url.set({ ordering: v })}
              allLabel="Newest first"
              options={ORDERING.filter((o) => o.value !== "-created_at")}
            />
            <ClearFiltersButton show={filtered} onClick={() => url.set({ search: null, status: null })} />
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
          rowKey={(s) => s.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={(s) => navigate(panelPath(`/admin/schools/${s.id}`))}
          empty={
            <EmptyState
              icon={School}
              title={filtered ? "No schools match these filters" : "No schools yet"}
              description={filtered ? "Try a different search or clear the filters." : "Add the first school to get started."}
              action={
                !filtered && (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus /> Add school
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      <SchoolFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={(s) => navigate(panelPath(`/admin/schools/${s.id}`))} />

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(o) => !o && setStatusTarget(null)}
        icon={statusTarget?.status === "ACTIVE" ? PowerOff : Power}
        destructive={statusTarget?.status === "ACTIVE"}
        title={statusTarget?.status === "ACTIVE" ? `Deactivate ${statusTarget?.name}?` : `Activate ${statusTarget?.name}?`}
        description={
          statusTarget?.status === "ACTIVE"
            ? "The school admin loses access and receives a deactivation email."
            : "A new password is generated for the school admin and emailed to them with their login details."
        }
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate and email"}
        loading={statusMutation.isPending}
        onConfirm={() => statusTarget && statusMutation.mutate(statusTarget)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        destructive
        icon={Trash2}
        title={`Delete ${deleteTarget?.name}?`}
        description="This permanently removes the school. It cannot be undone."
        confirmLabel="Delete school"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}
