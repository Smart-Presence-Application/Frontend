import { Navigate } from "react-router"
import { CalendarRange, School } from "lucide-react"

import { PageHeader } from "@/components/admin/page-header"
import { EmptyState } from "@/components/admin/states"
import { usePanel } from "@/context/panel"
import { useUrlState } from "@/hooks/use-url-state"
import { panelPath } from "@/lib/panel"
import { AcademicsTabs } from "./academics-tabs"

/** The School Admin's academic setup, pinned to their own school by useUrlState. Super Admins are redirected to the school's page, where they manage it. */
export default function AcademicsPage() {
  const url = useUrlState()
  const { kind } = usePanel()
  const school = Number(url.get("school")) || null

  if (kind === "super") {
    const tab = url.get("tab")
    return <Navigate to={school ? panelPath(`/admin/schools/${school}${tab ? `?tab=${tab}` : ""}#academics`) : panelPath("/admin/schools")} replace />
  }

  return (
    <>
      <PageHeader
        title="Academics"
        icon={CalendarRange}
        description="Academic years, classes, sections, holidays and the working-day calendar for your school."
      />
      {school ? (
        <AcademicsTabs school={school} />
      ) : (
        <div className="rounded-2xl border border-dashed bg-card">
          <EmptyState icon={School} title="No school linked" description="Your account is not linked to a school yet." />
        </div>
      )}
    </>
  )
}
