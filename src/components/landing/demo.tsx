import { useEffect, useMemo, useState } from "react"
import { BellRing, Camera, Check, FilePenLine, Lock, RotateCcw, ScanFace, UserCheck, UserX } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { SectionHeading, Reveal } from "@/components/common/reveal"
import { StudentAvatar } from "@/components/common/student-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type Phase = "idle" | "scanning" | "review" | "locked"
type Status = "PRESENT" | "ABSENT"

interface DemoStudent {
  roll: number
  name: string
  seed: number
  inClass: boolean
  similarity: number
}

const STUDENTS: DemoStudent[] = [
  { roll: 1, name: "Aarav Mehta", seed: 3, inClass: true, similarity: 0.97 },
  { roll: 2, name: "Diya Nair", seed: 4, inClass: true, similarity: 0.95 },
  { roll: 3, name: "Kabir Singh", seed: 5, inClass: true, similarity: 0.93 },
  { roll: 4, name: "Ananya Rao", seed: 6, inClass: false, similarity: 0 },
  { roll: 5, name: "Vihaan Das", seed: 7, inClass: true, similarity: 0.96 },
  { roll: 6, name: "Isha Kapoor", seed: 8, inClass: true, similarity: 0.91 },
  { roll: 7, name: "Arjun Patel", seed: 9, inClass: true, similarity: 0.94 },
  { roll: 8, name: "Meera Iyer", seed: 10, inClass: true, similarity: 0.98 },
  { roll: 9, name: "Rohan Gupta", seed: 11, inClass: true, similarity: 0.92 },
  { roll: 10, name: "Saanvi Joshi", seed: 12, inClass: true, similarity: 0.95 },
  { roll: 11, name: "Ayaan Khan", seed: 13, inClass: false, similarity: 0 },
  { roll: 12, name: "Tara Menon", seed: 14, inClass: true, similarity: 0.9 },
]

const STEPS = [
  { key: "idle", icon: Camera, title: "Capture", text: "Teacher takes up to 5 classroom photos." },
  { key: "scanning", icon: ScanFace, title: "Recognise", text: "AI matches faces against registered students." },
  { key: "review", icon: FilePenLine, title: "Review draft", text: "Tap any student to correct their status." },
  { key: "locked", icon: Lock, title: "Lock and notify", text: "Attendance is final and parents are alerted." },
] as const

const PHASE_INDEX: Record<Phase, number> = { idle: 0, scanning: 1, review: 2, locked: 3 }
const SCAN_MS = 2600
const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

function aiStatuses(): Record<number, Status> {
  return Object.fromEntries(STUDENTS.map((s) => [s.roll, s.inClass ? "PRESENT" : "ABSENT"]))
}

export function Demo() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [statuses, setStatuses] = useState<Record<number, Status>>(aiStatuses)
  const [edited, setEdited] = useState<Set<number>>(new Set())
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (phase !== "scanning") return
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const pct = Math.min(100, ((now - start) / SCAN_MS) * 100)
      setProgress(pct)
      if (pct < 100) frame = requestAnimationFrame(tick)
      else setPhase("review")
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase])

  const present = useMemo(() => Object.values(statuses).filter((s) => s === "PRESENT").length, [statuses])
  const absentees = STUDENTS.filter((s) => statuses[s.roll] === "ABSENT")
  const showBoxes = phase !== "idle"

  function capture() {
    setStatuses(aiStatuses())
    setEdited(new Set())
    setProgress(0)
    setPhase("scanning")
  }

  function toggle(roll: number) {
    if (phase !== "review") return
    setStatuses((prev) => ({ ...prev, [roll]: prev[roll] === "PRESENT" ? "ABSENT" : "PRESENT" }))
    setEdited((prev) => new Set(prev).add(roll))
  }

  return (
    <section aria-labelledby="demo-title" className="relative isolate overflow-hidden bg-neutral-950 py-20 text-white md:py-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid opacity-[0.07] invert" />
      <div aria-hidden="true" className="absolute top-1/2 -left-40 -z-10 size-[36rem] -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="container-page">
        <SectionHeading
          id="demo-title"
          inverted
          eyebrow="Interactive demo"
          title={
            <>
              See AI attendance <span className="text-primary">in action</span>
            </>
          }
          description="This is the same flow your teachers use: capture, recognise, review the draft, then lock. Try it below. No sign-in needed."
        />

        <ol className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {STEPS.map((step, i) => {
            const current = PHASE_INDEX[phase]
            const done = i < current || phase === "locked"
            const active = i === current && phase !== "locked"
            return (
              <li
                key={step.key}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-3 transition-all duration-500 sm:p-4",
                  active && "border-primary/60 bg-primary/10",
                  done && "border-primary/30 bg-white/[0.03]",
                  !active && !done && "border-white/10 bg-white/[0.02] opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                    done ? "bg-primary text-primary-foreground" : active ? "bg-primary/20 text-primary" : "bg-white/10 text-neutral-400"
                  )}
                >
                  {done ? <Check className="size-4" /> : <step.icon className="size-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="hidden text-xs text-neutral-400 sm:block">{step.text}</span>
                </span>
              </li>
            )
          })}
        </ol>

        <Reveal className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-neutral-900/80 p-3 shadow-2xl sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Camera className="size-4 text-primary" /> Class 6 - A, {today}
              </span>
              <SessionBadge phase={phase} />
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-950 p-3 sm:p-5">
              <div className="grid grid-cols-4 gap-2 sm:gap-4">
                {STUDENTS.map((s, i) => (
                  <div key={s.roll} className="relative aspect-square">
                    {s.inClass ? (
                      <StudentAvatar seed={s.seed} className="size-full" />
                    ) : (
                      <div className="flex size-full items-end justify-center rounded-lg border border-dashed border-white/15">
                        <div className="mb-1.5 h-1.5 w-3/4 rounded bg-white/10" />
                      </div>
                    )}
                    <AnimatePresence>
                      {showBoxes && s.inClass && (phase !== "scanning" || progress > (i / STUDENTS.length) * 90) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 1.25 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "absolute inset-0 rounded-lg border-2",
                            statuses[s.roll] === "PRESENT" ? "border-primary shadow-[0_0_14px] shadow-primary/40" : "border-red-400"
                          )}
                        >
                          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded bg-primary px-1 text-[9px] leading-4 font-semibold whitespace-nowrap text-primary-foreground sm:text-[10px]">
                            {Math.round(s.similarity * 100)}%
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {phase === "scanning" && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 animate-scan will-change-transform">
                  <div className="h-0.5 bg-primary shadow-[0_0_20px_6px] shadow-primary/60" />
                </div>
              )}

              <AnimatePresence>
                {phase === "idle" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-neutral-950/50 backdrop-blur-[2px]"
                  >
                    <Button size="lg" onClick={capture} className="h-12 rounded-full px-6 text-base shadow-lg shadow-primary/40">
                      <Camera /> Capture and recognise
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <span aria-hidden="true" className="absolute top-2 left-2 size-5 rounded-tl-lg border-t-2 border-l-2 border-white/40" />
              <span aria-hidden="true" className="absolute top-2 right-2 size-5 rounded-tr-lg border-t-2 border-r-2 border-white/40" />
              <span aria-hidden="true" className="absolute bottom-2 left-2 size-5 rounded-bl-lg border-b-2 border-l-2 border-white/40" />
              <span aria-hidden="true" className="absolute right-2 bottom-2 size-5 rounded-br-lg border-r-2 border-b-2 border-white/40" />
            </div>

            <div className="mt-4 min-h-10" aria-live="polite">
              {phase === "scanning" ? (
                <div className="grid gap-2">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Matching faces with registered students</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-white/10" />
                </div>
              ) : phase === "idle" ? (
                <p className="text-sm text-neutral-400">Two seats are empty today. Let us see if the AI notices.</p>
              ) : (
                <p className="text-sm text-neutral-300">
                  <span className="font-semibold text-primary">{present}</span> present,{" "}
                  <span className="font-semibold text-red-400">{STUDENTS.length - present}</span> absent out of {STUDENTS.length}.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-3xl border border-white/10 bg-neutral-900/80 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Attendance register</h3>
              <span className="text-xs text-neutral-400">
                {phase === "review" ? "Tap to correct" : phase === "locked" ? "Read only" : "Waiting for scan"}
              </span>
            </div>

            <ul className="-mx-1 grid max-h-[22rem] gap-1.5 overflow-y-auto px-1 [scrollbar-width:thin]">
              {STUDENTS.map((s) => {
                const status = statuses[s.roll]
                const known = phase === "review" || phase === "locked"
                return (
                  <li key={s.roll}>
                    <button
                      type="button"
                      onClick={() => toggle(s.roll)}
                      disabled={phase !== "review"}
                      aria-label={`${s.name}, ${known ? status.toLowerCase() : "pending"}`}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition-all",
                        phase === "review" && "hover:border-white/15 hover:bg-white/5 active:scale-[0.99]",
                        "disabled:cursor-default"
                      )}
                    >
                      <span className="w-6 text-xs text-neutral-500 tabular-nums">{String(s.roll).padStart(2, "0")}</span>
                      <StudentAvatar seed={s.seed} className="size-8 shrink-0 rounded-full bg-neutral-800" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.name}</span>
                        <span className="block text-[11px] text-neutral-500">
                          {known ? (edited.has(s.roll) ? "Manual" : s.inClass ? `AI, ${Math.round(s.similarity * 100)}% match` : "AI, not detected") : "Pending"}
                        </span>
                      </span>
                      {known ? (
                        <motion.span
                          key={status}
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                            status === "PRESENT" ? "bg-primary/15 text-primary" : "bg-red-500/15 text-red-400"
                          )}
                        >
                          {status === "PRESENT" ? <UserCheck className="size-3" /> : <UserX className="size-3" />}
                          {status === "PRESENT" ? "Present" : "Absent"}
                        </motion.span>
                      ) : (
                        <span className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="mt-4 border-t border-white/10 pt-4">
              <AnimatePresence mode="wait">
                {phase === "locked" ? (
                  <motion.div key="locked" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-3">
                    {absentees.length > 0 ? (
                      absentees.slice(0, 2).map((s) => (
                        <div key={s.roll} className="flex gap-3 rounded-xl bg-white p-3 text-neutral-900">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                            <BellRing className="size-4" />
                          </span>
                          <p className="text-xs leading-relaxed sm:text-sm">
                            <span className="font-semibold">Parent alert:</span> {s.name} was marked absent on {today}.
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl bg-primary/15 p-3 text-sm text-primary">Full attendance today. Parents can see it in their portal.</p>
                    )}
                    <Button variant="outline" onClick={() => setPhase("idle")} className="h-10 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
                      <RotateCcw /> Run the demo again
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button onClick={() => setPhase("locked")} disabled={phase !== "review"} className="h-11 w-full text-base">
                      <Lock /> Lock attendance and notify parents
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function SessionBadge({ phase }: { phase: Phase }) {
  if (phase === "locked")
    return (
      <Badge className="gap-1 bg-primary text-primary-foreground">
        <Lock className="size-3" /> LOCKED
      </Badge>
    )
  if (phase === "review")
    return (
      <Badge variant="outline" className="gap-1 border-amber-400/40 text-amber-300">
        <FilePenLine className="size-3" /> DRAFT
      </Badge>
    )
  if (phase === "scanning")
    return (
      <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
        <ScanFace className="size-3 animate-pulse" /> Scanning
      </Badge>
    )
  return (
    <Badge variant="outline" className="border-white/20 text-neutral-400">
      Ready
    </Badge>
  )
}
