import { CalendarCheck, CalendarDays, CalendarRange, Layers, LayoutGrid, Shapes, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUrlState } from "@/hooks/use-url-state"
import { ClassSectionsTab } from "./class-sections-tab"
import { clearedFilters } from "./helpers"
import { HolidaysTab } from "./holidays-tab"
import { NamesTab } from "./names-tab"
import { WorkingDaysTab } from "./working-days-tab"
import { YearsTab } from "./years-tab"

type TabId = "years" | "classes" | "sections" | "class-sections" | "holidays" | "working-days"

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "years", label: "Academic years", icon: CalendarRange },
  { id: "classes", label: "Classes", icon: Shapes },
  { id: "sections", label: "Sections", icon: Layers },
  { id: "class-sections", label: "Class sections", icon: LayoutGrid },
  { id: "holidays", label: "Holidays", icon: CalendarDays },
  { id: "working-days", label: "Working days", icon: CalendarCheck },
]

/**
 * One school's academic setup: years, classes, sections, class sections,
 * holidays and working days. Used on the School Admin's Academics page and
 * inside each school's page for Super Admins.
 */
export function AcademicsTabs({ school }: { school: number }) {
  const url = useUrlState()
  const rawTab = url.get("tab", "years")
  const tab: TabId = TABS.some((t) => t.id === rawTab) ? (rawTab as TabId) : "years"

  const goTo = (next: TabId) => url.set({ ...clearedFilters(), tab: next === "years" ? null : next })

  function renderTab(id: TabId) {
    switch (id) {
      case "years":
        return <YearsTab school={school} />
      case "classes":
        return <NamesTab kind="classes" school={school} />
      case "sections":
        return <NamesTab kind="sections" school={school} />
      case "class-sections":
        return <ClassSectionsTab school={school} onCreateYear={() => goTo("years")} />
      case "holidays":
        return <HolidaysTab school={school} onCreateYear={() => goTo("years")} />
      case "working-days":
        return <WorkingDaysTab school={school} onCreateYear={() => goTo("years")} />
    }
  }

  return (
    <Tabs value={tab} onValueChange={(v) => goTo(v as TabId)} className="gap-4">
      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <TabsList className="h-10 w-max">
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="flex-none px-3">
              <Icon /> {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {TABS.map(({ id }) => (
        <TabsContent key={id} value={id}>
          <motion.div key={`${id}-${school}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {tab === id && renderTab(id)}
          </motion.div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
