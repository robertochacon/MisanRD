import { createElement, type ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import type { ReceiptData } from './ReceiptPDF'
import { qrDataUrl } from '@/lib/qr'

/**
 * Genera el PDF del recibo como Blob.
 * react-pdf y el componente del recibo se cargan de forma diferida (dynamic
 * import) para no inflar el bundle principal.
 */
export async function buildReceiptBlob(
  data: Omit<ReceiptData, 'qrImage'> & { qrPayload?: string | null },
): Promise<Blob> {
  const [{ pdf }, { ReceiptPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ReceiptPDF'),
  ])
  const qrImage = data.qrPayload ? await qrDataUrl(data.qrPayload) : undefined
  const doc = createElement(ReceiptPDF, { data: { ...data, qrImage } }) as ReactElement<DocumentProps>
  return await pdf(doc).toBlob()
}

/** Descarga el recibo como archivo PDF. */
export async function downloadReceipt(
  data: Omit<ReceiptData, 'qrImage'> & { qrPayload?: string | null },
): Promise<void> {
  const blob = await buildReceiptBlob(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Recibo-${data.receiptNumber}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Comparte el recibo (Web Share API si está disponible) o lo descarga. */
export async function shareReceipt(
  data: Omit<ReceiptData, 'qrImage'> & { qrPayload?: string | null },
): Promise<boolean> {
  const blob = await buildReceiptBlob(data)
  const file = new File([blob], `Recibo-${data.receiptNumber}.pdf`, { type: 'application/pdf' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Recibo ${data.receiptNumber}` })
      return true
    } catch {
      return false
    }
  }
  // Fallback: descarga
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return false
}
