import {
  BellRing,
  Building2,
  CalendarDays,
  CircleCheck,
  FileDown,
  FileSpreadsheet,
  FilePenLine,
  GraduationCap,
  KeyRound,
  Megaphone,
  ScanFace,
  Smartphone,
  Timer,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import { Reveal, SectionHeading } from "@/components/common/reveal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface Feature {
  icon: LucideIcon
  title: string
  text: string
  className?: string
  highlight?: boolean
}

const FEATURES: Feature[] = [
  {
    icon: ScanFace,
    title: "AI face recognition",
    text: "Upload 1 to 5 classroom photos and every registered student is matched automatically, with a similarity score for each result. Re-running a scan keeps the teacher's manual corrections.",
    className: "md:col-span-2 md:row-span-2",
    highlight: true,
  },
  {
    icon: FilePenLine,
    title: "Draft, review, lock",
    text: "Results save as a draft. Teachers fix mistakes, then lock. Only admins can unlock.",
  },
  {
    icon: BellRing,
    title: "Instant parent alerts",
    text: "Locking a session notifies parents. Admin edits after locking notify them again.",
  },
  {
    icon: Timer,
    title: "Teacher check-in and out",
    text: "Live camera selfies stamped with server time. Full and half days are calculated from your thresholds.",
  },
  {
    icon: CalendarDays,
    title: "Academic calendar",
    text: "Academic years, holidays and weekends. Attendance is blocked on non-working days.",
  },
  {
    icon: FileSpreadsheet,
    title: "Bulk CSV import",
    text: "Enrol up to 1000 students, teachers or parents per file. Every row is validated before anything is saved.",
  },
  {
    icon: Megaphone,
    title: "Notices",
    text: "Send notices with attachments to teachers or parents as push notifications, and track who has read them.",
  },
  {
    icon: UsersRound,
    title: "People management",
    text: "Teachers, students and parents with classes, roll numbers and photos. Promote students to the next year in a few clicks.",
  },
  {
    icon: FileDown,
    title: "Excel reports",
    text: "Download students, parents, teachers and attendance with filters, plus per-person attendance summaries.",
    className: "sm:col-span-2 md:col-span-1",
  },
]

const ROLES = [
  {
    value: "school-admin",
    label: "School Admin",
    icon: Building2,
    summary: "Run your campus end to end.",
    items: [
      "Set up academic years, classes, sections, holidays and weekends",
      "Manage teachers, students and parents, and promote students each year",
      "Verify teacher check-ins and correct locked attendance",
      "Send notices and download Excel reports for any class or date range",
    ],
  },
  {
    value: "teacher",
    label: "Teacher",
    icon: GraduationCap,
    summary: "Mark your class in seconds.",
    items: [
      "Register student faces from photos or existing profile images",
      "Take attendance from classroom photos, review the draft and lock it",
      "Check in and out with the camera and view your own summary",
      "Message parents and download your class's students, parents and attendance",
    ],
  },
  {
    value: "parent",
    label: "Parent",
    icon: Users,
    summary: "Stay informed without asking.",
    items: [
      "Sign in with your mobile number, no email needed",
      "See finalised attendance for each of your children",
      "Get absence alerts and school announcements in one inbox",
      "Change your password any time from your profile",
    ],
  },
]

export function Features() {
  return (
    <section aria-labelledby="features-title" className="py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title="Everything your school runs on"
          description="Teachers, students, parents, attendance, notices and reports: one connected system from the first enrolment to the parent's phone."
        />

        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 md:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 0.06} className={cn("h-full", f.className)}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-20 md:mt-28">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">Built for every role</h3>
            <p className="mt-3 text-muted-foreground">Each person gets their own portal and only sees what they are allowed to.</p>
          </div>

          <Tabs defaultValue="teacher" className="mx-auto max-w-4xl">
            <TabsList className="mx-auto grid w-full max-w-xl grid-cols-3 gap-1.5 rounded-2xl border bg-muted/70 p-1.5 group-data-horizontal/tabs:h-auto">
              {ROLES.map((r) => (
                <TabsTrigger
                  key={r.value}
                  value={r.value}
                  className="h-11 gap-2 rounded-xl px-3 text-muted-foreground hover:bg-background/60 data-active:bg-background data-active:text-primary data-active:shadow-md"
                >
                  <r.icon className="size-4" /> {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {ROLES.map((r) => (
              <TabsContent key={r.value} value={r.value} className="mt-6 animate-in duration-300 fade-in-0 slide-in-from-bottom-2">
                <div className="grid gap-6 rounded-3xl border bg-card p-6 sm:p-8 md:grid-cols-[1fr_1.6fr] md:items-center">
                  <div>
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                      <r.icon className="size-7" />
                    </span>
                    <p className="mt-4 text-xl font-semibold">{r.label}</p>
                    <p className="mt-1 text-muted-foreground">{r.summary}</p>
                  </div>
                  <ul className="grid gap-3">
                    {r.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Reveal>

        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Smartphone className="size-4 text-primary" /> Works on phones, tablets and desktops
          </span>
          <span className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" /> Installable app with push notifications
          </span>
        </Reveal>
      </div>
    </section>
  )
}

function FeatureCard({ icon: Icon, title, text, highlight }: Feature) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        highlight
          ? "border-transparent bg-primary text-primary-foreground hover:shadow-primary/30"
          : "bg-card hover:border-primary/40 hover:shadow-primary/5"
      )}
    >
      {highlight && (
        <>
          <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-64 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-125" />
          <div aria-hidden="true" className="absolute right-8 bottom-8 size-32 rounded-full border-2 border-dashed border-white/30 transition-transform duration-[2s] group-hover:rotate-180" />
        </>
      )}
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6",
          highlight ? "bg-white text-primary" : "bg-accent text-primary"
        )}
      >
        <Icon className="size-6" />
      </span>
      <h3 className={cn("mt-5 font-semibold", highlight ? "text-2xl md:text-3xl" : "text-lg")}>{title}</h3>
      <p className={cn("mt-2 leading-relaxed", highlight ? "max-w-md text-primary-foreground/85 md:text-lg" : "text-sm text-muted-foreground")}>
        {text}
      </p>
    </article>
  )
}
