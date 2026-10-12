import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Construction, LoaderCircle, Save } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { Pill } from "@/components/admin/ui-bits"
import { SYSTEM_STATUS_KEY } from "@/components/common/app-status"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { systemApi, type MaintenanceSettings } from "@/lib/endpoints"
import { timeAgo } from "@/lib/format"

/** Super Admins switch the whole platform into maintenance mode and back. */
export function MaintenanceCard() {
  const queryClient = useQueryClient()
  const settings = useQuery({ queryKey: ["maintenance"], queryFn: systemApi.maintenance })
  const [draft, setDraft] = useState<string | null>(null)
  const [confirmOn, setConfirmOn] = useState(false)

  const save = useApiMutation((body: { is_enabled?: boolean; message?: string }) => systemApi.setMaintenance(body), {
    onSuccess: (data: MaintenanceSettings) => {
      queryClient.setQueryData(["maintenance"], data)
      queryClient.setQueryData(SYSTEM_STATUS_KEY, { maintenance: data.is_enabled, message: data.is_enabled ? data.display_message : "" })
      setDraft(null)
      setConfirmOn(false)
    },
  })

  const data = settings.data
  const message = draft ?? data?.message ?? ""
  const on = !!data?.is_enabled

  return (
    <Card className={on ? "border-amber-500/40" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <Construction className="size-4 text-primary" /> Maintenance mode
        </CardTitle>
        <CardDescription>While on, everyone but Super Admins sees a maintenance screen.</CardDescription>
        <CardAction>
          {data && <Pill tone={on ? "amber" : "gray"} dot>{on ? "On" : "Off"}</Pill>}
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        {settings.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <>
            <label className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
              <span className="text-sm font-medium">{on ? "Platform is in maintenance" : "Platform is live"}</span>
              <Switch
                checked={on}
                disabled={save.isPending || !data}
                onCheckedChange={(next) => (next ? setConfirmOn(true) : save.mutate({ is_enabled: false }))}
                aria-label="Maintenance mode"
              />
            </label>
            <div className="grid gap-2">
              <label htmlFor="maintenance-message" className="text-sm font-medium">
                Message shown to users
              </label>
              <Textarea
                id="maintenance-message"
                value={message}
                maxLength={500}
                rows={3}
                placeholder={data?.display_message}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {data?.updated_by_name ? `Last changed by ${data.updated_by_name} ${timeAgo(data.updated_at)}` : "Leave empty for the default message."}
                </span>
                <Button size="sm" variant="outline" disabled={draft === null || save.isPending} onClick={() => save.mutate({ message })}>
                  {save.isPending ? <LoaderCircle className="animate-spin" /> : <Save />} Save
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirmOn}
        onOpenChange={setConfirmOn}
        title="Turn on maintenance mode?"
        description="School admins, teachers and parents will be shown the maintenance screen until you turn it off. You keep full access."
        confirmLabel="Turn on"
        destructive
        icon={Construction}
        loading={save.isPending}
        onConfirm={() => save.mutate({ is_enabled: true, ...(draft !== null ? { message } : {}) })}
      />
    </Card>
  )
}
