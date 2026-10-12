import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Activity, CircleCheck, CircleX, Globe, Monitor, ScrollText, Timer } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState } from "@/components/admin/states"
import { ClearFiltersButton, DetailRow, FilterSelect, Panel, Pill, SearchInput, type Tone } from "@/components/admin/ui-bits"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUrlState } from "@/hooks/use-url-state"
import { systemApi, type ActivityLog } from "@/lib/endpoints"
import { formatDateTime, isoDate, ROLE_LABEL, timeAgo } from "@/lib/format"
import type { Role } from "@/lib/types"

const CATEGORIES = [
  { value: "auth", label: "Sign-ins" },
  { value: "users", label: "User accounts" },
  { value: "account", label: "Own profile" },
  { value: "schools", label: "Schools" },
  { value: "academics", label: "Academics" },
  { value: "teachers", label: "Teachers" },
  { value: "students", label: "Students" },
  { value: "parents", label: "Parents" },
  { value: "attendance", label: "Student attendance" },
  { value: "teacher-attendance", label: "Teacher attendance" },
  { value: "notifications", label: "Notices" },
  { value: "reports", label: "Report downloads" },
  { value: "system", label: "System" },
]

const METHOD_TONE: Record<string, Tone> = { POST: "green", PUT: "amber", PATCH: "amber", DELETE: "red", GET: "gray" }
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => ({ value: m, label: m }))

/** Super Admins see who did what across the platform: changes, sign-ins and data downloads. The list refreshes every 30 seconds to keep the newest activity coming in. */
export default function LogsPage() {
  const url = useUrlState()
  const [open, setOpen] = useState<ActivityLog | null>(null)

  const params = {
    page: url.page,
    page_size: url.pageSize,
    search: url.get("search"),
    role: url.get("role"),
    category: url.get("category"),
    outcome: url.get("outcome"),
    method: url.get("method"),
    date_from: url.get("date_from"),
    date_to: url.get("date_to"),
  }
  const query = useQuery({
    queryKey: ["activity-logs", params],
    queryFn: () => systemApi.logs(params),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
  const filtered = !!(params.search || params.role || params.category || params.outcome || params.method || params.date_from || params.date_to)

  const columns: Column<ActivityLog>[] = [
    {
      key: "when",
      header: "When",
      cell: (l) => (
        <div className="text-sm whitespace-nowrap">
          <p className="font-medium">{timeAgo(l.created_at)}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</p>
        </div>
      ),
    },
    {
      key: "who",
      header: "Who",
      cell: (l) => (
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{l.actor_name || l.actor_identifier || "Anonymous"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[l.actor_role ? ROLE_LABEL[l.actor_role as Role] : null, l.school_name].filter(Boolean).join(" · ") || "Not signed in"}
          </p>
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      cell: (l) => (
        <Pill tone={METHOD_TONE[l.method] ?? "gray"} className="font-mono">
          {l.method}
        </Pill>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (l) => (
        <div className="min-w-0 text-sm">
          <p className="font-medium">{l.action}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{l.path}</p>
        </div>
      ),
    },
    {
      key: "result",
      header: "Result",
      cell: (l) => (
        <Pill tone={l.succeeded ? "green" : "red"} dot>
          {l.succeeded ? "Done" : l.status_code === 429 ? "Rate limited" : "Failed"} · {l.status_code}
        </Pill>
      ),
    },
    { key: "ip", header: "IP address", hideBelow: "lg", cell: (l) => <span className="font-mono text-xs">{l.ip_address || "-"}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Activity logs"
        icon={ScrollText}
        description="Every change, sign-in and report download across the platform. Kept for 90 days."
      />

      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search person, school, action or IP" />
            <FilterSelect
              label="Role"
              value={params.role}
              onChange={(v) => url.set({ role: v })}
              allLabel="All roles"
              options={(Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />
            <FilterSelect label="Area" value={params.category} onChange={(v) => url.set({ category: v })} allLabel="All areas" options={CATEGORIES} />
            <FilterSelect label="Method" value={params.method} onChange={(v) => url.set({ method: v })} allLabel="All methods" className="sm:w-36" options={METHODS} />
            <FilterSelect
              label="Result"
              value={params.outcome}
              onChange={(v) => url.set({ outcome: v })}
              allLabel="Any result"
              className="sm:w-36"
              options={[
                { value: "success", label: "Succeeded" },
                { value: "failed", label: "Failed" },
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
              onClick={() => url.set({ search: null, role: null, category: null, outcome: null, method: null, date_from: null, date_to: null })}
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
          rowKey={(l) => l.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={setOpen}
          empty={
            <EmptyState
              icon={Activity}
              title={filtered ? "No matching activity" : "No activity yet"}
              description={filtered ? "Try other filters." : "Changes, sign-ins and report downloads appear here as they happen."}
            />
          }
        />
      </Panel>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.action}</SheetTitle>
                <SheetDescription>{formatDateTime(open.created_at)}</SheetDescription>
              </SheetHeader>
              <div className="grid gap-1 px-4 pb-6">
                <Pill tone={open.succeeded ? "green" : "red"} dot className="justify-self-start">
                  {open.succeeded ? "Succeeded" : "Failed"} · HTTP {open.status_code}
                </Pill>
                <div className="mt-2 divide-y rounded-xl border px-3">
                  <DetailRow label="Person">{open.actor_name || "Not signed in"}</DetailRow>
                  <DetailRow label="Email or mobile">{open.actor_identifier || "-"}</DetailRow>
                  <DetailRow label="Role">{open.actor_role ? ROLE_LABEL[open.actor_role as Role] : "-"}</DetailRow>
                  <DetailRow label="School">{open.school_name || "-"}</DetailRow>
                </div>
                <div className="mt-3 divide-y rounded-xl border px-3">
                  <DetailRow icon={Activity} label="Request">
                    <span className="font-mono text-xs break-all">
                      <Pill tone={METHOD_TONE[open.method] ?? "gray"}>{open.method}</Pill> {open.path}
                    </span>
                  </DetailRow>
                  <DetailRow icon={open.succeeded ? CircleCheck : CircleX} label="Response">
                    HTTP {open.status_code}
                  </DetailRow>
                  <DetailRow icon={Timer} label="Took">
                    {open.duration_ms} ms
                  </DetailRow>
                  <DetailRow icon={Globe} label="IP address">
                    <span className="font-mono">{open.ip_address || "-"}</span>
                  </DetailRow>
                  <DetailRow icon={Monitor} label="Device">
                    <span className="text-xs break-words">{open.user_agent || "-"}</span>
                  </DetailRow>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
