import { useRef, useState, type FormEvent } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { BadgeCheck, CalendarDays, Camera, Eye, EyeOff, IdCard, KeyRound, Layers, LoaderCircle, Lock, Mail, MapPin, Phone, Save, School, ShieldCheck, UserCog } from "lucide-react"
import { motion } from "motion/react"

import { PageHeader } from "@/components/admin/page-header"
import { DeviceCard } from "@/components/common/device-card"
import { FormAlert } from "@/components/admin/states"
import { DetailRow, Field, PersonAvatar, Pill } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth"
import { usePanel } from "@/context/panel"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { profileApi, teachersApi } from "@/lib/endpoints"
import { classSectionLabel, formatDate, formatDateTime, ROLE_LABEL } from "@/lib/format"
import type { TeacherProfile } from "@/lib/types"

/** Rough strength meter matching the backend rule: 12+ chars mixing letters, numbers or symbols. */
function strength(pw: string) {
  let score = 0
  if (pw.length >= 12) score++
  if (pw.length >= 16) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}
const STRENGTH = ["Too short", "Weak", "Fair", "Good", "Strong"]

/** The signed-in user's profile and password. The phone number is sent only when filled, since the API expects exactly 10 digits; a parent changing their password also clears the parent dashboard's "change your password" reminder. */
export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const { teacher, parent } = usePanel()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const profileErrors = useFormErrors()
  const passwordErrors = useFormErrors()
  const [gender, setGender] = useState<string>(user?.gender ?? "")
  const [newPassword, setNewPassword] = useState("")
  const [show, setShow] = useState(false)

  const update = useApiMutation((body: Record<string, unknown>) => profileApi.update(body), {
    toastError: false,
    onError: profileErrors.capture,
    onSuccess: (d) => setUser(d.user),
  })
  const image = useApiMutation((file: File) => profileApi.updateImage(file), { onSuccess: (d) => setUser(d.user) })
  const password = useApiMutation(
    ({ body }: { body: Record<string, unknown>; form: HTMLFormElement }) => profileApi.changePassword(body),
    {
      toastError: false,
      onError: passwordErrors.capture,
      onSuccess: (_, { form }) => {
        if (parent) queryClient.invalidateQueries({ queryKey: ["parent", "me"] })
        form.reset()
        setNewPassword("")
      },
    }
  )

  if (!user) return null

  function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    profileErrors.reset()
    const form = new FormData(e.currentTarget)
    update.mutate({
      name: String(form.get("name")).trim(),
      ...(String(form.get("phone_number")).trim() ? { phone_number: String(form.get("phone_number")).trim() } : {}),
      ...(gender ? { gender } : {}),
    })
  }

  function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    passwordErrors.reset()
    const form = new FormData(e.currentTarget)
    password.mutate({
      body: {
        old_password: form.get("old_password"),
        new_password: form.get("new_password"),
        confirm_new_password: form.get("confirm_new_password"),
      },
      form: e.currentTarget,
    })
  }

  const score = strength(newPassword)

  return (
    <>
      <PageHeader
        title="My profile"
        icon={UserCog}
        description={teacher ? "Your teaching record, account details and password." : "Your account details and password."}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden pt-0">
            <div className="h-24 bg-gradient-to-br from-primary via-primary/80 to-foreground" />
            <CardContent className="-mt-12 grid justify-items-center gap-3 text-center">
              <div className="group relative">
                <PersonAvatar name={user.name} src={user.profile_image} className="size-24 text-2xl ring-4 ring-card" />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={image.isPending}
                  aria-label="Change profile photo"
                  className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-110"
                >
                  {image.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) image.mutate(file)
                    e.target.value = ""
                  }}
                />
              </div>
              <div>
                <p className="text-lg font-semibold">{user.name}</p>
                <Pill tone="dark" className="mt-1">
                  <ShieldCheck className="size-3" /> {ROLE_LABEL[user.role]}
                </Pill>
              </div>
              <div className="w-full divide-y border-t pt-1 text-left">
                {!parent && (
                  <DetailRow label="Email" icon={Mail}>
                    {user.email}
                  </DetailRow>
                )}
                <DetailRow label="Mobile" icon={Phone}>
                  {user.phone_number}
                </DetailRow>
                <DetailRow label="Last updated" icon={UserCog}>
                  {formatDateTime(user.updated_at)}
                </DetailRow>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 lg:col-span-2">
          {teacher && <TeachingRecord initial={teacher} />}

          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Personal details</CardTitle>
              <CardDescription>
                {parent ? "Your mobile number is how you sign in. If you change it, sign in with the new number next time." : "Your email is your sign-in and cannot be changed here."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormAlert message={profileErrors.form} />
                </div>
                <Field label="Full name" htmlFor="p-name" required error={profileErrors.fields.name} className="sm:col-span-2">
                  <Input id="p-name" name="name" required maxLength={150} defaultValue={user.name} />
                </Field>
                <Field label="Mobile number" htmlFor="p-phone" error={profileErrors.fields.phone_number} hint="10 digits">
                  <Input id="p-phone" name="phone_number" inputMode="numeric" maxLength={10} defaultValue={user.phone_number ?? ""} />
                </Field>
                <Field label="Gender" error={profileErrors.fields.gender}>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="w-full" aria-label="Gender">
                      <SelectValue placeholder="Not specified" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Button type="submit" disabled={update.isPending} className="justify-self-start">
                  {update.isPending ? <LoaderCircle className="animate-spin" /> : <Save />} Save changes
                </Button>
              </form>
            </CardContent>
          </Card>

          <DeviceCard />

          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">Change password</CardTitle>
              <CardDescription>Use at least 12 characters with a mix of letters, numbers or symbols.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormAlert message={passwordErrors.form} />
                </div>
                <Field label="Current password" htmlFor="old_password" required error={passwordErrors.fields.old_password} className="sm:col-span-2">
                  <Input id="old_password" name="old_password" type={show ? "text" : "password"} autoComplete="current-password" required />
                </Field>
                <Field label="New password" htmlFor="new_password" required error={passwordErrors.fields.new_password}>
                  <div className="relative">
                    <Input
                      id="new_password"
                      name="new_password"
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={12}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? "Hide passwords" : "Show passwords"}
                      className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                    >
                      {show ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </Field>
                <Field label="Confirm new password" htmlFor="confirm_new_password" required error={passwordErrors.fields.confirm_new_password}>
                  <Input id="confirm_new_password" name="confirm_new_password" type={show ? "text" : "password"} autoComplete="new-password" required minLength={12} />
                </Field>
                {newPassword && (
                  <div className="sm:col-span-2" aria-live="polite">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <motion.span
                          key={i}
                          animate={{ opacity: i < score ? 1 : 0.2 }}
                          className={`h-1.5 flex-1 rounded-full ${score >= 3 ? "bg-primary" : score >= 2 ? "bg-amber-500" : "bg-destructive"}`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Strength: {STRENGTH[score]}</p>
                  </div>
                )}
                <Button type="submit" disabled={password.isPending} className="justify-self-start">
                  {password.isPending ? <LoaderCircle className="animate-spin" /> : <KeyRound />} Update password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

/** A teacher's school record, read-only since the school admin maintains it. Refetched on visit so a new class assignment shows without signing in again. */
function TeachingRecord({ initial }: { initial: TeacherProfile }) {
  const { data: t = initial } = useQuery({ queryKey: ["teacher", "me"], queryFn: teachersApi.me, initialData: initial, staleTime: 0 })
  const cs = t.class_section_detail
  const address = [t.address, t.city, t.state, t.pincode, t.country].filter(Boolean).join(", ")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Teaching record</CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <Lock className="size-3.5" /> Kept by your school admin. Ask them if anything here needs changing.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div
          className={
            cs
              ? "flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4"
              : "flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300"
          }
        >
          <span className={cs ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground" : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20"}>
            <Layers className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium opacity-80">Class assignment</p>
            <p className="truncate text-lg font-semibold">{cs ? classSectionLabel(cs) : "Not assigned yet"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {cs ? `Academic year ${cs.academic_year_name}` : "You can manage students and attendance once your school admin assigns a class."}
            </p>
          </div>
          {cs && (
            <Pill tone="green" className="hidden sm:inline-flex">
              <BadgeCheck className="size-3" /> Class teacher
            </Pill>
          )}
        </div>

        <div className="grid gap-x-6 divide-y sm:grid-cols-2 sm:divide-y-0">
          <DetailRow label="Employee ID" icon={IdCard}>
            <span className="font-mono">{t.employee_id}</span>
          </DetailRow>
          <DetailRow label="School" icon={School}>
            {t.school_name}
          </DetailRow>
          <DetailRow label="Joining date" icon={CalendarDays}>
            {t.joining_date ? formatDate(t.joining_date) : null}
          </DetailRow>
          <DetailRow label="Work email" icon={Mail}>
            {t.email}
          </DetailRow>
          <div className="sm:col-span-2">
            <DetailRow label="Address" icon={MapPin}>
              {address}
            </DetailRow>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
