import { Link } from "react-router"

import { ContactDialog } from "@/components/common/contact-dialog"
import { Logo } from "@/components/common/logo"

const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container-page flex flex-col items-center gap-4 py-6 md:flex-row md:justify-between">
        <Logo className="text-[1.7rem]" />
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
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
