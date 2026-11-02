import { Link } from "react-router"
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Building2,
  Camera,
  CalendarRange,
  GraduationCap,
  MessageSquare,
  Presentation,
  ScanFace,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import { ContactDialog } from "@/components/common/contact-dialog"
import { Seo } from "@/components/common/seo"
import { Button } from "@/components/ui/button"

const STEPS: { icon: LucideIcon; title: string; points: string[] }[] = [
  {
    icon: MessageSquare,
    title: "Contact SmartPresence",
    points: [
      "Send us a message through the contact form to onboard your school or organisation.",
      "Tell us your school's name, roughly how many students and teachers you have, and who will run it.",
    ],
  },
  {
    icon: Building2,
    title: "We create your school",
    points: [
      "The SmartPresence team creates your school and its School Admin account.",
      "The School Admin receives their sign-in details by email.",
    ],
  },
  {
    icon: CalendarRange,
    title: "Set up the academic year",
    points: [
      "The School Admin adds the academic year, classes and sections.",
      "Holidays and weekends are added so attendance cannot be taken on them.",
    ],
  },
  {
    icon: UserPlus,
    title: "Add teachers, students and parents",
    points: [
      "Add people one by one or import them from CSV files.",
      "Assign a class teacher to each section.",
      "Link parents to their children by mobile number; one parent account can cover several children.",
    ],
  },
  {
    icon: ScanFace,
    title: "Register student faces",
    points: [
      "Upload a clear photo of each student, or use their existing profile photo.",
      "SmartPresence stores a face template, not the photo, for matching.",
    ],
  },
  {
    icon: Camera,
    title: "Take attendance every day",
    points: [
      "Teachers check themselves in and out with the camera.",
      "For class attendance, the teacher takes 1 to 5 classroom photos and the AI marks who is present as a draft.",
      "The teacher fixes anything the camera missed, then locks the session.",
    ],
  },
  {
    icon: BellRing,
    title: "Notify and report",
    points: [
      "Parents are told each child's attendance as soon as the session is locked.",
      "Admins and teachers send notices to staff and parents.",
      "Download attendance reports for a class, a school or a date range.",
    ],
  },
]

const ROLES: { icon: LucideIcon; title: string; summary: string; can: string[] }[] = [
  {
    icon: Building2,
    title: "School Admin",
    summary: "Manages one school from start to finish.",
    can: [
      "Edit the school profile and logo",
      "Set up academic years, classes, sections and holidays",
      "Add, import, edit and delete teachers, students and parents, one at a time or in bulk",
      "Assign class teachers and transfer or deactivate staff",
      "Take, review, lock and unlock attendance for any class",
      "See teacher check-ins, send notices and download reports",
    ],
  },
  {
    icon: Presentation,
    title: "Teacher",
    summary: "Looks after their own class section.",
    can: [
      "Check in and out with the camera",
      "Take class attendance from photos, correct it and lock it",
      "Add, edit and delete students and parents in their class",
      "Register student faces",
      "Notify parents of their class and read school notices",
      "Download reports for their class",
    ],
  },
  {
    icon: UsersRound,
    title: "Parent",
    summary: "Follows their children's attendance.",
    can: [
      "Sign in with the mobile number registered at the school",
      "See each child's attendance history",
      "Get an alert with each child's attendance when the class register is locked",
      "Read notices from the school",
    ],
  },
]

/** Public guide to onboarding a school and what each role can do. */
export default function DocsPage() {
  return (
    <section className="container-page max-w-4xl pt-28 pb-20">
      <Seo
        title="Docs | SmartPresence"
        description="How a school gets started with SmartPresence, step by step, and what School Admins, teachers and parents can do."
        path="/docs"
      />

      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen className="size-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Docs</h1>
          <p className="text-sm text-muted-foreground">How SmartPresence is set up and run in a school</p>
        </div>
      </div>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2 text-sm">
        <a href="#getting-started" className="rounded-full border bg-card px-3 py-1.5 text-muted-foreground transition-colors hover:text-primary">
          Getting started
        </a>
        <a href="#roles" className="rounded-full border bg-card px-3 py-1.5 text-muted-foreground transition-colors hover:text-primary">
          Roles and permissions
        </a>
      </nav>

      <section id="getting-started" aria-labelledby="getting-started-title" className="mt-12 scroll-mt-28">
        <h2 id="getting-started-title" className="text-2xl font-bold tracking-tight">
          Getting started
        </h2>
        <p className="mt-2 text-muted-foreground">From the first message to daily attendance.</p>

        <ol className="relative mt-8 grid gap-6 before:absolute before:top-2 before:bottom-2 before:left-5 before:w-px before:bg-border">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-4">
              <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <step.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1 rounded-2xl border bg-card p-5">
                <p className="text-xs font-semibold tracking-widest text-primary uppercase">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-muted-foreground">
                  {step.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
                {i === 0 && (
                  <ContactDialog>
                    <Button className="mt-4 rounded-full">
                      <MessageSquare /> Contact us
                    </Button>
                  </ContactDialog>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="roles" aria-labelledby="roles-title" className="mt-16 scroll-mt-28">
        <h2 id="roles-title" className="text-2xl font-bold tracking-tight">
          Roles and permissions
        </h2>
        <p className="mt-2 text-muted-foreground">Everyone signs in to their own portal and sees only what their role allows.</p>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((role) => (
            <article key={role.title} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <role.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{role.title}</h3>
                  <p className="text-sm text-muted-foreground">{role.summary}</p>
                </div>
              </div>
              <ul className="mt-4 grid gap-2 text-sm leading-relaxed">
                {role.can.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    {c}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-16 flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center sm:p-8">
        <GraduationCap className="size-8 text-primary" />
        <p className="text-lg font-semibold">Ready to bring SmartPresence to your school?</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ContactDialog>
            <Button size="lg" className="rounded-full">
              <MessageSquare /> Contact us
            </Button>
          </ContactDialog>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link to="/login">
              Sign in <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
