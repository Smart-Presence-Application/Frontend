import { BarChart3, ListChecks, Settings2, UserRoundCheck } from "lucide-react"
import { motion } from "motion/react"

import { PageHeader } from "@/components/admin/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUrlState } from "@/hooks/use-url-state"
import { RecordsTab } from "./records-tab"
import { SettingsTab } from "./settings-tab"
import { SummaryTab } from "./summary-tab"

const TABS = [
  { value: "records", label: "Records", icon: ListChecks },
  { value: "summary", label: "Summary", icon: BarChart3 },
  { value: "settings", label: "Settings", icon: Settings2 },
] as const

type Tab = (typeof TABS)[number]["value"]

export default function TeacherAttendancePage() {
  const url = useUrlState()
  const raw = url.get("tab", "records")
  const tab: Tab = TABS.some((t) => t.value === raw) ? (raw as Tab) : "records"

  return (
    <>
      <PageHeader
        title="Teacher attendance"
        icon={UserRoundCheck}
        description="Review teachers' camera check-ins and check-outs, verify their days and track working hours."
      />
      <Tabs value={tab} onValueChange={(v) => url.set({ tab: v === "records" ? null : v })} className="gap-4">
        <TabsList className="h-9 w-full sm:w-fit">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-3">
              <t.icon /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {t.value === "records" && <RecordsTab url={url} />}
              {t.value === "summary" && <SummaryTab url={url} />}
              {t.value === "settings" && <SettingsTab url={url} />}
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </>
  )
}
