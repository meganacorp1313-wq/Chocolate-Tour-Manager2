import { Link } from "wouter"
import { useI18n } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-lg sm:text-xl font-bold text-primary tracking-tight truncate mr-4">
            {t("choco_factory")}
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6 text-sm font-medium shrink-0">
            <Link href="/" className="hover:text-primary transition-colors">{t("tours")}</Link>
            <Link href="/partner" className="text-muted-foreground hover:text-primary transition-colors">{t("partners")}</Link>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>
      <main className="flex-1 overflow-x-hidden">{children}</main>
      <footer className="border-t bg-card py-12 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-serif text-lg text-primary mb-2">{t("choco_factory")}</p>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
