import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Users,
  Phone,
  Link2,
  Copy,
  MessageCircle,
  Pencil,
  RefreshCw,
} from 'lucide-react'
import {
  useParticipants,
  usePortalTokens,
  useCreateParticipant,
  useUpdateParticipant,
  useRotatePortalToken,
  type ParticipantInput,
} from '@/hooks/participants'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Field, Input } from '@/components/ui/Input'
import { Select, Textarea } from '@/components/ui/Select'
import { PageLoader, EmptyState, Avatar } from '@/components/ui/misc'
import { ParticipantStatusBadge } from '@/components/StatusBadges'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/auth/AuthProvider'
import { PLANS, portalUrl } from '@/lib/constants'
import { openWhatsApp, portalInviteMessage } from '@/lib/whatsapp'
import type { Participant } from '@/types/db'

export function ParticipantsPage() {
  const { data: participants, isLoading } = useParticipants()
  const { data: tokens } = usePortalTokens()
  const rotateToken = useRotatePortalToken()
  const { tenant, plan } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Participant | null>(null)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return participants ?? []
    return (participants ?? []).filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q) ||
        (p.cedula ?? '').includes(q),
    )
  }, [participants, search])

  const atLimit =
    plan.maxParticipants != null && (participants?.length ?? 0) >= plan.maxParticipants

  const openNew = () => {
    if (atLimit) {
      toast.error(
        `El plan ${PLANS.basic.name} permite máximo ${plan.maxParticipants} participantes. Actualiza tu plan.`,
      )
      return
    }
    setEditing(null)
    setOpen(true)
  }

  const sharePortal = (p: Participant) => {
    const token = tokens?.[p.id]
    if (!token) {
      toast.error('Aún no hay enlace para este participante. Intenta recargar.')
      return
    }
    const url = portalUrl(token)
    openWhatsApp(
      p.whatsapp ?? p.phone,
      portalInviteMessage({ participantName: p.full_name, url, businessName: tenant?.name }),
    )
  }

  const copyPortal = async (p: Participant) => {
    const token = tokens?.[p.id]
    if (!token) return
    try {
      await navigator.clipboard.writeText(portalUrl(token))
      toast.success('Enlace del portal copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const regeneratePortal = async (p: Participant) => {
    if (
      !window.confirm(
        `¿Regenerar el enlace de ${p.full_name}? El enlace anterior dejará de funcionar de inmediato.`,
      )
    )
      return
    try {
      await rotateToken.mutateAsync(p.id)
      toast.success('Enlace regenerado. El anterior quedó invalidado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo regenerar')
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Participantes"
        description={`${participants?.length ?? 0} personas registradas`}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Nuevo
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, teléfono o cédula…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Sin participantes"
          description="Registra a las personas que participan en tus Sanes."
          action={<Button onClick={openNew}>Agregar participante</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={p.full_name} src={p.photo_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-slate-800">{p.full_name}</p>
                    <ParticipantStatusBadge status={p.status} />
                  </div>
                  {p.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                      <Phone className="h-3.5 w-3.5" /> {p.phone}
                    </p>
                  )}
                  {p.cedula && <p className="text-xs text-slate-400">Cédula: {p.cedula}</p>}
                </div>
                <button
                  onClick={() => {
                    setEditing(p)
                    setOpen(true)
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <Button size="sm" variant="secondary" onClick={() => sharePortal(p)}>
                  <MessageCircle className="h-4 w-4" /> Portal
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copyPortal(p)}>
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
                <button
                  onClick={() => regeneratePortal(p)}
                  className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Regenerar enlace del portal"
                  title="Regenerar enlace (invalida el anterior)"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ParticipantModal
        open={open}
        onClose={() => setOpen(false)}
        participant={editing}
      />
    </div>
  )
}

function ParticipantModal({
  open,
  onClose,
  participant,
}: {
  open: boolean
  onClose: () => void
  participant: Participant | null
}) {
  const toast = useToast()
  const create = useCreateParticipant()
  const update = useUpdateParticipant()
  const isEdit = !!participant

  const [form, setForm] = useState<ParticipantInput>(() => blank())

  // Sincroniza el formulario cuando cambia el participante seleccionado
  const key = participant?.id ?? 'new'
  useEffect(() => {
    setForm(
      participant
        ? {
            full_name: participant.full_name,
            phone: participant.phone ?? '',
            whatsapp: participant.whatsapp ?? '',
            cedula: participant.cedula ?? '',
            address: participant.address ?? '',
            status: participant.status,
            notes: participant.notes ?? '',
          }
        : blank(),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, open])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isEdit && participant) {
        await update.mutateAsync({ id: participant.id, ...form })
        toast.success('Participante actualizado')
      } else {
        await create.mutateAsync(form)
        toast.success('Participante agregado')
      }
      onClose()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const loading = create.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar participante' : 'Nuevo participante'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="participant-form" type="submit" loading={loading}>
            {isEdit ? 'Guardar' : 'Agregar'}
          </Button>
        </>
      }
    >
      <form id="participant-form" onSubmit={submit} className="space-y-4">
        <Field label="Nombre completo" required>
          <Input
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Ej. Juan Pérez"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <Input
              inputMode="tel"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="809…"
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              inputMode="tel"
              value={form.whatsapp ?? ''}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="1809…"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cédula (opcional)">
            <Input
              value={form.cedula ?? ''}
              onChange={(e) => setForm({ ...form, cedula: e.target.value })}
            />
          </Field>
          <Field label="Estado">
            <Select
              value={form.status ?? 'active'}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as 'active' | 'suspended' })
              }
            >
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
            </Select>
          </Field>
        </div>
        <Field label="Dirección (opcional)">
          <Input
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>
        <Field label="Notas (opcional)">
          <Textarea
            rows={2}
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        {!isEdit && (
          <p className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
            <Link2 className="h-3.5 w-3.5" /> Se generará automáticamente su enlace de portal
            personal.
          </p>
        )}
      </form>
    </Modal>
  )
}

function blank(): ParticipantInput {
  return {
    full_name: '',
    phone: '',
    whatsapp: '',
    cedula: '',
    address: '',
    status: 'active',
    notes: '',
  }
}

function errMsg(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err)
  if (m.includes('PLAN_LIMIT')) return m.split(':').slice(1).join(':').trim() || m
  return m
}
