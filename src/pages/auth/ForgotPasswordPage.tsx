import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MailCheck, ArrowLeft } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Field, Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase, hasSupabaseConfig } from '@/lib/supabase'
import { useToast } from '@/components/ui/toast'

export function ForgotPasswordPage() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasSupabaseConfig) {
      toast.error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env')
      return
    }
    setLoading(true)
    // Supabase devuelve al usuario a la raíz de la app con el token en el
    // fragmento; recoveryBootstrap lo redirige a /restablecer. BASE_URL cubre
    // tanto dominio propio (/) como "project page" (/MisanRD/).
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    setLoading(false)
    if (error) {
      toast.error(
        /rate|security purposes|too many/i.test(error.message)
          ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
          : error.message,
      )
      return
    }
    // Mensaje neutral: no revelamos si el correo existe (evita enumeración).
    setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout title="Revisa tu correo" subtitle="Te enviamos las instrucciones">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="text-sm text-slate-600">
            Si <span className="font-medium text-slate-800">{email.trim()}</span> tiene una cuenta,
            recibirás un enlace para crear una nueva contraseña. Revisa también tu carpeta de spam.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Usar otro correo
          </button>
          <Link to="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Volver a iniciar sesión
            </Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="¿Olvidaste tu contraseña?"
      subtitle="Escribe tu correo y te enviaremos un enlace para restablecerla"
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
        </Link>
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
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Enviar enlace
        </Button>
      </form>
    </AuthLayout>
  )
}
