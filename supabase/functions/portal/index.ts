// ═══════════════════════════════════════════════════════════════════════════
// MisanRD · Edge Function `portal`
// Portal de solo lectura para el participante. Recibe un token y devuelve
// únicamente la información de ESE participante. Usa la service_role key para
// saltar RLS de forma controlada (el token es el único mecanismo de acceso).
// ═══════════════════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const FREQ_LABEL: Record<string, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    let token = url.searchParams.get('token') ?? ''
    if (!token && req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      token = body?.token ?? ''
    }
    token = token.trim()
    if (!token) return json({ error: 'Falta el token' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    // 1) Resolver token → participante + tenant
    const { data: tok } = await supabase
      .from('participant_portal_tokens')
      .select('participant_id, tenant_id')
      .eq('token', token)
      .maybeSingle()

    if (!tok) return json({ error: 'Enlace inválido o expirado' }, 404)

    const [{ data: tenant }, { data: participant }] = await Promise.all([
      supabase
        .from('tenants')
        .select('name, logo_url, whatsapp, currency')
        .eq('id', tok.tenant_id)
        .single(),
      supabase
        .from('participants')
        .select('id, full_name, phone, status')
        .eq('id', tok.participant_id)
        .single(),
    ])

    // 2) Sanes del participante (membresías)
    const { data: memberships } = await supabase
      .from('san_participants')
      .select('san_id, position, sanes(id, name, description, contribution_amount, frequency, status, start_date)')
      .eq('participant_id', tok.participant_id)

    // 3) Cuotas del participante
    const { data: installments } = await supabase
      .from('installments')
      .select('san_id, period_number, due_date, amount, paid_amount, status')
      .eq('participant_id', tok.participant_id)
      .order('due_date', { ascending: true })

    // 4) Entregas programadas donde ESTE participante recibe
    const { data: payouts } = await supabase
      .from('payout_schedule')
      .select('san_id, period_number, scheduled_date, expected_amount, status')
      .eq('recipient_participant_id', tok.participant_id)

    // 5) Recibos del participante
    const { data: payments } = await supabase
      .from('payments')
      .select('id, san_id, amount, paid_at, method, receipts(number)')
      .eq('participant_id', tok.participant_id)
      .order('paid_at', { ascending: false })

    // ── Ensamblar respuesta por San ─────────────────────────────────────────
    const insts = installments ?? []
    const pos = payouts ?? []

    const sanes = (memberships ?? []).map((m: any) => {
      const s = m.sanes
      const myInst = insts.filter((i) => i.san_id === m.san_id)
      const paid = myInst.reduce((a, i) => a + Number(i.paid_amount), 0)
      const total = myInst.reduce((a, i) => a + Number(i.amount), 0)
      const myPayout = pos.find((p) => p.san_id === m.san_id) ?? null
      return {
        id: s?.id,
        name: s?.name,
        description: s?.description,
        contribution_amount: Number(s?.contribution_amount ?? 0),
        frequency: s?.frequency,
        frequency_label: FREQ_LABEL[s?.frequency] ?? s?.frequency,
        status: s?.status,
        my_position: m.position,
        totals: { paid, total, pending: total - paid },
        payout: myPayout
          ? {
              period: myPayout.period_number,
              date: myPayout.scheduled_date,
              amount: Number(myPayout.expected_amount),
              status: myPayout.status,
            }
          : null,
        installments: myInst.map((i) => ({
          period: i.period_number,
          due_date: i.due_date,
          amount: Number(i.amount),
          paid_amount: Number(i.paid_amount),
          status: i.status,
        })),
      }
    })

    const totalPaid = insts.reduce((a, i) => a + Number(i.paid_amount), 0)
    const totalDue = insts.reduce((a, i) => a + Number(i.amount), 0)
    const nextDue = insts
      .filter((i) => i.status !== 'paid')
      .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null

    return json({
      tenant,
      participant,
      summary: {
        total_paid: totalPaid,
        total_due: totalDue,
        total_pending: totalDue - totalPaid,
        sanes_count: sanes.length,
        next_due: nextDue
          ? { due_date: nextDue.due_date, amount: Number(nextDue.amount) - Number(nextDue.paid_amount) }
          : null,
      },
      sanes,
      receipts: (payments ?? []).map((p: any) => ({
        id: p.id,
        number: p.receipts?.number ?? null,
        amount: Number(p.amount),
        paid_at: p.paid_at,
        method: p.method,
        san_id: p.san_id,
      })),
    })
  } catch (err) {
    console.error(err)
    return json({ error: 'Error interno' }, 500)
  }
})
