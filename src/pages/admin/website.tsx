import { useState, type FormEvent } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Building2, Globe, Inbox, LoaderCircle, Mail, MailOpen, MessageSquareQuote, Pencil, Plus, Star, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import { MaintenanceCard } from "@/components/admin/maintenance-card"
import { FileDropzone } from "@/components/admin/file-dropzone"
import { PageHeader } from "@/components/admin/page-header"
import { Pagination } from "@/components/admin/pagination"
import { EmptyState, FormAlert } from "@/components/admin/states"
import { DetailRow, Field, FilterSelect, Panel, Pill, SearchInput } from "@/components/admin/ui-bits"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useApiMutation } from "@/hooks/use-api-mutation"
import { useUrlState } from "@/hooks/use-url-state"
import { errorMessage, toFormData } from "@/lib/api"
import { websiteAdminApi, type ContactMessage, type Partner, type Testimonial } from "@/lib/endpoints"
import { formatDateTime, timeAgo } from "@/lib/format"

type TabId = "testimonials" | "partners" | "enquiries"

/** Super Admins manage what the public website shows, and read its contact enquiries. */
export default function WebsitePage() {
  const url = useUrlState()
  const raw = url.get("tab", "testimonials")
  const tab: TabId = raw === "partners" || raw === "enquiries" ? raw : "testimonials"

  return (
    <>
      <PageHeader
        title="Website"
        icon={Globe}
        description="Maintenance mode, testimonials and partner logos on the home page, and enquiries from the contact form. Sections with nothing published stay hidden."
      />
      <div className="mb-6">
        <MaintenanceCard />
      </div>
      <Tabs value={tab} onValueChange={(v) => url.set({ tab: v === "testimonials" ? null : v, search: null, page: null })} className="gap-4">
        <TabsList className="h-10 w-max">
          <TabsTrigger value="testimonials" className="px-3">
            <MessageSquareQuote /> Testimonials
          </TabsTrigger>
          <TabsTrigger value="partners" className="px-3">
            <Building2 /> Partners
          </TabsTrigger>
          <TabsTrigger value="enquiries" className="px-3">
            <Inbox /> Enquiries
          </TabsTrigger>
        </TabsList>
        <TabsContent value="testimonials">{tab === "testimonials" && <TestimonialsTab />}</TabsContent>
        <TabsContent value="partners">{tab === "partners" && <PartnersTab />}</TabsContent>
        <TabsContent value="enquiries">{tab === "enquiries" && <EnquiriesTab />}</TabsContent>
      </Tabs>
    </>
  )
}

function PublishedPill({ published }: { published: boolean }) {
  return (
    <Pill tone={published ? "green" : "gray"} dot>
      {published ? "Published" : "Hidden"}
    </Pill>
  )
}

function TestimonialsTab() {
  const url = useUrlState()
  const params = { page: url.page, page_size: url.pageSize, search: url.get("search") }
  const query = useQuery({ queryKey: ["website-admin", "testimonials", params], queryFn: () => websiteAdminApi.testimonials.list(params), placeholderData: keepPreviousData })
  const [editing, setEditing] = useState<Testimonial | "new" | null>(null)
  const [deleting, setDeleting] = useState<Testimonial | null>(null)
  const remove = useApiMutation((id: number) => websiteAdminApi.testimonials.remove(id), {
    invalidate: [["website-admin", "testimonials"], ["website"]],
    onSuccess: () => setDeleting(null),
  })

  const columns: Column<Testimonial>[] = [
    {
      key: "who",
      header: "Person",
      cell: (t) => (
        <div className="flex items-center gap-3">
          {t.photo ? (
            <img src={t.photo} alt={`Photo of ${t.name}`} className="size-9 rounded-full object-cover" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquareQuote className="size-4" />
            </span>
          )}
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{t.name}</p>
            <p className="truncate text-xs text-muted-foreground">{[t.role, t.organization].filter(Boolean).join(", ") || "-"}</p>
          </div>
        </div>
      ),
    },
    { key: "quote", header: "Quote", hideBelow: "md", cell: (t) => <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">{t.quote}</p> },
    {
      key: "rating",
      header: "Rating",
      hideBelow: "lg",
      cell: (t) =>
        t.rating ? (
          <span className="flex items-center gap-1 text-sm">
            <Star className="size-3.5 fill-amber-400 text-amber-400" /> {t.rating}
          </span>
        ) : (
          "-"
        ),
    },
    { key: "order", header: "Order", hideBelow: "lg", cell: (t) => <span className="tabular-nums">{t.sort_order}</span> },
    { key: "status", header: "Status", cell: (t) => <PublishedPill published={t.is_published} /> },
    {
      key: "actions",
      header: "",
      cell: (t) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search name, school or quote" />
            <Button className="h-9 sm:ml-auto" onClick={() => setEditing("new")}>
              <Plus /> Add testimonial
            </Button>
          </>
        }
        footer={query.data && <Pagination count={query.data.count} page={url.page} pageSize={url.pageSize} onPageChange={(page) => url.set({ page })} onPageSizeChange={(size) => url.set({ page_size: size })} />}
      >
        <DataTable
          columns={columns}
          rows={query.data?.results}
          rowKey={(t) => t.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={
            <EmptyState
              icon={MessageSquareQuote}
              title="No testimonials yet"
              description="The home page hides the testimonials section until you publish one."
              action={
                <Button onClick={() => setEditing("new")}>
                  <Plus /> Add testimonial
                </Button>
              }
            />
          }
        />
      </Panel>
      <TestimonialDialog key={editing === "new" ? "new" : editing?.id ?? "closed"} target={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        destructive
        icon={Trash2}
        title={`Delete ${deleting?.name}'s testimonial?`}
        description="It disappears from the home page straight away."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  )
}

/** Creates or edits a testimonial. Multipart cannot send null, so an empty rating is sent as an empty value to clear it. */
function TestimonialDialog({ target, onClose }: { target: Testimonial | "new" | null; onClose: () => void }) {
  const existing = target && target !== "new" ? target : null
  const [published, setPublished] = useState(existing?.is_published ?? true)
  const [rating, setRating] = useState(existing?.rating ? String(existing.rating) : "")
  const [photo, setPhoto] = useState<File[]>([])

  const save = useApiMutation(
    (form: FormData) => (existing ? websiteAdminApi.testimonials.update(existing.id, form) : websiteAdminApi.testimonials.create(form)),
    { invalidate: [["website-admin", "testimonials"], ["website"]], toastError: false, onSuccess: onClose }
  )

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const form = toFormData({
      name: f.get("name"),
      role: f.get("role"),
      organization: f.get("organization"),
      quote: f.get("quote"),
      sort_order: f.get("sort_order") || 0,
      is_published: published,
      photo: photo[0],
    })
    form.append("rating", rating)
    save.mutate(form)
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit testimonial" : "Add testimonial"}</DialogTitle>
          <DialogDescription>Shown in the testimonials section of the home page while published.</DialogDescription>
        </DialogHeader>
        <form id="testimonial-form" onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="t-name" required>
              <Input id="t-name" name="name" required maxLength={120} defaultValue={existing?.name} placeholder="Anita Verma" />
            </Field>
            <Field label="Role" htmlFor="t-role" hint="e.g. Principal, Parent">
              <Input id="t-role" name="role" maxLength={120} defaultValue={existing?.role} placeholder="Principal" />
            </Field>
          </div>
          <Field label="School or organisation" htmlFor="t-org">
            <Input id="t-org" name="organization" maxLength={160} defaultValue={existing?.organization} placeholder="Greenfield Public School" />
          </Field>
          <Field label="Quote" htmlFor="t-quote" required hint="Up to 600 characters">
            <Textarea id="t-quote" name="quote" required maxLength={600} rows={4} defaultValue={existing?.quote} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rating">
              <FilterSelect
                label="Rating"
                value={rating}
                onChange={setRating}
                allLabel="No rating"
                className="sm:w-full"
                options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? "" : "s"}` }))}
              />
            </Field>
            <Field label="Order" htmlFor="t-order" hint="Lower numbers show first">
              <Input id="t-order" name="sort_order" type="number" min={0} defaultValue={existing?.sort_order ?? 0} />
            </Field>
          </div>
          <Field label="Photo" hint={existing?.photo ? "Leave empty to keep the current photo" : "Optional; initials are shown without one"}>
            <FileDropzone files={photo} onChange={setPhoto} accept="image/png,image/jpeg,image/webp" preview camera={false} label="Drop a photo or click to browse" />
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
            <span className="text-sm font-medium">Published on the home page</span>
            <Switch checked={published} onCheckedChange={setPublished} />
          </label>
          <FormAlert message={save.error ? errorMessage(save.error) : null} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="testimonial-form" disabled={save.isPending}>
            {save.isPending && <LoaderCircle className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PartnersTab() {
  const url = useUrlState()
  const params = { page: url.page, page_size: url.pageSize, search: url.get("search") }
  const query = useQuery({ queryKey: ["website-admin", "partners", params], queryFn: () => websiteAdminApi.partners.list(params), placeholderData: keepPreviousData })
  const [editing, setEditing] = useState<Partner | "new" | null>(null)
  const [deleting, setDeleting] = useState<Partner | null>(null)
  const remove = useApiMutation((id: number) => websiteAdminApi.partners.remove(id), {
    invalidate: [["website-admin", "partners"], ["website"]],
    onSuccess: () => setDeleting(null),
  })

  const columns: Column<Partner>[] = [
    {
      key: "logo",
      header: "Partner",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-20 items-center justify-center rounded-lg border bg-background p-1.5">
            <img src={p.logo} alt={`${p.name} logo`} className="max-h-full max-w-full object-contain" />
          </span>
          <span className="font-medium">{p.name}</span>
        </div>
      ),
    },
    {
      key: "website",
      header: "Website",
      hideBelow: "md",
      cell: (p) =>
        p.website ? (
          <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
            {p.website.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          "-"
        ),
    },
    { key: "order", header: "Order", hideBelow: "lg", cell: (p) => <span className="tabular-nums">{p.sort_order}</span> },
    { key: "status", header: "Status", cell: (p) => <PublishedPill published={p.is_published} /> },
    {
      key: "actions",
      header: "",
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search partners" />
            <Button className="h-9 sm:ml-auto" onClick={() => setEditing("new")}>
              <Plus /> Add partner
            </Button>
          </>
        }
        footer={query.data && <Pagination count={query.data.count} page={url.page} pageSize={url.pageSize} onPageChange={(page) => url.set({ page })} onPageSizeChange={(size) => url.set({ page_size: size })} />}
      >
        <DataTable
          columns={columns}
          rows={query.data?.results}
          rowKey={(p) => p.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={
            <EmptyState
              icon={Building2}
              title="No partners yet"
              description="Upload partner logos to show them on the home page."
              action={
                <Button onClick={() => setEditing("new")}>
                  <Plus /> Add partner
                </Button>
              }
            />
          }
        />
      </Panel>
      <PartnerDialog key={editing === "new" ? "new" : editing?.id ?? "closed"} target={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        destructive
        icon={Trash2}
        title={`Delete ${deleting?.name}?`}
        description="The logo is removed from the home page and storage."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  )
}

function PartnerDialog({ target, onClose }: { target: Partner | "new" | null; onClose: () => void }) {
  const existing = target && target !== "new" ? target : null
  const [published, setPublished] = useState(existing?.is_published ?? true)
  const [logo, setLogo] = useState<File[]>([])
  const [logoError, setLogoError] = useState<string | null>(null)

  const save = useApiMutation((form: FormData) => (existing ? websiteAdminApi.partners.update(existing.id, form) : websiteAdminApi.partners.create(form)), {
    invalidate: [["website-admin", "partners"], ["website"]],
    toastError: false,
    onSuccess: onClose,
  })

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!existing && !logo[0]) {
      setLogoError("Upload the partner's logo.")
      return
    }
    const f = new FormData(e.currentTarget)
    save.mutate(
      toFormData({
        name: f.get("name"),
        website: f.get("website"),
        sort_order: f.get("sort_order") || 0,
        is_published: published,
        logo: logo[0],
      })
    )
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit partner" : "Add partner"}</DialogTitle>
          <DialogDescription>Partner logos appear in the "Our partners" section of the home page.</DialogDescription>
        </DialogHeader>
        <form id="partner-form" onSubmit={submit} className="grid gap-4">
          <Field label="Name" htmlFor="p-name" required hint="Also used as the logo's alt text">
            <Input id="p-name" name="name" required maxLength={160} defaultValue={existing?.name} placeholder="Greenfield Public School" />
          </Field>
          <Field label="Website" htmlFor="p-site" hint="Optional; the logo links here">
            <Input id="p-site" name="website" type="url" defaultValue={existing?.website} placeholder="https://example.com" />
          </Field>
          <Field label="Order" htmlFor="p-order" hint="Lower numbers show first">
            <Input id="p-order" name="sort_order" type="number" min={0} defaultValue={existing?.sort_order ?? 0} />
          </Field>
          <Field label="Logo" required={!existing} error={logoError ?? undefined} hint={existing ? "Leave empty to keep the current logo" : "PNG with a transparent background works best (JPG and WEBP too)"}>
            {existing && !logo.length && (
              <span className="mb-2 flex h-16 w-40 items-center justify-center rounded-xl border bg-background p-2">
                <img src={existing.logo} alt={`${existing.name} logo`} className="max-h-full max-w-full object-contain" />
              </span>
            )}
            <FileDropzone
              files={logo}
              onChange={(f) => {
                setLogo(f)
                setLogoError(null)
              }}
              accept="image/png,image/jpeg,image/webp"
              preview
              camera={false}
              label="Drop the logo or click to browse"
            />
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
            <span className="text-sm font-medium">Published on the home page</span>
            <Switch checked={published} onCheckedChange={setPublished} />
          </label>
          <FormAlert message={save.error ? errorMessage(save.error) : null} />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="partner-form" disabled={save.isPending}>
            {save.isPending && <LoaderCircle className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EnquiriesTab() {
  const url = useUrlState()
  const params = { page: url.page, page_size: url.pageSize, search: url.get("search"), is_read: url.get("is_read") }
  const query = useQuery({ queryKey: ["website-admin", "messages", params], queryFn: () => websiteAdminApi.messages.list(params), placeholderData: keepPreviousData })
  const [open, setOpen] = useState<ContactMessage | null>(null)
  const [deleting, setDeleting] = useState<ContactMessage | null>(null)
  const markRead = useApiMutation(({ id, read }: { id: number; read: boolean }) => websiteAdminApi.messages.setRead(id, read), {
    invalidate: [["website-admin", "messages"]],
    toastSuccess: false,
  })
  const remove = useApiMutation((id: number) => websiteAdminApi.messages.remove(id), {
    invalidate: [["website-admin", "messages"]],
    onSuccess: () => {
      setDeleting(null)
      setOpen(null)
    },
  })

  function view(m: ContactMessage) {
    setOpen(m)
    if (!m.is_read) markRead.mutate({ id: m.id, read: true })
  }

  const columns: Column<ContactMessage>[] = [
    {
      key: "from",
      header: "From",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {m.is_read ? <MailOpen className="size-4" /> : <Mail className="size-4" />}
            {!m.is_read && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" aria-label="Unread" />}
          </span>
          <div className="min-w-0 text-sm">
            <p className={m.is_read ? "truncate" : "truncate font-semibold"}>{m.name}</p>
            <p className="truncate text-xs text-muted-foreground">{m.school || m.email}</p>
          </div>
        </div>
      ),
    },
    { key: "message", header: "Message", hideBelow: "md", cell: (m) => <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">{m.message}</p> },
    {
      key: "email",
      header: "Emailed",
      hideBelow: "lg",
      cell: (m) => (
        <Pill tone={m.email_sent ? "green" : "amber"} dot>
          {m.email_sent ? "Sent" : "Not sent"}
        </Pill>
      ),
    },
    { key: "when", header: "Received", cell: (m) => <span className="text-sm whitespace-nowrap">{timeAgo(m.created_at)}</span> },
  ]

  return (
    <>
      <Panel
        toolbar={
          <>
            <SearchInput value={params.search} onChange={(v) => url.set({ search: v })} placeholder="Search name, email, school or message" />
            <FilterSelect
              label="Status"
              value={params.is_read}
              onChange={(v) => url.set({ is_read: v })}
              allLabel="All enquiries"
              options={[
                { value: "false", label: "Unread" },
                { value: "true", label: "Read" },
              ]}
            />
          </>
        }
        footer={query.data && <Pagination count={query.data.count} page={url.page} pageSize={url.pageSize} onPageChange={(page) => url.set({ page })} onPageSizeChange={(size) => url.set({ page_size: size })} />}
      >
        <DataTable
          columns={columns}
          rows={query.data?.results}
          rowKey={(m) => m.id}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          onRowClick={view}
          empty={<EmptyState icon={Inbox} title="No enquiries yet" description="Messages sent from the website's contact form appear here." />}
        />
      </Panel>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.name}</SheetTitle>
                <SheetDescription>{formatDateTime(open.created_at)}</SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 px-4 pb-6">
                <div className="divide-y rounded-xl border px-3">
                  <DetailRow label="Email">
                    <a href={`mailto:${open.email}`} className="text-primary hover:underline">
                      {open.email}
                    </a>
                  </DetailRow>
                  <DetailRow label="Phone">{open.phone || "-"}</DetailRow>
                  <DetailRow label="School">{open.school || "-"}</DetailRow>
                  <DetailRow label="Emailed to the team">{open.email_sent ? "Yes" : "No (check the email settings)"}</DetailRow>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-line">{open.message}</div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <a href={`mailto:${open.email}?subject=${encodeURIComponent("Re: your SmartPresence enquiry")}`}>
                      <Mail /> Reply by email
                    </a>
                  </Button>
                  <Button variant="outline" onClick={() => markRead.mutate({ id: open.id, read: false }, { onSuccess: () => setOpen(null) })}>
                    Mark unread
                  </Button>
                  <Button variant="ghost" className="text-destructive" onClick={() => setDeleting(open)}>
                    <Trash2 /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        destructive
        icon={Trash2}
        title="Delete this enquiry?"
        description="It is removed permanently."
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  )
}
