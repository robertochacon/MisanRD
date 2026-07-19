import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Field, Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/auth/AuthProvider'

export function LoginPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasSupabaseConfig) {
      toast.error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      toast.error(
        error.message.includes('Invalid login')
          ? 'Correo o contraseña incorrectos'
          : error.message,
      )
      return
    }
    // Carga el perfil/tenant ANTES de navegar para evitar un redirect en falso al onboarding.
    await refresh()
    setLoading(false)
    navigate('/')
  }

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Administra tus Sanes desde cualquier lugar"
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-brand-600 hover:underline">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Correo" htmlFor="email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="pl-9"
            />
          </div>
        </Field>
        <Field label="Contraseña" htmlFor="password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-9"
            />
          </div>
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
