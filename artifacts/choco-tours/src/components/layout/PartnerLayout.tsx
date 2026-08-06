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
          <div className="flex items-center gap-4">
            <Link href="/" className="font-serif text-xl font-bold text-primary tracking-tight">
              Шоколадная Фабрика
            </Link>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm font-medium">Кабинет партнера</span>
          </div>
          <nav className="flex items-center gap-4">
            {session && <span className="text-sm text-muted-foreground mr-2">{session.name}</span>}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Выйти
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  )
}
