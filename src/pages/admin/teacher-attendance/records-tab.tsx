import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { BadgeCheck, CalendarClock, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Pagination } from "@/components/admin/pagination"
import { SchoolPicker } from "@/components/admin/pickers"
import { EmptyState } from "@/components/admin/states"
import { ClearFiltersButton, FilterSelect, Panel, PersonCell, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useApiMutation } from "@/hooks/use-api-mutation"
import type { useUrlState } from "@/hooks/use-url-state"
import { teacherAttendanceApi } from "@/lib/endpoints"
import { formatDate, formatTime, isoDate } from "@/lib/format"
import type { TeacherAttendanceRecord } from "@/lib/types"
import { DayTypePill, PhotoThumb, TeacherPicker, TeacherStatusPill } from "./bits"
import { durationLabel } from "./utils"
import { VerifyDialog } from "./verify-dialog"

function TimeCell({ time, image, label, adjusted, offline }: { time: string | null; image: string | null; label: string; adjusted: boolean; offline?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <PhotoThumb src={image} label={label} />
      <div className="text-sm">
        <p className="font-medium whitespace-nowrap tabular-nums">{time ? formatTime(time) : "Not yet"}</p>
        {adjusted && <p className="text-[11px] text-muted-foreground">Adjusted</p>}
        {offline && <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Offline, review time</p>}
      </div>
    </div>
  )
}

/** Teacher attendance records. A dialog key is bumped on every open so the verify form remounts from the chosen record. */
export function RecordsTab({ url }: { url: ReturnType<typeof useUrlState> }) {
  const [verifyTarget, setVerifyTarget] = useState<TeacherAttendanceRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeacherAttendanceRecord | null>(null)
  const deleteMutation = useApiMutation((id: number) => teacherAttendanceApi.remove(id), {
    invalidate: [["teacher-attendance"], ["teacher-attendance-summary"], ["dashboard"]],
    onSuccess: () => setDeleteTarget(null),
  })
  const [dialogKey, setDialogKey] = useState(0)
  const openVerify = (r: TeacherAttendanceRecord) => {
    setDialogKey((k) => k + 1)
    setVerifyTarget(r)
  }
  const school = Number(url.get("school")) || null
  const teacher = Number(url.get("teacher")) || null
  const params = {
    page: url.page,
    page_size: url.pageSize,
    school,
    teacher,
    status: url.get("status"),
    day_type: url.get("day_type"),
    date_from: url.get("date_from"),
    date_to: url.get("date_to"),
    search: url.get("search"),
  }
  const query = useQuery({
    queryKey: ["teacher-attendance", params],
    queryFn: () => teacherAttendanceApi.list(params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<TeacherAttendanceRecord>[] = [
    {
      key: "teacher",
      header: "Teacher",
      cell: (r) => (
        <PersonCell
          name={r.teacher_name}
          sub={
            <>
              <span className="font-mono">{r.employee_id}</span>
              <span className="sm:hidden"> · {formatDate(r.date)}</span>
            </>
          }
        />
      ),
    },
    { key: "date", header: "Date", hideBelow: "sm", cell: (r) => <span className="text-sm whitespace-nowrap">{formatDate(r.date)}</span> },
    {
      key: "in",
      header: "Check-in",
      hideBelow: "md",
      cell: (r) => <TimeCell time={r.check_in_at} image={r.check_in_image} label={`${r.teacher_name} check-in photo`} adjusted={!!r.check_in_verified_at} offline={r.check_in_offline} />,
    },
    {
      key: "out",
      header: "Check-out",
      hideBelow: "md",
      cell: (r) => (
        <TimeCell time={r.check_out_at} image={r.check_out_image} label={`${r.teacher_name} check-out photo`} adjusted={!!r.check_out_verified_at} offline={r.check_out_offline} />
      ),
    },
    {
      key: "worked",
      header: "Worked",
      hideBelow: "lg",
      cell: (r) => <span className="text-sm font-medium tabular-nums">{durationLabel(r.worked_minutes)}</span>,
    },
    { key: "day", header: "Day type", hideBelow: "lg", cell: (r) => <DayTypePill value={r.day_type} overridden={r.day_type_overridden} /> },
    { key: "status", header: "Status", cell: (r) => <TeacherStatusPill status={r.status} /> },
    {
      key: "verified_by",
      header: "Verified by",
      hideBelow: "xl",
      cell: (r) => <span className="text-xs text-muted-foreground">{r.verified_by_name ?? "-"}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-32 text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant={r.status === "VERIFIED" ? "ghost" : "outline"}
            onClick={(e) => {
              e.stopPropagation()
              openVerify(r)
            }}
          >
            <BadgeCheck /> {r.status === "VERIFIED" ? "Review" : "Verify"}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete ${r.teacher_name}'s attendance on ${formatDate(r.date)}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget(r)
                }}
              >
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]

  const filtered = !!(school || teacher || params.status || params.day_type || params.date_from || params.date_to || params.search)

  return (
    <>
      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search name or employee ID" className="sm:w-60" />
            <SchoolPicker
              value={school}
              onChange={(v) => url.set({ school: v, teacher: null })}
              placeholder="All schools"
              clearable
              className="h-9 w-full sm:w-52"
            />
            <TeacherPicker school={school} value={teacher} onChange={(v) => url.set({ teacher: v })} className="h-9 w-full sm:w-48" />
            <FilterSelect
              label="Status"
              value={params.status}
              onChange={(v) => url.set({ status: v })}
              allLabel="All statuses"
              className="sm:w-40"
              options={[
                { value: "DRAFT", label: "Awaiting review" },
                { value: "VERIFIED", label: "Verified" },
              ]}
            />
            <FilterSelect
              label="Day type"
              value={params.day_type}
              onChange={(v) => url.set({ day_type: v })}
              allLabel="All day types"
              className="sm:w-36"
              options={[
                { value: "FULL_DAY", label: "Full day" },
                { value: "HALF_DAY", label: "Half day" },
                { value: "ABSENT", label: "Absent" },
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
            <ClearFiltersButton
              show={filtered}
              onClick={() => url.set({ school: null, teacher: null, status: null, day_type: null, date_from: null, date_to: null, search: null })}
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
          rowKey={(r) => r.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={openVerify}
          empty={
            <EmptyState
              icon={CalendarClock}
              title={filtered ? "No records match these filters" : "No check-ins yet"}
              description={filtered ? "Try a different date range or clear the filters." : "Teachers' check-ins from the app appear here for review."}
            />
          }
        />
      </Panel>
      <VerifyDialog key={dialogKey} record={verifyTarget} onOpenChange={(o) => !o && setVerifyTarget(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        destructive
        icon={Trash2}
        title="Delete this attendance day?"
        description={
          deleteTarget &&
          `${deleteTarget.teacher_name}'s ${deleteTarget.status === "VERIFIED" ? "verified " : ""}day on ${formatDate(
            deleteTarget.date
          )} and its check-in and check-out photos are removed permanently. The teacher can check in again for that day if it is today.`
        }
        confirmLabel="Delete day"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}
