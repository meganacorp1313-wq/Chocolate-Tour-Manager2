import { useRoute } from "wouter"
import { useGetBookingByCode, getGetBookingByCodeQueryKey } from "@workspace/api-client-react"
import { QRCodeSVG } from "qrcode.react"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { Loader2, CheckCircle2, Calendar as CalIcon, Clock, Users, Ticket, MapPin } from "lucide-react"
import { format, parseISO } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { formatUsd } from "@/lib/currency"

export default function BookingConfirmation() {
  const [, params] = useRoute("/booking/:code")
  const code = params?.code || ""
  const { t, dateLocale, lang } = useI18n()
  
  const { data: booking, isLoading, error } = useGetBookingByCode(code, {
    query: {
      enabled: !!code,
      retry: false,
      queryKey: getGetBookingByCodeQueryKey(code),
      refetchInterval: (query) => {
        return query.state.data?.status === 'pending_payment' ? 3000 : false;
      }
    }
  })

  const getTourName = (b: any) => {
    if (lang === 'es' && b.tourNameEs) return b.tourNameEs;
    if (lang === 'en' && b.tourNameEn) return b.tourNameEn;
    return b.tourName;
  }

  const tourName = booking ? getTourName(booking) : "";

  const renderStatus = () => {
    if (!booking) return null;
    if (booking.status === 'cancelled') {
      return (
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">X</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-destructive mb-2">
            {t("status_cancelled_title")}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("status_cancelled_desc")}
          </p>
        </div>
      );
    }
    if (booking.status === 'pending_payment') {
      return (
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-600 mb-2">
            {t("payment_pending_title")}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("payment_pending_desc")}
          </p>
        </div>
      );
    }
    return (
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">
          {t("waiting_for_you")}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          {t("successfully_confirmed")}
        </p>
      </div>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-16 flex justify-center min-h-[70vh] items-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : error || !booking ? (
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-2xl font-bold">?</span>
            </div>
            <h2 className="font-serif text-2xl font-bold">{t("not_found")}</h2>
            <p className="text-muted-foreground">{t("check_code")}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/"}>
              {t("to_main")}
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderStatus()}

            <Card className={`overflow-hidden border-2 shadow-lg ${booking.status === 'cancelled' ? 'border-destructive/20 opacity-75' : 'border-primary/10'}`}>
              <div className="bg-primary text-primary-foreground p-4 sm:p-6 text-center border-b border-primary/20">
                <p className="text-primary-foreground/80 text-xs sm:text-sm font-medium uppercase tracking-wider mb-1">{t("booking_code")}</p>
                <p className="font-mono text-3xl sm:text-4xl font-bold tracking-widest">{booking.code}</p>
                {booking.status === "confirmed" && (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="bg-white p-2.5 rounded-lg">
                      <QRCodeSVG value={booking.code} size={160} />
                    </div>
                    <p className="text-primary-foreground/80 text-xs sm:text-sm">{t("qr_show_hint")}</p>
                  </div>
                )}
              </div>
              <CardContent className="p-4 sm:p-8">
                <h3 className="font-serif text-xl sm:text-2xl font-bold mb-6 text-center">{tourName}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
                  <div className="flex items-start gap-3">
                    <CalIcon className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{t("date")}</p>
                      <p className="font-semibold text-lg">{format(parseISO(booking.date), 'd MMMM yyyy', { locale: dateLocale })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{t("time")}</p>
                      <p className="font-semibold text-lg">{booking.startTime}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{t("guests")}</p>
                      <p className="font-semibold text-lg">{booking.peopleCount} {t("person")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Ticket className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{t("to_pay")}</p>
                      <p className="font-semibold text-lg">{formatUsd(booking.totalPrice)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-1">{t("factory_address")}</p>
                    <p className="text-muted-foreground">{t("factory_address_desc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {booking.status === 'confirmed' && (
              <div className="text-center mt-8">
                <Button variant="ghost" onClick={() => window.print()}>
                  {t("print_ticket")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
