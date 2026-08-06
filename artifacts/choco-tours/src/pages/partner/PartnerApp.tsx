import { useState } from "react"
import { useCompanyLogin, useGetCompanySession, useGetCompanyPrices, useGetCompanyBookings, getGetCompanySessionQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { PartnerLayout } from "@/components/layout/PartnerLayout"
import { BookingWidget } from "@/components/BookingWidget"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Ticket, CalendarDays, KeyRound, Building2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ru } from "date-fns/locale"

function PartnerLogin() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const login = useCompanyLogin()
  const queryClient = useQueryClient()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    login.mutate({ data: { password } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCompanySessionQueryKey() })
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
            <Building2 className="w-6 h-6" />
          </div>
          <CardTitle className="font-serif text-2xl text-primary">Вход для партнеров</CardTitle>
          <CardDescription>Введите пароль вашей компании для доступа</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Пароль"
                  className="pl-9"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Войти
            </Button>
            <div className="text-center mt-4">
              <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                &larr; Вернуться на сайт
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function PartnerDashboard() {
  const { data: prices, isLoading: loadingPrices } = useGetCompanyPrices()
  const { data: bookings, isLoading: loadingBookings } = useGetCompanyBookings()

  return (
    <Tabs defaultValue="booking" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
        <TabsTrigger value="booking">Бронирование</TabsTrigger>
        <TabsTrigger value="history">История</TabsTrigger>
        <TabsTrigger value="prices">Мои цены</TabsTrigger>
      </TabsList>

      <TabsContent value="booking" className="space-y-6 animate-in fade-in duration-300">
        <div className="mb-6">
          <h2 className="text-2xl font-serif font-bold text-primary mb-2">Оформить бронирование</h2>
          <p className="text-muted-foreground">Бронируйте экскурсии для ваших клиентов по специальным ценам.</p>
        </div>
        <BookingWidget asPartner={true} />
      </TabsContent>

      <TabsContent value="history" className="space-y-6 animate-in fade-in duration-300">
        <div className="mb-6">
          <h2 className="text-2xl font-serif font-bold text-primary mb-2">История бронирований</h2>
          <p className="text-muted-foreground">Все оформленные вами экскурсии.</p>
        </div>
        
        <Card>
          {loadingBookings ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : !bookings?.length ? (
            <div className="text-center p-12 text-muted-foreground">Вы еще не оформляли бронирования.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Дата и Время</TableHead>
                  <TableHead>Экскурсия</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Гости</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-medium">{b.code}</TableCell>
                    <TableCell>
                      {format(parseISO(b.date), 'dd.MM.yy')} <br/>
                      <span className="text-muted-foreground text-xs">{b.startTime}</span>
                    </TableCell>
                    <TableCell>{b.tourName}</TableCell>
                    <TableCell>
                      {b.customerName}
                      <br/><span className="text-muted-foreground text-xs">{b.phone}</span>
                    </TableCell>
                    <TableCell>{b.peopleCount}</TableCell>
                    <TableCell className="font-medium">{b.totalPrice} ₽</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {b.status === 'confirmed' ? 'Подтверждено' : 'Отменено'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="prices" className="space-y-6 animate-in fade-in duration-300">
        <div className="mb-6">
          <h2 className="text-2xl font-serif font-bold text-primary mb-2">Ваш прайс-лист</h2>
          <p className="text-muted-foreground">Специальные цены для вашей компании.</p>
        </div>

        <Card>
          {loadingPrices ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Программа</TableHead>
                  <TableHead>Базовая цена</TableHead>
                  <TableHead>Ваша цена</TableHead>
                  <TableHead>Ваша скидка</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices?.map(p => (
                  <TableRow key={p.tourId}>
                    <TableCell className="font-medium">{p.tourName}</TableCell>
                    <TableCell className="text-muted-foreground line-through">{p.basePrice} ₽</TableCell>
                    <TableCell className="font-bold text-primary text-lg">{p.price} ₽</TableCell>
                    <TableCell>
                      <span className="text-green-600 bg-green-50 px-2 py-1 rounded font-medium text-sm">
                        -{Math.round((1 - p.price / p.basePrice) * 100)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function PartnerApp() {
  const { data: session, isLoading, isError } = useGetCompanySession({
    query: { retry: false, queryKey: getGetCompanySessionQueryKey() }
  })

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (isError || !session) {
    return <PartnerLogin />
  }

  return (
    <PartnerLayout>
      <PartnerDashboard />
    </PartnerLayout>
  )
}
