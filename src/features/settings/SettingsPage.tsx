import { useEffect, useState } from 'react'
import {
  Building2,
  Upload,
  Check,
  Crown,
  Sparkles,
  Users,
  UserPlus,
  Copy,
  Trash2,
  MessageCircle,
  Lock,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar, EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/auth/AuthProvider'
import { useUpdateTenant, type TenantUpdate } from '@/hooks/tenant'
import {
  useTeamMembers,
  usePendingInvites,
  useCreateInvite,
  useRevokeInvite,
} from '@/hooks/team'
import { uploadFile } from '@/lib/storage'
import { PLANS, PLAN_ORDER, PUBLIC_URL, planPriceLabel } from '@/lib/constants'
import { fmtDate } from '@/lib/format'
import { openWhatsApp, adminInviteMessage } from '@/lib/whatsapp'
import { cn } from '@/lib/cn'

export function SettingsPage() {
  const { tenant, subscription, plan, refresh } = useAuth()
  const update = useUpdateTenant()
  const toast = useToast()
  const [form, setForm] = useState<TenantUpdate>({})
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name,
        whatsapp: tenant.whatsapp ?? '',
        phone: tenant.phone ?? '',
        email: tenant.email ?? '',
        address: tenant.address ?? '',
        bank_name: tenant.bank_name ?? '',
        bank_account: tenant.bank_account ?? '',
      })
    }
  }, [tenant])

  if (!tenant) return null

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await update.mutateAsync({ id: tenant.id, ...form })
      await refresh()
      toast.success('Cambios guardados')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const onLogo = async (file: File) => {
    setUploading(true)
    try {
      const { publicUrl } = await uploadFile('logos', tenant.id, file, 'logo-')
      await update.mutateAsync({ id: tenant.id, logo_url: publicUrl })
      await refresh()
      toast.success('Logo actualizado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir el logo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <PageHeader title="Configuración" description="Datos de tu negocio y plan" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Datos de la administradora" />
            <CardBody>
              <div className="mb-5 flex items-center gap-4">
                <Avatar name={tenant.name} src={tenant.logo_url} size="lg" />
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Subiendo…' : 'Cambiar logo'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onLogo(f)
                    }}
                  />
                </label>
              </div>

              <form onSubmit={save} className="space-y-4">
                <Field label="Nombre del negocio" required>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      required
                      value={form.name ?? ''}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="WhatsApp" hint="Con código de país. Ej. 18095551234">
                    <Input
                      inputMode="tel"
                      value={form.whatsapp ?? ''}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    />
                  </Field>
                  <Field label="Teléfono">
                    <Input
                      inputMode="tel"
                      value={form.phone ?? ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Dirección">
                  <Input
                    value={form.address ?? ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Banco">
                    <Input
                      value={form.bank_name ?? ''}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    />
                  </Field>
                  <Field label="Cuenta bancaria">
                    <Input
                      value={form.bank_account ?? ''}
                      onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" loading={update.isPending}>
                    Guardar cambios
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Plan */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Tu plan"
              action={
                subscription?.status === 'trial' ? (
                  <Badge tone="gold">Prueba</Badge>
                ) : (
                  <Badge tone="green">Activo</Badge>
                )
              }
            />
            <CardBody>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-gold-400" />
                <span className="text-lg font-bold text-slate-800">{plan.name}</span>
                <span className="text-slate-400">· {planPriceLabel(plan)}</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Otros planes" subtitle="Para cambiar de plan, contáctanos" />
            <CardBody className="space-y-2">
              {PLAN_ORDER.filter((c) => c !== plan.code).map((code) => {
                const p = PLANS[code]
                return (
                  <div
                    key={code}
                    className={cn(
                      'flex items-center justify-between rounded-xl border border-slate-200 p-3',
                    )}
                  >
                    <div>
                      <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                        {code === 'premium' && <Sparkles className="h-4 w-4 text-gold-400" />}
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-500">{p.features[0]}</p>
                    </div>
                    <span className="font-bold text-brand-600">{planPriceLabel(p)}</span>
                  </div>
                )
              })}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <TeamCard />
      </div>
    </div>
  )
}

function TeamCard() {
  const { tenant, plan, profile } = useAuth()
  const toast = useToast()
  const { data: members } = useTeamMembers()
  const { data: invites } = usePendingInvites()
  const createInvite = useCreateInvite()
  const revokeInvite = useRevokeInvite()

  const isPremium = plan.code === 'premium'
  const isOwner = profile?.role === 'owner'
  const canInvite = isPremium && isOwner
  const registerUrl = `${PUBLIC_URL}/#/registro`

  const invite = async () => {
    try {
      await createInvite.mutateAsync()
      toast.success('Invitación creada. Compártela con el nuevo administrador.')
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Error'
      toast.error(m.includes('PLAN_LIMIT') ? m.split(':').slice(1).join(':').trim() : m)
    }
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Código copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <Card>
      <CardHeader
        title="Administradores"
        subtitle="Personas que pueden gestionar esta cuenta"
        action={
          canInvite ? (
            <Button size="sm" onClick={invite} loading={createInvite.isPending}>
              <UserPlus className="h-4 w-4" /> Invitar
            </Button>
          ) : !isPremium ? (
            <Badge tone="gold">
              <Crown className="h-3.5 w-3.5" /> Premium
            </Badge>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        {/* Miembros actuales */}
        <ul className="space-y-2">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <Avatar name={m.full_name} size="sm" />
              <span className="flex-1 truncate text-sm font-medium text-slate-800">
                {m.full_name ?? 'Administrador'}
              </span>
              <Badge tone={m.role === 'owner' ? 'blue' : 'gray'}>
                {m.role === 'owner' ? 'Dueña' : 'Administrador'}
              </Badge>
            </li>
          ))}
        </ul>

        {!isPremium ? (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
            <Lock className="h-5 w-5 shrink-0 text-slate-400" />
            Agrega más administradores con el plan <span className="font-semibold">Premium</span>.
          </div>
        ) : !isOwner ? null : invites && invites.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Invitaciones pendientes
            </p>
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5"
                >
                  <code className="flex-1 truncate rounded-lg bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700">
                    {inv.code}
                  </code>
                  <span className="hidden text-xs text-slate-400 sm:inline">
                    vence {fmtDate(inv.expires_at)}
                  </span>
                  <button
                    onClick={() => copyCode(inv.code)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Copiar código"
                    title="Copiar código"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      openWhatsApp(
                        '',
                        adminInviteMessage({
                          code: inv.code,
                          registerUrl,
                          businessName: tenant?.name,
                        }),
                      )
                    }
                    className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                    aria-label="Enviar por WhatsApp"
                    title="Enviar por WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => revokeInvite.mutate(inv.id)}
                    className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
                    aria-label="Revocar"
                    title="Revocar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="Sin invitaciones pendientes"
            description="Invita a otra persona para que administre contigo."
          />
        )}
      </CardBody>
    </Card>
  )
}
