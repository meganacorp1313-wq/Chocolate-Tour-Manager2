import { useEffect } from "react"
import { useRoute } from "wouter"
import { useGetBookingByCode, getGetBookingByCodeQueryKey } from "@workspace/api-client-react"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { Loader2, CheckCircle2, Calendar as CalIcon, Clock, Users, Ticket, MapPin, CreditCard, AlertCircle } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ru } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BookingConfirmation() {
  const [, params] = useRoute("/booking/:code")
  const code = params?.code || ""
  
  const { data: booking, isLoading, error, refetch } = useGetBookingByCode(code, {
    query: {
      enabled: !!code,
      retry: false,
      queryKey: getGetBookingByCodeQueryKey(code),
    }
  })

  // Poll every 5 s while payment is pending so the page updates automatically once paid
  useEffect(() => {
    if (booking?.paymentStatus !== "pending") return
    const interval = setInterval(() => { void refetch() }, 5000)
    return () => clearInterval(interval)
  }, [booking?.paymentStatus, refetch])

  const isPendingPayment = booking?.status === "pending_payment" || booking?.paymentStatus === "pending"
  const isPaid = booking?.paymentStatus === "paid"

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-16 flex justify-center min-h-[70vh] items-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Ищем бронирование...</p>
          </div>
        ) : error || !booking ? (
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-2xl font-bold">?</span>
            </div>
            <h2 className="font-serif text-2xl font-bold">Бронирование не найдено</h2>
            <p className="text-muted-foreground">Проверьте правильность кода или свяжитесь с нами.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/"}>
              На главную
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              {isPendingPayment ? (
                <>
                  <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">
                    Ожидаем оплату
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    Бронирование создано, но ещё не оплачено. Оно будет автоматически отменено через 30 минут, если оплата не поступит.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">
                    Ждем вас на фабрике!
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    {isPaid
                      ? "Оплата получена. Бронирование подтверждено."
                      : "Ваше бронирование успешно подтверждено"}
                  </p>
                </>
              )}
            </div>

            <Card className="overflow-hidden border-2 border-primary/10 shadow-lg">
              <div className={`text-primary-foreground p-4 sm:p-6 text-center border-b border-primary/20 ${
                isPendingPayment ? "bg-yellow-600" : "bg-primary"
              }`}>
                <p className="text-primary-foreground/80 text-xs sm:text-sm font-medium uppercase tracking-wider mb-1">Код бронирования</p>
                <p className="font-mono text-3xl sm:text-4xl font-bold tracking-widest">{booking.code}</p>
              </div>
              <CardContent className="p-4 sm:p-8">
                <h3 className="font-serif text-xl sm:text-2xl font-bold mb-6 text-center">{booking.tourName}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
                  <div className="flex items-start gap-3">
                    <CalIcon className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Дата</p>
                      <p className="font-semibold text-lg">{format(parseISO(booking.date), 'd MMMM yyyy', { locale: ru })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Время</p>
                      <p className="font-semibold text-lg">{booking.startTime}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Гости</p>
                      <p className="font-semibold text-lg">{booking.peopleCount} чел.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    {isPaid ? (
                      <CreditCard className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <Ticket className="w-5 h-5 text-accent mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {isPaid ? "Оплачено онлайн" : isPendingPayment ? "К оплате" : "К оплате на месте"}
                      </p>
                      <p className="font-semibold text-lg">{booking.totalPrice} ₽</p>
                    </div>
                  </div>
                </div>

                {/* Payment status badge */}
                {booking.paymentStatus && (
                  <div className={`rounded-lg p-3 flex items-center gap-3 mb-6 ${
                    isPaid
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                  }`}>
                    {isPaid ? (
                      <CreditCard className="w-5 h-5 text-green-600 shrink-0" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-yellow-600 animate-spin shrink-0" />
                    )}
                    <p className={`text-sm font-medium ${isPaid ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-400"}`}>
                      {isPaid
                        ? "Оплата подтверждена"
                        : "Ожидаем подтверждение оплаты..."}
                    </p>
                  </div>
                )}

                <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-1">Адрес фабрики</p>
                    <p className="text-muted-foreground">ул. Шоколадная, д. 1, г. Москва. Пожалуйста, приходите за 10 минут до начала экскурсии.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="text-center mt-8 flex justify-center gap-4">
              {!isPaid && !isPendingPayment && (
                <Button variant="ghost" onClick={() => window.print()}>
                  Распечатать билет
                </Button>
              )}
              <Button variant="outline" onClick={() => window.location.href = "/"}>
                На главную
              </Button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
