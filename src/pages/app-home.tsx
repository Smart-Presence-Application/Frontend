import { Navigate, useNavigate } from "react-router"
import { LogOut, UserRound } from "lucide-react"
import { toast } from "sonner"

import { PageLoader } from "@/components/common/page-loader"
import { Seo } from "@/components/common/seo"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth"

const ROLE_LABEL = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "School Admin",
  TEACHER: "Teacher",
  PARENT: "Parent",
} as const

/** Signed-in landing spot until the role dashboards are built. */
export default function AppHomePage() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === "SUPER_ADMIN") return <Navigate to="/admin" replace />
  if (user.role === "SCHOOL_ADMIN") return <Navigate to="/school" replace />
  if (user.role === "TEACHER") return <Navigate to="/teacher" replace />
  if (user.role === "PARENT") return <Navigate to="/parent" replace />

  async function handleLogout() {
    await logout()
    toast.success("You have been signed out")
    navigate("/", { replace: true })
  }

  return (
    <section className="container-page flex min-h-[80dvh] items-center justify-center pt-24 pb-16">
      <Seo title="Dashboard | SmartPresence" description="Your SmartPresence portal." path="/app" noIndex />
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl">
        <span className="mx-auto flex size-16 items-center justify-center overflow-hidden rounded-full bg-accent text-primary">
          {user.profile_image ? (
            <img src={user.profile_image} alt={`Photo of ${user.name}`} className="size-full object-cover" />
          ) : (
            <UserRound className="size-8" />
          )}
        </span>
        <h1 className="mt-4 text-2xl font-bold">Hello, {user.name}</h1>
        <p className="mt-1 text-sm text-primary">{ROLE_LABEL[user.role]}</p>
        <p className="mt-4 text-muted-foreground">You are signed in. Your dashboard is on its way.</p>
        <Button variant="outline" className="mt-6 h-10" onClick={handleLogout}>
          <LogOut /> Sign out
        </Button>
      </div>
    </section>
  )
}
