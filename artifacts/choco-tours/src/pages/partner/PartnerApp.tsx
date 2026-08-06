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
import { Loader2, KeyRound, Building2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { useI18n } from "@/lib/i18n"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"
import { formatUsd } from "@/lib/currency"

function PartnerLogin() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const login = useCompanyLogin()
  const queryClient = useQueryClient()
  const { t } = useI18n()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    login.mutate({ data: { password } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCompanySessionQueryKey() })
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
              <Building2 className="w-6 h-6" />
            </div>
            <CardTitle className="font-serif text-2xl text-primary">{t("login_partner_title")}</CardTitle>
            <CardDescription>{t("login_partner_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder={t("password")}
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
                {t("enter")}
              </Button>
              <div className="text-center mt-4">
                <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {t("back_to_site")}
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function PartnerDashboard() {
  const { data: prices, isLoading: loadingPrices } = useGetCompanyPrices()
  const { data: bookings, isLoading: loadingBookings } = useGetCompanyBookings()
  const { t, dateLocale, lang } = useI18n()

  const getTourName = (b: any) => {
    if (lang === 'es' && b.tourNameEs) return b.tourNameEs;
    if (lang === 'en' && b.tourNameEn) return b.tourNameEn;
    return b.tourName;
  }

  return (
    <Tabs defaultValue="booking" className="w-full">
      <TabsList className="flex flex-wrap w-full max-w-md mb-6 sm:mb-8 h-auto justify-start bg-transparent sm:bg-muted p-0 sm:p-1 gap-1">
        <TabsTrigger value="booking" className="flex-1 min-w-[100px] border sm:border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:data-[state=active]:bg-background sm:data-[state=active]:text-foreground text-xs sm:text-sm">{t("tab_booking")}</TabsTrigger>
        <TabsTrigger value="history" className="flex-1 min-w-[100px] border sm:border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:data-[state=active]:bg-background sm:data-[state=active]:text-foreground text-xs sm:text-sm">{t("tab_history")}</TabsTrigger>
        <TabsTrigger value="prices" className="flex-1 min-w-[100px] border sm:border-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:data-[state=active]:bg-background sm:data-[state=active]:text-foreground text-xs sm:text-sm">{t("tab_prices")}</TabsTrigger>
      </TabsList>

      <TabsContent value="booking" className="space-y-6 animate-in fade-in duration-300">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary mb-2">{t("partner_booking_title")}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t("partner_booking_desc")}</p>
        </div>
        <BookingWidget asPartner={true} />
      </TabsContent>

      <TabsContent value="history" className="space-y-6 animate-in fade-in duration-300">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary mb-2">{t("history_title")}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t("history_desc")}</p>
        </div>
        
        <Card className="overflow-hidden">
          {loadingBookings ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : !bookings?.length ? (
            <div className="text-center p-12 text-muted-foreground">{t("no_bookings_partner")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col_code")}</TableHead>
                  <TableHead>{t("col_datetime")}</TableHead>
                  <TableHead>{t("col_tour")}</TableHead>
                  <TableHead>{t("col_client")}</TableHead>
                  <TableHead>{t("col_guests")}</TableHead>
                  <TableHead>{t("col_amount")}</TableHead>
                  <TableHead>{t("col_status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-medium">{b.code}</TableCell>
                    <TableCell>
                      <span className="whitespace-nowrap">{format(parseISO(b.date), 'dd.MM.yy')}</span> <br/>
                      <span className="text-muted-foreground text-xs whitespace-nowrap">{b.startTime}</span>
                    </TableCell>
                    <TableCell className="min-w-[120px]">{getTourName(b)}</TableCell>
                    <TableCell className="min-w-[100px]">
                      {b.customerName}
                      <br/><span className="text-muted-foreground text-xs whitespace-nowrap">{b.phone}</span>
                    </TableCell>
                    <TableCell>{b.peopleCount}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{formatUsd(b.totalPrice)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        b.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {b.status === 'confirmed' ? t("status_confirmed") : 
                         b.status === 'pending_payment' ? t("status_pending_payment") : 
                         t("status_cancelled")}
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
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary mb-2">{t("prices_title")}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t("prices_desc")}</p>
        </div>

        <Card className="overflow-hidden">
          {loadingPrices ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("col_tour")}</TableHead>
                  <TableHead>{t("base_price")}</TableHead>
                  <TableHead>{t("your_price")}</TableHead>
                  <TableHead>{t("your_discount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices?.map(p => (
                  <TableRow key={p.tourId}>
                    <TableCell className="font-medium">{getTourName(p)}</TableCell>
                    <TableCell className="text-muted-foreground line-through">{formatUsd(p.basePrice)}</TableCell>
                    <TableCell className="font-bold text-primary text-lg">{formatUsd(p.price)}</TableCell>
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
