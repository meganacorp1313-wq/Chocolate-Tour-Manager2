import { useState } from "react"
import {
  useListStaff,
  getListStaffQueryKey,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
} from "@workspace/api-client-react"
import type { StaffUser } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Loader2, Plus, Pencil, Trash2, UserRound } from "lucide-react"
import { useI18n } from "@/lib/i18n"

type Role = "admin" | "manager" | "staff"

const ROLES: Role[] = ["admin", "manager", "staff"]

export default function AdminStaff() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { data: staff, isLoading } = useListStaff({
    query: { queryKey: getListStaffQueryKey() },
  })
  const createStaff = useCreateStaff()
  const updateStaff = useUpdateStaff()
  const deleteStaff = useDeleteStaff()

  const [editing, setEditing] = useState<StaffUser | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "staff" as Role })
  const [error, setError] = useState("")

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() })

  const openCreate = () => {
    setForm({ name: "", username: "", password: "", role: "staff" })
    setError("")
    setCreating(true)
  }
  const openEdit = (u: StaffUser) => {
    setForm({ name: u.name, username: u.username, password: "", role: u.role as Role })
    setError("")
    setEditing(u)
  }
  const close = () => {
    setCreating(false)
    setEditing(null)
  }

  const onError = (err: unknown) => {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? (err as { status?: number }).status
        : undefined
    setError(status === 409 ? t("staff_username_taken") : t("staff_save_error"))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (creating) {
      createStaff.mutate(
        { data: { name: form.name, username: form.username, password: form.password, role: form.role } },
        { onSuccess: () => { refresh(); close() }, onError },
      )
    } else if (editing) {
      updateStaff.mutate(
        {
          id: editing.id,
          data: {
            name: form.name,
            role: form.role,
            ...(form.password ? { password: form.password } : {}),
          },
        },
        { onSuccess: () => { refresh(); close() }, onError },
      )
    }
  }

  const toggleActive = (u: StaffUser) => {
    updateStaff.mutate({ id: u.id, data: { active: !u.active } }, { onSuccess: refresh })
  }

  const remove = (u: StaffUser) => {
    if (!window.confirm(t("staff_delete_confirm"))) return
    deleteStaff.mutate({ id: u.id }, { onSuccess: refresh })
  }

  const roleLabel = (r: string) => t(`role_${r}` as "role_admin" | "role_manager" | "role_staff")
  const pending = createStaff.isPending || updateStaff.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">{t("staff_title")}</h1>
          <p className="text-muted-foreground mt-1">{t("staff_desc")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> {t("staff_add")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !staff || staff.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">{t("staff_empty")}</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {staff.map((u) => (
            <Card key={u.id} className={u.active ? "" : "opacity-60"}>
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                  <UserRound className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{u.name}</p>
                  <p className="text-sm text-muted-foreground font-mono truncate">@{u.username}</p>
                </div>
                <Badge variant={u.role === "admin" ? "default" : "secondary"}>{roleLabel(u.role)}</Badge>
                <Badge variant={u.active ? "outline" : "destructive"} className="cursor-pointer" onClick={() => toggleActive(u)}>
                  {u.active ? t("staff_active") : t("staff_inactive")}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={creating || !!editing} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">
              {creating ? t("staff_add") : editing?.name}
            </DialogTitle>
            <DialogDescription>{t("staff_desc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("staff_name")}</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            {creating && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("staff_username")}</label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                  minLength={3}
                  required
                  autoComplete="off"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{creating ? t("staff_password") : t("staff_new_password")}</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                required={creating}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("staff_role")}</label>
              <div className="grid gap-2">
                {ROLES.map((r) => (
                  <label key={r} className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${form.role === r ? "border-primary bg-primary/5" : ""}`}>
                    <input
                      type="radio"
                      name="role"
                      className="mt-1"
                      checked={form.role === r}
                      onChange={() => setForm({ ...form, role: r })}
                    />
                    <span>
                      <span className="font-medium block">{roleLabel(r)}</span>
                      <span className="text-sm text-muted-foreground">{t(`role_${r}_hint` as "role_admin_hint" | "role_manager_hint" | "role_staff_hint")}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={close}>{t("cancel")}</Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
