import { PlayCircle } from "lucide-react"

import { Reveal, SectionHeading } from "@/components/common/reveal"

const HIGHLIGHTS = ["AI attendance from one classroom photo", "Teacher check-in with the camera", "Instant alerts and notices for parents", "Reports for admins"]

/** Overview video. It downloads only when played, since the file is large. */
export function VideoTour() {
  return (
    <section aria-labelledby="video-title" className="py-16 md:py-20">
      <div className="container-page">
        <SectionHeading
          id="video-title"
          eyebrow="Watch the tour"
          title="See SmartPresence in a school day"
          description="A short walkthrough of how AI attendance works in a classroom, and the other tools teachers, parents and admins use every day."
        />
        <Reveal className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-[1.5rem] border bg-neutral-950 shadow-2xl shadow-primary/10 sm:rounded-[2rem]">
            <video
              controls
              playsInline
              preload="none"
              poster="/videos/smartpresence-overview.jpg"
              width={1920}
              height={1080}
              className="aspect-video h-auto w-full"
            >
              <source src="/videos/smartpresence-overview.mp4" type="video/mp4" />
              Your browser cannot play this video.
            </video>
          </div>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground">
                <PlayCircle className="size-4 text-primary" /> {h}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
