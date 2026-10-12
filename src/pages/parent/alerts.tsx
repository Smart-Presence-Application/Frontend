import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { BellRing, CheckCheck, MailOpen } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState, ErrorState } from "@/components/admin/states"
import { Panel } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useUrlState } from "@/hooks/use-url-state"
import { parentPortalApi } from "@/lib/endpoints"
import { AlertRow } from "./bits"

const INVALIDATE = [["parent-alerts"]]

/** A parent's attendance alerts. Reading one is quiet: no toast, just the dot and badge going away. */
export default function AttendanceAlertsPage() {
  const url = useUrlState()
  const params = { page: url.page, page_size: url.pageSize, is_read: url.get("is_read") }
  const query = useQuery({
    queryKey: ["parent-alerts", "list", params],
    queryFn: () => parentPortalApi.alerts(params),
    placeholderData: keepPreviousData,
  })
  const unread = useQuery({ queryKey: ["parent-alerts", "unread"], queryFn: () => parentPortalApi.alertsUnread().then((d) => d.unread) })

  const markAll = useApiMutation(() => parentPortalApi.markAlertsRead(), { invalidate: INVALIDATE })
  const markOne = useApiMutation((id: number) => parentPortalApi.markAlertsRead([id]), { invalidate: INVALIDATE, toastSuccess: false })

  return (
    <>
      <PageHeader
        title="Attendance alerts"
        icon={BellRing}
        description="A message each time your child's class attendance is confirmed by the school."
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
                {!!unread.data && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{unread.data}</span>}
              </TabsTrigger>
              <TabsTrigger value="true">Read</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        footer={
          query.data &&
          query.data.count > 0 && <Pagination count={query.data.count} page={url.page} pageSize={url.pageSize} onPageChange={(page) => url.set({ page })} />
        }
      >
        {query.error && !query.data ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : !query.data ? (
          <div className="grid gap-px">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex gap-3 p-4">
                <Skeleton className="size-10 rounded-xl" />
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
            title={params.is_read === "false" ? "You are all caught up" : "No alerts yet"}
            description="You get an alert each time the class teacher locks the day's attendance."
          />
        ) : (
          <ul className="divide-y">
            <AnimatePresence initial={false}>
              {query.data.results.map((a, i) => (
                <motion.li key={a.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                  <AlertRow alert={a} onRead={() => !a.is_read && markOne.mutate(a.id)} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>
    </>
  )
}
