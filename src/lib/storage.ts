import { supabase } from './supabase'

/**
 * Sube un archivo al bucket indicado bajo la carpeta del tenant.
 * Devuelve el path guardado (para buckets privados) o la URL pública (logos).
 */
export async function uploadFile(
  bucket: 'logos' | 'participants' | 'signatures' | 'receipts',
  tenantId: string,
  file: File,
  prefix = '',
): Promise<{ path: string; publicUrl: string | null }> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const rand = crypto.randomUUID().slice(0, 8)
  const name = `${tenantId}/${prefix}${Date.now()}-${rand}.${ext}`

  const { error } = await supabase.storage.from(bucket).upload(name, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  const publicUrl =
    bucket === 'logos' ? supabase.storage.from(bucket).getPublicUrl(name).data.publicUrl : null

  return { path: name, publicUrl }
}
