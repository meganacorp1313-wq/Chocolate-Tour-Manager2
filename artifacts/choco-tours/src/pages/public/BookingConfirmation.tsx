import { useRoute } from "wouter"
import { useGetBookingByCode, getGetBookingByCodeQueryKey } from "@workspace/api-client-react"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { Loader2, CheckCircle2, Calendar as CalIcon, Clock, Users, Ticket, MapPin } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ru } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BookingConfirmation() {
  const [, params] = useRoute("/booking/:code")
  const code = params?.code || ""
  
  const { data: booking, isLoading, error } = useGetBookingByCode(code, {
    query: {
      enabled: !!code,
      retry: false,
      queryKey: getGetBookingByCodeQueryKey(code)
    }
  })

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
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">
                Ждем вас на фабрике!
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                Ваше бронирование успешно подтверждено
              </p>
            </div>

            <Card className="overflow-hidden border-2 border-primary/10 shadow-lg">
              <div className="bg-primary text-primary-foreground p-4 sm:p-6 text-center border-b border-primary/20">
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
                    <Ticket className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">К оплате на месте</p>
                      <p className="font-semibold text-lg">{booking.totalPrice} ₽</p>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-1">Адрес фабрики</p>
                    <p className="text-muted-foreground">ул. Шоколадная, д. 1, г. Москва. Пожалуйста, приходите за 10 минут до начала экскурсии.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="text-center mt-8">
              <Button variant="ghost" onClick={() => window.print()}>
                Распечатать билет
              </Button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
