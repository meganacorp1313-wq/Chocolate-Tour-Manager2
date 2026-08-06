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
import { useI18n } from "@/lib/i18n"

export default function AdminTours() {
  const queryClient = useQueryClient()
  const { data: tours, isLoading } = useAdminListTours()
  const { t, lang } = useI18n()
  
  const createTour = useCreateTour()
  const updateTour = useUpdateTour()
  const deleteTour = useDeleteTour()

  const [editingTour, setEditingTour] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [form, setForm] = useState({
    name: "",
    nameEs: "",
    nameEn: "",
    description: "",
    descriptionEs: "",
    descriptionEn: "",
    durationMinutes: 60,
    basePrice: 15,
    active: true
  })

  const handleEdit = (tour: any) => {
    setEditingTour(tour)
    setForm({
      name: tour.name || "",
      nameEs: tour.nameEs || "",
      nameEn: tour.nameEn || "",
      description: tour.description || "",
      descriptionEs: tour.descriptionEs || "",
      descriptionEn: tour.descriptionEn || "",
      durationMinutes: tour.durationMinutes,
      basePrice: tour.basePrice,
      active: tour.active
    })
  }

  const handleCreate = () => {
    setEditingTour(null)
    setForm({ name: "", nameEs: "", nameEn: "", description: "", descriptionEs: "", descriptionEn: "", durationMinutes: 60, basePrice: 15, active: true })
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

    const payload = {
      ...form,
      nameEs: form.nameEs || undefined,
      nameEn: form.nameEn || undefined,
      descriptionEs: form.descriptionEs || undefined,
      descriptionEn: form.descriptionEn || undefined,
    };

    if (editingTour) {
      updateTour.mutate({ id: editingTour.id, data: payload }, { onSuccess: onSucc })
    } else {
      createTour.mutate({ data: payload }, { onSuccess: onSucc })
    }
  }

  const handleDelete = (id: number) => {
    if (confirm(t("confirm_delete"))) {
      deleteTour.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListToursQueryKey() })
          queryClient.invalidateQueries({ queryKey: getListToursQueryKey() })
        }
      })
    }
  }

  const getTourName = (tour: any) => {
    if (lang === 'es' && tour.nameEs) return tour.nameEs;
    if (lang === 'en' && tour.nameEn) return tour.nameEn;
    return tour.name;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-primary mb-1 sm:mb-2">{t("tours_title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t("tours_desc")}</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-2"/> {t("add")}</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col_name")}</TableHead>
                <TableHead>{t("col_duration")}</TableHead>
                <TableHead>{t("col_price")}</TableHead>
                <TableHead>{t("col_status")}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours?.map(tour => (
                <TableRow key={tour.id}>
                  <TableCell className="font-medium">{getTourName(tour)}</TableCell>
                  <TableCell>{tour.durationMinutes} {t("mins")}</TableCell>
                  <TableCell>${tour.basePrice}</TableCell>
                  <TableCell>
                    {tour.active ? <span className="text-green-600 font-medium">{t("active")}</span> : <span className="text-muted-foreground">{t("archive")}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(tour)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(tour.id)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTour ? t("edit_tour") : t("new_tour")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t("name_es")} (Default)</Label>
              <Input value={form.nameEs} onChange={e => setForm({...form, nameEs: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>{t("desc_es")}</Label>
              <Textarea value={form.descriptionEs} onChange={e => setForm({...form, descriptionEs: e.target.value})} rows={2} required />
            </div>

            <div className="space-y-2">
              <Label>{t("name_ru")} (Fallback)</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>{t("desc_ru")}</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} required />
            </div>
            
            <div className="space-y-2">
              <Label>{t("name_en")}</Label>
              <Input value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>{t("desc_en")}</Label>
              <Textarea value={form.descriptionEn} onChange={e => setForm({...form, descriptionEn: e.target.value})} rows={2} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("duration_min")}</Label>
                <Input type="number" min={1} value={form.durationMinutes} onChange={e => setForm({...form, durationMinutes: parseInt(e.target.value)})} required />
              </div>
              <div className="space-y-2">
                <Label>{t("price_usd")}</Label>
                <Input type="number" min={0} value={form.basePrice} onChange={e => setForm({...form, basePrice: parseInt(e.target.value)})} required />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="active" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="w-4 h-4" />
              <Label htmlFor="active">{t("is_active")}</Label>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createTour.isPending || updateTour.isPending}>
                {t("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
