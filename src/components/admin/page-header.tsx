import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowLeft, type LucideIcon } from "lucide-react"
import { motion } from "motion/react"

import { Seo } from "@/components/common/seo"
import { Button } from "@/components/ui/button"
import { panelPath } from "@/lib/panel"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
  backTo?: string
  seoTitle?: string
}

/** Page title row; `backTo` adds a back button and `seoTitle` overrides the document title when the visible one is not descriptive enough. */
export function PageHeader({ title, description, icon: Icon, actions, backTo, seoTitle }: PageHeaderProps) {
  return (
    <>
      <Seo
        title={`${seoTitle ?? title} | SmartPresence Admin`}
        description={description ?? `${title} in your SmartPresence portal.`}
        path={panelPath("/admin")}
        noIndex
      />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="flex min-w-0 items-start gap-3">
          {backTo && (
            <Button asChild variant="outline" size="icon-lg" className="mt-0.5 shrink-0 rounded-xl">
              <Link to={backTo} aria-label="Go back">
                <ArrowLeft />
              </Link>
            </Button>
          )}
          {Icon && !backTo && (
            <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 sm:flex">
              <Icon className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight sm:text-[1.7rem]">{title}</h1>
            {description && <p className="mt-1 text-sm text-pretty text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </motion.div>
    </>
  )
}
