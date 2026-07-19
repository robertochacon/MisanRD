import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Shuffle,
  ArrowUp,
  ArrowDown,
  X,
  UserPlus,
  Search,
  Coins,
  Check,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { Select, Textarea } from '@/components/ui/Select'
import { PageLoader, Avatar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { useParticipants, useCreateParticipant } from '@/hooks/participants'
import { useCreateSan } from '@/hooks/sanes'
import { FREQUENCIES } from '@/lib/constants'
import { money, fmtDate } from '@/lib/format'
import { buildSchedulePreview, shuffle } from '@/lib/san'
import { cn } from '@/lib/cn'
import type { SanFrequency } from '@/types/db'

export function SanCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: participants, isLoading } = useParticipants()
  const createSan = useCreateSan()
  const createParticipant = useCreateParticipant()

  const [step, setStep] = useState<1 | 2>(1)

  // Paso 1: detalles
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<SanFrequency>('weekly')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))

  // Paso 2: participantes + orden
  const [selected, setSelected] = useState<string[]>([])
  const [orderMode, setOrderMode] = useState<'manual' | 'random'>('manual')
  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const byId = useMemo(() => {
    const m: Record<string, { id: string; full_name: string; phone: string | null }> = {}
    ;(participants ?? []).forEach((p) => (m[p.id] = p))
    return m
  }, [participants])

  const available = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (participants ?? [])
      .filter((p) => !selected.includes(p.id))
      .filter((p) => !q || p.full_name.toLowerCase().includes(q))
  }, [participants, selected, search])

  const contribution = Number(amount) || 0
  const preview = useMemo(
    () =>
      buildSchedulePreview({
        start: new Date(`${startDate}T00:00:00`),
        frequency,
        contribution,
        order: selected.map((id) => ({ id, name: byId[id]?.full_name ?? '' })),
      }),
    [startDate, frequency, contribution, selected, byId],
  )

  const goStep2 = () => {
    if (!name.trim()) return toast.error('Ponle un nombre al San')
    if (contribution <= 0) return toast.error('Ingresa el monto de la cuota')
    if (!startDate) return toast.error('Elige la fecha de inicio')
    setStep(2)
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= selected.length) return
    setSelected((s) => {
      const a = [...s]
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    })
    setOrderMode('manual')
  }

  const doShuffle = () => {
    setSelected((s) => shuffle(s))
    setOrderMode('random')
  }

  const addNew = async () => {
    if (!newName.trim()) return
    try {
      const p = await createParticipant.mutateAsync({
        full_name: newName.trim(),
        phone: newPhone.trim() || null,
        whatsapp: newPhone.trim() || null,
      })
      setSelected((s) => [...s, p.id])
      setNewName('')
      setNewPhone('')
      toast.success('Participante agregado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const submit = async () => {
    if (selected.length < 2) return toast.error('Selecciona al menos 2 participantes')
    try {
      const id = await createSan.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        contribution_amount: contribution,
        frequency,
        start_date: startDate,
        order_type: orderMode,
        orderedParticipantIds: selected,
      })
      toast.success('¡San creado y activado! 🎉')
      navigate(`/sanes/${id}`)
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Error'
      toast.error(m.includes('PLAN_LIMIT') ? m.split(':').slice(1).join(':').trim() : m)
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <button
        onClick={() => (step === 1 ? navigate('/sanes') : setStep(1))}
        className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> {step === 1 ? 'Volver a Sanes' : 'Volver a detalles'}
      </button>

      <PageHeader
        title="Nuevo San"
        description={step === 1 ? 'Paso 1 de 2 · Detalles' : 'Paso 2 de 2 · Participantes y orden'}
      />

      {step === 1 ? (
        <Card>
          <CardBody className="space-y-4">
            <Field label="Nombre del San" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. San Navidad" />
            </Field>
            <Field label="Descripción (opcional)">
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. San del grupo del colmado"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monto por cuota" required>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    RD$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500"
                    className="pl-11"
                  />
                </div>
              </Field>
              <Field label="Frecuencia" required>
                <Select value={frequency} onChange={(e) => setFrequency(e.target.value as SanFrequency)}>
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label} ({f.every})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Fecha de inicio" required>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <div className="flex justify-end">
              <Button onClick={goStep2}>
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Seleccionar / agregar */}
          <Card>
            <CardHeader title="Agregar participantes" subtitle="Selecciona de tu lista o crea nuevos" />
            <CardBody className="space-y-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Crear rápido
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Nombre"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Input
                    placeholder="Teléfono"
                    inputMode="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="sm:max-w-[140px]"
                  />
                  <Button onClick={addNew} loading={createParticipant.isPending} className="shrink-0">
                    <UserPlus className="h-4 w-4" /> Agregar
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar en mi lista…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-64 space-y-1 overflow-y-auto">
                {available.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    No hay más participantes disponibles.
                  </p>
                ) : (
                  available.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected((s) => [...s, p.id])}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50"
                    >
                      <Avatar name={p.full_name} size="sm" />
                      <span className="flex-1 truncate text-sm text-slate-700">{p.full_name}</span>
                      <span className="rounded-lg bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600">
                        Añadir
                      </span>
                    </button>
                  ))
                )}
              </div>
            </CardBody>
          </Card>

          {/* Orden + preview */}
          <Card>
            <CardHeader
              title={`Orden de entrega (${selected.length})`}
              action={
                <Button size="sm" variant="outline" onClick={doShuffle} disabled={selected.length < 2}>
                  <Shuffle className="h-4 w-4" /> Aleatorio
                </Button>
              }
            />
            <CardBody className="space-y-3">
              {selected.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Agrega participantes para definir el orden.
                </p>
              ) : (
                <ol className="space-y-1">
                  {selected.map((id, i) => (
                    <li
                      key={id}
                      className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-2 py-1.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-sm text-slate-700">
                        {byId[id]?.full_name}
                      </span>
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Subir"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === selected.length - 1}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                        aria-label="Bajar"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelected((s) => s.filter((x) => x !== id))}
                        className="rounded p-1 text-red-400 hover:bg-red-50"
                        aria-label="Quitar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}

              {selected.length >= 2 && (
                <div className="rounded-xl bg-brand-50 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-brand-700">
                    <Coins className="h-4 w-4" /> Cada quien recibe {money(contribution * selected.length)}
                  </div>
                  <p className="mt-1 text-xs text-brand-600/80">
                    {selected.length} turnos · primera entrega {fmtDate(preview[0]?.date)} · última{' '}
                    {fmtDate(preview[preview.length - 1]?.date)}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Preview cronograma */}
          {selected.length >= 2 && (
            <Card className="lg:col-span-2">
              <CardHeader title="Vista previa del cronograma" />
              <CardBody className="p-0">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2">Turno</th>
                        <th className="px-4 py-2">Fecha</th>
                        <th className="px-4 py-2">Recibe</th>
                        <th className="px-4 py-2 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.map((r) => (
                        <tr key={r.period}>
                          <td className="px-4 py-2 font-medium text-slate-600">#{r.period}</td>
                          <td className="px-4 py-2 text-slate-600">{fmtDate(r.date)}</td>
                          <td className="px-4 py-2 text-slate-800">{r.recipientName}</td>
                          <td className="px-4 py-2 text-right font-semibold text-brand-600">
                            {money(r.pot)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="lg:col-span-2">
            <Button
              size="lg"
              className={cn('w-full')}
              onClick={submit}
              loading={createSan.isPending}
              disabled={selected.length < 2}
            >
              <Check className="h-5 w-5" /> Crear y activar San
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
