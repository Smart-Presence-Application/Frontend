import { MessageSquare } from "lucide-react"

import { ContactDialog } from "@/components/common/contact-dialog"
import { Reveal, SectionHeading } from "@/components/common/reveal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"

const FAQS = [
  {
    q: "How does AI attendance work?",
    a: "The teacher uploads between one and five photos of the classroom. Our face recognition service compares every face with the students registered in that class section and marks matches as present. The result is saved as a draft so the teacher can review it before locking.",
  },
  {
    q: "What if the AI misses a student or makes a mistake?",
    a: "Nothing is final until the session is locked. Teachers can tap any student to switch them between present and absent, and these manual corrections are kept even if the photos are scanned again. After locking, a school admin can still unlock and correct a session, and parents are notified of the change.",
  },
  {
    q: "Do we need special cameras or hardware?",
    a: "No. Any phone, tablet or laptop camera works. For large classrooms, take up to five photos from different angles in a single scan.",
  },
  {
    q: "How are student faces registered?",
    a: "Teachers or admins can upload photos in bulk, naming each file with the student ID, register a single student, or reuse profile pictures already on file. Faces can be removed at any time.",
  },
  {
    q: "How do parents get notified?",
    a: "When a teacher locks attendance, parents receive an alert in their portal. Parents sign in with their mobile number and a password provided by the school, and can see attendance history for each child.",
  },
  {
    q: "Can teachers mark their own attendance?",
    a: "Yes. Teachers check in and out with a live camera photo. The server records the time, and the school admin verifies the day. Full and half days are worked out automatically from the school's settings.",
  },
  {
    q: "Does it handle holidays and weekends?",
    a: "Yes. Admins define the academic year, holidays and weekly offs. Attendance cannot be taken for future dates, holidays or non-working days, which keeps reports clean.",
  },
]

export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="bg-muted/40 py-20 md:py-28">
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        })}
      </script>

      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            id="faq-title"
            align="start"
            eyebrow="FAQs"
            title="Questions, answered"
            description="Everything schools usually ask before getting started."
          />
          <Reveal className="-mt-6 hidden rounded-3xl bg-neutral-950 p-6 text-white lg:block">
            <p className="font-semibold">Still have questions?</p>
            <p className="mt-1 text-sm text-neutral-400">Our team is happy to walk you through it.</p>
            <ContactDialog>
              <Button className="mt-4">
                <MessageSquare /> Contact us
              </Button>
            </ContactDialog>
          </Reveal>
        </div>

        <Reveal>
          <Accordion type="single" collapsible defaultValue="item-0" className="grid gap-3">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                className="rounded-2xl border bg-background px-5 transition-shadow last:border-b data-[state=open]:border-primary/40 data-[state=open]:shadow-md"
              >
                <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="pb-5 text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
