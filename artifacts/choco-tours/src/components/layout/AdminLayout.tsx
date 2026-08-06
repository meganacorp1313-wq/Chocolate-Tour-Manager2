import { Link } from "wouter"
import { useAdminLogout } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { LogOut, CalendarDays, Ticket, Building2, LayoutDashboard } from "lucide-react"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const logout = useAdminLogout()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => window.location.href = "/"
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-serif text-xl font-bold text-primary tracking-tight">
              Админ-панель
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> Выйти
          </Button>
        </div>
      </header>
      <div className="flex-1 flex container mx-auto px-4">
        <aside className="w-64 border-r pr-6 py-8 hidden md:block">
          <nav className="space-y-2 flex flex-col">
            <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground data-[active]:bg-accent data-[active]:text-foreground">
              <LayoutDashboard className="h-4 w-4" /> Дашборд
            </Link>
            <Link href="/admin/schedule" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Расписание
            </Link>
            <Link href="/admin/tours" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
              <Ticket className="h-4 w-4" /> Экскурсии
            </Link>
            <Link href="/admin/bookings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
              <Ticket className="h-4 w-4" /> Бронирования
            </Link>
            <Link href="/admin/companies" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground text-muted-foreground">
              <Building2 className="h-4 w-4" /> Партнеры
            </Link>
          </nav>
        </aside>
        <main className="flex-1 py-8 md:pl-8 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
