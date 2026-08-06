import { useState } from "react"
import { useAdminListBookings, useUpdateBookingStatus, useExpireUnpaidBookings, getAdminListBookingsQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckCircle2, XCircle, CreditCard, Clock } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ru } from "date-fns/locale"

export default function AdminBookings() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const params = {
    from: dateFrom || undefined,
    to: dateTo || undefined
  }

  const { data: bookings, isLoading, refetch } = useAdminListBookings(params)
  const updateStatus = useUpdateBookingStatus()
  const expireUnpaid = useExpireUnpaidBookings()
  const queryClient = useQueryClient()

  const handleStatus = (id: number, status: 'confirmed' | 'cancelled') => {
    updateStatus.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.setQueryData(getAdminListBookingsQueryKey(params), (old: any) => {
          if (!old) return old
          return old.map((b: any) => b.id === id ? { ...b, status } : b)
        })
      }
    })
  }

  const handleExpire = () => {
    expireUnpaid.mutate(undefined, {
      onSuccess: (res) => {
        if (res.cancelled > 0) refetch()
      }
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary mb-1 sm:mb-2">Бронирования</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Управление записями гостей</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExpire}
          disabled={expireUnpaid.isPending}
          title="Отменить неоплаченные брони с истёкшим сроком"
        >
          {expireUnpaid.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
          Отменить просроченные
        </Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 items-end bg-card shadow-sm">
        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-sm font-medium">От даты</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-sm font-medium">До даты</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo("") }} className="w-full sm:w-auto">
          Сбросить
        </Button>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !bookings?.length ? (
          <div className="text-center p-12 text-muted-foreground">Бронирования не найдены</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Дата/Время</TableHead>
                <TableHead>Экскурсия</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Оплата</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map(b => (
                <TableRow key={b.id} className={b.status === 'cancelled' ? 'opacity-60 bg-muted/20' : ''}>
                  <TableCell className="font-mono">{b.code}</TableCell>
                  <TableCell>
                    <div className="font-medium">{format(parseISO(b.date), 'dd.MM.yy')}</div>
                    <div className="text-xs text-muted-foreground">{b.startTime}</div>
                  </TableCell>
                  <TableCell>{b.tourName}</TableCell>
                  <TableCell>
                    <div className="font-medium">{b.customerName}</div>
                    <div className="text-xs text-muted-foreground">{b.phone}</div>
                    <div className="text-xs text-muted-foreground">{b.peopleCount} чел.</div>
                  </TableCell>
                  <TableCell>
                    {b.companyName ? (
                      <span className="text-xs bg-accent/10 text-accent font-medium px-2 py-1 rounded">B2B: {b.companyName}</span>
                    ) : (
                      <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-1 rounded">Сайт</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{b.totalPrice} ₽</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      b.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : b.status === 'pending_payment'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {b.status === 'confirmed' ? 'Подтверждено' : b.status === 'pending_payment' ? 'Ожидает оплаты' : 'Отменено'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {b.paymentStatus === 'paid' ? (
                      <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                        <CreditCard className="w-3.5 h-3.5" /> Оплачено
                      </span>
                    ) : b.paymentStatus === 'pending' ? (
                      <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
                        <Clock className="w-3.5 h-3.5" /> Ожидание
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {b.status === 'cancelled' ? (
                        <Button size="sm" variant="outline" onClick={() => handleStatus(b.id, 'confirmed')}>
                          <CheckCircle2 className="w-4 h-4 mr-1 text-green-600"/> Восстановить
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleStatus(b.id, 'cancelled')}>
                          <XCircle className="w-4 h-4 mr-1"/> Отменить
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
