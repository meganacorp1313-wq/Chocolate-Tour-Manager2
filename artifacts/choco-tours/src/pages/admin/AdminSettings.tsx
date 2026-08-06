import { useState } from "react"
import { useChangeAdminPassword } from "@workspace/api-client-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react"

export default function AdminSettings() {
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
      setError("Новый пароль должен быть не короче 6 символов")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают")
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
          const message =
            typeof err === "object" && err !== null && "error" in err && typeof (err as { error?: unknown }).error === "string"
              ? (err as { error: string }).error
              : "Не удалось сменить пароль"
          setError(message)
        },
      },
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-serif text-3xl font-bold text-primary">Настройки</h1>
        <p className="text-muted-foreground mt-1">Управление доступом к админ-панели</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Смена пароля</CardTitle>
              <CardDescription>Пароль для входа в админ-панель</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Текущий пароль</Label>
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
              <Label htmlFor="new-password">Новый пароль</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Минимум 6 символов</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Повторите новый пароль</Label>
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
                <CheckCircle2 className="w-4 h-4" /> Пароль изменён
              </p>
            )}
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Сменить пароль
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
