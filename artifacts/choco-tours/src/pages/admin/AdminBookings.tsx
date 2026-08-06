import { useState } from "react"
import { useAdminListBookings, useUpdateBookingStatus, getAdminListBookingsQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, CheckCircle2, XCircle } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ru } from "date-fns/locale"

export default function AdminBookings() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const params = {
    from: dateFrom || undefined,
    to: dateTo || undefined
  }

  const { data: bookings, isLoading } = useAdminListBookings(params)
  const updateStatus = useUpdateBookingStatus()
  const queryClient = useQueryClient()

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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Бронирования</h1>
          <p className="text-muted-foreground">Управление записями гостей</p>
        </div>
      </div>

      <Card className="p-4 flex gap-4 items-end bg-card shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium">От даты</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">До даты</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo("") }}>
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
                      b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {b.status === 'confirmed' ? 'Подтверждено' : 'Отменено'}
                    </span>
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
