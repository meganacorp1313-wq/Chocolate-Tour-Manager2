import { useListTours } from "@workspace/api-client-react"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { BookingWidget } from "@/components/BookingWidget"
import { Loader2, Clock, Banknote } from "lucide-react"

export default function Home() {
  const { data: tours, isLoading } = useListTours()

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img 
          src="/hero.jpg" 
          alt="Chocolate Factory" 
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&q=80&w=2000" }}
        />
        <div className="relative z-20 text-center text-white px-4 max-w-3xl">
          <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6 drop-shadow-md">
            Магия настоящего шоколада
          </h1>
          <p className="text-xl md:text-2xl font-medium mb-10 drop-shadow">
            Приглашаем вас за кулисы нашей семейной фабрики. Попробуйте, почувствуйте и создайте свой идеальный десерт.
          </p>
          <a 
            href="#booking" 
            className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-8 text-lg font-medium text-accent-foreground shadow transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Забронировать экскурсию
          </a>
        </div>
      </section>

      {/* Tours Section */}
      <section className="py-20 bg-background" id="tours">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-4">Наши программы</h2>
            <div className="w-24 h-1 bg-accent mx-auto rounded-full" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tours?.filter(t => t.active).map((tour, idx) => (
                <div key={tour.id} className="bg-card rounded-xl overflow-hidden shadow-sm border hover:shadow-md transition-shadow group">
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img 
                      src={tour.imageUrl || `/tour-${(idx % 2) + 1}.jpg`} 
                      alt={tour.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1614088685112-0a760b71a3c8?auto=format&fit=crop&q=80&w=800" }}
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-xl font-bold text-primary mb-2">{tour.name}</h3>
                    <p className="text-muted-foreground text-sm mb-6 line-clamp-3">{tour.description}</p>
                    <div className="flex items-center justify-between text-sm font-medium pt-4 border-t">
                      <div className="flex items-center gap-1.5 text-primary">
                        <Clock className="w-4 h-4" /> {tour.durationMinutes} мин
                      </div>
                      <div className="flex items-center gap-1.5 text-accent font-bold text-lg">
                        {tour.basePrice} ₽
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Booking Section */}
      <section className="py-20 bg-secondary/30" id="booking">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-4">Календарь экскурсий</h2>
            <p className="text-muted-foreground">Выберите удобный день и время для визита</p>
          </div>
          
          <BookingWidget />
        </div>
      </section>
    </PublicLayout>
  )
}
