import { useState } from "react"
import { useNavigate, useParams } from "react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CalendarClock, CheckCheck, Clock, School, Trash2, UserRound, Users } from "lucide-react"
import { motion } from "motion/react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState, ErrorState } from "@/components/admin/states"
import { DetailRow, FilterSelect, Panel, PersonCell, Pill, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { notificationsApi } from "@/lib/endpoints"
import { formatDateTime, ROLE_LABEL, timeAgo } from "@/lib/format"
import type { Recipient, Role } from "@/lib/types"
import { AttachmentList, AudiencePills } from "./shared"
import { panelPath } from "@/lib/panel"

export default function NotificationDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [filters, setFilters] = useState({ page: 1, page_size: 20, search: "", is_read: "", role: "" })

  const { data: n, error, refetch, isLoading } = useQuery({
    queryKey: ["notification", id],
    queryFn: () => notificationsApi.get(id),
  })
  const recipients = useQuery({
    queryKey: ["notification", id, "recipients", filters],
    queryFn: () => notificationsApi.recipients(id, filters),
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useApiMutation(() => notificationsApi.remove(id), {
    invalidate: [["notifications"], ["inbox"]],
    onSuccess: () => navigate(panelPath("/admin/notifications"), { replace: true }),
  })

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (isLoading || !n) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    )
  }

  const readPct = n.recipient_count ? Math.round(((n.read_count ?? 0) / n.recipient_count) * 100) : 0
  const setFilter = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, page: 1, ...patch }))

  const columns: Column<Recipient>[] = [
    { key: "user", header: "Recipient", cell: (r) => <PersonCell name={r.user.name} sub={r.user.email ?? r.user.phone_number} /> },
    { key: "role", header: "Role", hideBelow: "sm", cell: (r) => <Pill tone="gray">{ROLE_LABEL[r.user.role]}</Pill> },
    {
      key: "status",
      header: "Status",
      cell: (r) =>
        r.is_read ? (
          <Pill tone="green">
            <CheckCheck className="size-3" /> Read
          </Pill>
        ) : (
          <Pill tone="amber">
            <Clock className="size-3" /> Unread
          </Pill>
        ),
    },
    { key: "read_at", header: "Read at", hideBelow: "md", cell: (r) => <span className="text-sm text-muted-foreground">{r.read_at ? formatDateTime(r.read_at) : "-"}</span> },
  ]

  return (
    <>
      <PageHeader
        title={n.title}
        seoTitle="Notification"
        description={`Sent ${timeAgo(n.created_at)} to ${n.recipient_count} recipient(s)`}
        backTo={panelPath("/admin/notifications")}
        actions={
          <Button variant="destructive" className="h-9" onClick={() => setDeleteOpen(true)}>
            <Trash2 /> Delete for everyone
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="font-semibold">Message</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="text-sm leading-relaxed whitespace-pre-line">{n.message || <span className="text-muted-foreground">No message text.</span>}</p>
            <AttachmentList attachments={n.attachments} />
            <div className="grid gap-x-8 border-t pt-2 sm:grid-cols-2">
              <DetailRow label="Sent by" icon={UserRound}>
                {n.sender_name} ({ROLE_LABEL[n.sender_role]})
              </DetailRow>
              <DetailRow label="Sent at" icon={CalendarClock}>
                {formatDateTime(n.created_at)}
              </DetailRow>
              <DetailRow label="School" icon={School}>
                {n.school_name ?? "All schools"}
              </DetailRow>
              <DetailRow label="Audience" icon={Users}>
                <AudiencePills n={n} />
              </DetailRow>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-semibold">Read receipts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold tabular-nums">{readPct}%</p>
              <p className="pb-1 text-sm text-muted-foreground">
                {n.read_count ?? 0} of {n.recipient_count} have read it
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <motion.div initial={{ width: 0 }} animate={{ width: `${readPct}%` }} transition={{ duration: 0.9, ease: "easeOut" }} className="h-full rounded-full bg-primary" />
            </div>
            <ul className="grid gap-3">
              {(n.read_summary ?? []).map((row, i) => {
                const pct = row.total ? Math.round((row.seen / row.total) * 100) : 0
                return (
                  <li key={row.role}>
                    <button
                      type="button"
                      onClick={() => setFilter({ role: filters.role === row.role ? "" : row.role })}
                      className="w-full rounded-xl border p-3 text-left transition-colors hover:border-primary/40 data-[on=true]:border-primary data-[on=true]:bg-primary/5"
                      data-on={filters.role === row.role}
                    >
                      <span className="flex items-center justify-between text-sm">
                        <span className="font-medium">{ROLE_LABEL[row.role as Role] ?? row.role}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {row.seen}/{row.total}
                        </span>
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.1 * i }}
                          className="block h-full rounded-full bg-foreground"
                        />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Recipients</h2>
      <Panel
        toolbar={
          <>
            <SearchInput value={filters.search} onChange={(v) => setFilter({ search: v })} placeholder="Search recipients" />
            <FilterSelect
              label="Read status"
              value={filters.is_read}
              onChange={(v) => setFilter({ is_read: v })}
              allLabel="Read and unread"
              options={[
                { value: "true", label: "Read" },
                { value: "false", label: "Unread" },
              ]}
            />
            <FilterSelect
              label="Role"
              value={filters.role}
              onChange={(v) => setFilter({ role: v })}
              allLabel="All roles"
              options={(["SCHOOL_ADMIN", "TEACHER", "PARENT"] as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />
          </>
        }
        footer={
          recipients.data && (
            <Pagination
              count={recipients.data.count}
              page={filters.page}
              pageSize={filters.page_size}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
              onPageSizeChange={(page_size) => setFilter({ page_size })}
            />
          )
        }
      >
        <DataTable
          columns={columns}
          rows={recipients.data?.results}
          rowKey={(r) => r.user.id}
          loading={recipients.isFetching}
          error={recipients.error}
          onRetry={recipients.refetch}
          empty={<EmptyState icon={Users} title="No recipients match" description="Try different filters." />}
        />
      </Panel>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        destructive
        icon={Trash2}
        title="Delete this notification?"
        description="It will be removed from every recipient's inbox. This cannot be undone."
        confirmLabel="Delete for everyone"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  )
}
