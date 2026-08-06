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
import { useI18n } from "@/lib/i18n"

export default function AdminSchedule() {
  const [dateFrom, setDateFrom] = useState(format(new Date(), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"))

  const queryClient = useQueryClient()
  const { data: slots, isLoading } = useAdminListSlots({ from: dateFrom, to: dateTo })
  const { data: tours } = useAdminListTours()
  const { t, lang, dateLocale } = useI18n()

  const [isBulkCreating, setIsBulkCreating] = useState(false)

  const updateSlot = useUpdateSlot()
  const deleteSlot = useDeleteSlot()

  const handleDelete = (id: number) => {
    if(confirm(t("confirm_delete"))) {
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

  const getTourName = (slot: any) => {
    if (lang === 'es' && slot.tourNameEs) return slot.tourNameEs;
    if (lang === 'en' && slot.tourNameEn) return slot.tourNameEn;
    if (tours) {
      const tour = tours.find(t => t.id === slot.tourId);
      if (tour) {
        if (lang === 'es' && tour.nameEs) return tour.nameEs;
        if (lang === 'en' && tour.nameEn) return tour.nameEn;
        return tour.name;
      }
    }
    return slot.tourName;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary mb-1 sm:mb-2">{t("schedule_title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t("schedule_desc")}</p>
        </div>
        <Button onClick={() => setIsBulkCreating(true)} className="w-full sm:w-auto">
          <CalendarDays className="w-4 h-4 mr-2"/> {t("bulk_create")}
        </Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 items-end bg-card shadow-sm">
        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-sm font-medium">{t("from_date")}</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} required />
        </div>
        <div className="space-y-2 w-full sm:w-auto">
          <label className="text-sm font-medium">{t("to_date")}</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} required />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !slots?.length ? (
          <div className="text-center p-12 text-muted-foreground">{t("no_slots_admin")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("time")}</TableHead>
                <TableHead>{t("col_tour")}</TableHead>
                <TableHead>{t("col_seats")}</TableHead>
                <TableHead>{t("col_status")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map(s => (
                <TableRow key={s.id} className={s.blocked ? "bg-muted/50 opacity-60" : ""}>
                  <TableCell className="font-medium">{format(parseISO(s.date), 'dd.MM.yyyy')}</TableCell>
                  <TableCell className="font-bold">{s.startTime}</TableCell>
                  <TableCell>{getTourName(s)}</TableCell>
                  <TableCell>
                    <span className="text-primary font-medium">{s.bookedSeats}</span>
                    <span className="text-muted-foreground"> / {s.capacity}</span>
                  </TableCell>
                  <TableCell>
                    {s.blocked ? (
                      <span className="text-destructive text-sm flex items-center gap-1"><Lock className="w-3 h-3"/> {t("blocked")}</span>
                    ) : s.availableSeats === 0 ? (
                      <span className="text-muted-foreground text-sm font-medium">{t("no_seats")}</span>
                    ) : (
                      <span className="text-green-600 text-sm font-medium">{t("available")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleBlock(s)}>
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
  const { t, lang } = useI18n()
  
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

  const daysLabels = [t("day_su"), t("day_mo"), t("day_tu"), t("day_we"), t("day_th"), t("day_fr"), t("day_sa")]

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Parse times
    const timesList = form.times.split(',').map(t => t.trim()).filter(t => t.match(/^\d{2}:\d{2}$/))
    if (timesList.length === 0) {
      alert(t("format_time_hint"))
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
        onSuccess()
        onClose()
      }
    })
  }

  const getTourName = (tour: any) => {
    if (lang === 'es' && tour.nameEs) return tour.nameEs;
    if (lang === 'en' && tour.nameEn) return tour.nameEn;
    return tour.name;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("bulk_dialog_title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{t("col_tour")}</Label>
            <Select value={String(form.tourId)} onValueChange={v => setForm({...form, tourId: parseInt(v)})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tours.map(tour => (
                  <SelectItem key={tour.id} value={String(tour.id)}>{getTourName(tour)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("from_date")}</Label>
              <Input type="date" value={form.dateFrom} onChange={e => setForm({...form, dateFrom: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>{t("to_date")}</Label>
              <Input type="date" value={form.dateTo} onChange={e => setForm({...form, dateTo: e.target.value})} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("bulk_weekdays")}</Label>
            <div className="flex flex-wrap gap-2">
              {[1,2,3,4,5,6,0].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-colors ${
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label>{t("bulk_capacity")}</Label>
              <Input type="number" min={1} value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} required />
            </div>
            <div className="space-y-2">
              <Label>{t("bulk_times")}</Label>
              <Input placeholder="10:00, 14:00" value={form.times} onChange={e => setForm({...form, times: e.target.value})} required />
              <p className="text-xs text-muted-foreground">{t("format_time_hint")}</p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={bulkCreate.isPending}>
              {bulkCreate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("generate")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
