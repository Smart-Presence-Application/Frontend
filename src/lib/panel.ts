export type PanelKind = "super" | "school" | "teacher" | "parent"

export const PANEL_BASE: Record<PanelKind, string> = { super: "/admin", school: "/school", teacher: "/teacher", parent: "/parent" }

const inside = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

/** Which panel the current URL belongs to. Pages are shared, so links are resolved at call time. */
function currentPanel(): PanelKind {
  const path = window.location.pathname
  if (inside(path, "/school")) return "school"
  if (inside(path, "/teacher")) return "teacher"
  if (inside(path, "/parent")) return "parent"
  return "super"
}

/**
 * Maps an "/admin/..." path to the same page in the panel being viewed.
 * School admins have no schools directory, so school links lead to their own school;
 * teachers and parents have neither, so school links lead to their dashboard.
 */
export function panelPath(path: string): string {
  const panel = currentPanel()
  if (panel === "super") return path
  if (/^\/admin\/schools(\/|$|\?)/.test(path)) return panel === "school" ? "/school/my-school" : PANEL_BASE[panel]
  return path.replace(/^\/admin(?=\/|$|\?)/, PANEL_BASE[panel])
}
