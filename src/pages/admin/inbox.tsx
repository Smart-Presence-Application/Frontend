import { useState } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCheck, Inbox, Mail, MailOpen, Paperclip } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState, ErrorState } from "@/components/admin/states"
import { Panel, PersonAvatar } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useUrlState } from "@/hooks/use-url-state"
import { inboxApi } from "@/lib/endpoints"
import { formatDateTime, ROLE_LABEL, timeAgo } from "@/lib/format"
import type { InboxItem } from "@/lib/types"
import { cn } from "@/lib/utils"
import { AttachmentList } from "./notifications/shared"
import { usePanel } from "@/context/panel"

/** Received notifications. Opening a message marks it read on the server, so the list and badge are refreshed afterwards. */
export default function InboxPage() {
  const url = useUrlState()
  const queryClient = useQueryClient()
  const [openId, setOpenId] = useState<number | null>(null)
  const isParent = usePanel().kind === "parent"

  const params = { page: url.page, page_size: url.pageSize, is_read: url.get("is_read") }
  const query = useQuery({ queryKey: ["inbox", "list", params], queryFn: () => inboxApi.list(params), placeholderData: keepPreviousData })
  const unread = useQuery({ queryKey: ["inbox", "unread"], queryFn: () => inboxApi.unreadCount().then((d) => d.unread) })

  const detail = useQuery({
    queryKey: ["inbox", "item", openId],
    queryFn: async () => {
      const item = await inboxApi.get(openId!)
      queryClient.invalidateQueries({ queryKey: ["inbox", "list"] })
      queryClient.invalidateQueries({ queryKey: ["inbox", "unread"] })
      return item
    },
    enabled: openId !== null,
  })

  const markAll = useApiMutation(() => inboxApi.markRead(), { invalidate: [["inbox"]] })

  return (
    <>
      <PageHeader
        title={isParent ? "School notices" : "Inbox"}
        icon={Inbox}
        description={isParent ? "Announcements from your children's school and class teachers." : "Notifications sent to you."}
        actions={
          <Button variant="outline" className="h-9" onClick={() => markAll.mutate()} disabled={!unread.data || markAll.isPending}>
            <CheckCheck /> Mark all as read
          </Button>
        }
      />

      <Panel
        toolbar={
          <Tabs value={params.is_read || "all"} onValueChange={(v) => url.set({ is_read: v === "all" ? null : v })}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="false" className="gap-1.5">
                Unread
                {!!unread.data && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{unread.data}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="true">Read</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        footer={
          query.data && query.data.count > 0 && (
            <Pagination count={query.data.count} page={url.page} pageSize={url.pageSize} onPageChange={(page) => url.set({ page })} />
          )
        }
      >
        {query.error && !query.data ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : !query.data ? (
          <div className="grid gap-px">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex gap-3 p-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : query.data.results.length === 0 ? (
          <EmptyState
            icon={MailOpen}
            title={params.is_read === "false" ? "You are all caught up" : "Your inbox is empty"}
            description="New notifications will appear here."
          />
        ) : (
          <ul className="divide-y">
            <AnimatePresence initial={false}>
              {query.data.results.map((item, i) => (
                <motion.li key={item.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <InboxRow item={item} onOpen={() => setOpenId(item.id)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>

      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          {detail.data ? (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 text-lg">{detail.data.title}</DialogTitle>
                <DialogDescription>
                  From {detail.data.sender_name ?? "SmartPresence"} ({ROLE_LABEL[detail.data.sender_role]})
                  {detail.data.school_name && `, ${detail.data.school_name}`} on {formatDateTime(detail.data.created_at)}
                </DialogDescription>
              </DialogHeader>
              {detail.data.message && <p className="text-sm leading-relaxed whitespace-pre-line">{detail.data.message}</p>}
              <AttachmentList attachments={detail.data.attachments} />
            </>
          ) : detail.error ? (
            <ErrorState error={detail.error} onRetry={detail.refetch} />
          ) : (
            <div className="grid gap-3">
              <DialogTitle className="sr-only">Loading notification</DialogTitle>
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function InboxRow({ item, onOpen }: { item: InboxItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn("flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50", !item.is_read && "bg-primary/[0.03]")}
    >
      <div className="relative">
        <PersonAvatar name={item.sender_name ?? "SmartPresence"} className="size-10" />
        {!item.is_read && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary ring-2 ring-card" aria-label="Unread" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn("truncate text-sm", !item.is_read ? "font-semibold" : "font-medium text-muted-foreground")}>{item.title}</p>
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(item.created_at)}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {item.sender_name} · {ROLE_LABEL[item.sender_role]}
          {item.school_name && ` · ${item.school_name}`}
        </p>
        {item.message && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.message}</p>}
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          {item.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3" /> {item.attachments.length}
            </span>
          )}
          {item.is_read ? (
            <span className="inline-flex items-center gap-1">
              <MailOpen className="size-3" /> Read
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-primary">
              <Mail className="size-3" /> New
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
