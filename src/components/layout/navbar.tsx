import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router"
import { LogIn, Menu, MessageSquare } from "lucide-react"
import { motion } from "motion/react"

import { ContactDialog } from "@/components/common/contact-dialog"
import { InstallButton } from "@/components/common/install-button"
import { Logo } from "@/components/common/logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { NAV_LINKS } from "@/data/nav"
import { useActiveSection, useSectionNav } from "@/hooks/use-section-nav"
import { cn } from "@/lib/utils"

const SECTION_IDS = NAV_LINKS.map((l) => l.id)

/** Site header. Mobile links wait for the sheet to close before scrolling so its body scroll lock is released. */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const goTo = useSectionNav()
  const active = useActiveSection(SECTION_IDS)
  const onHome = pathname === "/"

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b bg-background/80 shadow-sm backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <nav aria-label="Main" className="container-page flex h-16 items-center justify-between gap-4 md:h-18">
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const isActive = onHome && active === link.id
            return (
              <li key={link.id}>
                <a
                  href={link.id === "home" ? "/" : `/#${link.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    goTo(link.id)
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-accent"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  {link.label}
                </a>
              </li>
            )
          })}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <InstallButton iconOnly className="xl:hidden" />
          <InstallButton variant="ghost" size="lg" className="hidden h-10 rounded-full px-4 xl:inline-flex">
            Install app
          </InstallButton>
          <ContactDialog>
            <Button variant="outline" size="lg" className="h-10 rounded-full px-4">
              <MessageSquare /> Contact us
            </Button>
          </ContactDialog>
          <Button asChild size="lg" className="h-10 rounded-full px-5 shadow-md shadow-primary/25">
            <Link to="/login">
              <LogIn /> Login
            </Link>
          </Button>
        </div>

        <div className="ml-auto lg:hidden">
          <InstallButton iconOnly />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] max-w-sm">
            <SheetHeader>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Logo />
            </SheetHeader>
            <ul className="flex flex-col gap-1 px-4">
              {NAV_LINKS.map((link, i) => (
                <motion.li
                  key={link.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <SheetClose asChild>
                    <a
                      href={link.id === "home" ? "/" : `/#${link.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        setTimeout(() => goTo(link.id), 250)
                      }}
                      className={cn(
                        "block rounded-lg px-3 py-3 text-base font-medium transition-colors hover:bg-accent",
                        onHome && active === link.id && "bg-accent text-primary"
                      )}
                    >
                      {link.label}
                    </a>
                  </SheetClose>
                </motion.li>
              ))}
            </ul>
            <div className="mt-auto grid gap-2 p-4">
              <InstallButton variant="secondary" size="lg" className="h-11">
                Install the app
              </InstallButton>
              <ContactDialog>
                <Button variant="outline" size="lg" className="h-11">
                  <MessageSquare /> Contact us
                </Button>
              </ContactDialog>
              <SheetClose asChild>
                <Button asChild size="lg" className="h-11">
                  <Link to="/login">
                    <LogIn /> Login
                  </Link>
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
