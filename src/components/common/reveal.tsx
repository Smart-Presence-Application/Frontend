import { motion, type HTMLMotionProps } from "motion/react"

interface RevealProps extends HTMLMotionProps<"div"> {
  delay?: number
  y?: number
}

/** Fades and lifts children into view once, when scrolled near. */
export function Reveal({ delay = 0, y = 24, children, ...props }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

interface SectionHeadingProps {
  id: string
  eyebrow: string
  title: React.ReactNode
  description?: string
  inverted?: boolean
  align?: "center" | "start"
}

export function SectionHeading({ id, eyebrow, title, description, inverted, align = "center" }: SectionHeadingProps) {
  return (
    <Reveal className={`mx-auto mb-12 max-w-2xl text-center md:mb-16 ${align === "start" ? "lg:mx-0 lg:text-left" : ""}`}>
      <p className="mb-3 text-sm font-semibold tracking-widest text-primary uppercase">{eyebrow}</p>
      <h2
        id={id}
        className={`text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl ${inverted ? "text-white" : ""}`}
      >
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-base text-pretty sm:text-lg ${inverted ? "text-neutral-400" : "text-muted-foreground"}`}>
          {description}
        </p>
      )}
    </Reveal>
  )
}
