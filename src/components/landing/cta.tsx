import { Link } from "react-router"
import { ArrowRight, MessageSquare } from "lucide-react"

import { ContactDialog } from "@/components/common/contact-dialog"
import { Reveal } from "@/components/common/reveal"
import { Button } from "@/components/ui/button"

export function Cta() {
  return (
    <section aria-labelledby="cta-title" className="py-20 md:py-24">
      <div className="container-page">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-neutral-950 px-6 py-14 text-center text-white sm:px-12 md:py-20">
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid opacity-10 invert" />
            <div aria-hidden="true" className="absolute -bottom-32 left-1/2 -z-10 size-[30rem] -translate-x-1/2 rounded-full bg-primary/40 blur-3xl" />
            <h2 id="cta-title" className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Ready to make roll call a thing of the past?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-neutral-300 sm:text-lg">
              Bring SmartPresence to your school and give every teacher minutes back in every class.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ContactDialog>
                <Button size="lg" className="group h-12 w-full rounded-full px-6 text-base sm:w-auto">
                  <MessageSquare /> Contact us
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Button>
              </ContactDialog>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-full border-white/25 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto"
              >
                <Link to="/login">Login</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
