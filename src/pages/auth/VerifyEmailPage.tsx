import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Button } from '@/components/ui/Button'

export function VerifyEmailPage() {
  return (
    <AuthLayout title="Revisa tu correo" subtitle="Te enviamos un enlace de confirmación">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          <MailCheck className="h-7 w-7" />
        </div>
        <p className="text-sm text-slate-600">
          Abre el correo que te enviamos y haz clic en el enlace para activar tu cuenta. Luego
          vuelve e inicia sesión.
        </p>
        <Link to="/login" className="w-full">
          <Button className="w-full">Ir a iniciar sesión</Button>
        </Link>
      </div>
    </AuthLayout>
  )
}
