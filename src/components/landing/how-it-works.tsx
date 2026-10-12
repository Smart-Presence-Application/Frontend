import { motion } from "motion/react"
import { BellRing, Camera, School, UserPlus, type LucideIcon } from "lucide-react"

import { Reveal, SectionHeading } from "@/components/common/reveal"

const STEPS: { icon: LucideIcon; title: string; text: string; detail: string }[] = [
  {
    icon: School,
    title: "Set up your school",
    text: "Your school and admin account are created and activated. The admin adds the academic year, classes, sections and holidays.",
    detail: "Weekends can be marked in one click.",
  },
  {
    icon: UserPlus,
    title: "Enrol and register faces",
    text: "Import teachers and students from CSV, then register faces from photos or existing profile pictures.",
    detail: "Up to 100 photos per upload.",
  },
  {
    icon: Camera,
    title: "Snap the classroom",
    text: "The teacher takes 1 to 5 photos. AI recognises each student and saves the result as a draft.",
    detail: "Future dates and holidays are blocked.",
  },
  {
    icon: BellRing,
    title: "Review, lock, notify",
    text: "Fix anything the camera missed, lock the session, and parents are alerted straight away.",
    detail: "Admins can unlock to correct later.",
  },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="Live in four simple steps"
          description="No special cameras or hardware. Any phone or laptop camera your teachers already carry is enough."
        />

        <ol className="relative grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <div aria-hidden="true" className="absolute top-8 right-[12.5%] left-[12.5%] hidden h-0.5 bg-border lg:block">
            <motion.div
              className="h-full origin-left bg-primary"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 1.6, ease: "easeInOut" }}
            />
          </div>

          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.15} className="relative">
              <li className="group flex h-full flex-col items-center text-center">
                <span className="relative z-10 flex size-16 items-center justify-center rounded-2xl border-4 border-background bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <step.icon className="size-7" />
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-neutral-950 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <div className="mt-5 flex flex-1 flex-col rounded-2xl border bg-card p-5 transition-colors group-hover:border-primary/40">
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                  <p className="mt-4 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">{step.detail}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
