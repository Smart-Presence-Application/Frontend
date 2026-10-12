import { Fragment } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { useIsFetching, useQueryClient } from "@tanstack/react-query"
import { Bell, BellRing, ExternalLink, Inbox, LogOut, Menu, Monitor, Moon, RefreshCw, Sun, UserCog, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { InstallButton } from "@/components/common/install-button"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/auth"
import { usePanel } from "@/context/panel"
import { useTheme } from "@/context/theme"
import { ROLE_LABEL } from "@/lib/format"
import { PersonAvatar } from "../ui-bits"
import { SEGMENT_LABEL } from "./nav"
import type { Badges } from "./sidebar"
import { panelPath } from "@/lib/panel"

function Breadcrumbs() {
  const { pathname } = useLocation()
  const segments = pathname.split("/").filter(Boolean)

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 md:block">
      <ol className="flex items-center gap-1.5 text-sm">
        {segments.map((segment, i) => {
          const to = `/${segments.slice(0, i + 1).join("/")}`
          const last = i === segments.length - 1
          const label = SEGMENT_LABEL[segment] ?? (/^\d+$/.test(segment) ? "Details" : segment)
          return (
            <Fragment key={to}>
              {i > 0 && <li className="text-muted-foreground/50">/</li>}
              <li className="truncate">
                {last ? (
                  <span aria-current="page" className="font-medium">
                    {label}
                  </span>
                ) : (
                  <Link to={to} className="text-muted-foreground transition-colors hover:text-primary">
                    {label}
                  </Link>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

/** Refetches every query on screen; spins while any request is in flight. */
function RefreshButton() {
  const queryClient = useQueryClient()
  const fetching = useIsFetching() > 0

  async function refresh() {
    await queryClient.refetchQueries({ type: "active" })
    toast.success("Data refreshed", { id: "refresh", duration: 1500 })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-lg" onClick={refresh} disabled={fetching} aria-label="Refresh data">
          <RefreshCw className={fetching ? "animate-spin" : "transition-transform duration-500 hover:rotate-180"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Refresh data</TooltipContent>
    </Tooltip>
  )
}

/** Icon link with an unread count, e.g. the inbox bell. */
function CountButton({ to, icon: Icon, label, count }: { to: string; icon: LucideIcon; label: string; count: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="ghost" size="icon-lg" className="relative" aria-label={`${label}, ${count} unread`}>
          <Link to={to}>
            <Icon />
            {count > 0 && (
              <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background">
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/60 [animation-iteration-count:3]" />
                <span className="relative">{count > 9 ? "9+" : count}</span>
              </span>
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function Topbar({ onMenu, badges }: { onMenu: () => void; badges: Badges }) {
  const { user, logout } = useAuth()
  const isParent = usePanel().kind === "parent"
  const { theme, resolved, setTheme } = useTheme()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    toast.success("You have been signed out")
    navigate("/login", { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <Button variant="ghost" size="icon-lg" className="lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu />
      </Button>
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1.5">
        <InstallButton iconOnly />
        <RefreshButton />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-lg" aria-label="Change theme">
              {resolved === "dark" ? <Moon /> : <Sun />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
              <DropdownMenuRadioItem value="light">
                <Sun /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon /> Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor /> System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {isParent ? (
          <>
            <CountButton to={panelPath("/admin/inbox")} icon={Inbox} label="School notices" count={badges.inbox} />
            <CountButton to={panelPath("/admin/alerts")} icon={BellRing} label="Attendance alerts" count={badges.alerts} />
          </>
        ) : (
          <CountButton to={panelPath("/admin/inbox")} icon={Bell} label="Inbox" count={badges.inbox} />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-1 flex items-center gap-2.5 rounded-full p-0.5 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:rounded-xl sm:py-1 sm:pr-3 sm:pl-1"
              aria-label="Account menu"
            >
              <PersonAvatar name={user?.name} src={user?.profile_image} className="size-8" />
              <span className="hidden text-left sm:block">
                <span className="block max-w-36 truncate text-sm leading-tight font-medium">{user?.name}</span>
                <span className="block text-xs leading-tight text-primary">{user ? ROLE_LABEL[user.role] : ""}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={panelPath("/admin/profile")}>
                <UserCog /> My profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/">
                <ExternalLink /> Visit website
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
