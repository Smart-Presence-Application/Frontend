import { useMemo, useState } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { BadgeCheck, CalendarCheck, CalendarClock, Clock, CloudOff, CloudUpload, Download, LoaderCircle, LogIn, LogOut, Sun, Timer, Trash2, TriangleAlert } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState } from "@/components/admin/states"
import { ClearFiltersButton, FilterSelect, Panel, Pill, StatCard } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useObjectUrls } from "@/hooks/use-object-urls"
import { useOnline } from "@/hooks/use-online"
import { useOutbox } from "@/hooks/use-worker-events"
import { useUrlState } from "@/hooks/use-url-state"
import { ApiError, errorMessage } from "@/lib/api"
import { reportsApi, teacherAttendanceApi } from "@/lib/endpoints"
import { formatDate, formatNumber, formatTime, isoDate } from "@/lib/format"
import { isTransient } from "@/lib/offline-queue"
import { addToOutbox, outboxSupported, removeFromOutbox, type OutboxItem } from "@/lib/outbox"
import { requestSync } from "@/lib/sync"
import type { TeacherAttendanceRecord } from "@/lib/types"
import { DayTypePill, PhotoPanel, PhotoThumb, TeacherStatusPill } from "../admin/teacher-attendance/bits"
import { durationLabel } from "../admin/teacher-attendance/utils"
import { CameraCaptureDialog } from "@/components/common/camera-capture-dialog"

type CaptureKind = "in" | "out"

const INVALIDATE = [["teacher-attendance"], ["teacher-attendance-summary"], ["outbox"]]
const QUEUED_MESSAGE = "Saved on this device. It uploads automatically when you are back online."

function monthStart() {
  const now = new Date()
  return isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
}

/** Today's photos still waiting to upload (refused ones do not count). */
function queuedToday(items: OutboxItem[] = []) {
  const today = isoDate()
  const pending = items.filter((i) => i.status !== "failed" && isoDate(new Date(i.capturedAt)) === today)
  return { in: pending.find((i) => i.kind === "check-in"), out: pending.find((i) => i.kind === "check-out") }
}

/** Which step of the day the teacher is on, counting photos still waiting to upload. */
function stepOf(today: TeacherAttendanceRecord | null | undefined, queued: ReturnType<typeof queuedToday>): CaptureKind | "done" {
  if (!today?.check_in_at && !queued.in) return "in"
  if (!today?.check_out_at && !queued.out) return "out"
  return "done"
}

/** A teacher's own check-ins. Without internet, or when the request never reaches the server, the photo is queued on the device and uploaded as soon as the connection is back (by the app, or by the service worker if the app is closed). The Excel export follows the dates picked in the history filter. */
export default function MyAttendancePage() {
  const [capture, setCapture] = useState<CaptureKind | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const { user } = useAuth()
  const online = useOnline()
  const today = useQuery({ queryKey: ["teacher-attendance", "today"], queryFn: teacherAttendanceApi.today })
  const outbox = useOutbox()
  const queued = queuedToday(outbox.data)
  const step = stepOf(today.data, queued)

  const mutation = useApiMutation(
    async ({ kind, image, at }: { kind: CaptureKind; image: Blob; at: string }) => {
      const queue = async () => {
        await addToOutbox({ kind: kind === "in" ? "check-in" : "check-out", image, capturedAt: at, userId: user!.id })
        requestSync()
        return { message: QUEUED_MESSAGE, data: null }
      }
      if (!navigator.onLine && outboxSupported) return queue()
      try {
        return await (kind === "in" ? teacherAttendanceApi.checkIn(image, at) : teacherAttendanceApi.checkOut(image, at))
      } catch (err) {
        // No answer, or the server is down or busy: keep the photo and upload it later.
        if ((!(err instanceof ApiError) || isTransient(err.status)) && outboxSupported) return queue()
        throw err
      }
    },
    {
      invalidate: INVALIDATE,
      toastError: false,
      onError: (err) => setCaptureError(errorMessage(err)),
      onSuccess: () => setCapture(null),
    }
  )

  function openCapture(kind: CaptureKind) {
    setCaptureError(null)
    mutation.reset()
    setCapture(kind)
  }

  const url = useUrlState()
  const download = useMutation({
    mutationFn: () => reportsApi.download("my-attendance", { date_from: url.get("date_from"), date_to: url.get("date_to") }),
    onSuccess: () => toast.success("Attendance report downloaded."),
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <>
      <PageHeader
        title="My attendance"
        icon={CalendarCheck}
        description="Check in when you arrive and check out when you leave. Your school admin verifies each day."
        actions={
          <>
            <Button variant="outline" className="h-9" onClick={() => download.mutate()} disabled={download.isPending}>
              {download.isPending ? <LoaderCircle className="animate-spin" /> : <Download />}
              Download report
            </Button>
            {step !== "done" && !today.isLoading && (
              <Button onClick={() => openCapture(step)} className="h-9 shadow-md shadow-primary/20">
                {step === "in" ? <LogIn /> : <LogOut />}
                {step === "in" ? "Check in" : "Check out"}
              </Button>
            )}
          </>
        }
      />

      {!online && !outboxSupported && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <CloudOff className="size-4 shrink-0" /> You are offline and this browser cannot save photos for later. Check in once you are back online.
        </p>
      )}
      <QueuedCard items={outbox.data ?? []} />
      <TodayCard record={today.data} loading={today.isLoading} step={step} queued={queued} onCapture={openCapture} />
      <MonthStats />
      <History />

      <CameraCaptureDialog
        open={capture !== null}
        onOpenChange={(o) => !o && setCapture(null)}
        title={capture === "out" ? "Check out" : "Check in"}
        description={
          !online
            ? "You are offline. The photo is saved on this device with the time it was taken, uploaded when you are back online, and flagged for your admin to review."
            : capture === "out"
              ? "Take a photo as you leave school. The time is recorded by the server."
              : "Take a photo as you arrive at school. The time is recorded by the server."
        }
        submitLabel={!online ? "Save offline" : capture === "out" ? "Check out" : "Check in"}
        facingMode="user"
        faceGuide
        hint="Face the camera in good light and keep your face inside the oval."
        pending={mutation.isPending}
        error={captureError}
        onSubmit={(image, at) => capture && mutation.mutate({ kind: capture, image, at })}
      />
    </>
  )
}

/** Today's check-in steps, showing uploaded times first and otherwise the time a queued photo was taken. */
function TodayCard({
  record,
  loading,
  step,
  queued,
  onCapture,
}: {
  record: TeacherAttendanceRecord | null | undefined
  loading: boolean
  step: CaptureKind | "done"
  queued: ReturnType<typeof queuedToday>
  onCapture: (kind: CaptureKind) => void
}) {
  const inAt = record?.check_in_at ?? queued.in?.capturedAt ?? null
  const outAt = record?.check_out_at ?? queued.out?.capturedAt ?? null
  const waiting = (!record?.check_in_at && !!queued.in) || (!record?.check_out_at && !!queued.out)
  const headline = step === "in" ? "You have not checked in yet" : step === "out" ? `Checked in at ${formatTime(inAt)}` : "You are done for today"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Today</CardTitle>
        <CardDescription>{formatDate(isoDate())}</CardDescription>
        {record && (
          <CardAction>
            <TeacherStatusPill status={record.status} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_16rem]">
            <Skeleton className="aspect-[4/3] rounded-xl" />
            <Skeleton className="aspect-[4/3] rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_16rem]">
            <PhotoPanel src={record?.check_in_image ?? null} label="Check-in photo" capturedAt={record?.check_in_captured_at ?? null} />
            <PhotoPanel src={record?.check_out_image ?? null} label="Check-out photo" capturedAt={record?.check_out_captured_at ?? null} />
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {step === "done" ? <BadgeCheck className="size-5" /> : step === "out" ? <Timer className="size-5" /> : <Sun className="size-5" />}
              </span>
              <p className="font-semibold">{headline}</p>
              {waiting && (
                <Pill tone="amber" className="w-fit">
                  <CloudUpload className="size-3" /> Waiting to upload
                </Pill>
              )}
              {(record?.check_in_offline || record?.check_out_offline) && (
                <Pill tone="gray" className="w-fit">
                  <CloudOff className="size-3" /> Synced from offline
                </Pill>
              )}
              <dl className="grid gap-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Check-in</dt>
                  <dd className="tabular-nums">{inAt ? formatTime(inAt) : "-"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Check-out</dt>
                  <dd className="tabular-nums">{outAt ? formatTime(outAt) : "-"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Worked</dt>
                  <dd className="font-medium tabular-nums">{durationLabel(record?.worked_minutes)}</dd>
                </div>
                {record?.day_type && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Day type</dt>
                    <dd>
                      <DayTypePill value={record.day_type} overridden={record.day_type_overridden} />
                    </dd>
                  </div>
                )}
              </dl>
              {step !== "done" && (
                <Button onClick={() => onCapture(step)} className="mt-auto">
                  {step === "in" ? <LogIn /> : <LogOut />}
                  {step === "in" ? "Check in now" : "Check out now"}
                </Button>
              )}
              {record?.remarks && <p className="text-xs text-muted-foreground">Admin note: {record.remarks}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Photos taken offline: waiting to upload, or refused by the server with the reason. */
function QueuedCard({ items }: { items: OutboxItem[] }) {
  const queryClient = useQueryClient()
  const online = useOnline()
  const images = useMemo(() => items.map((i) => i.image), [items])
  const urls = useObjectUrls(images)

  if (!items.length) return null

  async function discard(id: number) {
    await removeFromOutbox(id)
    void queryClient.invalidateQueries({ queryKey: ["outbox"] })
  }

  return (
    <Card className="mb-6 border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <CloudUpload className="size-4 text-amber-600" /> Saved on this device
        </CardTitle>
        <CardDescription>
          {online
            ? "Uploading now. This list clears as each photo is accepted."
            : "These upload automatically when you are back online. Keep this app installed until then."}
        </CardDescription>
        {online && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={requestSync}>
              Retry now
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <img src={urls[i]} alt={`Offline ${item.kind} photo`} className="size-12 shrink-0 rounded-lg border object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {item.kind === "check-in" ? "Check-in" : "Check-out"} · {formatDate(isoDate(new Date(item.capturedAt)))}, {formatTime(item.capturedAt)}
                </p>
                {item.status === "failed" ? (
                  <p className="flex items-start gap-1 text-xs text-destructive">
                    <TriangleAlert className="mt-0.5 size-3 shrink-0" /> {item.error}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Waiting to upload</p>
                )}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => void discard(item.id)} aria-label="Discard this photo">
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/** The teacher's monthly totals; their summary holds just their own row. */
function MonthStats() {
  const params = { date_from: monthStart(), date_to: isoDate() }
  const query = useQuery({
    queryKey: ["teacher-attendance-summary", params],
    queryFn: () => teacherAttendanceApi.summary(params),
  })
  const row = query.data?.teachers[0]
  const stats = [
    { label: "Hours this month", value: row ? `${formatNumber(row.total_working_hours)}h` : "0h", icon: Clock, hint: "Verified and pending days" },
    { label: "Full days", value: row?.total_full_days ?? 0, icon: CalendarCheck, hint: "This month" },
    { label: "Half days", value: row?.total_half_days ?? 0, icon: CalendarClock, hint: "This month" },
    { label: "Awaiting review", value: row?.pending_verification ?? 0, icon: BadgeCheck, hint: "Days your admin has not verified yet" },
  ]
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s, i) => (
        <StatCard key={s.label} {...s} index={i} loading={query.isLoading} />
      ))}
    </div>
  )
}

function History() {
  const url = useUrlState()
  const params = {
    page: url.page,
    page_size: url.pageSize,
    status: url.get("status"),
    date_from: url.get("date_from"),
    date_to: url.get("date_to"),
  }
  const query = useQuery({
    queryKey: ["teacher-attendance", params],
    queryFn: () => teacherAttendanceApi.list(params),
    placeholderData: keepPreviousData,
  })

  const columns: Column<TeacherAttendanceRecord>[] = [
    { key: "date", header: "Date", cell: (r) => <span className="text-sm font-medium whitespace-nowrap">{formatDate(r.date)}</span> },
    {
      key: "in",
      header: "Check-in",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <PhotoThumb src={r.check_in_image} label={`Check-in photo, ${formatDate(r.date)}`} />
          <span className="text-sm whitespace-nowrap tabular-nums">{r.check_in_at ? formatTime(r.check_in_at) : "-"}</span>
        </div>
      ),
    },
    {
      key: "out",
      header: "Check-out",
      hideBelow: "sm",
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <PhotoThumb src={r.check_out_image} label={`Check-out photo, ${formatDate(r.date)}`} />
          <span className="text-sm whitespace-nowrap tabular-nums">{r.check_out_at ? formatTime(r.check_out_at) : "Not yet"}</span>
        </div>
      ),
    },
    { key: "worked", header: "Worked", hideBelow: "md", cell: (r) => <span className="text-sm font-medium tabular-nums">{durationLabel(r.worked_minutes)}</span> },
    { key: "day", header: "Day type", hideBelow: "lg", cell: (r) => <DayTypePill value={r.day_type} overridden={r.day_type_overridden} /> },
    { key: "status", header: "Status", cell: (r) => <TeacherStatusPill status={r.status} /> },
    { key: "verified_by", header: "Verified by", hideBelow: "xl", cell: (r) => <span className="text-xs text-muted-foreground">{r.verified_by_name ?? "-"}</span> },
  ]

  const filtered = !!(params.status || params.date_from || params.date_to)

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-semibold">History</h2>
      <Panel
        toolbar={
          <>
            <FilterSelect
              label="Status"
              value={params.status}
              onChange={(v) => url.set({ status: v })}
              allLabel="Any status"
              options={[
                { value: "DRAFT", label: "Awaiting review" },
                { value: "VERIFIED", label: "Verified" },
              ]}
            />
            <Input
              type="date"
              value={params.date_from}
              max={params.date_to || isoDate()}
              onChange={(e) => url.set({ date_from: e.target.value })}
              aria-label="From date"
              className="h-9 w-full sm:w-40"
            />
            <Input
              type="date"
              value={params.date_to}
              min={params.date_from || undefined}
              max={isoDate()}
              onChange={(e) => url.set({ date_to: e.target.value })}
              aria-label="To date"
              className="h-9 w-full sm:w-40"
            />
            <ClearFiltersButton show={filtered} onClick={() => url.set({ status: null, date_from: null, date_to: null })} />
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
          empty={
            <EmptyState
              icon={CalendarClock}
              title={filtered ? "No days match these filters" : "No attendance yet"}
              description={filtered ? "Try a different date range or clear the filters." : "Your check-ins appear here, day by day."}
            />
          }
        />
      </Panel>
    </div>
  )
}
