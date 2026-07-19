import { digits, money, fmtDate } from './format'

/** Construye un enlace wa.me con mensaje pre-rellenado. */
export function waLink(phone: string | null | undefined, message: string): string {
  const p = digits(phone)
  const text = encodeURIComponent(message)
  return p ? `https://wa.me/${p}?text=${text}` : `https://wa.me/?text=${text}`
}

/** Abre WhatsApp con el mensaje listo para enviar. */
export function openWhatsApp(phone: string | null | undefined, message: string): void {
  window.open(waLink(phone, message), '_blank', 'noopener,noreferrer')
}

interface ReminderCtx {
  participantName: string
  sanName: string
  amount: number
  dueDate?: string | null
  businessName?: string | null
}

/** Recordatorio de cuota vencida / por vencer. */
export function paymentReminderMessage(ctx: ReminderCtx): string {
  const when = ctx.dueDate ? ` (vence el ${fmtDate(ctx.dueDate)})` : ''
  return (
    `Hola ${ctx.participantName} 👋\n\n` +
    `Te recordamos tu cuota del San "${ctx.sanName}"${when}.\n\n` +
    `Monto: ${money(ctx.amount)}\n\n` +
    `¡Gracias!${ctx.businessName ? `\n${ctx.businessName}` : ''}`
  )
}

/** Aviso de que hoy recibe su San. */
export function payoutMessage(ctx: ReminderCtx): string {
  return (
    `¡Hola ${ctx.participantName}! 🎉\n\n` +
    `Hoy recibirás tu San "${ctx.sanName}".\n\n` +
    `Monto: ${money(ctx.amount)}\n\n` +
    `Coordina con nosotros la entrega.${ctx.businessName ? `\n${ctx.businessName}` : ''}`
  )
}

/** Compartir enlace del portal del participante. */
export function portalInviteMessage(ctx: {
  participantName: string
  url: string
  businessName?: string | null
}): string {
  return (
    `Hola ${ctx.participantName} 👋\n\n` +
    `Este es tu portal personal para ver tus pagos, lo que debes, cuándo te toca ` +
    `recibir y descargar tus recibos:\n\n${ctx.url}\n\n` +
    `Guarda este enlace.${ctx.businessName ? `\n${ctx.businessName}` : ''}`
  )
}

/** Invitar a un administrador con su código. */
export function adminInviteMessage(ctx: {
  code: string
  registerUrl: string
  businessName?: string | null
}): string {
  return (
    `¡Hola! Te invito a administrar los Sanes de "${ctx.businessName ?? 'nuestro negocio'}" en MisanRD 🎉\n\n` +
    `1) Crea tu cuenta aquí:\n${ctx.registerUrl}\n\n` +
    `2) Al iniciar, elige "Unirme con código" e ingresa:\n\n${ctx.code}\n\n` +
    `El código vence en 14 días.`
  )
}

/** Compartir un recibo por WhatsApp. */
export function receiptMessage(ctx: {
  participantName: string
  sanName: string
  amount: number
  receiptNumber: string
  date: string
  businessName?: string | null
}): string {
  return (
    `Hola ${ctx.participantName} 👋\n\n` +
    `Recibo ${ctx.receiptNumber} — San "${ctx.sanName}"\n` +
    `Monto: ${money(ctx.amount)}\n` +
    `Fecha: ${fmtDate(ctx.date)}\n\n` +
    `¡Gracias por tu pago!${ctx.businessName ? `\n${ctx.businessName}` : ''}`
  )
}
