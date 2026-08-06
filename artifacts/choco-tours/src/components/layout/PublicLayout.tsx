import { Link } from "wouter"

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-bold text-primary tracking-tight">
            Шоколадная Фабрика
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-primary transition-colors">Экскурсии</Link>
            <Link href="/partner" className="text-muted-foreground hover:text-primary transition-colors">Партнерам</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-card py-12 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-serif text-lg text-primary mb-2">Шоколадная Фабрика</p>
          <p>© {new Date().getFullYear()} Все права защищены. Сделано с любовью к шоколаду.</p>
        </div>
      </footer>
    </div>
  )
}
