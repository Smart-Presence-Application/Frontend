import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  CalendarCheck,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  GraduationCap,
  LoaderCircle,
  Presentation,
  School,
  ScrollText,
  Timer,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { PageHeader } from "@/components/admin/page-header"
import { ClassSectionSelect, SchoolPicker } from "@/components/admin/pickers"
import { EmptyState, ErrorState } from "@/components/admin/states"
import { ClearFiltersButton, FilterSelect, Panel } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { usePanel } from "@/context/panel"
import { useUrlState } from "@/hooks/use-url-state"
import { errorMessage, type QueryParams } from "@/lib/api"
import { reportsApi } from "@/lib/endpoints"
import { isoDate } from "@/lib/format"
import type { ReportFilter, ReportInfo } from "@/lib/types"

const ICONS: Record<string, LucideIcon> = {
  students: GraduationCap,
  parents: UsersRound,
  "student-attendance": ClipboardCheck,
  teachers: Presentation,
  "teacher-attendance": Timer,
  schools: School,
  users: Users,
  "activity-logs": ScrollText,
  "my-attendance": CalendarCheck,
}

/** Filters a report may take beyond the shared ones in the toolbar, shown on its own card. */
const EXTRA_FILTERS: Partial<Record<ReportFilter, { label: string; allLabel: string; options: { value: string; label: string }[] }>> = {
  status: {
    label: "Attendance",
    allLabel: "Present and absent",
    options: [
      { value: "PRESENT", label: "Present only" },
      { value: "ABSENT", label: "Absent only" },
    ],
  },
  session_status: {
    label: "State",
    allLabel: "Draft and locked",
    options: [
      { value: "LOCKED", label: "Locked only" },
      { value: "DRAFT", label: "Drafts only" },
    ],
  },
  verification: {
    label: "Verification",
    allLabel: "Verified and pending",
    options: [
      { value: "VERIFIED", label: "Verified only" },
      { value: "DRAFT", label: "Pending only" },
    ],
  },
  day_type: {
    label: "Day type",
    allLabel: "Any day type",
    options: [
      { value: "FULL_DAY", label: "Full days" },
      { value: "HALF_DAY", label: "Half days" },
      { value: "ABSENT", label: "Absent" },
    ],
  },
  school_status: {
    label: "School status",
    allLabel: "Active and inactive",
    options: [
      { value: "ACTIVE", label: "Active only" },
      { value: "INACTIVE", label: "Inactive only" },
    ],
  },
  role: {
    label: "Role",
    allLabel: "Every role",
    options: [
      { value: "SUPER_ADMIN", label: "Super admins" },
      { value: "SCHOOL_ADMIN", label: "School admins" },
      { value: "TEACHER", label: "Teachers" },
      { value: "PARENT", label: "Parents" },
    ],
  },
  is_active: {
    label: "Account",
    allLabel: "Active and inactive",
    options: [
      { value: "true", label: "Active only" },
      { value: "false", label: "Inactive only" },
    ],
  },
}

/** Report downloads. Each report gets the shared filters it understands plus its own. The school (and a teacher's class) are pinned in scoped panels, so they do not count as active filters there. */
export default function ReportsPage() {
  const url = useUrlState()
  const { kind } = usePanel()
  const reports = useQuery({ queryKey: ["reports"], queryFn: reportsApi.list })

  const school = Number(url.get("school")) || null
  const shared: Record<string, string | number | null> = {
    school,
    class_section: Number(url.get("class_section")) || null,
    date_from: url.get("date_from"),
    date_to: url.get("date_to"),
  }
  const filtered = !!(shared.date_from || shared.date_to || (kind === "super" && school) || (kind !== "teacher" && shared.class_section))

  const paramsFor = (report: ReportInfo, extras: Record<string, string> = {}): QueryParams => {
    const params: QueryParams = {}
    for (const filter of report.filters) {
      const value = extras[filter] ?? shared[filter]
      if (value) params[filter] = value
    }
    return params
  }

  const downloadAll = useMutation({
    mutationFn: () => {
      const params: QueryParams = {}
      for (const [key, value] of Object.entries(shared)) if (value) params[key] = value
      return reportsApi.download("all", params)
    },
    onSuccess: () => toast.success("Workbook downloaded."),
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <>
      <PageHeader
        title="Reports"
        icon={FileSpreadsheet}
        description="Download your data as Excel workbooks. Filters narrow each download; you only ever get what you can see in the app."
        actions={
          (reports.data?.length ?? 0) > 1 && (
            <Button className="h-9 shadow-md shadow-primary/20" onClick={() => downloadAll.mutate()} disabled={downloadAll.isPending}>
              {downloadAll.isPending ? <LoaderCircle className="animate-spin" /> : <Download />}
              Download everything
            </Button>
          )
        }
      />

      <Panel
        className="mb-6"
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
              value={Number(url.get("class_section")) || null}
              onChange={(v) => url.set({ class_section: v })}
              allowAll
              className="sm:w-52"
            />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Input
                type="date"
                aria-label="From date"
                title="From date"
                value={url.get("date_from")}
                max={url.get("date_to") || isoDate()}
                onChange={(e) => url.set({ date_from: e.target.value })}
                className="h-9 sm:w-38"
              />
              <Input
                type="date"
                aria-label="To date"
                title="To date"
                value={url.get("date_to")}
                min={url.get("date_from") || undefined}
                onChange={(e) => url.set({ date_to: e.target.value })}
                className="h-9 sm:w-38"
              />
            </div>
            <ClearFiltersButton show={filtered} onClick={() => url.set({ school: null, class_section: null, date_from: null, date_to: null })} />
          </>
        }
      >
        <p className="px-4 py-3 text-xs text-muted-foreground">
          School and class apply to every report that has them; the date range applies to attendance reports.
        </p>
      </Panel>

      {reports.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : reports.error ? (
        <ErrorState error={reports.error} onRetry={reports.refetch} />
      ) : reports.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.data.map((report, i) => (
            <ReportCard key={report.key} report={report} index={i} paramsFor={paramsFor} />
          ))}
        </div>
      ) : (
        <EmptyState icon={FileSpreadsheet} title="No reports available" description="Your account has no reports to download." />
      )}
    </>
  )
}

function ReportCard({
  report,
  index,
  paramsFor,
}: {
  report: ReportInfo
  index: number
  paramsFor: (report: ReportInfo, extras?: Record<string, string>) => QueryParams
}) {
  const [extras, setExtras] = useState<Record<string, string>>({})
  const Icon = ICONS[report.key] ?? FileSpreadsheet
  const extraFilters = report.filters.filter((f) => EXTRA_FILTERS[f])
  const usesDates = report.filters.includes("date_from")

  const download = useMutation({
    mutationFn: () => reportsApi.download(report.key, paramsFor(report, extras)),
    onSuccess: () => toast.success(`${report.title} downloaded.`),
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{report.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{report.description}</p>
        </div>
      </div>

      {extraFilters.length > 0 && (
        <div className="mt-4 grid gap-2">
          {extraFilters.map((filter) => {
            const spec = EXTRA_FILTERS[filter]!
            return (
              <FilterSelect
                key={filter}
                label={spec.label}
                value={extras[filter] ?? ""}
                onChange={(v) => setExtras((prev) => ({ ...prev, [filter]: v }))}
                allLabel={spec.allLabel}
                options={spec.options}
                className="sm:w-full"
              />
            )
          })}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="text-xs text-muted-foreground">{usesDates ? "Uses the date range" : "Excel (.xlsx)"}</span>
        <Button variant="outline" size="sm" onClick={() => download.mutate()} disabled={download.isPending}>
          {download.isPending ? <LoaderCircle className="animate-spin" /> : <Download />}
          Download
        </Button>
      </div>
    </motion.div>
  )
}
