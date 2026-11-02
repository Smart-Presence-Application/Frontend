import { Link } from "react-router"

import { ContactDialog } from "@/components/common/contact-dialog"
import { Logo } from "@/components/common/logo"
import { PAGE_LINKS } from "@/data/nav"

const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container-page flex flex-col items-center gap-4 py-6 md:flex-row md:justify-between">
        <Logo className="h-8" />
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {PAGE_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="transition-colors hover:text-primary">
              {link.label}
            </Link>
          ))}
          <Link to="/privacy-policy" className="transition-colors hover:text-primary">
            Privacy policy
          </Link>
          <ContactDialog>
            <button type="button" className="transition-colors hover:text-primary">
              Contact us
            </button>
          </ContactDialog>
          <Link to="/login" className="transition-colors hover:text-primary">
            Sign in
          </Link>
        </nav>
        <p className="text-center text-sm text-muted-foreground">&copy; {YEAR} SmartPresence. All rights are reserved.</p>
      </div>
    </footer>
  )
}
