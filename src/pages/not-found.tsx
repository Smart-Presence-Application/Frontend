import { Link, useLocation } from "react-router"
import { ArrowLeft, Home, LayoutDashboard, MessageSquare, SearchX } from "lucide-react"
import { motion } from "motion/react"

import { ContactDialog } from "@/components/common/contact-dialog"
import { Seo } from "@/components/common/seo"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth"

/** Shown for any address that does not exist, on the website and inside every portal. Inside a portal it sits under the sidebar, so it needs no room for the site navbar. */
export default function NotFoundPage() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const inPortal = /^\/(admin|school|teacher|parent)(\/|$)/.test(pathname)

  return (
    <section
      className={
        inPortal
          ? "flex min-h-[70dvh] flex-col items-center justify-center px-4 py-12 text-center"
          : "container-page relative isolate flex min-h-[85dvh] flex-col items-center justify-center overflow-hidden pt-28 pb-16 text-center"
      }
    >
      <Seo title="Page not found | SmartPresence" description="The page you are looking for does not exist or has moved." path={pathname} noIndex />
      {!inPortal && (
        <>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
          <div aria-hidden="true" className="absolute top-1/3 left-1/2 -z-10 size-[30rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        </>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <div className="relative mx-auto w-fit">
          <p className="font-logo text-[7rem] leading-none font-bold text-primary sm:text-[9rem]" aria-hidden="true">
            404
          </p>
          <motion.span
            initial={{ rotate: -12, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 14 }}
            className="absolute -top-2 -right-8 flex size-14 items-center justify-center rounded-2xl bg-card text-primary shadow-lg ring-1 ring-border"
          >
            <SearchX className="size-7" />
          </motion.span>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">This seat is empty</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          We looked everywhere, but the page <code className="rounded bg-muted px-1.5 py-0.5 text-sm break-all">{pathname}</code> has been moved or
          never existed.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {user ? (
            <Button asChild size="lg" className="h-11 rounded-full px-6">
              <Link to="/app">
                <LayoutDashboard /> Go to my dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="h-11 rounded-full px-6">
              <Link to="/">
                <Home /> Back to home
              </Link>
            </Button>
          )}
          <Button size="lg" variant="outline" className="h-11 rounded-full px-6" onClick={() => window.history.back()}>
            <ArrowLeft /> Go back
          </Button>
        </div>
        {!inPortal && (
          <p className="mt-6 text-sm text-muted-foreground">
            Think something is missing?{" "}
            <ContactDialog>
              <button type="button" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
                <MessageSquare className="size-3.5" /> Tell us
              </button>
            </ContactDialog>
          </p>
        )}
      </motion.div>
    </section>
  )
}
