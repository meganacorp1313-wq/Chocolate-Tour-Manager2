import { useState } from "react"
import { useConfirmAdminPasswordReset } from "@workspace/api-client-react"
import { Link } from "wouter"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

export default function AdminPasswordReset({ token }: { token: string }) {
  const { t } = useI18n()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const confirmReset = useConfirmAdminPasswordReset()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (newPassword.length < 6) {
      setError(t("password_too_short"))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t("passwords_dont_match"))
      return
    }
    confirmReset.mutate(
      { data: { token, newPassword } },
      {
        onSuccess: () => setDone(true),
        onError: () => setError(t("reset_link_invalid")),
      },
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-end">
          <LanguageSwitcher />
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6" />
            </div>
            <CardTitle className="font-serif text-2xl text-primary">{t("reset_title")}</CardTitle>
            <CardDescription>{t("reset_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-4 pt-4 text-center">
                <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {t("password_changed")}
                </p>
                <Link href="/admin">
                  <Button className="w-full">{t("back_to_login")}</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-new-password">{t("new_password")}</Label>
                  <Input
                    id="reset-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">{t("min_6_chars")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm-password">{t("repeat_new_password")}</Label>
                  <Input
                    id="reset-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                <Button type="submit" className="w-full" disabled={confirmReset.isPending}>
                  {confirmReset.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t("reset_submit")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
