import { lazy, Suspense, useEffect } from "react"
import { useLocation } from "react-router"

import { SectionSkeleton } from "@/components/common/page-loader"
import { Seo } from "@/components/common/seo"
import { Hero } from "@/components/landing/hero"

const About = lazy(() => import("@/components/landing/about").then((m) => ({ default: m.About })))
const Demo = lazy(() => import("@/components/landing/demo").then((m) => ({ default: m.Demo })))
const Features = lazy(() => import("@/components/landing/features").then((m) => ({ default: m.Features })))
const Partners = lazy(() => import("@/components/landing/partners").then((m) => ({ default: m.Partners })))
const HowItWorks = lazy(() => import("@/components/landing/how-it-works").then((m) => ({ default: m.HowItWorks })))
const Testimonials = lazy(() => import("@/components/landing/testimonials").then((m) => ({ default: m.Testimonials })))
const Faq = lazy(() => import("@/components/landing/faq").then((m) => ({ default: m.Faq })))
const Cta = lazy(() => import("@/components/landing/cta").then((m) => ({ default: m.Cta })))
const InstallApp = lazy(() => import("@/components/landing/install-app").then((m) => ({ default: m.InstallApp })))

/** Public landing page. Below-the-fold sections load as separate chunks, and Partners and Testimonials render nothing until Super Admins add content. Scrolls to a section requested from another page (navbar) or via a #hash link. */
export default function HomePage() {
  const location = useLocation()

  useEffect(() => {
    const target = (location.state as { scrollTo?: string } | null)?.scrollTo ?? location.hash.slice(1)
    if (!target) return
    const timer = setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth" }), 150)
    return () => clearTimeout(timer)
  }, [location])

  return (
    <>
      <Seo
        title="SmartPresence | AI-Powered School Management and Attendance"
        description="SmartPresence manages teachers, students, parents, attendance, notices and reports in one platform, with AI face recognition that takes classroom attendance from a single photo."
      />

      <div id="home">
        <Hero />
      </div>
      <div id="about">
        <Suspense fallback={<SectionSkeleton />}>
          <About />
        </Suspense>
      </div>
      <div id="demo">
        <Suspense fallback={<SectionSkeleton className="min-h-[900px] bg-neutral-950" />}>
          <Demo />
        </Suspense>
      </div>
      <div id="features">
        <Suspense fallback={<SectionSkeleton className="min-h-[1100px]" />}>
          <Features />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <Partners />
      </Suspense>
      <div id="how-it-works">
        <Suspense fallback={<SectionSkeleton />}>
          <HowItWorks />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <Testimonials />
      </Suspense>
      <div id="faq">
        <Suspense fallback={<SectionSkeleton />}>
          <Faq />
        </Suspense>
      </div>
      <div id="install">
        <Suspense fallback={<SectionSkeleton className="min-h-[420px]" />}>
          <InstallApp />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <Cta />
      </Suspense>
    </>
  )
}
