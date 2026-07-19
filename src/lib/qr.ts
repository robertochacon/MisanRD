import QRCode from 'qrcode'

/** Genera un data URL PNG de un código QR (para incrustar en recibos PDF). */
export async function qrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 240,
      errorCorrectionLevel: 'M',
      color: { dark: '#0e1e45', light: '#ffffff' },
    })
  } catch {
    return ''
  }
}
