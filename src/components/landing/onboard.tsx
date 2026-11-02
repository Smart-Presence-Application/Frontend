import { ArrowRight, Building2, MessageSquare } from "lucide-react"

import { ContactDialog } from "@/components/common/contact-dialog"
import { Reveal } from "@/components/common/reveal"
import { Button } from "@/components/ui/button"

const POINTS = ["Your school and admin account set up for you", "Import teachers, students and parents from CSV", "No special cameras or hardware"]

/** Invitation to onboard a school, shown right below the hero. */
export function Onboard() {
  return (
    <section aria-labelledby="onboard-title" className="pt-4 pb-8 md:pb-12">
      <div className="container-page">
        <Reveal>
          <div className="relative isolate flex flex-col gap-6 overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
            <div aria-hidden="true" className="absolute -right-20 -bottom-24 -z-10 size-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <Building2 className="size-6" />
              </span>
              <div>
                <h2 id="onboard-title" className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                  Onboard your school with SmartPresence
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Tell us about your school or organisation and our team will set everything up with you.
                </p>
                <ul className="mt-4 flex flex-col gap-x-6 gap-y-1.5 text-sm sm:flex-row sm:flex-wrap">
                  {POINTS.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ContactDialog>
              <Button size="lg" className="group h-12 w-full shrink-0 rounded-full px-6 text-base shadow-md shadow-primary/25 sm:w-auto">
                <MessageSquare /> Contact us
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Button>
            </ContactDialog>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
