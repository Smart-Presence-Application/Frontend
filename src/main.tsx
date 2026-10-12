import { lazy, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { MotionConfig } from "motion/react"

import { MaintenanceGate, RouteError } from "@/components/common/app-status"
import { RootLayout } from "@/components/layout/root-layout"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/context/auth"
import { initAnalytics } from "@/lib/analytics"
import { registerServiceWorker } from "@/lib/pwa"
import { queryClient } from "@/lib/query-client"
import "./index.css"

const HomePage = lazy(() => import("@/pages/home"))
const LoginPage = lazy(() => import("@/pages/login"))
const AppHomePage = lazy(() => import("@/pages/app-home"))
const NotFoundPage = lazy(() => import("@/pages/not-found"))
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy"))

const AdminLayout = lazy(() => import("@/components/admin/layout/admin-layout"))
const Dashboard = lazy(() => import("@/pages/admin/dashboard"))
const Schools = lazy(() => import("@/pages/admin/schools/list"))
const SchoolDetail = lazy(() => import("@/pages/admin/schools/detail"))
const Users = lazy(() => import("@/pages/admin/users"))
const Academics = lazy(() => import("@/pages/admin/academics"))
const Teachers = lazy(() => import("@/pages/admin/teachers/list"))
const TeacherDetail = lazy(() => import("@/pages/admin/teachers/detail"))
const Students = lazy(() => import("@/pages/admin/students"))
const Parents = lazy(() => import("@/pages/admin/parents"))
const Sessions = lazy(() => import("@/pages/admin/attendance/sessions"))
const SessionDetail = lazy(() => import("@/pages/admin/attendance/session-detail"))
const Faces = lazy(() => import("@/pages/admin/attendance/faces"))
const TeacherAttendance = lazy(() => import("@/pages/admin/teacher-attendance"))
const Notifications = lazy(() => import("@/pages/admin/notifications/list"))
const ComposeNotification = lazy(() => import("@/pages/admin/notifications/compose"))
const NotificationDetail = lazy(() => import("@/pages/admin/notifications/detail"))
const InboxPage = lazy(() => import("@/pages/admin/inbox"))
const Profile = lazy(() => import("@/pages/admin/profile"))
const Reports = lazy(() => import("@/pages/admin/reports"))
const Logs = lazy(() => import("@/pages/admin/logs"))
const Website = lazy(() => import("@/pages/admin/website"))
const MySchool = lazy(() => import("@/pages/admin/schools/my-school"))
const TeacherDashboard = lazy(() => import("@/pages/teacher/dashboard"))
const MyAttendance = lazy(() => import("@/pages/teacher/my-attendance"))
const ParentDashboard = lazy(() => import("@/pages/parent/dashboard"))
const ChildAttendance = lazy(() => import("@/pages/parent/attendance"))
const AttendanceAlerts = lazy(() => import("@/pages/parent/alerts"))

/**
 * Every route sits behind the maintenance check, with a friendly error screen. Panel
 * pages are lazy chunks; the School Admin and teacher panels reuse the admin pages,
 * which the backend scopes to the admin's school or the teacher's class section.
 */
const router = createBrowserRouter([
  {
    element: <MaintenanceGate />,
    errorElement: <RouteError />,
    children: [
      {
        element: <RootLayout />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/login", element: <LoginPage /> },
          { path: "/app", element: <AppHomePage /> },
          { path: "/privacy-policy", element: <PrivacyPolicyPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
      {
        path: "/admin",
        element: <AdminLayout panel="super" />,
        children: [
          { path: "schools", element: <Schools /> },
          { path: "schools/:id", element: <SchoolDetail /> },
          { path: "logs", element: <Logs /> },
          { path: "website", element: <Website /> },
          ...sharedAdminRoutes(),
        ],
      },
      {
        path: "/school",
        element: <AdminLayout panel="school" />,
        children: [{ path: "my-school", element: <MySchool /> }, ...sharedAdminRoutes()],
      },
      {
        path: "/teacher",
        element: <AdminLayout panel="teacher" />,
        children: [
          { index: true, element: <TeacherDashboard /> },
          { path: "my-attendance", element: <MyAttendance /> },
          { path: "students", element: <Students /> },
          { path: "parents", element: <Parents /> },
          { path: "attendance", element: <Sessions /> },
          { path: "attendance/:id", element: <SessionDetail /> },
          { path: "faces", element: <Faces /> },
          { path: "notifications", element: <Notifications /> },
          { path: "notifications/new", element: <ComposeNotification /> },
          { path: "notifications/:id", element: <NotificationDetail /> },
          { path: "inbox", element: <InboxPage /> },
          { path: "reports", element: <Reports /> },
          { path: "profile", element: <Profile /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
      {
        path: "/parent",
        element: <AdminLayout panel="parent" />,
        children: [
          { index: true, element: <ParentDashboard /> },
          { path: "attendance", element: <ChildAttendance /> },
          { path: "alerts", element: <AttendanceAlerts /> },
          { path: "inbox", element: <InboxPage /> },
          { path: "profile", element: <Profile /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

function sharedAdminRoutes() {
  return [
    { index: true, element: <Dashboard /> },
    { path: "users", element: <Users /> },
    { path: "academics", element: <Academics /> },
    { path: "teachers", element: <Teachers /> },
    { path: "teachers/:id", element: <TeacherDetail /> },
    { path: "students", element: <Students /> },
    { path: "parents", element: <Parents /> },
    { path: "attendance", element: <Sessions /> },
    { path: "attendance/:id", element: <SessionDetail /> },
    { path: "faces", element: <Faces /> },
    { path: "teacher-attendance", element: <TeacherAttendance /> },
    { path: "notifications", element: <Notifications /> },
    { path: "notifications/new", element: <ComposeNotification /> },
    { path: "notifications/:id", element: <NotificationDetail /> },
    { path: "inbox", element: <InboxPage /> },
    { path: "reports", element: <Reports /> },
    { path: "profile", element: <Profile /> },
    { path: "*", element: <NotFoundPage /> },
  ]
}

registerServiceWorker()
initAnalytics()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster position="top-center" richColors />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MotionConfig>
  </StrictMode>,
)
