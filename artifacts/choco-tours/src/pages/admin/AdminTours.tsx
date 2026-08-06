import { useState } from "react"
import { useAdminListTours, useCreateTour, useUpdateTour, useDeleteTour, getAdminListToursQueryKey, getListToursQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"

export default function AdminTours() {
  const queryClient = useQueryClient()
  const { data: tours, isLoading } = useAdminListTours()
  
  const createTour = useCreateTour()
  const updateTour = useUpdateTour()
  const deleteTour = useDeleteTour()

  const [editingTour, setEditingTour] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [form, setForm] = useState({
    name: "",
    description: "",
    durationMinutes: 60,
    basePrice: 1000,
    active: true
  })

  const handleEdit = (tour: any) => {
    setEditingTour(tour)
    setForm({
      name: tour.name,
      description: tour.description,
      durationMinutes: tour.durationMinutes,
      basePrice: tour.basePrice,
      active: tour.active
    })
  }

  const handleCreate = () => {
    setEditingTour(null)
    setForm({ name: "", description: "", durationMinutes: 60, basePrice: 1000, active: true })
    setIsCreating(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const onSucc = () => {
      queryClient.invalidateQueries({ queryKey: getAdminListToursQueryKey() })
      queryClient.invalidateQueries({ queryKey: getListToursQueryKey() })
      setEditingTour(null)
      setIsCreating(false)
    }

    if (editingTour) {
      updateTour.mutate({ id: editingTour.id, data: form }, { onSuccess: onSucc })
    } else {
      createTour.mutate({ data: form }, { onSuccess: onSucc })
    }
  }

  const handleDelete = (id: number) => {
    if (confirm("Вы уверены? Это действие нельзя отменить.")) {
      deleteTour.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListToursQueryKey() })
          queryClient.invalidateQueries({ queryKey: getListToursQueryKey() })
        }
      })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Экскурсии</h1>
          <p className="text-muted-foreground">Управление программами экскурсий</p>
        </div>
        <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2"/> Добавить</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Длительность</TableHead>
                <TableHead>Базовая цена</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours?.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.durationMinutes} мин</TableCell>
                  <TableCell>{t.basePrice} ₽</TableCell>
                  <TableCell>
                    {t.active ? <span className="text-green-600 font-medium">Активна</span> : <span className="text-muted-foreground">Архив</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(t.id)}>
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

      <Dialog open={!!editingTour || isCreating} onOpenChange={(open) => { if(!open) {setEditingTour(null); setIsCreating(false)} }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTour ? 'Редактировать экскурсию' : 'Новая экскурсия'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Длительность (мин)</Label>
                <Input type="number" min={1} value={form.durationMinutes} onChange={e => setForm({...form, durationMinutes: parseInt(e.target.value)})} required />
              </div>
              <div className="space-y-2">
                <Label>Базовая цена (₽)</Label>
                <Input type="number" min={0} value={form.basePrice} onChange={e => setForm({...form, basePrice: parseInt(e.target.value)})} required />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="active" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="w-4 h-4" />
              <Label htmlFor="active">Активна (показывается на сайте)</Label>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createTour.isPending || updateTour.isPending}>
                Сохранить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
