import { useState } from "react"
import { useChangeAdminPassword } from "@workspace/api-client-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export default function AdminSettings() {
  const { t } = useI18n()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const changePassword = useChangeAdminPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    if (newPassword.length < 6) {
      setError(t("password_too_short"))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t("passwords_dont_match"))
      return
    }
    changePassword.mutate(
      { data: { currentPassword, newPassword } },
      {
        onSuccess: () => {
          setSuccess(true)
          setCurrentPassword("")
          setNewPassword("")
          setConfirmPassword("")
        },
        onError: (err) => {
          const raw =
            typeof err === "object" && err !== null && "error" in err && typeof (err as { error?: unknown }).error === "string"
              ? (err as { error: string }).error
              : ""
          if (raw === "Текущий пароль указан неверно") setError(t("wrong_current_password"))
          else if (raw === "Новый пароль должен быть не короче 6 символов") setError(t("password_too_short"))
          else setError(t("change_password_failed"))
        },
      },
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-serif text-3xl font-bold text-primary">{t("settings")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings_desc")}</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>{t("change_password_title")}</CardTitle>
              <CardDescription>{t("change_password_desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">{t("current_password")}</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("new_password")}</Label>
              <Input
                id="new-password"
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
              <Label htmlFor="confirm-password">{t("repeat_new_password")}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            {success && (
              <p className="text-sm text-green-600 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {t("password_changed")}
              </p>
            )}
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("change_password_btn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
