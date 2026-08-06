import { useState } from "react"
import { useAdminListBookings, useUpdateBookingStatus, useResendBookingEmails, getAdminListBookingsQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, CheckCircle2, XCircle, MailWarning, MailCheck, RotateCw } from "lucide-react"
import { format, parseISO } from "date-fns"
import { useI18n } from "@/lib/i18n"

export default function AdminBookings() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const params = {
    from: dateFrom || undefined,
    to: dateTo || undefined
  }

  const { data: bookings, isLoading } = useAdminListBookings(params)
  const updateStatus = useUpdateBookingStatus()
  const resendEmails = useResendBookingEmails()
  const [resendingId, setResendingId] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const { t, dateLocale, lang } = useI18n()

  const handleStatus = (id: number, status: 'confirmed' | 'cancelled') => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        // Patch locally
        queryClient.setQueryData(getAdminListBookingsQueryKey(params), (old: any) => {
          if (!old) return old
          return old.map((b: any) => b.id === id ? { ...b, status } : b)
        })
      }
    })
  }

  const handleResend = (id: number) => {
    setResendingId(id)
    resendEmails.mutate({ id }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getAdminListBookingsQueryKey(params), (old: any) => {
          if (!old) return old
          return old.map((b: any) => b.id === id ? { ...b, emailStatus: updated.emailStatus, emailError: updated.emailError, emailAttempts: updated.emailAttempts, emailRetriesExhausted: updated.emailRetriesExhausted } : b)
        })
      },
      onSettled: () => setResendingId(null)
    })
  }

  const getTourName = (b: any) => {
    if (lang === 'es' && b.tourNameEs) return b.tourNameEs;
    if (lang === 'en' && b.tourNameEn) return b.tourNameEn;
    return b.tourName;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary mb-1 sm:mb-2">{t("bookings_title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t("bookings_desc")}</p>
        </div>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 items-end bg-card shadow-sm">
        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-sm font-medium">{t("from_date")}</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-sm font-medium">{t("to_date")}</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo("") }} className="w-full sm:w-auto">
          {t("reset")}
        </Button>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !bookings?.length ? (
          <div className="text-center p-12 text-muted-foreground">{t("no_bookings_admin")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col_code")}</TableHead>
                <TableHead>{t("col_datetime")}</TableHead>
                <TableHead>{t("col_tour")}</TableHead>
                <TableHead>{t("col_client")}</TableHead>
                <TableHead>{t("col_source")}</TableHead>
                <TableHead>{t("col_amount")}</TableHead>
                <TableHead>{t("col_status")}</TableHead>
                <TableHead>{t("col_email")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map(b => (
                <TableRow key={b.id} className={b.status === 'cancelled' ? 'opacity-60 bg-muted/20' : ''}>
                  <TableCell className="font-mono">{b.code}</TableCell>
                  <TableCell>
                    <div className="font-medium whitespace-nowrap">{format(parseISO(b.date), 'dd.MM.yy')}</div>
                    <div className="text-xs text-muted-foreground">{b.startTime}</div>
                  </TableCell>
                  <TableCell className="min-w-[120px]">{getTourName(b)}</TableCell>
                  <TableCell className="min-w-[120px]">
                    <div className="font-medium">{b.customerName}</div>
                    <div className="text-xs text-muted-foreground">{b.phone}</div>
                    <div className="text-xs text-muted-foreground">{b.peopleCount} {t("person")}</div>
                  </TableCell>
                  <TableCell>
                    {b.companyName ? (
                      <span className="text-xs bg-accent/10 text-accent font-medium px-2 py-1 rounded whitespace-nowrap">B2B: {b.companyName}</span>
                    ) : (
                      <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-1 rounded whitespace-nowrap">{t("website")}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">${b.totalPrice}</TableCell>
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
                  <TableCell>
                    {b.emailStatus === 'failed' && !b.emailRetriesExhausted ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700 whitespace-nowrap"
                        title={b.emailError ?? undefined}
                      >
                        <RotateCw className="w-3.5 h-3.5" /> {t("email_retrying").replace("{n}", String(b.emailAttempts ?? 0)).replace("{max}", "4")}
                      </span>
                    ) : b.emailStatus === 'failed' ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 whitespace-nowrap"
                          title={b.emailError ?? undefined}
                        >
                          <MailWarning className="w-3.5 h-3.5" /> {t("email_failed_manual")}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          disabled={resendingId === b.id}
                          onClick={() => handleResend(b.id)}
                          title={t("btn_resend_email")}
                        >
                          {resendingId === b.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <RotateCw className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    ) : b.emailStatus === 'sent' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 whitespace-nowrap">
                        <MailCheck className="w-3.5 h-3.5" /> {t("email_sent")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("email_pending")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {b.status === 'cancelled' ? (
                        <Button size="sm" variant="outline" onClick={() => handleStatus(b.id, 'confirmed')}>
                          <CheckCircle2 className="w-4 h-4 mr-1 text-green-600"/> {t("btn_restore")}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleStatus(b.id, 'cancelled')}>
                          <XCircle className="w-4 h-4 mr-1"/> {t("btn_cancel")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
