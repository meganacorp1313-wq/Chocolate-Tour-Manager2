import { useState } from "react"
import { useAdminLogin, useGetAdminSession, getGetAdminSessionQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Loader2, Lock } from "lucide-react"
import { Switch, Route, Redirect } from "wouter"
import { useI18n } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

// Views
import AdminDashboard from "./AdminDashboard"
import AdminTours from "./AdminTours"
import AdminSchedule from "./AdminSchedule"
import AdminCompanies from "./AdminCompanies"
import AdminBookings from "./AdminBookings"

function AdminLogin() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const login = useAdminLogin()
  const queryClient = useQueryClient()
  const { t } = useI18n()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    login.mutate({ data: { password } }, {
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const { data: session, isLoading, isError } = useGetAdminSession({
    query: { retry: false, queryKey: getGetAdminSessionQueryKey() }
  })

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (isError || !session?.ok) {
    return <AdminLogin />
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/tours" component={AdminTours} />
        <Route path="/admin/schedule" component={AdminSchedule} />
        <Route path="/admin/companies" component={AdminCompanies} />
        <Route path="/admin/bookings" component={AdminBookings} />
        <Route path="/admin/*">
          <Redirect to="/admin" />
        </Route>
      </Switch>
    </AdminLayout>
  )
}
