import type { Role, User } from "./api"

export type { Role, User }
export type Gender = "MALE" | "FEMALE" | "OTHER"
type ActiveStatus = "ACTIVE" | "INACTIVE"
export type DayType = "WORKING" | "HOLIDAY" | "WEEKEND" | "EVENT"
export type PresenceStatus = "PRESENT" | "ABSENT"
export type SessionStatus = "DRAFT" | "LOCKED"
export type TeacherAttendanceStatus = "DRAFT" | "VERIFIED"
export type WorkDayType = "FULL_DAY" | "HALF_DAY" | "ABSENT"

export interface SchoolListItem {
  id: number
  name: string
  code: string
  email: string
  phone: string
  city: string
  state: string
  status: ActiveStatus
  admin_name: string | null
  attendance_threshold: number
}

export interface SchoolDetail {
  id: number
  name: string
  code: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  pincode: string
  logo: string | null
  status: ActiveStatus
  admin: User | null
  attendance_threshold: number
  created_at: string
  updated_at: string
}

export interface AcademicYear {
  id: number
  school: number
  school_name: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
}

export interface NamedSchoolItem {
  id: number
  school: number
  school_name: string
  name: string
}

export interface ClassSection {
  id: number
  academic_year: number
  academic_year_name: string
  school_class: number
  class_name: string
  section: number
  section_name: string
}

export interface Holiday {
  id: number
  school: number
  school_name: string
  academic_year: number
  academic_year_name: string
  title: string
  date: string
  description: string
}

export interface WorkingDay {
  id: number
  school: number
  school_name: string
  academic_year: number
  academic_year_name: string
  date: string
  day_type: DayType
  day_type_display: string
  remarks: string
}

export interface BulkResult<T = { id: number; name: string }> {
  created: T[]
  failed: { name?: string; error?: string; errors?: unknown }[]
}

export interface Teacher {
  id: number
  employee_id: string
  name: string
  email: string
  phone_number: string | null
  gender: Gender | null
  is_active: boolean
  school: number
  school_name: string
  class_section: number | null
  class_section_detail: ClassSection | null
  joining_date: string | null
  profile_image?: string | null
  address?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
  created_at?: string
  updated_at?: string
}

/** `face_registered`: whether the AI can recognise the student in classroom photos. */
export interface Student {
  id: number
  student_id: string
  name: string
  roll_number: string
  school: number
  school_name: string
  class_section: number
  class_section_detail: ClassSection | null
  profile_image: string | null
  has_profile_image: boolean
  face_registered: boolean
  created_at: string
  updated_at: string
}

export interface Parent {
  id: number
  user: number
  name: string
  phone_number: string
  is_active: boolean
  students: Student[]
  initial_password: string | null
  password_changed: boolean
  last_login: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  created?: boolean
}

export interface FaceStatus {
  id: number
  student_id: string
  name: string
  roll_number: string
  profile_image: string | null
  face_registered: boolean
  face_source: string | null
  face_registered_at: string | null
}

export interface FaceRegisterResult {
  total: number
  registered: number
  failed: number
  results: { label: string; student: number | null; student_id: string | null; registered: boolean; error: string | null }[]
}

type AIJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED"

/**
 * Work that waits on the AI service (face registration, attendance verification)
 * runs in the background; the starting request answers 202 with one of these to poll.
 * `done` means succeeded or failed (stop polling), `result` holds a running summary
 * during face registration, `error*` carry what the endpoint would have answered had
 * it done the work itself, and `poll_after` is the seconds to wait (null once done).
 */
export interface AIJob<TResult = unknown> {
  id: string
  kind: "FACE_REGISTER" | "FACE_REGISTER_FROM_PROFILE" | "STUDENT_PHOTO" | "ATTENDANCE_VERIFY"
  status: AIJobStatus
  done: boolean
  message: string
  total: number
  processed: number
  succeeded: number
  failed: number
  percent: number | null
  result: TResult | null
  error: string
  error_status: number | null
  errors: Record<string, unknown> | null
  poll_after: number | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  updated_at: string
}

type StudentPhotoJob = AIJob<{ student: number; face_registered: boolean }>

/** A student plus the background job registering their new photo's face, if any. */
export interface StudentWithFaceJob extends Student {
  face_job: StudentPhotoJob | null
}

export interface AttendanceSession {
  id: number
  school: number
  school_name: string
  class_section: number
  class_section_detail: ClassSection | null
  date: string
  status: SessionStatus
  image_count: number
  detected_faces: number
  verified_at: string | null
  total_students: number | null
  present_count: number | null
  absent_count: number | null
  created_by_name: string | null
  locked_by_name: string | null
  locked_at: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: number
  student: number
  student_id: string
  student_name: string
  roll_number: string
  status: PresenceStatus
  source: "AI" | "MANUAL"
  ai_status: PresenceStatus | null
  similarity: number | null
  face_registered: boolean
  remarks: string
  updated_by_name: string | null
}

export interface AttendanceSessionDetail extends AttendanceSession {
  not_registered_count: number
  records: AttendanceRecord[]
}

/** `check_in_offline`/`check_out_offline`: synced later from a photo taken without internet, so the time is the device's. */
export interface TeacherAttendanceRecord {
  id: number
  teacher: number
  employee_id: string
  teacher_name: string
  school: number
  date: string
  status: TeacherAttendanceStatus
  check_in_at: string | null
  check_out_at: string | null
  check_in_captured_at: string | null
  check_out_captured_at: string | null
  check_in_verified_at: string | null
  check_out_verified_at: string | null
  check_in_image: string | null
  check_out_image: string | null
  check_in_offline: boolean
  check_out_offline: boolean
  worked_minutes: number | null
  worked_hours: number | null
  day_type: WorkDayType | null
  day_type_overridden: boolean
  remarks: string
  verified_by_name: string | null
  verified_at: string | null
}

export interface TeacherAttendanceSettings {
  school: number
  full_day_minutes: number
  full_day_hours: number
  half_day_minutes: number
  half_day_hours: number
}

export interface TeacherSummaryRow {
  teacher: number
  employee_id: string
  teacher_name: string
  total_working_minutes: number
  total_working_hours: number
  total_full_days: number
  total_half_days: number
  total_absent_days: number
  total_working_days: number
  pending_verification: number
}

export interface Attachment {
  id: number
  file: string
  original_name: string
  content_type: string
  size: number
  kind: string
}

export interface SentNotification {
  id: number
  title: string
  message: string
  attachments: Attachment[]
  sender_name: string | null
  sender_role: Role
  school: number | null
  school_name: string | null
  to_school_admins: boolean
  to_teachers: boolean
  to_parents: boolean
  target_schools: number[]
  target_class_sections: number[]
  target_users: { id: number; name: string; role: Role }[]
  target_students: number[]
  recipient_count: number
  read_count: number | null
  unread_count: number | null
  last_read_at: string | null
  created_at: string
  read_summary?: { role: Role; total: number; seen: number; not_seen: number }[]
}

export interface Recipient {
  user: { id: number; name: string; role: Role; phone_number: string | null; email: string | null }
  is_read: boolean
  read_at: string | null
}

export interface InboxItem {
  id: number
  title: string
  message: string
  attachments: Attachment[]
  sender_name: string | null
  sender_role: Role
  school_name: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

/** What a teacher sees of their own record (teachers/me/). */
export interface TeacherProfile {
  id: number
  employee_id: string
  name: string
  email: string
  phone_number: string | null
  school: number
  school_name: string
  class_section: number | null
  class_section_detail: ClassSection | null
  address: string
  city: string
  state: string
  country: string
  pincode: string
  joining_date: string | null
}

/** What a parent sees about themselves (parents/me/); `password_changed` is false while they still use the school's password. */
export interface ParentProfile {
  id: number
  name: string
  phone_number: string
  students: Student[]
  password_changed: boolean
}

/** One child's finalised (locked) attendance for one day. */
export interface ChildAttendance {
  id: number
  date: string
  student: number
  student_id: string
  student_name: string
  class_name: string
  section_name: string
  status: PresenceStatus
  remarks: string
}

/** An in-app message telling a parent their child's attendance. */
export interface AttendanceAlert {
  id: number
  student: number
  student_name: string
  date: string
  status: PresenceStatus
  title: string
  message: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

/** One marked date in a school's calendar; `title` is the holiday name on holidays. */
export interface CalendarDay {
  date: string
  day_type: DayType
  title: string
  remarks: string
}

/** `schools` lists the schools this user may switch between (a parent with children in several). */
export interface SchoolCalendar {
  school: number
  school_name: string
  schools: { id: number; name: string }[]
  date_from: string
  date_to: string
  academic_year: { id: number; name: string; start_date: string; end_date: string } | null
  days: CalendarDay[]
}

export type ReportFilter =
  | "school"
  | "academic_year"
  | "class_section"
  | "school_class"
  | "section"
  | "student"
  | "teacher"
  | "date_from"
  | "date_to"
  | "status"
  | "session_status"
  | "verification"
  | "day_type"
  | "school_status"
  | "role"
  | "is_active"

export interface ReportInfo {
  key: string
  title: string
  description: string
  filters: ReportFilter[]
}
