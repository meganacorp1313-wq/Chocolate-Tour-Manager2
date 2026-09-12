import { useState } from "react"
import { useAdminLogin, useGetAdminSession, getGetAdminSessionQueryKey, useRequestAdminPasswordReset } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Loader2, Lock } from "lucide-react"
import { Switch, Route, Redirect, useRoute } from "wouter"
import { useI18n } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

// Views
import AdminDashboard from "./AdminDashboard"
import AdminTours from "./AdminTours"
import AdminSchedule from "./AdminSchedule"
import AdminCompanies from "./AdminCompanies"
import AdminBookings from "./AdminBookings"
import AdminCheckIn from "./AdminCheckIn"
import AdminSettings from "./AdminSettings"
import AdminStaff from "./AdminStaff"
import AdminPasswordReset from "./AdminPasswordReset"

function AdminLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const login = useAdminLogin()
  const requestReset = useRequestAdminPasswordReset()
  const queryClient = useQueryClient()
  const { t } = useI18n()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    login.mutate({ data: { password, username: username.trim() || null } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() })
      },
      onError: () => {
        setError(t("invalid_password"))
      }
    })
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
              <Lock className="w-6 h-6" />
            </div>
            <CardTitle className="font-serif text-2xl text-primary">{t("login_admin_title")}</CardTitle>
            <CardDescription>{t("login_admin_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Input
                  placeholder={t("username")}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <p className="text-xs text-muted-foreground">{t("login_username_hint")}</p>
                <Input
                  type="password"
                  placeholder={t("password")}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("enter")}
              </Button>
            </form>
            <div className="pt-4 text-center">
              {resetSent ? (
                <p className="text-sm text-muted-foreground">{t("reset_email_sent")}</p>
              ) : (
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary disabled:opacity-50"
                  disabled={requestReset.isPending}
                  onClick={() =>
                    requestReset.mutate(undefined, { onSuccess: () => setResetSent(true) })
                  }
                >
                  {t("forgot_password")}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const [isReset, resetParams] = useRoute("/admin/reset/:token")
  const { data: session, isLoading, isError } = useGetAdminSession({
    query: { retry: false, queryKey: getGetAdminSessionQueryKey() }
  })

  // Reachable without a session — the whole point is that the password is lost.
  if (isReset && resetParams?.token) {
    return <AdminPasswordReset token={resetParams.token} />
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (isError || !session?.ok) {
    return <AdminLogin />
  }

  const role = (session.role ?? "admin") as "admin" | "manager" | "staff"
  const home = role === "staff" ? "/admin/checkin" : "/admin"

  return (
    <AdminLayout role={role}>
      <Switch>
        {role !== "staff" && <Route path="/admin" component={AdminDashboard} />}
        {role === "admin" && <Route path="/admin/tours" component={AdminTours} />}
        {role !== "staff" && <Route path="/admin/schedule" component={AdminSchedule} />}
        {role === "admin" && <Route path="/admin/companies" component={AdminCompanies} />}
        <Route path="/admin/bookings" component={AdminBookings} />
        <Route path="/admin/checkin" component={AdminCheckIn} />
        {role === "admin" && <Route path="/admin/staff" component={AdminStaff} />}
        {role === "admin" && <Route path="/admin/settings" component={AdminSettings} />}
        <Route path="/admin/*">
          <Redirect to={home} />
        </Route>
        <Route path="/admin">
          <Redirect to={home} />
        </Route>
      </Switch>
    </AdminLayout>
  )
}
