import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Bell, Eye, MoreHorizontal, Send, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState } from "@/components/admin/states"
import { Panel, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useUrlState } from "@/hooks/use-url-state"
import { notificationsApi } from "@/lib/endpoints"
import { ROLE_LABEL, timeAgo } from "@/lib/format"
import type { SentNotification } from "@/lib/types"
import { AttachmentCount, AudiencePills, ReadProgress } from "./shared"
import { panelPath } from "@/lib/panel"
import { usePanel } from "@/context/panel"

export default function NotificationsPage() {
  const isTeacher = usePanel().kind === "teacher"
  const navigate = useNavigate()
  const url = useUrlState()
  const [deleteTarget, setDeleteTarget] = useState<SentNotification | null>(null)

  const params = { page: url.page, page_size: url.pageSize, search: url.get("search") }
  const query = useQuery({
    queryKey: ["notifications", params],
    queryFn: () => notificationsApi.list(params),
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useApiMutation((id: number) => notificationsApi.remove(id), {
    invalidate: [["notifications"], ["inbox"]],
    onSuccess: () => setDeleteTarget(null),
  })

  const columns: Column<SentNotification>[] = [
    {
      key: "title",
      header: "Notification",
      className: "max-w-0 w-full",
      cell: (n) => (
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{n.title}</span>
            <AttachmentCount count={n.attachments.length} />
          </p>
          <p className="truncate text-xs text-muted-foreground">{n.message || "No message, attachments only"}</p>
        </div>
      ),
    },
    { key: "audience", header: "Audience", hideBelow: "lg", cell: (n) => <AudiencePills n={n} /> },
    {
      key: "sender",
      header: "Sent by",
      hideBelow: "md",
      cell: (n) => (
        <div className="text-sm">
          <p className="truncate">{n.sender_name ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABEL[n.sender_role] ?? n.sender_role}{n.school_name && ` · ${n.school_name}`}</p>
        </div>
      ),
    },
    { key: "reads", header: "Read", hideBelow: "sm", cell: (n) => <ReadProgress read={n.read_count} total={n.recipient_count} /> },
    { key: "when", header: "Sent", hideBelow: "md", cell: (n) => <span className="text-sm whitespace-nowrap text-muted-foreground">{timeAgo(n.created_at)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12 text-right",
      cell: (n) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${n.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => navigate(panelPath(`/admin/notifications/${n.id}`))}>
              <Eye /> View details
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(n)}>
              <Trash2 /> Delete for everyone
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={isTeacher ? "Notify parents" : "Notifications"}
        icon={Bell}
        description={
          isTeacher
            ? "Announcements you sent to the parents of your class, with read tracking."
            : "Announcements sent to school admins, teachers and parents, with read tracking."
        }
        actions={
          <Button asChild className="h-9 shadow-md shadow-primary/20">
            <Link to={panelPath("/admin/notifications/new")}>
              <Send /> Compose
            </Link>
          </Button>
        }
      />

      <Panel
        toolbar={<SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search notifications" />}
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
          rowKey={(n) => n.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={(n) => navigate(panelPath(`/admin/notifications/${n.id}`))}
          empty={
            <EmptyState
              icon={Bell}
              title={params.search ? "No notifications match" : "Nothing sent yet"}
              description={params.search ? "Try a different search." : "Compose your first announcement."}
              action={
                !params.search && (
                  <Button asChild>
                    <Link to={panelPath("/admin/notifications/new")}>
                      <Send /> Compose
                    </Link>
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
        title="Delete this notification?"
        description={`"${deleteTarget?.title}" will be removed from every recipient's inbox.`}
        confirmLabel="Delete for everyone"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  )
}
