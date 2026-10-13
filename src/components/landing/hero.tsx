import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowRight, BellRing, CircleCheck, Lock, Play, ScanFace, Sparkles } from "lucide-react"
import { motion } from "motion/react"

import { StudentAvatar } from "@/components/common/student-avatar"
import { Badge } from "@/components/ui/badge"
import { InstallButton } from "@/components/common/install-button"
import { Button } from "@/components/ui/button"
import { useSectionNav } from "@/hooks/use-section-nav"

const STATS = [
  { value: "1 photo", label: "to mark a whole class" },
  { value: "5", label: "photos per scan for big rooms" },
  { value: "4", label: "role-based portals" },
  { value: "1000", label: "rows per CSV import" },
]

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const goTo = useSectionNav()

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div aria-hidden="true" className="absolute -top-40 left-1/2 -z-10 size-[44rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <div className="container-page grid items-center gap-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div className="text-center lg:text-left">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <Badge variant="outline" className="h-7 gap-1.5 rounded-full border-primary/30 bg-accent px-3 text-accent-foreground">
              <Sparkles className="size-3.5" /> AI face recognition attendance
            </Badge>
          </motion.div>

          <motion.h1
            id="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease }}
            className="mt-6 text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl xl:text-7xl"
          >
            Attendance that{" "}
            <span className="relative whitespace-nowrap text-primary">
              takes itself
              <svg aria-hidden="true" viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full">
                <motion.path
                  d="M4 14 C 80 4, 200 2, 296 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.9, delay: 0.7, ease: "easeInOut" }}
                  className="opacity-40"
                />
              </svg>
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease }}
            className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted-foreground lg:mx-0"
          >
            Snap one classroom photo. SmartPresence recognises every registered student, saves a draft for the
            teacher to review, and alerts parents the moment it is locked.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <Button
              size="lg"
              className="group h-12 w-full rounded-full px-6 text-base shadow-lg shadow-primary/30 sm:w-auto"
              onClick={() => goTo("demo")}
            >
              <Play className="fill-current" /> Attendance demo
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 w-full rounded-full px-6 text-base sm:w-auto">
              <Link to="/login">Login to your school</Link>
            </Button>
            <InstallButton variant="ghost" size="lg" className="h-12 w-full rounded-full px-5 text-base sm:w-auto">
              Install app
            </InstallButton>
          </motion.div>

          <motion.dl
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col-reverse border-l-2 border-primary/30 pl-3 text-left">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="text-2xl font-bold tracking-tight">{s.value}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <HeroVisual />
      </div>
    </section>
  )
}

const EMPTY_SEATS = [3, 10]

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.2, ease }}
      className="relative mx-auto w-full max-w-md lg:max-w-lg"
    >
      <div className="relative rounded-3xl border border-neutral-800 bg-neutral-950 p-3 shadow-2xl shadow-primary/20 sm:p-4">
        <div className="mb-3 flex items-center justify-between px-1 text-xs text-neutral-400">
          <span className="flex items-center gap-2 font-medium text-neutral-200">
            <ScanFace className="size-4 text-primary" /> Class 8 - B
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 animate-pulse rounded-full bg-primary" /> Recognising
          </span>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-900 p-3 sm:p-4">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {Array.from({ length: 12 }, (_, i) => {
              const empty = EMPTY_SEATS.includes(i)
              return (
                <div key={i} className="relative aspect-square">
                  {empty ? (
                    <div className="flex size-full items-end justify-center rounded-lg border border-dashed border-neutral-700">
                      <div className="mb-1 h-1.5 w-3/4 rounded bg-neutral-700" />
                    </div>
                  ) : (
                    <>
                      <StudentAvatar seed={i + 3} className="size-full" />
                      <motion.span
                        initial={{ opacity: 0, scale: 1.3 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 + i * 0.12, duration: 0.35 }}
                        className="absolute inset-0 rounded-lg border-2 border-primary shadow-[0_0_12px] shadow-primary/50"
                      />
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 animate-scan will-change-transform">
            <div className="h-0.5 bg-primary shadow-[0_0_18px_4px] shadow-primary/60" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-neutral-900 p-2.5">
            <p className="text-lg font-bold text-white">12</p>
            <p className="text-neutral-400">Students</p>
          </div>
          <div className="rounded-xl bg-primary/15 p-2.5">
            <p className="text-lg font-bold text-primary">10</p>
            <p className="text-neutral-400">Present</p>
          </div>
          <div className="rounded-xl bg-neutral-900 p-2.5">
            <p className="text-lg font-bold text-white">2</p>
            <p className="text-neutral-400">Absent</p>
          </div>
        </div>
      </div>

      <FloatingChip
        className="-top-10 -left-2 sm:-left-10"
        delay={2.4}
        icon={<CircleCheck className="size-4" />}
        title="Draft saved"
        sub="10 of 12 matched"
      />
      <FloatingChip
        className="top-1/3 -right-2 hidden sm:-right-10 sm:block"
        delay={2.8}
        icon={<Lock className="size-4" />}
        title="Locked by teacher"
        sub="08:42 AM"
        floatDelay="1.5s"
      />
      <FloatingChip
        className="-bottom-7 left-4 sm:left-10"
        delay={3.2}
        icon={<BellRing className="size-4" />}
        title="Parents notified"
        sub="2 absence alerts sent"
        floatDelay="3s"
      />
    </motion.div>
  )
}

function FloatingChip({
  className,
  delay,
  icon,
  title,
  sub,
  floatDelay = "0s",
}: {
  className: string
  delay: number
  icon: ReactNode
  title: string
  sub: string
  floatDelay?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", bounce: 0.4 }}
      className={`absolute ${className}`}
    >
      <div
        className="flex animate-float items-center gap-2.5 rounded-2xl border bg-background/95 px-3 py-2 shadow-xl backdrop-blur"
        style={{ animationDelay: floatDelay }}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-accent text-primary">{icon}</span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs text-muted-foreground">{sub}</span>
        </span>
      </div>
    </motion.div>
  )
}
