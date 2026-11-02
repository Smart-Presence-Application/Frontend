import { useQuery } from "@tanstack/react-query"
import { Activity, BrainCircuit, CheckCircle2, CircleAlert, CircleHelp, Construction, Database, LoaderCircle, RefreshCw, Server, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"

import { Seo } from "@/components/common/seo"
import { Button } from "@/components/ui/button"
import { systemApi, type ServiceCheck, type ServicesStatus } from "@/lib/endpoints"
import { formatDateTime, timeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"

const SERVICES: { key: keyof ServicesStatus["services"]; name: string; text: string; icon: LucideIcon }[] = [
  { key: "backend", name: "Backend service", text: "The API behind the website, the apps and every portal.", icon: Server },
  { key: "postgres", name: "Database", text: "Schools, people, attendance, notices and reports.", icon: Database },
  { key: "ai_service", name: "AI service", text: "Face recognition for classroom attendance and teacher check-in.", icon: BrainCircuit },
]

type State = "up" | "down" | "unknown"

function stateOf(check?: ServiceCheck): State {
  if (!check || check.ok === null) return "unknown"
  return check.ok ? "up" : "down"
}

const STATE_UI: Record<State, { label: string; icon: LucideIcon; tone: string; dot: string }> = {
  up: { label: "Operational", icon: CheckCircle2, tone: "text-primary", dot: "bg-primary" },
  down: { label: "Outage", icon: CircleAlert, tone: "text-destructive", dot: "bg-destructive" },
  unknown: { label: "Unknown", icon: CircleHelp, tone: "text-muted-foreground", dot: "bg-muted-foreground" },
}

/** Public status page: the health of each part of the platform, and the maintenance notice while maintenance is on. */
export default function StatusPage() {
  const status = useQuery({
    queryKey: ["system-services"],
    queryFn: systemApi.services,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  })
  const data = status.data
  // The backend answering at all is the first check; if it does not, nothing else can be known.
  const unreachable = status.isError
  const states = SERVICES.map((s) => (unreachable ? (s.key === "backend" ? "down" : "unknown") : stateOf(data?.services[s.key])))
  const maintenance = data?.maintenance?.enabled ? data.maintenance : null
  const allUp = !!data && states.every((s) => s === "up")

  const overall = status.isPending
    ? { title: "Checking every service", text: "This takes a few seconds.", icon: LoaderCircle, className: "border-border bg-card", iconClass: "animate-spin text-muted-foreground" }
    : maintenance
      ? { title: "Scheduled maintenance in progress", text: "Some features are unavailable until it ends.", icon: Construction, className: "border-amber-500/30 bg-amber-500/10", iconClass: "text-amber-600 dark:text-amber-400" }
      : allUp
        ? { title: "All systems operational", text: "Everything is running normally.", icon: CheckCircle2, className: "border-primary/30 bg-primary/10", iconClass: "text-primary" }
        : { title: "Some systems are having problems", text: "We are aware and working on it.", icon: CircleAlert, className: "border-destructive/30 bg-destructive/10", iconClass: "text-destructive" }

  return (
    <section className="container-page max-w-3xl pt-28 pb-20">
      <Seo title="System Status | SmartPresence" description="Live status of the SmartPresence backend, AI service and databases, and any scheduled maintenance." path="/status" />

      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Activity className="size-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">System status</h1>
          <p className="text-sm text-muted-foreground">Checked again every 30 seconds</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("mt-8 flex items-center gap-4 rounded-2xl border p-5", overall.className)}
        role="status"
      >
        <overall.icon className={cn("size-8 shrink-0", overall.iconClass)} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{overall.title}</p>
          <p className="text-sm text-muted-foreground">{overall.text}</p>
        </div>
        <Button variant="outline" size="icon-lg" onClick={() => status.refetch()} disabled={status.isFetching} aria-label="Check again">
          <RefreshCw className={cn(status.isFetching && "animate-spin")} />
        </Button>
      </motion.div>

      {maintenance && (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-card p-5">
          <div className="flex items-center gap-2 font-semibold">
            <Construction className="size-5 text-amber-600 dark:text-amber-400" /> Maintenance details
          </div>
          <p className="mt-2 leading-relaxed text-muted-foreground">{maintenance.message}</p>
          {maintenance.updated_at && (
            <p className="mt-3 text-sm text-muted-foreground">
              Started {formatDateTime(maintenance.updated_at)} ({timeAgo(maintenance.updated_at)})
            </p>
          )}
        </div>
      )}

      <ul className="mt-6 divide-y rounded-2xl border bg-card">
        {SERVICES.map((s, i) => {
          const state = STATE_UI[states[i]]
          const check = data?.services[s.key]
          return (
            <li key={s.key} className="flex items-center gap-4 p-4 sm:p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <s.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.text}</p>
                {s.key === "ai_service" && check?.ok && check.model_loaded === false && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Starting up: the face model is still loading.</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                {status.isPending ? (
                  <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", state.tone)}>
                      <span className={cn("size-2 rounded-full", state.dot)} />
                      {state.label}
                    </span>
                    {check?.latency_ms !== undefined && <p className="text-xs text-muted-foreground tabular-nums">{Math.round(check.latency_ms)} ms</p>}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {data && <p className="mt-4 text-center text-xs text-muted-foreground">Last checked {formatDateTime(data.checked_at)}</p>}
    </section>
  )
}
