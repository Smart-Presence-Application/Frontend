import { useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react"
import { Download, MonitorSmartphone, Share, SquarePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { canInstall, installApp, subscribeInstall } from "@/lib/pwa"

const standalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)

/** Whether an Install button makes sense here, and what pressing it does. iPhone and iPad have no install prompt, so there it shows Share-menu steps. */
export function useInstall() {
  const prompt = useSyncExternalStore(subscribeInstall, canInstall, () => false)
  const installed = standalone()
  const ios = !installed && isIos()
  return { available: !installed && (prompt || ios), prompt, ios, install: installApp }
}

type InstallButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  children?: ReactNode
  iconOnly?: boolean
}

/**
 * Installs SmartPresence as an app. Uses the browser's own prompt where there is
 * one (Chrome, Edge, Android) and shows Share-menu steps on iPhone and iPad.
 * Renders nothing once installed or where installing is not possible. `iconOnly`
 * renders an icon with a tooltip, for toolbars.
 */
export function InstallButton({ children = "Install app", iconOnly, ...props }: InstallButtonProps) {
  const { available, prompt, install } = useInstall()
  const [helpOpen, setHelpOpen] = useState(false)
  if (!available) return null

  const onClick = () => (prompt ? void install() : setHelpOpen(true))
  const button = iconOnly ? (
    <Button variant="ghost" size="icon-lg" aria-label="Install app" onClick={onClick} {...props}>
      <Download />
    </Button>
  ) : (
    <Button onClick={onClick} {...props}>
      <Download /> {children}
    </Button>
  )

  return (
    <>
      {iconOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>Install app</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
      <IosInstallHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}

function IosInstallHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const steps = [
    { icon: Share, text: "Tap the Share button in Safari's toolbar." },
    { icon: SquarePlus, text: "Scroll down and choose Add to Home Screen." },
    { icon: MonitorSmartphone, text: "Tap Add. SmartPresence opens from your Home Screen like any app, with notifications." },
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Install SmartPresence</DialogTitle>
          <DialogDescription>On iPhone and iPad, apps are added from Safari's Share menu.</DialogDescription>
        </DialogHeader>
        <ol className="grid gap-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-4" />
              </span>
              <p className="pt-1.5 text-sm">
                <span className="font-semibold">{i + 1}.</span> {s.text}
              </p>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
