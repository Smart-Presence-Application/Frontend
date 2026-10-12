import { api, downloadFile, request, toFormData, type Paginated, type QueryParams } from "./api"
import type {
  AIJob,
  AcademicYear,
  AttendanceAlert,
  AttendanceSession,
  AttendanceSessionDetail,
  BulkResult,
  SchoolCalendar,
  ChildAttendance,
  ClassSection,
  FaceRegisterResult,
  FaceStatus,
  Holiday,
  InboxItem,
  NamedSchoolItem,
  Parent,
  ParentProfile,
  ReportInfo,
  Recipient,
  SchoolDetail,
  SchoolListItem,
  SentNotification,
  Student,
  StudentWithFaceJob,
  Teacher,
  TeacherAttendanceRecord,
  TeacherAttendanceSettings,
  TeacherProfile,
  TeacherSummaryRow,
  User,
  WorkingDay,
} from "./types"

type Body = Record<string, unknown>
const list = <T>(path: string) => (params?: QueryParams) => api<Paginated<T>>(path, { params })
const get = <T>(path: string) => (id: number | string) => api<T>(`${path}${id}/`)
const post = <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "POST", body })
const patch = <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body })
const del = <T = unknown>(path: string) => request<T>(path, { method: "DELETE" })

/** Every list in this API is paginated; this pulls the count only. */
export const countOf = (path: string, params?: QueryParams) =>
  api<Paginated<unknown>>(path, { params: { ...params, page_size: 1 } }).then((d) => d.count)

export const profileApi = {
  get: () => api<{ user: User }>("auth/profile/"),
  update: (body: Body) => patch<{ user: User }>("auth/profile/", body),
  updateImage: (file: File) => patch<{ user: User }>("auth/profile/image/", toFormData({ profile_image: file })),
  changePassword: (body: Body) => post("auth/profile/change-password/", body),
}

export const usersApi = {
  list: list<User>("auth/users/"),
  get: (id: number) => api<User>(`auth/users/${id}/`),
  update: (id: number, body: Body) => patch<User>(`auth/users/${id}/`, body),
  setPassword: (id: number, body: Body) => post(`auth/users/${id}/change-password/`, body),
  setStatus: (id: number, is_active: boolean) => patch<User>(`auth/users/${id}/status/`, { is_active }),
  bulkStatus: (user_ids: number[], is_active: boolean) =>
    post<{ requested: number; matched: number; updated: number; skipped_ids: number[] }>("auth/users/bulk-status/", {
      user_ids,
      is_active,
    }),
}

/** Schools; `me` is the School Admin's own school. */
export const schoolsApi = {
  list: list<SchoolListItem>("schools/"),
  get: get<SchoolDetail>("schools/"),
  create: (body: Body) => post<SchoolDetail>("schools/", body),
  update: (id: number, body: Body | FormData) => patch<SchoolDetail>(`schools/${id}/`, body),
  remove: (id: number) => del(`schools/${id}/`),
  setStatus: (id: number, status: "ACTIVE" | "INACTIVE") => patch<SchoolDetail>(`schools/${id}/status/`, { status }),
  me: () => api<SchoolDetail>("schools/me/"),
  updateMyLogo: (file: File) => patch<SchoolDetail>("schools/me/logo/", toFormData({ logo: file })),
}

function crud<T>(base: string) {
  return {
    list: list<T>(base),
    get: get<T>(base),
    update: (id: number, body: Body) => patch<T>(`${base}${id}/`, body),
    remove: (id: number) => del(`${base}${id}/`),
  }
}

export const academicsApi = {
  years: {
    ...crud<AcademicYear>("academics/years/"),
    create: (body: Body) => post<AcademicYear>("academics/years/", body),
    activate: (id: number) => post(`academics/years/${id}/activate/`),
  },
  classes: {
    ...crud<NamedSchoolItem>("academics/classes/"),
    create: (items: { name: string; school: number }[]) => post<BulkResult>("academics/classes/", items),
  },
  sections: {
    ...crud<NamedSchoolItem>("academics/sections/"),
    create: (items: { name: string; school: number }[]) => post<BulkResult>("academics/sections/", items),
  },
  classSections: {
    ...crud<ClassSection>("academics/class-sections/"),
    create: (items: { academic_year: number; school_class: number; section: number }[]) =>
      post<BulkResult<ClassSection>>("academics/class-sections/", items),
  },
  holidays: {
    ...crud<Holiday>("academics/holidays/"),
    create: (body: Body) => post<Holiday>("academics/holidays/", body),
  },
  workingDays: {
    ...crud<WorkingDay>("academics/working-days/"),
    create: (body: Body) => post<WorkingDay>("academics/working-days/", body),
    markWeekends: (body: Body) =>
      post<{ matched: number; created: number; updated: number; skipped: number }>(
        "academics/working-days/mark-weekends/",
        body
      ),
  },
}

/** Read-only school calendar for every role, scoped to the user's own school. */
export const calendarApi = {
  get: (params: { date_from: string; date_to: string; school?: number | null }) => api<SchoolCalendar>("academics/calendar/", { params }),
}

/** Teachers; `me` is the signed-in teacher's own record. */
export const teachersApi = {
  list: list<Teacher>("teachers/"),
  get: get<Teacher>("teachers/"),
  create: (body: Body) => post<Teacher>("teachers/", body),
  bulkUpload: (file: File, school: number) =>
    post<{ created: number; teachers: Teacher[] }>("teachers/bulk-upload/", toFormData({ file, school })),
  update: (id: number, body: Body) => patch<Teacher>(`teachers/${id}/`, body),
  remove: (id: number) => del(`teachers/${id}/`),
  setStatus: (id: number, is_active: boolean) => patch<Teacher>(`teachers/${id}/status/`, { is_active }),
  assignSection: (id: number, class_section: number) => post<Teacher>(`teachers/${id}/class-section/`, { class_section }),
  revokeSection: (id: number) => del<Teacher>(`teachers/${id}/class-section/`),
  transfer: (id: number, class_section: number) => post(`teachers/${id}/transfer/`, { class_section }),
  me: () => api<TeacherProfile>("teachers/me/"),
}

/**
 * Students. With a photo, `create` and `setImage` return a `face_job` that registers
 * the face in the background (the new photo is saved once it has). `promote` moves
 * students into another class section (School and Super Admins).
 */
export const studentsApi = {
  list: list<Student>("students/"),
  get: get<Student>("students/"),
  create: (body: Body | FormData) => post<StudentWithFaceJob>("students/", body),
  bulkUpload: (file: File, school: number, class_section: number) =>
    post<{ created: number; students: Student[] }>(
      "students/bulk-upload/",
      toFormData({ file, school, class_section })
    ),
  update: (id: number, body: Body) => patch<Student>(`students/${id}/`, body),
  remove: (id: number) => del(`students/${id}/`),
  setImage: (id: number, file: File) =>
    patch<StudentWithFaceJob>(`students/${id}/image/`, toFormData({ profile_image: file })),
  promote: (body: { student_ids: number[]; to_class_section: number | null; roll_numbers: "keep" | "renumber" | "alphabetical" }) =>
    post<{ promoted: number; to_class_section: number }>("students/promote/", body),
}

/** Parents; `bulkUpload` takes a CSV of student_id, name, phone_number (`school` is needed by Super Admins only). */
export const parentsApi = {
  list: list<Parent>("parents/"),
  get: get<Parent>("parents/"),
  create: (body: Body) => post<Parent>("parents/", body),
  bulkUpload: (file: File, school?: number | null) =>
    post<{
      created: number
      linked: number
      already_linked: number
      rows: { row: number; student_id: string; student_name: string; phone_number: string; parent: number; created: boolean; already_linked: boolean }[]
      parents: Parent[]
    }>("parents/bulk-upload/", toFormData({ file, school })),
  update: (id: number, body: Body) => patch<Parent>(`parents/${id}/`, body),
  resetPassword: (id: number) => post<Parent>(`parents/${id}/reset-password/`),
  unlinkStudent: (id: number, studentPk: number) =>
    del<{ parent_deleted: boolean }>(`parents/${id}/students/${studentPk}/`),
}

const SA = "student-attendance/"

/** Background AI jobs; see `lib/jobs.ts` for waiting on one. */
export const jobsApi = {
  get: <T = unknown>(id: string) => api<AIJob<T>>(`${SA}jobs/${id}/`),
}

/**
 * Face registration. `register` starts a background job whose result is the per-file
 * summary; `registerFromProfile` does the same, or answers an empty summary (total 0).
 */
export const facesApi = {
  list: list<FaceStatus>(`${SA}faces/`),
  register: (fields: Body) => post<AIJob<FaceRegisterResult>>(`${SA}faces/register/`, toFormData(fields)),
  registerFromProfile: (body: Body) =>
    post<AIJob<FaceRegisterResult> | FaceRegisterResult>(`${SA}faces/register-from-profile/`, body),
  remove: (studentPk: number) => del(`${SA}faces/${studentPk}/`),
}

/**
 * Student attendance sessions. `verify` starts a background job whose result names the
 * saved draft session; `remove` (admins only) deletes a session and its records, locked or not.
 */
export const sessionsApi = {
  list: list<AttendanceSession>(`${SA}sessions/`),
  get: get<AttendanceSessionDetail>(`${SA}sessions/`),
  verify: (fields: Body) => post<AIJob<{ session: number }>>(`${SA}verify/`, toFormData(fields)),
  createManual: (body: Body) => post<AttendanceSessionDetail>(`${SA}sessions/`, body),
  updateRecords: (id: number, records: { student: number; status: string; remarks?: string }[]) =>
    patch<AttendanceSessionDetail>(`${SA}sessions/${id}/records/`, { records }),
  lock: (id: number) => post<AttendanceSessionDetail>(`${SA}sessions/${id}/lock/`),
  unlock: (id: number) => post<AttendanceSessionDetail>(`${SA}sessions/${id}/unlock/`),
  remove: (id: number) => del<{ id: number; class_section: number; date: string }>(`${SA}sessions/${id}/`),
}

const TA = "teacher-attendance/"
/**
 * Teacher attendance. `remove` (admins only) deletes the day and its check-in/out photos;
 * `today` is the signed-in teacher's record for today, or null before check-in.
 */
export const teacherAttendanceApi = {
  list: list<TeacherAttendanceRecord>(`${TA}records/`),
  get: get<TeacherAttendanceRecord>(`${TA}records/`),
  remove: (id: number) => del<{ id: number; teacher: number; date: string }>(`${TA}records/${id}/`),
  verify: (id: number, body: Body) => post<TeacherAttendanceRecord>(`${TA}records/${id}/verify/`, body),
  settings: (school: number) => api<TeacherAttendanceSettings>(`${TA}settings/`, { params: { school } }),
  updateSettings: (body: Body) => patch<TeacherAttendanceSettings>(`${TA}settings/`, body),
  summary: (params: QueryParams) =>
    api<{ date_from: string; date_to: string; teachers: TeacherSummaryRow[] }>(`${TA}summary/`, { params }),
  today: () => api<TeacherAttendanceRecord | null>(`${TA}today/`),
  checkIn: (image: Blob, captured_at: string) =>
    post<TeacherAttendanceRecord>(`${TA}check-in/`, toFormData({ image: new File([image], "check-in.jpg", { type: image.type }), captured_at })),
  checkOut: (image: Blob, captured_at: string) =>
    post<TeacherAttendanceRecord>(`${TA}check-out/`, toFormData({ image: new File([image], "check-out.jpg", { type: image.type }), captured_at })),
}

export const notificationsApi = {
  list: list<SentNotification>("notifications/"),
  get: get<SentNotification>("notifications/"),
  create: (body: Body | FormData) => post<SentNotification>("notifications/", body),
  remove: (id: number) => del(`notifications/${id}/`),
  recipients: (id: number, params?: QueryParams) =>
    api<Paginated<Recipient>>(`notifications/${id}/recipients/`, { params }),
}

/**
 * Parent portal, scoped to the signed-in parent's own children. `uploadChildPhoto` saves
 * the child's first photo for staff to register; once a face exists, a new photo replaces
 * it through `face_job` in the background.
 */
export const parentPortalApi = {
  me: () => api<ParentProfile>("parents/me/"),
  attendance: list<ChildAttendance>("parents/me/attendance/"),
  alerts: list<AttendanceAlert>("parents/me/notifications/"),
  alertsUnread: () => api<{ unread: number }>("parents/me/notifications/unread-count/"),
  markAlertsRead: (ids?: number[]) => post<{ updated: number }>("parents/me/notifications/read/", ids ? { ids } : {}),
  uploadChildPhoto: (studentId: number, file: File) =>
    post<StudentWithFaceJob>(`parents/me/students/${studentId}/photo/`, toFormData({ profile_image: file })),
}

/** Web Push; `publicKey` is null when the server has no VAPID keys configured. */
export const pushApi = {
  publicKey: () => api<{ public_key: string | null }>("notifications/push/public-key/").then((d) => d.public_key),
  subscribe: (subscription: PushSubscriptionJSON) => post("notifications/push/subscribe/", subscription),
  unsubscribe: (endpoint: string) => post("notifications/push/unsubscribe/", { endpoint }),
}

export const inboxApi = {
  list: list<InboxItem>("notifications/inbox/"),
  get: get<InboxItem>("notifications/inbox/"),
  unreadCount: () => api<{ unread: number }>("notifications/inbox/unread-count/"),
  markRead: (ids?: number[]) => post<{ updated: number }>("notifications/inbox/read/", ids ? { ids } : {}),
}

/**
 * Excel downloads, scoped to what the signed-in user can see. `download` takes a report's
 * key, or "all" for every allowed report in one workbook.
 */
export const reportsApi = {
  list: () => api<ReportInfo[]>("reports/"),
  download: (key: string, params?: QueryParams) => downloadFile(`reports/${key}/`, params, `smartpresence-${key}.xlsx`),
}

export interface MaintenanceSettings {
  is_enabled: boolean
  message: string
  display_message: string
  updated_by_name: string | null
  updated_at: string
}

/** Maintenance mode and activity logs. `status` is public and works during maintenance; `logs` is Super Admin only. */
export const systemApi = {
  status: () => api<{ maintenance: boolean; message: string }>("system/status/", { skipRefresh: true }),
  maintenance: () => api<MaintenanceSettings>("system/maintenance/"),
  setMaintenance: (body: { is_enabled?: boolean; message?: string }) => patch<MaintenanceSettings>("system/maintenance/", body),
  logs: (params?: QueryParams) => api<Paginated<ActivityLog>>("system/logs/", { params }),
}

export interface ActivityLog {
  id: number
  created_at: string
  actor: number | null
  actor_name: string
  actor_identifier: string
  actor_role: string
  school: number | null
  school_name: string
  action: string
  category: string
  method: string
  path: string
  status_code: number
  succeeded: boolean
  duration_ms: number
  ip_address: string
  user_agent: string
}

export interface Testimonial {
  id: number
  name: string
  role: string
  organization: string
  quote: string
  rating: number | null
  photo: string | null
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Partner {
  id: number
  name: string
  logo: string
  website: string
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ContactMessage {
  id: number
  name: string
  email: string
  phone: string
  school: string
  message: string
  email_sent: boolean
  is_read: boolean
  ip_address: string
  created_at: string
}

type PublicTestimonial = Pick<Testimonial, "id" | "name" | "role" | "organization" | "quote" | "rating" | "photo">
export type PublicPartner = Pick<Partner, "id" | "name" | "logo" | "website">

export const websiteApi = {
  testimonials: () => api<PublicTestimonial[]>("website/testimonials/", { skipRefresh: true }),
  partners: () => api<PublicPartner[]>("website/partners/", { skipRefresh: true }),
  contact: (body: { name: string; email: string; phone?: string; school?: string; message: string; turnstile_token?: string; website?: string }) =>
    request<null>("website/contact/", { method: "POST", body, skipRefresh: true }),
}

/** Super Admin management of the public website's content. */
export const websiteAdminApi = {
  testimonials: {
    list: list<Testimonial>("website/admin/testimonials/"),
    create: (form: FormData) => post<Testimonial>("website/admin/testimonials/", form),
    update: (id: number, body: FormData | Body) => patch<Testimonial>(`website/admin/testimonials/${id}/`, body),
    remove: (id: number) => del(`website/admin/testimonials/${id}/`),
  },
  partners: {
    list: list<Partner>("website/admin/partners/"),
    create: (form: FormData) => post<Partner>("website/admin/partners/", form),
    update: (id: number, body: FormData | Body) => patch<Partner>(`website/admin/partners/${id}/`, body),
    remove: (id: number) => del(`website/admin/partners/${id}/`),
  },
  messages: {
    list: list<ContactMessage>("website/admin/messages/"),
    setRead: (id: number, is_read: boolean) => patch<ContactMessage>(`website/admin/messages/${id}/`, { is_read }),
    remove: (id: number) => del(`website/admin/messages/${id}/`),
  },
}
