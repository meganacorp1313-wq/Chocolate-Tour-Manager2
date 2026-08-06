import { Link } from "wouter"
import { useCompanyLogout, useGetCompanySession, getGetCompanySessionQueryKey } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useGetCompanySession({ query: { retry: false, queryKey: getGetCompanySessionQueryKey() } })
  const logout = useCompanyLogout()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => window.location.href = "/"
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate pr-2">
            <Link href="/" className="font-serif text-lg sm:text-xl font-bold text-primary tracking-tight truncate">
              Шоко<span className="hidden sm:inline">ладная</span> Фабрика
            </Link>
            <span className="text-muted-foreground text-sm shrink-0">/</span>
            <span className="text-sm font-medium truncate shrink-0">B2B<span className="hidden sm:inline"> Партнер</span></span>
          </div>
          <nav className="flex items-center gap-2 shrink-0">
            {session && <span className="hidden sm:inline text-sm text-muted-foreground mr-2">{session.name}</span>}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 px-2 sm:px-3">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Выйти</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full overflow-x-hidden">{children}</main>
    </div>
  )
}
