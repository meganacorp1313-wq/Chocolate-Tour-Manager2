import { useState } from "react"
import { useGetAvailability, useListSlots, useCreateBooking, getListSlotsQueryKey, getGetAvailabilityQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { format, parseISO, startOfMonth, endOfMonth, isBefore, startOfDay, addDays } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useLocation } from "wouter"
import { Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n"

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
  const { t, dateLocale, lang } = useI18n()
  
  const monthStr = format(month, 'yyyy-MM')
  const dateStr = format(date, 'yyyy-MM-dd')

  const { data: availability, isLoading: loadingAvail } = useGetAvailability({ month: monthStr })
  const { data: slots, isLoading: loadingSlots } = useListSlots({ date: dateStr })
  const createBooking = useCreateBooking()

  const translateBookingError = (err: unknown): string => {
    const raw = typeof err === "object" && err !== null && "error" in err && typeof (err as { error?: unknown }).error === "string"
      ? (err as { error: string }).error
      : ""
    if (raw === "Слот недоступен") return t("booking_error_slot_unavailable")
    const seats = raw.match(/^Недостаточно мест: свободно (\d+)$/)
    if (seats) return t("booking_error_not_enough_seats").replace("{n}", seats[1])
    return t("booking_error_generic")
  }

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
        comment: bookingForm.comment || undefined,
        language: lang
      }
    }, {
      onSuccess: (res) => {
        // invalidations
        queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey({ date: dateStr }) })
        queryClient.invalidateQueries({ queryKey: getGetAvailabilityQueryKey({ month: monthStr }) })
        
        if (res.checkoutUrl) {
          window.location.href = res.checkoutUrl;
        } else if (asPartner) {
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

  const getTourName = (slot: any) => {
    if (lang === 'es' && slot.tourNameEs) return slot.tourNameEs;
    if (lang === 'en' && slot.tourNameEn) return slot.tourNameEn;
    return slot.tourName;
  }

  return (
    <div className="bg-card border rounded-xl shadow-lg p-4 sm:p-6 flex flex-col md:flex-row gap-6 sm:gap-8">
      {/* Calendar Side */}
      <div className="flex-1 overflow-x-auto pb-2">
        <h3 className="text-lg sm:text-xl font-serif font-semibold mb-4 text-primary">{t("select_date")}</h3>
        <div className="border rounded-lg p-1 sm:p-2 bg-background inline-block min-w-min">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            onMonthChange={setMonth}
            month={month}
            disabled={isDayDisabled}
            locale={dateLocale}
          />
        </div>
      </div>

      {/* Slots Side */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <h3 className="text-lg sm:text-xl font-serif font-semibold mb-4 text-primary">
          {t("time_for")} {format(date, 'd MMMM', { locale: dateLocale })}
        </h3>
        
        {loadingSlots ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        ) : slots?.length === 0 ? (
          <p className="text-muted-foreground">{t("no_slots")}</p>
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
                    {t("remaining_seats")} {slot.availableSeats}
                  </span>
                </div>
                <h4 className="font-medium">{getTourName(slot)}</h4>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">{t("booking_checkout")}</DialogTitle>
            <DialogDescription>
              {selectedSlot ? getTourName(selectedSlot) : ""} • {format(date, 'd MMMM', { locale: dateLocale })} — {selectedSlot?.startTime}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBooking} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">{asPartner ? t("form_client_name") : t("form_name")}</Label>
              <Input 
                id="name" 
                required 
                value={bookingForm.name}
                onChange={e => setBookingForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("form_phone")}</Label>
              <Input 
                id="phone" 
                type="tel" 
                required 
                value={bookingForm.phone}
                onChange={e => setBookingForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("form_email")}</Label>
              <Input 
                id="email" 
                type="email" 
                value={bookingForm.email}
                onChange={e => setBookingForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="people">{t("form_people")}</Label>
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
              <Label htmlFor="comment">{t("form_comment")}</Label>
              <Textarea 
                id="comment" 
                value={bookingForm.comment}
                onChange={e => setBookingForm(f => ({ ...f, comment: e.target.value }))}
              />
            </div>
            
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedSlot(null)}>{t("cancel")}</Button>
              {createBooking.isError && (
                <p className="text-sm text-destructive font-medium">{translateBookingError(createBooking.error)}</p>
              )}
              <Button type="submit" disabled={createBooking.isPending}>
                {createBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("book_btn")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}