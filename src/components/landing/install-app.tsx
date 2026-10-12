import { BellRing, Camera, CheckCircle2, CloudOff, Download, Smartphone } from "lucide-react"

import { InstallButton, useInstall } from "@/components/common/install-button"
import { Reveal } from "@/components/common/reveal"

const PERKS = [
  { icon: CloudOff, title: "Works offline", text: "Open your lists and check in without internet; it syncs when you are back." },
  { icon: BellRing, title: "Instant notifications", text: "Attendance alerts, school notices and check-in updates, even when the app is closed." },
  { icon: Camera, title: "Camera ready", text: "Check in, take classroom photos and register faces straight from your phone." },
]

/** Homepage section inviting visitors to install SmartPresence as an app. */
export function InstallApp() {
  const { available } = useInstall()
  const installed = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches

  return (
    <section aria-labelledby="install-title" className="py-16 md:py-20">
      <div className="container-page">
        <Reveal>
          <div className="relative isolate grid items-center gap-10 overflow-hidden rounded-[2rem] border bg-card p-6 shadow-sm sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:p-12">
            <div aria-hidden="true" className="absolute -top-24 -right-24 -z-10 size-80 rounded-full bg-primary/15 blur-3xl" />
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Smartphone className="size-4" /> Get the app
              </span>
              <h2 id="install-title" className="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Take SmartPresence with you
              </h2>
              <p className="mt-3 text-muted-foreground sm:text-lg">
                Install it on your phone, tablet or computer in one tap. No app store, no download to manage, and it updates itself.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                {available ? (
                  <InstallButton size="lg" className="h-12 rounded-full px-6 text-base shadow-lg shadow-primary/30">
                    Install SmartPresence
                  </InstallButton>
                ) : installed ? (
                  <p className="inline-flex items-center gap-2 font-medium text-primary">
                    <CheckCircle2 className="size-5" /> You are using the installed app
                  </p>
                ) : (
                  <p className="inline-flex items-start gap-2 text-sm text-muted-foreground">
                    <Download className="mt-0.5 size-4 shrink-0" />
                    Open this page in Chrome, Edge or Safari (iPhone) to install it. Already installed? Open it from your home screen.
                  </p>
                )}
              </div>
            </div>

            <ul className="grid gap-3">
              {PERKS.map((p) => (
                <li key={p.title} className="flex items-start gap-4 rounded-2xl border bg-background/60 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <p.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-sm text-muted-foreground">{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
