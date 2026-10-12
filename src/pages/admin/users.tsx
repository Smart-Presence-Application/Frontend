import { useState, type FormEvent } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { KeyRound, LoaderCircle, Power, PowerOff, Save, Users, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState, FormAlert } from "@/components/admin/states"
import {
  ActiveBadge,
  ClearFiltersButton,
  Field,
  FilterSelect,
  Panel,
  PersonAvatar,
  PersonCell,
  Pill,
  SearchInput,
  type Tone,
} from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useAuth } from "@/context/auth"
import { usePanel } from "@/context/panel"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useFormErrors } from "@/hooks/use-form-errors"
import { useUrlState } from "@/hooks/use-url-state"
import { usersApi } from "@/lib/endpoints"
import { formatDateTime, ROLE_LABEL } from "@/lib/format"
import type { Role, User } from "@/lib/types"

const EMPTY = new Set<number | string>()
const ROLE_TONE: Record<Role, Tone> = { SUPER_ADMIN: "dark", SCHOOL_ADMIN: "green", TEACHER: "amber", PARENT: "gray" }

/** User accounts. Selection is tied to the current page and filters, since it only makes sense for what is on screen. */
export default function UsersPage() {
  const panel = usePanel()
  const url = useUrlState()
  const [selection, setSelection] = useState<{ view: string; ids: Set<number | string> }>({ view: "", ids: new Set() })
  const [bulkAction, setBulkAction] = useState<boolean | null>(null)
  const [openUser, setOpenUser] = useState<User | null>(null)

  const params = {
    page: url.page,
    page_size: url.pageSize,
    search: url.get("search"),
    role: url.get("role"),
    is_active: url.get("is_active"),
    joined_after: url.get("joined_after"),
    joined_before: url.get("joined_before"),
    ordering: url.get("ordering", "-date_joined"),
  }
  const query = useQuery({ queryKey: ["users", params], queryFn: () => usersApi.list(params), placeholderData: keepPreviousData })

  const view = url.params.toString()
  const selected = selection.view === view ? selection.ids : EMPTY
  const setSelected = (ids: Set<number | string>) => setSelection({ view, ids })

  const bulkMutation = useApiMutation((is_active: boolean) => usersApi.bulkStatus([...selected].map(Number), is_active), {
    invalidate: [["users"], ["dashboard"]],
    onSuccess: () => {
      setSelected(new Set())
      setBulkAction(null)
    },
  })

  const columns: Column<User>[] = [
    {
      key: "user",
      header: "User",
      cell: (u) => <PersonCell name={u.name} sub={u.email ?? u.phone_number} src={u.profile_image} />,
    },
    { key: "role", header: "Role", cell: (u) => <Pill tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Pill> },
    { key: "phone", header: "Mobile", hideBelow: "md", cell: (u) => u.phone_number ?? "-" },
    { key: "gender", header: "Gender", hideBelow: "xl", cell: (u) => (u.gender ? u.gender[0] + u.gender.slice(1).toLowerCase() : "-") },
    {
      key: "updated",
      header: "Last updated",
      hideBelow: "lg",
      cell: (u) => <span className="text-sm text-muted-foreground">{formatDateTime(u.updated_at)}</span>,
    },
    { key: "status", header: "Status", cell: (u) => <ActiveBadge active={u.is_active} /> },
  ]

  const filtered = !!(params.search || params.role || params.is_active || params.joined_after || params.joined_before)

  return (
    <>
      <PageHeader
        title={panel.kind === "school" ? "Staff accounts" : "Users"}
        icon={Users}
        description={
          panel.kind === "school"
            ? "Sign-in accounts for you and your school's teachers."
            : "Every account on the platform: school admins, teachers and parents."
        }
      />

      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search name, email or mobile" />
            <FilterSelect
              label="Role"
              value={params.role}
              onChange={(v) => url.set({ role: v })}
              allLabel="All roles"
              options={(panel.kind === "school" ? (["SCHOOL_ADMIN", "TEACHER"] as Role[]) : (Object.keys(ROLE_LABEL) as Role[])).map((r) => ({
                value: r,
                label: ROLE_LABEL[r],
              }))}
            />
            <FilterSelect
              label="Status"
              value={params.is_active}
              onChange={(v) => url.set({ is_active: v })}
              allLabel="Any status"
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label="Joined after"
                value={params.joined_after}
                onChange={(e) => url.set({ joined_after: e.target.value })}
                className="h-9 w-full sm:w-38"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                aria-label="Joined before"
                value={params.joined_before}
                onChange={(e) => url.set({ joined_before: e.target.value })}
                className="h-9 w-full sm:w-38"
              />
            </div>
            <FilterSelect
              label="Sort by"
              value={url.get("ordering")}
              onChange={(v) => url.set({ ordering: v })}
              allLabel="Newest first"
              options={[
                { value: "date_joined", label: "Oldest first" },
                { value: "name", label: "Name A to Z" },
                { value: "-name", label: "Name Z to A" },
                { value: "-last_login", label: "Recently active" },
              ]}
            />
            <ClearFiltersButton
              show={filtered}
              onClick={() => url.set({ search: null, role: null, is_active: null, joined_after: null, joined_before: null })}
            />
          </>
        }
        footer={
          query.data && (
            <Pagination
              count={query.data.count}
              page={url.page}
              pageSize={url.pageSize}
              onPageChange={(page) => url.set({ page })}
              onPageSizeChange={(size) => url.set({ page_size: size })}
            />
          )
        }
      >
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b bg-primary/5"
            >
              <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="text-sm font-medium">{selected.size} selected</span>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setBulkAction(true)}>
                    <Power /> Activate
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setBulkAction(false)}>
                    <PowerOff /> Deactivate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    <X /> Clear
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <DataTable
          columns={columns}
          rows={query.data?.results}
          rowKey={(u) => u.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={setOpenUser}
          selectable
          selected={selected}
          onSelectedChange={setSelected}
          empty={<EmptyState icon={Users} title="No users found" description="Try a different search or clear the filters." />}
        />
      </Panel>

      <UserSheet user={openUser} onClose={() => setOpenUser(null)} onChanged={setOpenUser} />

      <ConfirmDialog
        open={bulkAction !== null}
        onOpenChange={(o) => !o && setBulkAction(null)}
        destructive={bulkAction === false}
        icon={bulkAction ? Power : PowerOff}
        title={`${bulkAction ? "Activate" : "Deactivate"} ${selected.size} account(s)?`}
        description={
          bulkAction
            ? "Selected accounts will be able to sign in again."
            : "Selected accounts are signed out of SmartPresence and each user receives a deactivation email."
        }
        confirmLabel={bulkAction ? "Activate" : "Deactivate"}
        loading={bulkMutation.isPending}
        onConfirm={() => bulkAction !== null && bulkMutation.mutate(bulkAction)}
      />
    </>
  )
}

/** The body is keyed by user so form state and errors start fresh for each person opened. */
function UserSheet({ user, onClose, onChanged }: { user: User | null; onClose: () => void; onChanged: (u: User) => void }) {
  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {user && <UserSheetBody key={user.id} user={user} onChanged={onChanged} />}
      </SheetContent>
    </Sheet>
  )
}

/** Edits one user. The phone number is sent only when filled, since the API expects exactly 10 digits. Nobody can deactivate their own account or a Super Admin here. */
function UserSheetBody({ user, onChanged }: { user: User; onChanged: (u: User) => void }) {
  const { user: me } = useAuth()
  const [statusOpen, setStatusOpen] = useState(false)
  const profileErrors = useFormErrors()
  const passwordErrors = useFormErrors()
  const [gender, setGender] = useState<string>(user.gender ?? "")

  const update = useApiMutation((body: Record<string, unknown>) => usersApi.update(user.id, body), {
    invalidate: [["users"]],
    toastError: false,
    onError: profileErrors.capture,
    onSuccess: onChanged,
  })
  const password = useApiMutation(
    ({ body }: { body: Record<string, unknown>; form: HTMLFormElement }) => usersApi.setPassword(user.id, body),
    {
      toastError: false,
      onError: passwordErrors.capture,
      onSuccess: (_, { form }) => form.reset(),
    },
  )
  const status = useApiMutation(() => usersApi.setStatus(user.id, !user.is_active), {
    invalidate: [["users"], ["dashboard"]],
    onSuccess: (u) => {
      onChanged(u)
      setStatusOpen(false)
    },
  })

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
      body: { new_password: form.get("new_password"), confirm_new_password: form.get("confirm_new_password") },
      form: e.currentTarget,
    })
  }

  const isSelf = user.role === "SUPER_ADMIN" || user.id === me?.id

  return (
    <>
      <SheetHeader className="border-b">
        <div className="flex items-center gap-3">
          <PersonAvatar name={user.name} src={user.profile_image} className="size-14" />
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg">{user.name}</SheetTitle>
            <SheetDescription className="truncate">{user.email ?? user.phone_number}</SheetDescription>
            <div className="mt-1.5 flex gap-2">
              <Pill tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Pill>
              <ActiveBadge active={user.is_active} />
            </div>
          </div>
        </div>
      </SheetHeader>

      <div className="grid gap-6 px-4 pb-6">
        <form key={`p-${user.id}`} onSubmit={saveProfile} className="grid gap-4">
          <h3 className="text-sm font-semibold">Profile</h3>
          <FormAlert message={profileErrors.form} />
          <Field label="Full name" htmlFor="u-name" required error={profileErrors.fields.name}>
            <Input id="u-name" name="name" required maxLength={150} defaultValue={user.name} />
          </Field>
          <Field label="Mobile number" htmlFor="u-phone" error={profileErrors.fields.phone_number} hint="10 digits">
            <Input id="u-phone" name="phone_number" inputMode="numeric" maxLength={10} defaultValue={user.phone_number ?? ""} />
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
            {update.isPending ? <LoaderCircle className="animate-spin" /> : <Save />} Save profile
          </Button>
        </form>

        <Separator />

        <form key={`pw-${user.id}`} onSubmit={savePassword} className="grid gap-4">
          <div>
            <h3 className="text-sm font-semibold">Set a new password</h3>
            <p className="text-xs text-muted-foreground">At least 12 characters with a mix of letters, numbers or symbols.</p>
          </div>
          <FormAlert message={passwordErrors.form} />
          <Field label="New password" htmlFor="u-np" error={passwordErrors.fields.new_password}>
            <Input id="u-np" name="new_password" type="password" autoComplete="new-password" required minLength={12} />
          </Field>
          <Field label="Confirm new password" htmlFor="u-cnp" error={passwordErrors.fields.confirm_new_password}>
            <Input id="u-cnp" name="confirm_new_password" type="password" autoComplete="new-password" required minLength={12} />
          </Field>
          <Button type="submit" variant="outline" disabled={password.isPending} className="justify-self-start">
            {password.isPending ? <LoaderCircle className="animate-spin" /> : <KeyRound />} Update password
          </Button>
        </form>

        {!isSelf && (
          <>
            <Separator />
            <div className="grid gap-3">
              <div>
                <h3 className="text-sm font-semibold">Account access</h3>
                <p className="text-xs text-muted-foreground">
                  {user.is_active ? "Deactivating signs the user out and emails them." : "Activate to let this user sign in again."}
                </p>
              </div>
              <Button
                variant={user.is_active ? "destructive" : "default"}
                onClick={() => setStatusOpen(true)}
                className="justify-self-start"
              >
                {user.is_active ? <PowerOff /> : <Power />}
                {user.is_active ? "Deactivate account" : "Activate account"}
              </Button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        destructive={user.is_active}
        icon={user.is_active ? PowerOff : Power}
        title={user.is_active ? `Deactivate ${user.name}?` : `Activate ${user.name}?`}
        description={user.is_active ? "They will be signed out and receive a deactivation email." : "They will be able to sign in again."}
        confirmLabel={user.is_active ? "Deactivate" : "Activate"}
        loading={status.isPending}
        onConfirm={() => status.mutate()}
      />
    </>
  )
}
