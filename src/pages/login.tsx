import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LogIn, Mail, Phone, ScanFace, UsersRound } from "lucide-react"
import { motion } from "motion/react"
import { toast } from "sonner"

import { PageLoader } from "@/components/common/page-loader"
import { Seo } from "@/components/common/seo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/context/auth"
import { ApiError, authApi, type Role } from "@/lib/api"
import { PANEL_BASE } from "@/lib/panel"

const ROLE_BASE: Record<Role, string> = {
  SUPER_ADMIN: PANEL_BASE.super,
  SCHOOL_ADMIN: PANEL_BASE.school,
  TEACHER: PANEL_BASE.teacher,
  PARENT: PANEL_BASE.parent,
}

type Mode = "staff" | "parent"

/** Where a signed-in user goes: `next` only when it is inside their own panel, never an arbitrary URL. */
function destinationFor(role: Role, next: string | null) {
  const base = ROLE_BASE[role]
  return next === base || next?.startsWith(`${base}/`) || next?.startsWith(`${base}?`) ? next : base
}

/** Sends an already signed-in user straight to their dashboard instead of a second login. */
export default function LoginPage() {
  const { user, loading } = useAuth()
  const [searchParams] = useSearchParams()

  if (loading) return <PageLoader />
  if (user) return <Navigate to={destinationFor(user.role, searchParams.get("next"))} replace />

  return <LoginScreen />
}

/** Login form. Someone sent here from the parent panel most likely signs in with a mobile number, so it starts in parent mode. */
function LoginScreen() {
  const [mode, setMode] = useState<Mode>(() => (new URLSearchParams(window.location.search).get("next")?.startsWith(PANEL_BASE.parent) ? "parent" : "staff"))

  return (
    <>
      <Seo
        title="Login | SmartPresence"
        description="Sign in to SmartPresence as a school admin, teacher or parent."
        path="/login"
      />
      <section className="relative isolate flex min-h-dvh items-center overflow-hidden pt-24 pb-16">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div aria-hidden="true" className="absolute top-1/3 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block"
          >
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
              <ArrowLeft className="size-4" /> Back to home
            </Link>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-balance">
              Welcome back to <span className="font-logo text-6xl text-primary">SmartPresence</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Staff sign in with their school email. Parents use the mobile number registered with the school.
            </p>
            <ul className="mt-8 grid gap-4">
              {[
                { icon: ScanFace, text: "Take attendance from a single classroom photo" },
                { icon: UsersRound, text: "Teachers, students, parents and reports in one place" },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                    <item.icon className="size-5" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto w-full max-w-md"
          >
            <div className="rounded-3xl border bg-card/95 p-6 shadow-2xl shadow-primary/10 backdrop-blur sm:p-8">
              <div className="mb-6 text-center lg:hidden">
                <h1 className="text-2xl font-bold">Sign in</h1>
                <p className="mt-1 text-sm text-muted-foreground">Access your SmartPresence portal</p>
              </div>
              <p className="mb-6 hidden text-xl font-semibold lg:block">Sign in to your account</p>

              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 group-data-horizontal/tabs:h-11">
                  <TabsTrigger value="staff" className="h-full gap-2 rounded-lg">
                    <Mail className="size-4" /> Staff
                  </TabsTrigger>
                  <TabsTrigger value="parent" className="h-full gap-2 rounded-lg">
                    <Phone className="size-4" /> Parent
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="staff" className="mt-6">
                  <LoginForm mode="staff" />
                </TabsContent>
                <TabsContent value="parent" className="mt-6">
                  <LoginForm mode="parent" />
                </TabsContent>
              </Tabs>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Forgot your password? Ask your school admin to reset it.
            </p>
          </motion.div>
        </div>
      </section>
    </>
  )
}

function LoginForm({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const identifier = String(form.get("identifier") ?? "").trim()
    const password = String(form.get("password") ?? "")

    setPending(true)
    setFieldErrors({})
    setFormError(null)
    try {
      let user
      if (mode === "staff") {
        user = (await authApi.staffLogin(identifier, password)).user
        setUser(user)
        toast.success(`Welcome back, ${user.name.split(" ")[0]}`)
      } else {
        const result = await authApi.parentLogin(identifier, password)
        user = result.user
        setUser(user)
        toast.success(`Welcome, ${user.name.split(" ")[0]}`, {
          description: result.must_change_password ? "Please change the password your school gave you." : undefined,
        })
      }
      navigate(destinationFor(user.role, searchParams.get("next")), { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        const { non_field_errors, ...rest } = err.errors
        const mapped: Record<string, string> = {}
        for (const [key, value] of Object.entries(rest)) {
          if (Array.isArray(value)) mapped[key === "email" || key === "phone_number" ? "identifier" : key] = String(value[0])
        }
        setFieldErrors(mapped)
        setFormError(Array.isArray(non_field_errors) ? String(non_field_errors[0]) : Object.keys(mapped).length ? null : err.message)
      } else {
        setFormError("Could not reach the server. Check your connection and try again.")
      }
    } finally {
      setPending(false)
    }
  }

  const isStaff = mode === "staff"

  return (
    <form onSubmit={handleSubmit} noValidate={false} className="grid gap-4">
      {formError && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {formError}
        </motion.p>
      )}

      <div className="grid gap-2">
        <Label htmlFor={`${mode}-identifier`}>{isStaff ? "Email address" : "Mobile number"}</Label>
        <div className="relative">
          {isStaff ? (
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          ) : (
            <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            id={`${mode}-identifier`}
            name="identifier"
            required
            type={isStaff ? "email" : "tel"}
            inputMode={isStaff ? "email" : "numeric"}
            autoComplete={isStaff ? "email" : "tel-national"}
            pattern={isStaff ? undefined : "[0-9]{10}"}
            maxLength={isStaff ? undefined : 10}
            title={isStaff ? undefined : "Enter your 10 digit mobile number"}
            placeholder={isStaff ? "you@gmail.com" : "9876543210"}
            aria-invalid={!!fieldErrors.identifier || undefined}
            className="h-11 pl-9"
          />
        </div>
        {fieldErrors.identifier && <p className="text-sm text-destructive">{fieldErrors.identifier}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${mode}-password`}>Password</Label>
        <div className="relative">
          <Input
            id={`${mode}-password`}
            name="password"
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            aria-invalid={!!fieldErrors.password || undefined}
            className="h-11 pr-11"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
        {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
      </div>

      <Button type="submit" size="lg" disabled={pending} className="mt-2 h-11 text-base shadow-lg shadow-primary/25">
        {pending ? <LoaderCircle className="animate-spin" /> : <LogIn />}
        {pending ? "Signing in" : "Sign in"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {isStaff
          ? "For admins and teachers."
          : "Use the mobile number and password shared by your school."}
      </p>
    </form>
  )
}
