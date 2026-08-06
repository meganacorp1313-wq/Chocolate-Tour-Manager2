import { Link, useLocation } from "wouter"
import { useAdminLogout } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { LogOut, CalendarDays, Ticket, Building2, LayoutDashboard, Settings } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const logout = useAdminLogout()
  const [location] = useLocation()
  const { t } = useI18n()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => window.location.href = "/"
    })
  }

  const isActive = (path: string) => location === path || location.startsWith(`${path}/`);

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
            <Link href="/admin" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${location === "/admin" ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}>{t("dashboard")}</Link>
            <Link href="/admin/schedule" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive("/admin/schedule") ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}>{t("schedule")}</Link>
            <Link href="/admin/tours" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive("/admin/tours") ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}>{t("tours_title")}</Link>
            <Link href="/admin/bookings" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive("/admin/bookings") ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}>{t("bookings")}</Link>
            <Link href="/admin/companies" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive("/admin/companies") ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}>{t("companies")}</Link>
          </nav>
        </div>
      </header>
      <div className="flex-1 flex container mx-auto px-4 sm:px-6">
        <aside className="w-64 border-r pr-6 py-8 hidden md:block shrink-0">
          <nav className="space-y-2 flex flex-col">
            <Link href="/admin" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${location === "/admin" ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
              <LayoutDashboard className="h-4 w-4" /> {t("dashboard")}
            </Link>
            <Link href="/admin/schedule" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive("/admin/schedule") ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
              <CalendarDays className="h-4 w-4" /> {t("schedule")}
            </Link>
            <Link href="/admin/tours" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive("/admin/tours") ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
              <Ticket className="h-4 w-4" /> {t("tours_title")}
            </Link>
            <Link href="/admin/bookings" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive("/admin/bookings") ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
              <Ticket className="h-4 w-4" /> {t("bookings")}
            </Link>
            <Link href="/admin/companies" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive("/admin/companies") ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
              <Building2 className="h-4 w-4" /> {t("companies")}
            </Link>
            <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
              <Settings className="h-4 w-4" /> {t("settings")}
            </Link>
          </nav>
        </aside>
        <main className="flex-1 py-4 md:py-8 md:pl-8 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
