import { useQueryClient } from "@tanstack/react-query"
import { BellOff, BellRing, Download, LoaderCircle, MonitorSmartphone } from "lucide-react"
import { toast } from "sonner"

import { useEnablePush, usePushState } from "@/components/admin/layout/pwa-banners"
import { Pill } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InstallButton, useInstall } from "@/components/common/install-button"
import { useAuth } from "@/context/auth"
import { disablePush, setPushOptOut } from "@/lib/push"

const STATE_TEXT = {
  on: "You get notifications on this device, even when the app is closed.",
  off: "Turn on to hear about new messages, attendance alerts and check-ins.",
  denied: "Notifications are blocked for this site. Allow them in your browser's site settings, then come back.",
  unsupported: "This browser cannot receive push notifications. On iPhone, add SmartPresence to the Home Screen first.",
} as const

/**
 * Push notifications and app install for the current device. Install also shows on
 * iPhone, where the button explains Add to Home Screen. Turning push off is remembered,
 * since the installed app otherwise turns notifications on by itself.
 */
export function DeviceCard() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data: state = "off", isLoading } = usePushState()
  const { enable, pending } = useEnablePush()
  const installable = useInstall().available

  async function turnOff() {
    await disablePush().catch(() => {})
    if (user) setPushOptOut(user.id, true)
    queryClient.setQueryData(["push-state"], "off")
    toast.success("Notifications are off for this device")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <MonitorSmartphone className="size-4 text-primary" /> This device
        </CardTitle>
        <CardDescription>Settings here apply only to the browser or app you are using now.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {state === "on" ? <BellRing className="size-5" /> : <BellOff className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-medium">
              Notifications
              <Pill tone={state === "on" ? "green" : state === "denied" ? "red" : "gray"} dot>
                {state === "on" ? "On" : state === "denied" ? "Blocked" : state === "unsupported" ? "Not available" : "Off"}
              </Pill>
            </p>
            <p className="text-sm text-muted-foreground">{STATE_TEXT[state]}</p>
          </div>
          {state === "on" ? (
            <Button variant="outline" onClick={() => void turnOff()}>
              Turn off
            </Button>
          ) : (
            state === "off" && (
              <Button onClick={() => void enable()} disabled={pending || isLoading}>
                {pending ? <LoaderCircle className="animate-spin" /> : <BellRing />} Turn on
              </Button>
            )
          )}
        </div>

        {installable && (
          <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Download className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Install the app</p>
              <p className="text-sm text-muted-foreground">Open SmartPresence from your home screen or desktop and use it offline.</p>
            </div>
            <InstallButton variant="outline">Install</InstallButton>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
