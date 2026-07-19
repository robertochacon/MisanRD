import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Field, Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'

export function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasSupabaseConfig) {
      toast.error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env')
      return
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    if (data.session) {
      // Confirmación de correo desactivada → entra directo al onboarding
      navigate('/bienvenida')
    } else {
      navigate('/verifica-correo')
    }
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Empieza gratis. 30 días de prueba, sin tarjeta."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tu nombre" htmlFor="name" required>
          <Input
            id="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ej. María Pérez"
          />
        </Field>
        <Field label="Correo" htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
          />
        </Field>
        <Field label="Contraseña" htmlFor="password" required hint="Mínimo 6 caracteres">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  )
}
