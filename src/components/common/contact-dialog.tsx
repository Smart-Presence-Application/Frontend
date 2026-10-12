import { useState, type FormEvent, type ReactNode } from "react"
import { CircleCheck, LoaderCircle, Send } from "lucide-react"
import { motion } from "motion/react"

import { Turnstile, turnstileEnabled } from "@/components/common/turnstile"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { trackEvent } from "@/lib/analytics"
import { ApiError, errorMessage } from "@/lib/api"
import { websiteApi } from "@/lib/endpoints"

/** The website's contact form. Sent to the team's inbox by the backend; spam-checked by Cloudflare Turnstile. */
export function ContactDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setTimeout(() => setSent(false), 200)
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {sent ? <ThankYou onClose={() => setOpen(false)} /> : <ContactForm onSent={() => setSent(true)} />}
      </DialogContent>
    </Dialog>
  )
}

/**
 * The hidden `website` field is a honeypot that only bots fill in. After a failed send
 * the Turnstile widget is reset, since each token is single use.
 */
function ContactForm({ onSent }: { onSent: () => void }) {
  const [token, setToken] = useState("")
  const [resetKey, setResetKey] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? "").trim()

    setPending(true)
    setError(null)
    setFieldErrors({})
    try {
      await websiteApi.contact({
        name: value("name"),
        email: value("email"),
        phone: value("phone"),
        school: value("school"),
        message: value("message"),
        turnstile_token: token,
        website: value("website"),
      })
      trackEvent("generate_lead", { form: "contact" })
      onSent()
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.fields)
      setError(errorMessage(err))
      setResetKey((k) => k + 1)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Talk to the SmartPresence team</DialogTitle>
        <DialogDescription>Tell us about your school and we will help you plan a rollout or set up a walkthrough.</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-4" noValidate={false}>
        {error && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="contact-name">Your name</Label>
            <Input id="contact-name" name="name" required maxLength={120} autoComplete="name" placeholder="Priya Sharma" aria-invalid={!!fieldErrors.name || undefined} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" name="email" type="email" required autoComplete="email" placeholder="you@gmail.com" aria-invalid={!!fieldErrors.email || undefined} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-phone">
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="contact-phone" name="phone" type="tel" maxLength={20} autoComplete="tel" placeholder="9876543210" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact-school">
              School <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="contact-school" name="school" maxLength={160} autoComplete="organization" placeholder="Your school's name" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-message">How can we help?</Label>
          <Textarea
            id="contact-message"
            name="message"
            required
            minLength={10}
            maxLength={3000}
            rows={4}
            placeholder="Number of students, classes, and what you would like to see."
            aria-invalid={!!fieldErrors.message || undefined}
          />
          {fieldErrors.message && <p className="text-sm text-destructive">{fieldErrors.message}</p>}
        </div>

        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <Turnstile onToken={setToken} resetKey={resetKey} />

        <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pending || (turnstileEnabled && !token)}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
          {pending ? "Sending" : "Send message"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          We only use your details to reply. See our{" "}
          <a href="/privacy-policy" className="underline underline-offset-4 hover:text-primary">
            privacy policy
          </a>
          .
        </p>
      </form>
    </>
  )
}

function ThankYou({ onClose }: { onClose: () => void }) {
  return (
    <div className="grid justify-items-center gap-4 py-6 text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <CircleCheck className="size-9" />
      </motion.span>
      <DialogHeader className="items-center text-center">
        <DialogTitle className="text-2xl">Thank you!</DialogTitle>
        <DialogDescription className="max-w-sm text-base">
          Your message is on its way to our team. We usually reply within one working day.
        </DialogDescription>
      </DialogHeader>
      <Button size="lg" className="mt-2 h-11 px-8" onClick={onClose}>
        Done
      </Button>
    </div>
  )
}
