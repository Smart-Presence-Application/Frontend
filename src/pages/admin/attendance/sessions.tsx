import { useState } from "react"
import { useNavigate } from "react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CalendarCheck, ClipboardPen, Eye, ImageIcon, MoreHorizontal, ScanFace, Sparkles, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { EmptyState } from "@/components/admin/states"
import { ClearFiltersButton, FilterSelect, Panel } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { usePanel } from "@/context/panel"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { Input } from "@/components/ui/input"
import { useUrlState } from "@/hooks/use-url-state"
import { sessionsApi } from "@/lib/endpoints"
import { classSectionLabel, formatDate, isoDate, timeAgo } from "@/lib/format"
import type { AttendanceSession } from "@/lib/types"
import { AttendanceBar, SessionStatusPill } from "./attendance-bits"
import { AiAttendanceDialog, ManualAttendanceDialog } from "./take-attendance-dialogs"
import { panelPath } from "@/lib/panel"

const ORDERING = [
  { value: "date", label: "Oldest date first" },
  { value: "-created_at", label: "Recently created" },
  { value: "status", label: "Drafts first" },
  { value: "-status", label: "Locked first" },
]

/** Attendance sessions list. Teachers see only their own class and cannot delete attendance. A dialog key is bumped on every open so the dialogs remount with fresh form state. */
export default function AttendanceSessionsPage() {
  const navigate = useNavigate()
  const url = useUrlState()
  const isTeacher = usePanel().kind === "teacher"
  const [aiOpen, setAiOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AttendanceSession | null>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const openAi = () => {
    setDialogKey((k) => k + 1)
    setAiOpen(true)
  }
  const openManual = () => {
    setDialogKey((k) => k + 1)
    setManualOpen(true)
  }

  const school = Number(url.get("school")) || null
  const classSection = Number(url.get("class_section")) || null
  const params = {
    page: url.page,
    page_size: url.pageSize,
    school,
    class_section: classSection,
    status: url.get("status"),
    date_from: url.get("date_from"),
    date_to: url.get("date_to"),
    ordering: url.get("ordering"),
  }
  const query = useQuery({
    queryKey: ["sessions", params],
    queryFn: () => sessionsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const openSession = (s: { id: number }) => navigate(panelPath(`/admin/attendance/${s.id}`))

  const deleteMutation = useApiMutation((id: number) => sessionsApi.remove(id), {
    invalidate: [["sessions"], ["dashboard"]],
    onSuccess: () => setDeleteTarget(null),
  })

  const columns: Column<AttendanceSession>[] = [
    {
      key: "date",
      header: "Date",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 leading-none text-primary">
            <span className="text-sm font-bold">{s.date.slice(8, 10)}</span>
          </span>
          <div className="min-w-0">
            <p className="font-medium whitespace-nowrap">{formatDate(s.date)}</p>
            <p className="truncate text-xs text-muted-foreground sm:hidden">{classSectionLabel(s.class_section_detail)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "school",
      header: "School",
      hideBelow: "lg",
      cell: (s) => <span className="line-clamp-2 max-w-48 text-sm">{s.school_name}</span>,
    },
    {
      key: "class",
      header: "Class section",
      hideBelow: "sm",
      cell: (s) => (
        <div className="text-sm">
          <p className="font-medium whitespace-nowrap">{classSectionLabel(s.class_section_detail)}</p>
          <p className="text-xs text-muted-foreground">{s.class_section_detail?.academic_year_name}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (s) => <SessionStatusPill status={s.status} /> },
    {
      key: "counts",
      header: "Present / absent",
      hideBelow: "md",
      cell: (s) => <AttendanceBar present={s.present_count} absent={s.absent_count} total={s.total_students} />,
    },
    {
      key: "ai",
      header: "AI",
      hideBelow: "xl",
      cell: (s) =>
        s.image_count > 0 ? (
          <div className="grid gap-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <ImageIcon className="size-3.5 text-primary" /> {s.image_count} photo{s.image_count === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <ScanFace className="size-3.5 text-primary" /> {s.detected_faces} face{s.detected_faces === 1 ? "" : "s"}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Manual</span>
        ),
    },
    {
      key: "people",
      header: "Taken / locked by",
      hideBelow: "lg",
      cell: (s) => (
        <div className="text-xs">
          <p className="truncate">{s.created_by_name ?? "-"}</p>
          <p className="text-muted-foreground">{s.locked_by_name ? `Locked by ${s.locked_by_name} ${timeAgo(s.locked_at)}` : "Not locked"}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (s) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for attendance on ${formatDate(s.date)}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => openSession(s)}>
              <Eye /> Open
            </DropdownMenuItem>
            {!isTeacher && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(s)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const filtered = !!(school || classSection || params.status || params.date_from || params.date_to)

  return (
    <>
      <PageHeader
        title={isTeacher ? "Class attendance" : "Student attendance"}
        icon={CalendarCheck}
        description={
          isTeacher
            ? "Take attendance from a classroom photo or by hand, correct records and lock them to notify parents."
            : "Review AI and manual attendance for every class, correct records and lock them to notify parents."
        }
        actions={
          <>
            <Button variant="outline" className="h-9" onClick={openManual}>
              <ClipboardPen /> Manual attendance
            </Button>
            <Button onClick={openAi} className="h-9 shadow-md shadow-primary/20">
              <Sparkles /> Take attendance with AI
            </Button>
          </>
        }
      />

      <Panel
        toolbar={
          <>
            <SchoolPicker
              value={school}
              onChange={(v) => url.set({ school: v, class_section: null })}
              placeholder="All schools"
              clearable
              className="h-9 w-full sm:w-56"
            />
            <ClassSectionSelect
              school={school}
              value={classSection}
              onChange={(v) => url.set({ class_section: v })}
              allowAll
              className="sm:w-52"
            />
            <FilterSelect
              label="Status"
              value={params.status}
              onChange={(v) => url.set({ status: v })}
              allLabel="All statuses"
              className="sm:w-36"
              options={[
                { value: "DRAFT", label: "Draft" },
                { value: "LOCKED", label: "Locked" },
              ]}
            />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Input
                type="date"
                aria-label="From date"
                title="From date"
                value={params.date_from}
                max={params.date_to || isoDate()}
                onChange={(e) => url.set({ date_from: e.target.value })}
                className="h-9 sm:w-38"
              />
              <Input
                type="date"
                aria-label="To date"
                title="To date"
                value={params.date_to}
                min={params.date_from || undefined}
                onChange={(e) => url.set({ date_to: e.target.value })}
                className="h-9 sm:w-38"
              />
            </div>
            <FilterSelect
              label="Sort by"
              value={params.ordering}
              onChange={(v) => url.set({ ordering: v })}
              allLabel="Newest date first"
              options={ORDERING}
            />
            <ClearFiltersButton
              show={filtered}
              onClick={() => url.set({ school: null, class_section: null, status: null, date_from: null, date_to: null })}
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
          onRowClick={openSession}
          empty={
            <EmptyState
              icon={CalendarCheck}
              title={filtered ? "No attendance matches these filters" : "No attendance taken yet"}
              description={
                filtered ? "Try a different date range or clear the filters." : "Upload classroom photos and let the AI mark attendance."
              }
              action={
                !filtered && (
                  <Button onClick={openAi}>
                    <Sparkles /> Take attendance with AI
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        destructive
        icon={Trash2}
        title="Delete this attendance?"
        description={
          deleteTarget &&
          `${classSectionLabel(deleteTarget.class_section_detail)} on ${formatDate(deleteTarget.date)} and all ${deleteTarget.total_students ?? 0} student records will be removed permanently.${
            deleteTarget.status === "LOCKED" ? " It is locked: notifications parents already received stay in their inbox." : ""
          }`
        }
        confirmLabel="Delete attendance"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      <AiAttendanceDialog
        key={`ai-${dialogKey}`}
        open={aiOpen}
        onOpenChange={setAiOpen}
        onDone={openSession}
        defaultSchool={school}
        defaultClassSection={classSection}
        onSwitchToManual={() => {
          setAiOpen(false)
          openManual()
        }}
      />
      <ManualAttendanceDialog
        key={`manual-${dialogKey}`}
        open={manualOpen}
        onOpenChange={setManualOpen}
        onDone={openSession}
        defaultSchool={school}
        defaultClassSection={classSection}
      />
    </>
  )
}
