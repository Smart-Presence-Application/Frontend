import { CircleCheck, Clock, FileSpreadsheet, HeartHandshake, UsersRound } from "lucide-react"

import { Reveal, SectionHeading } from "@/components/common/reveal"

const PILLARS = [
  {
    icon: UsersRound,
    title: "Your whole school in one place",
    text: "Teachers, students and parents, classes and sections, academic years and holidays, all managed from a single dashboard.",
  },
  {
    icon: Clock,
    title: "Attendance in seconds",
    text: "One classroom photo replaces roll call. Results land as a draft for the teacher to check and lock, and teachers check in with the camera too.",
  },
  {
    icon: HeartHandshake,
    title: "Everyone in the loop",
    text: "Parents get attendance alerts on their phone, and notices reach teachers and parents instantly, with read receipts.",
  },
  {
    icon: FileSpreadsheet,
    title: "Reports on demand",
    text: "Download students, parents, teachers and attendance as Excel, filtered by class and date, whenever you need them.",
  },
]

const POINTS = [
  "Teacher, student and parent management with bulk CSV import",
  "AI attendance for students, camera check-in for teachers",
  "Notices and instant alerts for teachers and parents",
  "Excel reports for every class, teacher and date range",
  "Every person only sees what they should",
]

export function About() {
  return (
    <section aria-labelledby="about-title" className="py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="about-title"
          eyebrow="About SmartPresence"
          title={
            <>
              One platform to <span className="text-primary">run</span> your{" "}
              <span className="text-primary">school</span>
            </>
          }
          description="SmartPresence brings teachers, students, parents, attendance, notices and reports together in one simple platform, with AI face recognition that turns roll call into a single photo."
        />

        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="grid gap-4">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.1}>
                <article className="group flex gap-4 rounded-2xl border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 sm:p-6">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <p.icon className="size-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <p className="mt-1 text-muted-foreground">{p.text}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.15}>
            <div className="relative overflow-hidden rounded-3xl bg-neutral-950 p-8 text-white sm:p-10">
              <div aria-hidden="true" className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/30 blur-3xl" />
              <p className="relative font-logo text-4xl leading-tight text-primary sm:text-5xl">Our mission</p>
              <p className="relative mt-4 text-xl leading-relaxed text-neutral-200 sm:text-2xl">
                Take the paperwork out of running a school: less admin for teachers, clear updates for parents, and reliable records for school leaders.
              </p>
              <ul className="relative mt-8 grid gap-3">
                {POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-neutral-300">
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
