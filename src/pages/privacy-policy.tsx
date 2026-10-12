import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowLeft, ShieldCheck } from "lucide-react"

import { Seo } from "@/components/common/seo"
import { CONTACT_EMAIL } from "@/data/nav"

const UPDATED = "11 October 2026"

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <p>
        SmartPresence ("we", "us") provides a school management and attendance platform. Schools sign up and decide what information is entered. For
        student, parent and staff records, the school is in charge of that data, and we process it on the school's behalf and on its instructions.
        For our website and contact form, we are responsible for the data ourselves.
      </p>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <ul>
        <li>
          <strong>School staff:</strong> name, email, mobile number, gender, profile photo, employee ID, address, assigned class and account
          activity.
        </li>
        <li>
          <strong>Students:</strong> name, student ID, roll number, class and section, a profile photo and attendance records.
        </li>
        <li>
          <strong>Facial data:</strong> when a school enables AI attendance, we create a face template (a numerical representation, not a photo) from a
          student's registered photo, and process classroom photos to match faces. Teachers' check-in and check-out photos are stored as proof of
          attendance.
        </li>
        <li>
          <strong>Parents:</strong> name, mobile number and which children they are linked to.
        </li>
        <li>
          <strong>Usage and device data:</strong> sign-in times, actions taken in the app (kept in an activity log for security), IP address,
          browser type and, if you turn on notifications, a push subscription for your device.
        </li>
        <li>
          <strong>Website visitors:</strong> what you send through the contact form (name, email, phone, school, message) and, if analytics is
          enabled, anonymous statistics about pages visited.
        </li>
      </ul>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use it",
    body: (
      <ul>
        <li>To run the service for the school: attendance, notices, reports, parent alerts and teacher check-ins.</li>
        <li>To sign people in, keep accounts secure, prevent abuse (for example rate limiting and spam checks) and investigate problems.</li>
        <li>To send account emails and the notifications people have turned on.</li>
        <li>To reply to enquiries sent through our contact form.</li>
        <li>To understand how the website is used so we can improve it.</li>
      </ul>
    ),
  },
  {
    id: "children",
    title: "Children's data",
    body: (
      <p>
        Student records are entered by schools, which are responsible for obtaining any consent required from parents or guardians, including
        before registering a student's face for AI attendance. We use children's data only to provide the service to their school, never for
        advertising, and we do not sell it. Parents can ask their school, or us, to correct or remove their child's data.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "Who we share it with",
    body: (
      <>
        <p>We do not sell personal data. We share it only with service providers that help us run SmartPresence, under contracts that protect it:</p>
        <ul>
          <li>Cloud hosting and storage providers (servers, databases, and file and image storage).</li>
          <li>Our face recognition service, which builds and matches face templates for AI attendance.</li>
          <li>Email and push notification providers, to deliver messages.</li>
          <li>Cloudflare Turnstile, to check the contact form is not spam.</li>
          <li>Google Analytics, for anonymous website statistics, if enabled.</li>
        </ul>
        <p>We may also disclose information when the law requires it.</p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it",
    body: (
      <p>
        School data is kept while the school uses SmartPresence and deleted or returned when it leaves, unless the law requires us to keep it longer.
        Face templates are deleted when a student's photo changes or the student is removed. Activity logs are kept for 90 days. Contact form
        enquiries are kept for as long as needed to respond and follow up.
      </p>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <p>
        Connections are encrypted with HTTPS. Sign-in sessions use secure, HttpOnly cookies. Every person only sees the data their role allows, sign-in
        attempts are rate limited, and important actions are recorded in an activity log. No system is perfectly secure, but we work to protect your
        data and will notify schools of any breach as required by law.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        We use essential cookies to keep you signed in. If analytics is enabled, Google Analytics sets cookies to count visits anonymously. The app
        also stores some data on your device so it works offline; signing out clears it.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <p>
        Depending on where you live (including under India's Digital Personal Data Protection Act, 2023), you can ask to access, correct or delete
        your personal data, withdraw consent, and raise a complaint. For data your school entered, please contact the school first; we will help them
        respond. You can also write to us at the address below.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: <p>We may update this policy. We will change the date at the top and, for significant changes, let schools know in advance.</p>,
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        Questions or requests about privacy:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return (
    <section className="container-page max-w-3xl pt-28 pb-20">
      <Seo
        title="Privacy Policy | SmartPresence"
        description="How SmartPresence collects, uses, shares and protects personal data, including student, parent, staff and facial data."
        path="/privacy-policy"
      />
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="size-4" /> Back to home
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated {UPDATED}</p>
        </div>
      </div>

      <nav aria-label="On this page" className="mt-8 rounded-2xl border bg-card p-5">
        <p className="text-sm font-semibold">On this page</p>
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted-foreground transition-colors hover:text-primary">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 grid gap-10">
        {SECTIONS.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-28">
            <h2 id={`${s.id}-title`} className="text-xl font-semibold">
              {i + 1}. {s.title}
            </h2>
            <div className="mt-3 grid gap-3 leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:grid [&_ul]:gap-2">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
