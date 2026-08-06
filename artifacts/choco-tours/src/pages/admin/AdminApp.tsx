import { useState } from "react"
import { useAdminLogin, useGetAdminSession, getGetAdminSessionQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { AdminLayout } from "@/components/layout/AdminLayout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Loader2, Lock } from "lucide-react"
import { Switch, Route, Redirect } from "wouter"

// Views
import AdminDashboard from "./AdminDashboard"
import AdminTours from "./AdminTours"
import AdminSchedule from "./AdminSchedule"
import AdminCompanies from "./AdminCompanies"
import AdminBookings from "./AdminBookings"
import AdminSettings from "./AdminSettings"

function AdminLogin() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const login = useAdminLogin()
  const queryClient = useQueryClient()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    login.mutate({ data: { password } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() })
      },
      onError: () => {
        setError("Неверный пароль")
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="font-serif text-2xl text-primary">Вход в Админ-панель</CardTitle>
          <CardDescription>Управление шоколадной фабрикой</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Пароль администратора"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Войти
            </Button>
          </form>
        </CardContent>
      </Card>
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
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/*">
          <Redirect to="/admin" />
        </Route>
      </Switch>
    </AdminLayout>
  )
}
