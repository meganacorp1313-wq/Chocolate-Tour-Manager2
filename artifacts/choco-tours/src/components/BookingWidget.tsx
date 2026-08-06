import { useState } from "react"
import { useGetAvailability, useListSlots, useCreateBooking, getListSlotsQueryKey, getGetAvailabilityQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { format, parseISO, startOfMonth, endOfMonth, isBefore, startOfDay, addDays } from "date-fns"
import { ru } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useLocation } from "wouter"
import { Loader2 } from "lucide-react"

export function BookingWidget({ asPartner = false }: { asPartner?: boolean }) {
  const [date, setDate] = useState<Date>(new Date())
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()))
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  
  const [bookingForm, setBookingForm] = useState({
    name: "",
    phone: "",
    email: "",
    people: 1,
    comment: ""
  })

  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  
  const monthStr = format(month, 'yyyy-MM')
  const dateStr = format(date, 'yyyy-MM-dd')

  const { data: availability, isLoading: loadingAvail } = useGetAvailability({ month: monthStr })
  const { data: slots, isLoading: loadingSlots } = useListSlots({ date: dateStr })
  const createBooking = useCreateBooking()

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot) return

    createBooking.mutate({
      data: {
        slotId: selectedSlot.id,
        customerName: bookingForm.name,
        phone: bookingForm.phone,
        email: bookingForm.email || undefined,
        peopleCount: bookingForm.people,
        comment: bookingForm.comment || undefined
      }
    }, {
      onSuccess: (res) => {
        // invalidations
        queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey({ date: dateStr }) })
        queryClient.invalidateQueries({ queryKey: getGetAvailabilityQueryKey({ month: monthStr }) })
        
        if (asPartner) {
          setLocation("/partner")
        } else {
          setLocation(`/booking/${res.code}`)
        }
      }
    })
  }

  // Find day info to disable days with no slots or in past
  const today = startOfDay(new Date())
  
  const isDayDisabled = (d: Date) => {
    if (isBefore(d, today)) return true
    const dStr = format(d, 'yyyy-MM-dd')
    const dayAvail = availability?.find(a => a.date === dStr)
    if (!dayAvail || dayAvail.slotCount === 0 || dayAvail.availableSeats === 0) return true
    return false
  }

  return (
    <div className="bg-card border rounded-xl shadow-lg p-6 flex flex-col md:flex-row gap-8">
      {/* Calendar Side */}
      <div className="flex-1">
        <h3 className="text-xl font-serif font-semibold mb-4 text-primary">Выберите дату</h3>
        <div className="border rounded-lg p-2 bg-background inline-block">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            onMonthChange={setMonth}
            month={month}
            disabled={isDayDisabled}
            locale={ru}
          />
        </div>
      </div>

      {/* Slots Side */}
      <div className="flex-1 flex flex-col min-w-[300px]">
        <h3 className="text-xl font-serif font-semibold mb-4 text-primary">
          Время на {format(date, 'd MMMM', { locale: ru })}
        </h3>
        
        {loadingSlots ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        ) : slots?.length === 0 ? (
          <p className="text-muted-foreground">На эту дату нет доступных экскурсий.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[400px] pr-2">
            {slots?.map(slot => (
              <div 
                key={slot.id} 
                className={`border rounded-lg p-4 transition-colors ${
                  slot.blocked || slot.availableSeats === 0 
                    ? 'opacity-50 bg-muted/50 cursor-not-allowed'
                    : 'hover:border-primary/50 hover:shadow-sm cursor-pointer bg-background'
                }`}
                onClick={() => {
                  if (!slot.blocked && slot.availableSeats > 0) {
                    setSelectedSlot(slot)
                  }
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-lg">{slot.startTime}</span>
                  <span className="text-sm px-2 py-1 bg-secondary rounded text-secondary-foreground font-medium">
                    Осталось мест: {slot.availableSeats}
                  </span>
                </div>
                <h4 className="font-medium">{slot.tourName}</h4>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">Оформление бронирования</DialogTitle>
            <DialogDescription>
              {selectedSlot?.tourName} • {format(date, 'd MMMM', { locale: ru })} в {selectedSlot?.startTime}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBooking} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя {asPartner ? "клиента" : ""}</Label>
              <Input 
                id="name" 
                required 
                value={bookingForm.name}
                onChange={e => setBookingForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input 
                id="phone" 
                type="tel" 
                required 
                value={bookingForm.phone}
                onChange={e => setBookingForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (необязательно)</Label>
              <Input 
                id="email" 
                type="email" 
                value={bookingForm.email}
                onChange={e => setBookingForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="people">Количество человек</Label>
              <Input 
                id="people" 
                type="number" 
                min={1} 
                max={selectedSlot?.availableSeats || 1} 
                required 
                value={bookingForm.people}
                onChange={e => setBookingForm(f => ({ ...f, people: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Комментарий (необязательно)</Label>
              <Textarea 
                id="comment" 
                value={bookingForm.comment}
                onChange={e => setBookingForm(f => ({ ...f, comment: e.target.value }))}
              />
            </div>
            
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedSlot(null)}>Отмена</Button>
              <Button type="submit" disabled={createBooking.isPending}>
                {createBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Забронировать
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
