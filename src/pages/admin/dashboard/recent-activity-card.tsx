import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Activity, ArrowRight } from "lucide-react"

import { EmptyState } from "@/components/admin/states"
import { Pill } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { systemApi } from "@/lib/endpoints"
import { ROLE_LABEL, timeAgo } from "@/lib/format"
import { panelPath } from "@/lib/panel"
import type { Role } from "@/lib/types"

/** Super Admins get a glance at the newest platform activity; the full log lives under System. */
export function RecentActivityCard() {
  const logs = useQuery({
    queryKey: ["activity-logs", "recent"],
    queryFn: () => systemApi.logs({ page_size: 5 }),
    refetchInterval: 30_000,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Recent activity</CardTitle>
        <CardDescription>Latest changes and sign-ins across the platform</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to={panelPath("/admin/logs")}>
              View all <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {logs.isLoading ? (
          <div className="grid gap-3 px-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : logs.data?.results.length ? (
          <ul className="divide-y">
            {logs.data.results.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Activity className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.action}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[l.actor_name || l.actor_identifier || "Anonymous", l.actor_role ? ROLE_LABEL[l.actor_role as Role] : null, timeAgo(l.created_at)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Pill tone={l.succeeded ? "green" : "red"} dot>
                  {l.succeeded ? "Done" : "Failed"}
                </Pill>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Activity} title="No activity yet" />
        )}
      </CardContent>
    </Card>
  )
}
