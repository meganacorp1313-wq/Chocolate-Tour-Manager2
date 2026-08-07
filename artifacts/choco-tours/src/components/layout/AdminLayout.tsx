import { Link, useLocation } from "wouter"
import { useAdminLogout } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { LogOut, CalendarDays, Ticket, Building2, LayoutDashboard, Settings, QrCode, Users } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

type AdminRole = "admin" | "manager" | "staff"

interface NavItem {
  href: string
  labelKey: string
  icon: typeof LayoutDashboard
  roles: AdminRole[]
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard, roles: ["admin", "manager"] },
  { href: "/admin/schedule", labelKey: "schedule", icon: CalendarDays, roles: ["admin", "manager"] },
  { href: "/admin/tours", labelKey: "tours_title", icon: Ticket, roles: ["admin"] },
  { href: "/admin/bookings", labelKey: "bookings", icon: Ticket, roles: ["admin", "manager", "staff"] },
  { href: "/admin/checkin", labelKey: "checkin_title", icon: QrCode, roles: ["admin", "manager", "staff"] },
  { href: "/admin/companies", labelKey: "companies", icon: Building2, roles: ["admin"] },
  { href: "/admin/staff", labelKey: "staff_title", icon: Users, roles: ["admin"] },
  { href: "/admin/settings", labelKey: "settings", icon: Settings, roles: ["admin"] },
]

export function AdminLayout({ children, role = "admin" }: { children: React.ReactNode; role?: AdminRole }) {
  const logout = useAdminLogout()
  const [location] = useLocation()
  const { t } = useI18n()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => window.location.href = "/"
    })
  }

  const isActive = (path: string) =>
    path === "/admin" ? location === "/admin" : location === path || location.startsWith(`${path}/`)

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 truncate">
            <span className="font-serif text-lg sm:text-xl font-bold text-primary tracking-tight truncate">
              {t("admin_panel")}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 px-2 sm:px-3">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          </div>
        </div>
        <div className="md:hidden border-t bg-background overflow-x-auto scrollbar-hide">
          <nav className="flex items-center px-4 py-2 gap-2 min-w-max">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive(item.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}>
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="flex-1 flex container mx-auto px-4 sm:px-6">
        <aside className="w-64 border-r pr-6 py-8 hidden md:block shrink-0">
          <nav className="space-y-2 flex flex-col">
            {items.map((item) => (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive(item.href) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                <item.icon className="h-4 w-4" /> {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 py-4 md:py-8 md:pl-8 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
