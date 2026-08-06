import { useState } from "react"
import { useAdminListCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany, useGetCompanyPriceList, useSetCompanyPriceList, getAdminListCompaniesQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, Plus, Pencil, Trash2, KeyRound, Banknote } from "lucide-react"

export default function AdminCompanies() {
  const queryClient = useQueryClient()
  const { data: companies, isLoading } = useAdminListCompanies()
  
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany()
  const deleteCompany = useDeleteCompany()

  const [editingCompany, setEditingCompany] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pricingCompany, setPricingCompany] = useState<number | null>(null)

  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    password: "",
    active: true
  })

  const handleEdit = (comp: any) => {
    setEditingCompany(comp)
    setForm({
      name: comp.name,
      contactEmail: comp.contactEmail || "",
      password: comp.password,
      active: comp.active
    })
  }

  const handleCreate = () => {
    setEditingCompany(null)
    setForm({ name: "", contactEmail: "", password: "", active: true })
    setIsCreating(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const onSucc = () => {
      queryClient.invalidateQueries({ queryKey: getAdminListCompaniesQueryKey() })
      setEditingCompany(null)
      setIsCreating(false)
    }

    if (editingCompany) {
      updateCompany.mutate({ id: editingCompany.id, data: form }, { onSuccess: onSucc })
    } else {
      createCompany.mutate({ data: form }, { onSuccess: onSucc })
    }
  }

  const handleDelete = (id: number) => {
    if (confirm("Вы уверены? Удаление компании безвозвратно.")) {
      deleteCompany.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminListCompaniesQueryKey() })
      })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary mb-1 sm:mb-2">Компании-партнеры</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Управление B2B партнерами и их скидками</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2"/> Добавить партнера</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Пароль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[180px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies?.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.contactEmail || "—"}</TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">{c.password}</TableCell>
                  <TableCell>
                    {c.active ? <span className="text-green-600 font-medium">Активен</span> : <span className="text-muted-foreground">Заблокирован</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Прайс-лист" onClick={() => setPricingCompany(c.id)}>
                        <Banknote className="w-4 h-4 text-accent" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(c.id)}>
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

      {/* CRUD Dialog */}
      <Dialog open={!!editingCompany || isCreating} onOpenChange={(open) => { if(!open) {setEditingCompany(null); setIsCreating(false)} }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Редактировать партнера' : 'Новый партнер'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название компании</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Контактный Email</Label>
              <Input type="email" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Пароль для входа (мин. 4 символа)</Label>
              <Input value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={4} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="cactive" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="w-4 h-4" />
              <Label htmlFor="cactive">Доступ разрешен</Label>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createCompany.isPending || updateCompany.isPending}>
                Сохранить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog */}
      {pricingCompany && <PricingDialog companyId={pricingCompany} onClose={() => setPricingCompany(null)} />}
    </div>
  )
}

function PricingDialog({ companyId, onClose }: { companyId: number, onClose: () => void }) {
  const { data: prices, isLoading } = useGetCompanyPriceList(companyId)
  const setPrices = useSetCompanyPriceList()
  const queryClient = useQueryClient()
  
  const [localPrices, setLocalPrices] = useState<Record<number, number>>({})

  // Initialize local state once data loads
  useState(() => {
    if (prices) {
      const init: Record<number, number> = {}
      prices.forEach(p => { init[p.tourId] = p.price })
      setLocalPrices(init)
    }
  })

  // Hacky way to sync on load
  if (prices && Object.keys(localPrices).length === 0 && prices.length > 0) {
    const init: Record<number, number> = {}
    prices.forEach(p => { init[p.tourId] = p.price })
    setLocalPrices(init)
  }

  const handleSave = () => {
    const items = Object.entries(localPrices).map(([tourId, price]) => ({
      tourId: parseInt(tourId),
      price: price
    }))
    
    setPrices.mutate({ id: companyId, data: { items } }, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Прайс-лист партнера</DialogTitle>
          <DialogDescription>Установите специальные цены для этого партнера. Базовая цена указана зачеркнутой.</DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
           <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-3">
              {prices?.map(p => (
                <div key={p.tourId} className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{p.tourName}</p>
                    <p className="text-sm text-muted-foreground line-through">Базовая: {p.basePrice} ₽</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      className="w-32 text-right font-bold text-primary"
                      value={localPrices[p.tourId] ?? p.price}
                      onChange={e => setLocalPrices({...localPrices, [p.tourId]: parseInt(e.target.value) || 0})}
                    />
                    <span className="text-muted-foreground">₽</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={setPrices.isPending}>
                {setPrices.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                Сохранить прайс
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
