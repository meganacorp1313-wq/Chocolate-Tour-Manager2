import { useState } from "react"
import { useAdminListSlots, useCreateSlot, useCreateSlotsBulk, useUpdateSlot, useDeleteSlot, useAdminListTours, getAdminListSlotsQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { format, addDays, parseISO } from "date-fns"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Plus, Pencil, Trash2, CalendarDays, Lock, Unlock } from "lucide-react"

export default function AdminSchedule() {
  const [dateFrom, setDateFrom] = useState(format(new Date(), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"))

  const queryClient = useQueryClient()
  const { data: slots, isLoading } = useAdminListSlots({ from: dateFrom, to: dateTo })
  const { data: tours } = useAdminListTours()

  const [isBulkCreating, setIsBulkCreating] = useState(false)
  const [editingSlot, setEditingSlot] = useState<any>(null)

  const updateSlot = useUpdateSlot()
  const deleteSlot = useDeleteSlot()

  const handleDelete = (id: number) => {
    if(confirm("Удалить этот слот? Бронирования на него могут быть потеряны.")) {
      deleteSlot.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminListSlotsQueryKey({ from: dateFrom, to: dateTo }) })
      })
    }
  }

  const handleToggleBlock = (slot: any) => {
    updateSlot.mutate({ id: slot.id, data: { blocked: !slot.blocked } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminListSlotsQueryKey({ from: dateFrom, to: dateTo }) })
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Расписание</h1>
          <p className="text-muted-foreground">Управление слотами для экскурсий</p>
        </div>
        <Button onClick={() => setIsBulkCreating(true)}>
          <CalendarDays className="w-4 h-4 mr-2"/> Массовое создание
        </Button>
      </div>

      <Card className="p-4 flex gap-4 items-end bg-card shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium">От даты</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">До даты</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} required />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !slots?.length ? (
          <div className="text-center p-12 text-muted-foreground">В этом периоде нет слотов</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Время</TableHead>
                <TableHead>Экскурсия</TableHead>
                <TableHead>Места</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map(s => (
                <TableRow key={s.id} className={s.blocked ? "bg-muted/50 opacity-60" : ""}>
                  <TableCell className="font-medium">{format(parseISO(s.date), 'dd.MM.yyyy')}</TableCell>
                  <TableCell className="font-bold">{s.startTime}</TableCell>
                  <TableCell>{s.tourName}</TableCell>
                  <TableCell>
                    <span className="text-primary font-medium">{s.bookedSeats}</span>
                    <span className="text-muted-foreground"> / {s.capacity}</span>
                  </TableCell>
                  <TableCell>
                    {s.blocked ? (
                      <span className="text-destructive text-sm flex items-center gap-1"><Lock className="w-3 h-3"/> Заблокирован</span>
                    ) : s.availableSeats === 0 ? (
                      <span className="text-muted-foreground text-sm font-medium">Мест нет</span>
                    ) : (
                      <span className="text-green-600 text-sm font-medium">Доступен</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleBlock(s)} title={s.blocked ? "Разблокировать" : "Заблокировать"}>
                        {s.blocked ? <Unlock className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {isBulkCreating && (
        <BulkCreateDialog 
          onClose={() => setIsBulkCreating(false)} 
          tours={tours || []} 
          onSuccess={() => queryClient.invalidateQueries({ queryKey: getAdminListSlotsQueryKey({ from: dateFrom, to: dateTo }) })}
        />
      )}
    </div>
  )
}

function BulkCreateDialog({ onClose, tours, onSuccess }: { onClose: () => void, tours: any[], onSuccess: () => void }) {
  const bulkCreate = useCreateSlotsBulk()
  
  const [form, setForm] = useState({
    tourId: tours[0]?.id || 0,
    dateFrom: format(new Date(), "yyyy-MM-dd"),
    dateTo: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    capacity: 10,
    weekdays: [1,2,3,4,5,6,0], // all days
    times: "10:00, 12:00, 14:00, 16:00"
  })

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      weekdays: f.weekdays.includes(day) ? f.weekdays.filter(d => d !== day) : [...f.weekdays, day]
    }))
  }

  const daysLabels = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Parse times
    const timesList = form.times.split(',').map(t => t.trim()).filter(t => t.match(/^\d{2}:\d{2}$/))
    if (timesList.length === 0) {
      alert("Укажите хотя бы одно время в формате ЧЧ:ММ")
      return
    }
    
    bulkCreate.mutate({
      data: {
        tourId: form.tourId,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        weekdays: form.weekdays,
        times: timesList,
        capacity: form.capacity
      }
    }, {
      onSuccess: (res) => {
        alert(`Успешно создано слотов: ${res.created}`)
        onSuccess()
        onClose()
      }
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Генерация расписания</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Экскурсия</Label>
            <Select value={String(form.tourId)} onValueChange={v => setForm({...form, tourId: parseInt(v)})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tours.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>С даты</Label>
              <Input type="date" value={form.dateFrom} onChange={e => setForm({...form, dateFrom: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>По дату</Label>
              <Input type="date" value={form.dateTo} onChange={e => setForm({...form, dateTo: e.target.value})} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Дни недели</Label>
            <div className="flex gap-2">
              {[1,2,3,4,5,6,0].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                    form.weekdays.includes(day) 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {daysLabels[day]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label>Вместимость группы</Label>
              <Input type="number" min={1} value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} required />
            </div>
            <div className="space-y-2">
              <Label>Время начала (через запятую)</Label>
              <Input placeholder="10:00, 14:00" value={form.times} onChange={e => setForm({...form, times: e.target.value})} required />
              <p className="text-xs text-muted-foreground">Формат: ЧЧ:ММ</p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={bulkCreate.isPending}>
              {bulkCreate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Сгенерировать
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
