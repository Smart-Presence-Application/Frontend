import { createContext, use, type ReactNode } from "react"

import { PANEL_BASE, type PanelKind } from "@/lib/panel"
import type { ParentProfile, SchoolDetail, TeacherProfile } from "@/lib/types"

interface PanelContextValue {
  kind: PanelKind
  base: string
  school: SchoolDetail | null
  teacher: TeacherProfile | null
  parent: ParentProfile | null
  scopeSchool: { id: number; name: string } | null
}

const PanelContext = createContext<PanelContextValue>({ kind: "super", base: PANEL_BASE.super, school: null, teacher: null, parent: null, scopeSchool: null })

/**
 * Describes the current panel. `school` is the School Admin's school, `teacher` and
 * `parent` the signed-in user's own record (null in other panels), and `scopeSchool`
 * the school every list and form is pinned to in the School Admin and teacher panels.
 */
export function PanelProvider({
  kind,
  school = null,
  teacher = null,
  parent = null,
  children,
}: {
  kind: PanelKind
  school?: SchoolDetail | null
  teacher?: TeacherProfile | null
  parent?: ParentProfile | null
  children: ReactNode
}) {
  const scopeSchool = school ? { id: school.id, name: school.name } : teacher ? { id: teacher.school, name: teacher.school_name } : null
  return <PanelContext value={{ kind, base: PANEL_BASE[kind], school, teacher, parent, scopeSchool }}>{children}</PanelContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePanel() {
  return use(PanelContext)
}
