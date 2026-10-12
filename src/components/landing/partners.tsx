import { useQuery } from "@tanstack/react-query"

import { Reveal } from "@/components/common/reveal"
import { websiteApi, type PublicPartner } from "@/lib/endpoints"

/**
 * Partner logos, managed by Super Admins. Renders nothing until at least one is published.
 * A handful sit still in a row; more scroll as a marquee, repeated so the -50% translate loops seamlessly.
 */
export function Partners() {
  const { data: partners = [] } = useQuery({ queryKey: ["website", "partners"], queryFn: websiteApi.partners, staleTime: 5 * 60_000 })

  if (!partners.length) return null

  const scrolling = partners.length > 5

  return (
    <section aria-labelledby="partners-title" className="border-y bg-muted/40 py-16 md:py-20">
      <div className="container-page">
        <Reveal className="text-center">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">Our partners</p>
          <h2 id="partners-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Trusted by schools and organisations
          </h2>
        </Reveal>
      </div>

      {scrolling ? (
        <div className="mt-10 flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <ul className="group flex w-max shrink-0 animate-marquee gap-4 pr-4 hover:[animation-play-state:paused]">
            {[...partners, ...partners].map((p, i) => (
              <li key={`${p.id}-${i}`} aria-hidden={i >= partners.length ? "true" : undefined}>
                <PartnerLogo partner={p} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="container-page mt-10 flex flex-wrap items-center justify-center gap-4">
          {partners.map((p) => (
            <li key={p.id}>
              <PartnerLogo partner={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PartnerLogo({ partner }: { partner: PublicPartner }) {
  const logo = (
    <span className="flex h-20 w-48 items-center justify-center rounded-2xl border bg-background px-5 grayscale transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:grayscale-0">
      <img src={partner.logo} alt={`${partner.name} logo`} loading="lazy" className="max-h-12 max-w-full object-contain" />
    </span>
  )
  return partner.website ? (
    <a href={partner.website} target="_blank" rel="noopener noreferrer" title={partner.name}>
      {logo}
    </a>
  ) : (
    logo
  )
}
