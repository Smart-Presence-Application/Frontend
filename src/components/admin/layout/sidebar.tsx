import { NavLink, useLocation } from "react-router"
import { ChevronsLeft, Layers, School, UsersRound } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { Logo } from "@/components/common/logo"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { usePanel } from "@/context/panel"
import { classSectionLabel } from "@/lib/format"
import { NAV_PARENT, NAV_SCHOOL, NAV_SUPER, NAV_TEACHER, type NavGroup, type NavItem } from "./nav"

interface SidebarNavProps {
  collapsed?: boolean
  badges?: Badges
  onNavigate?: () => void
  layoutId: string
}

function isActive(item: NavItem, pathname: string) {
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** Unread counts shown next to nav items that carry a `badge`. */
export type Badges = Record<NonNullable<NavItem["badge"]>, number>

/** `layoutId` distinguishes the desktop and mobile instances so their active pills animate independently. */
export function SidebarNav({ collapsed, badges, onNavigate, layoutId }: SidebarNavProps) {
  const { pathname } = useLocation()
  const { kind } = usePanel()
  const nav: NavGroup[] = { super: NAV_SUPER, school: NAV_SCHOOL, teacher: NAV_TEACHER, parent: NAV_PARENT }[kind]

  return (
    <nav aria-label="Admin" className="flex flex-col gap-5 px-3 py-4">
      {nav.map((group) => (
        <div key={group.label}>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase"
              >
                {group.label}
              </motion.p>
            )}
          </AnimatePresence>
          <ul className="grid gap-0.5">
            {group.items.map((item) => {
              const active = isActive(item, pathname)
              const badge = item.badge ? (badges?.[item.badge] ?? 0) : 0
              const link = (
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active ? "text-primary-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`${layoutId}-active`}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-primary shadow-md shadow-primary/25"
                    />
                  )}
                  <item.icon className="relative size-[1.15rem] shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  {!collapsed && <span className="relative truncate">{item.label}</span>}
                  {badge > 0 && (
                    <span
                      className={cn(
                        "relative ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                        active ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
                        collapsed && "absolute top-1 right-1 ml-0 h-4 min-w-4 px-1"
                      )}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </NavLink>
              )
              return (
                <li key={item.to}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/** Title and subtitle for the scope badge, per panel. */
function useScope() {
  const { school, teacher, parent } = usePanel()
  if (school) return { title: school.name, sub: school.code, mono: true }
  if (teacher) return { title: teacher.class_section_detail ? classSectionLabel(teacher.class_section_detail) : "No class assigned", sub: teacher.school_name }
  if (parent) {
    const n = parent.students.length
    const schools = [...new Set(parent.students.map((s) => s.school_name))]
    return { title: n === 1 ? parent.students[0].name : `${n} children`, sub: schools.join(", ") || "No school yet" }
  }
  return null
}

/**
 * Who the panel is scoped to, shown at the top of the sidebar: the managed school
 * for a School Admin, the class for a teacher, the children for a parent.
 */
export function SchoolBadge({ collapsed }: { collapsed?: boolean }) {
  const { school, teacher, parent } = usePanel()
  const scope = useScope()
  if (!scope) return null
  const { title, sub } = scope
  const logo = (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
      {school?.logo ? (
        <img src={school.logo} alt={`${school.name} logo`} className="size-full object-cover" />
      ) : teacher ? (
        <Layers className="size-4" />
      ) : parent ? (
        <UsersRound className="size-4" />
      ) : (
        <School className="size-4" />
      )}
    </span>
  )
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center px-3 pt-4">{logo}</div>
        </TooltipTrigger>
        <TooltipContent side="right">{title}</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <div className="mx-3 mt-4 flex items-center gap-3 rounded-xl border bg-card/60 p-2.5">
      {logo}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className={cn("truncate text-[11px] text-muted-foreground", scope.mono && "font-mono")}>{sub}</p>
      </div>
    </div>
  )
}

export function DesktopSidebar({ collapsed, onToggle, badges }: { collapsed: boolean; onToggle: () => void; badges: Badges }) {
  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 264 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar lg:flex"
    >
      <div className={cn("flex h-16 shrink-0 items-center border-b px-5", collapsed && "justify-center px-0")}>
        {collapsed ? (
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary font-logo text-2xl font-bold text-primary-foreground">S</span>
        ) : (
          <Logo className="text-[1.7rem]" />
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <SchoolBadge collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} badges={badges} layoutId="desktop" />
      </div>
      <div className="border-t p-3">
        <Button
          variant="ghost"
          onClick={onToggle}
          className={cn("h-10 w-full justify-start gap-3 rounded-xl px-3 text-muted-foreground", collapsed && "justify-center px-0")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronsLeft className={cn("size-[1.15rem] transition-transform duration-300", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </Button>
      </div>
    </motion.aside>
  )
}
