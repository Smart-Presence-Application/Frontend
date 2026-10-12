import { useQuery } from "@tanstack/react-query"
import { Quote, Star } from "lucide-react"

import { Reveal, SectionHeading } from "@/components/common/reveal"
import { websiteApi } from "@/lib/endpoints"
import { cn } from "@/lib/utils"

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}

/** What schools and parents say. Managed by Super Admins; hidden when there are none. */
export function Testimonials() {
  const { data: testimonials = [] } = useQuery({
    queryKey: ["website", "testimonials"],
    queryFn: websiteApi.testimonials,
    staleTime: 5 * 60_000,
  })

  if (!testimonials.length) return null

  return (
    <section aria-labelledby="testimonials-title" className="py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="testimonials-title"
          eyebrow="Testimonials"
          title="Loved by schools, teachers and parents"
          description="Hear from the people who use SmartPresence every day."
        />

        <ul className={cn("grid gap-4", testimonials.length > 1 && "md:grid-cols-2", testimonials.length > 2 && "lg:grid-cols-3")}>
          {testimonials.map((t, i) => (
            <li key={t.id} className="h-full">
              <Reveal delay={(i % 3) * 0.08} className="h-full">
                <figure className="flex h-full flex-col rounded-3xl border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                  <Quote className="size-8 text-primary/30" aria-hidden="true" />
                  {t.rating && (
                    <div className="mt-3 flex gap-0.5" aria-label={`Rated ${t.rating} out of 5`}>
                      {Array.from({ length: 5 }, (_, s) => (
                        <Star key={s} className={cn("size-4", s < t.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                      ))}
                    </div>
                  )}
                  <blockquote className="mt-3 flex-1 leading-relaxed text-pretty">{t.quote}</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    {t.photo ? (
                      <img src={t.photo} alt={`Photo of ${t.name}`} loading="lazy" className="size-11 rounded-full object-cover ring-2 ring-primary/15" />
                    ) : (
                      <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" aria-hidden="true">
                        {initials(t.name)}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block font-semibold">{t.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">{[t.role, t.organization].filter(Boolean).join(", ")}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
