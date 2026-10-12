import {
  Bell,
  BellRing,
  Building2,
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  FileSpreadsheet,
  Globe,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Presentation,
  ScanFace,
  ScrollText,
  School,
  Timer,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
  badge?: "inbox" | "alerts"
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Super Admin navigation. `exact` items match only their own path (the dashboard index
 * route). The System group is Super Admin only, and academics are reached from each
 * school's page instead.
 */
export const NAV_SUPER: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Organisation",
    items: [
      { label: "Schools", to: "/admin/schools", icon: School },
      { label: "Users", to: "/admin/users", icon: Users },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Teachers", to: "/admin/teachers", icon: Presentation },
      { label: "Students", to: "/admin/students", icon: GraduationCap },
      { label: "Parents", to: "/admin/parents", icon: UsersRound },
    ],
  },
  {
    label: "Attendance",
    items: [
      { label: "Student attendance", to: "/admin/attendance", icon: ClipboardCheck },
      { label: "Face registry", to: "/admin/faces", icon: ScanFace },
      { label: "Teacher attendance", to: "/admin/teacher-attendance", icon: Timer },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Notifications", to: "/admin/notifications", icon: Bell },
      { label: "Inbox", to: "/admin/inbox", icon: Inbox, badge: "inbox" },
    ],
  },
  {
    label: "Data",
    items: [{ label: "Reports", to: "/admin/reports", icon: FileSpreadsheet }],
  },
  {
    label: "System",
    items: [
      { label: "Website", to: "/admin/website", icon: Globe },
      { label: "Activity logs", to: "/admin/logs", icon: ScrollText },
    ],
  },
  {
    label: "Account",
    items: [{ label: "My profile", to: "/admin/profile", icon: UserCog }],
  },
]

/**
 * School Admins see the same pages scoped to their school, without the schools
 * directory or System group; "My school" takes its place and adds Academics.
 */
export const NAV_SCHOOL: NavGroup[] = NAV_SUPER.filter((group) => group.label !== "System").map((group) => ({
  ...group,
  label: group.label === "Organisation" ? "My school" : group.label,
  items: [
    ...group.items.map((item) =>
      item.to === "/admin/schools"
        ? { label: "School profile", to: "/school/my-school", icon: Building2 }
        : { ...item, label: item.label === "Users" ? "Staff accounts" : item.label, to: item.to.replace(/^\/admin/, "/school") }
    ),
    ...(group.label === "Organisation" ? [{ label: "Academics", to: "/school/academics", icon: CalendarRange }] : []),
  ],
}))

/** Teachers work inside their own class section and track their own check-ins. */
export const NAV_TEACHER: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", to: "/teacher", icon: LayoutDashboard, end: true },
      { label: "My attendance", to: "/teacher/my-attendance", icon: CalendarCheck },
    ],
  },
  {
    label: "My class",
    items: [
      { label: "Students", to: "/teacher/students", icon: GraduationCap },
      { label: "Parents", to: "/teacher/parents", icon: UsersRound },
    ],
  },
  {
    label: "Attendance",
    items: [
      { label: "Class attendance", to: "/teacher/attendance", icon: ClipboardCheck },
      { label: "Face registry", to: "/teacher/faces", icon: ScanFace },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Notify parents", to: "/teacher/notifications", icon: Bell },
      { label: "Inbox", to: "/teacher/inbox", icon: Inbox, badge: "inbox" },
    ],
  },
  {
    label: "Data",
    items: [{ label: "Reports", to: "/teacher/reports", icon: FileSpreadsheet }],
  },
  {
    label: "Account",
    items: [{ label: "My profile", to: "/teacher/profile", icon: UserCog }],
  },
]

/** Parents follow their own children: attendance, alerts and school announcements. */
export const NAV_PARENT: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/parent", icon: LayoutDashboard, end: true }],
  },
  {
    label: "My children",
    items: [
      { label: "Attendance", to: "/parent/attendance", icon: ClipboardCheck },
      { label: "Attendance alerts", to: "/parent/alerts", icon: BellRing, badge: "alerts" },
    ],
  },
  {
    label: "Communication",
    items: [{ label: "School notices", to: "/parent/inbox", icon: Inbox, badge: "inbox" }],
  },
  {
    label: "Account",
    items: [{ label: "My profile", to: "/parent/profile", icon: UserCog }],
  },
]

/** Breadcrumb labels for path segments. */
export const SEGMENT_LABEL: Record<string, string> = {
  admin: "Dashboard",
  school: "Dashboard",
  teacher: "Dashboard",
  parent: "Dashboard",
  alerts: "Attendance alerts",
  "my-attendance": "My attendance",
  "my-school": "School profile",
  schools: "Schools",
  users: "Users",
  academics: "Academics",
  teachers: "Teachers",
  students: "Students",
  parents: "Parents",
  attendance: "Student attendance",
  faces: "Face registry",
  "teacher-attendance": "Teacher attendance",
  notifications: "Notifications",
  new: "Compose",
  inbox: "Inbox",
  profile: "My profile",
  reports: "Reports",
  logs: "Activity logs",
  website: "Website",
}
