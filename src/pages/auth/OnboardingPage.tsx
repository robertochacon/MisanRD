import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Ticket } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Field, Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import { useAcceptInvite } from '@/hooks/team'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'

export function OnboardingPage() {
  const [mode, setMode] = useState<'create' | 'join'>('create')

  return (
    <AuthLayout
      title="Configura tu acceso"
      subtitle="Crea tu negocio o únete a uno con un código"
    >
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <ModeTab active={mode === 'create'} onClick={() => setMode('create')} icon={<Store className="h-4 w-4" />}>
          Crear negocio
        </ModeTab>
        <ModeTab active={mode === 'join'} onClick={() => setMode('join')} icon={<Ticket className="h-4 w-4" />}>
          Unirme con código
        </ModeTab>
      </div>

      {mode === 'create' ? <CreateForm /> : <JoinForm />}
    </AuthLayout>
  )
}

function ModeTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
        active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function CreateForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, refresh } = useAuth()
  const [business, setBusiness] = useState('')
  const [fullName, setFullName] = useState((user?.user_metadata?.full_name as string) ?? '')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.rpc('setup_tenant', {
      p_name: business,
      p_full_name: fullName,
      p_whatsapp: whatsapp,
    })
    if (error) {
      setLoading(false)
      toast.error(error.message)
      return
    }
    await refresh()
    setLoading(false)
    toast.success('¡Todo listo! Bienvenida a MisanRD 🎉')
    navigate('/')
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nombre de tu negocio o grupo" htmlFor="business" required>
        <div className="relative">
          <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="business"
            required
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="Ej. Sanes de María"
            className="pl-9"
          />
        </div>
      </Field>
      <Field label="Tu nombre" htmlFor="fullname">
        <Input
          id="fullname"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Ej. María Pérez"
        />
      </Field>
      <Field label="WhatsApp" htmlFor="whatsapp" hint="Con código de país. Ej. 18095551234">
        <Input
          id="whatsapp"
          inputMode="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="18095551234"
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Empezar
      </Button>
    </form>
  )
}

function JoinForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh } = useAuth()
  const accept = useAcceptInvite()
  const [code, setCode] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await accept.mutateAsync(code)
      await refresh()
      toast.success('¡Te uniste a la cuenta! 🎉')
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Código inválido')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Código de invitación"
        htmlFor="code"
        required
        hint="Te lo comparte la dueña de la cuenta"
      >
        <div className="relative">
          <Ticket className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ej. a1b2c3d4e5f6"
            className="pl-9 font-mono"
          />
        </div>
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={accept.isPending}>
        Unirme
      </Button>
    </form>
  )
}
