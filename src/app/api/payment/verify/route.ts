import { NextRequest, NextResponse } from 'next/server'
import {
  createPaymentSupabaseClient,
  getPaymentErrorMessage,
  getPaypackToken,
  type PaymentSupabaseClient,
} from '../server'

type PaymentRecord = {
  id: string
  user_id: string
  amount: number
  flw_ref?: string | null
  status?: string | null
  metadata?: {
    type?: string
    ad_id?: string
    duration_days?: string | number
    plan?: string
  } | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function activatePayment(payment: PaymentRecord, supabase: PaymentSupabaseClient) {
  const type = payment.metadata?.type
  const userId = payment.user_id

  if (type === 'boost') {
    const adId = payment.metadata?.ad_id
    const days = Number.parseInt(String(payment.metadata?.duration_days), 10)
    const endsAt = new Date()
    endsAt.setDate(endsAt.getDate() + days)
    const { data: boost } = await supabase.from('boosts').insert([{
      user_id: userId, ad_id: adId, duration_days: days, price: payment.amount,
      status: 'active', is_active: true, flw_ref: payment.flw_ref, ends_at: endsAt.toISOString(),
    }]).select().single()
    await supabase.from('ads').update({ is_boosted: true }).eq('id', adId)
    await supabase.from('payments').update({ status: 'success', reference_id: boost?.id }).eq('id', payment.id)
  }

  if (type === 'subscription') {
    const plan = payment.metadata?.plan
    const endsAt = new Date()
    endsAt.setMonth(endsAt.getMonth() + 1)
    const { data: sub } = await supabase.from('subscriptions').insert([{
      user_id: userId, plan, status: 'active', price: payment.amount,
      flw_ref: payment.flw_ref, ends_at: endsAt.toISOString(),
    }]).select().single()
    await supabase.from('users').update({ plan, plan_ends_at: endsAt.toISOString() }).eq('id', userId)
    await supabase.from('payments').update({ status: 'success', reference_id: sub?.id }).eq('id', payment.id)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const payload = isRecord(body) ? body : {}
    const paymentId = typeof payload.payment_id === 'string' ? payload.payment_id : ''
    const ref = typeof payload.ref === 'string' ? payload.ref : ''
    const supabase = createPaymentSupabaseClient()

    let query = supabase.from('payments').select('*')
    if (paymentId) query = query.eq('id', paymentId)
    else if (ref) query = query.eq('flw_ref', ref)
    else return NextResponse.json({ error: 'payment_id ou ref requis' }, { status: 400 })

    const { data: payment } = await query.single()
    if (!payment) return NextResponse.json({ success: false, error: 'Introuvable' })
    if (payment.status === 'success') return NextResponse.json({ success: true, status: 'already_processed', type: payment.metadata?.type })
    if (payment.status === 'failed') return NextResponse.json({ success: false, status: 'failed' })

    const paypackRef = payment.flw_ref
    if (!paypackRef) return NextResponse.json({ success: false, status: 'pending', message: 'En attente' })

    const token = await getPaypackToken()
    const verifyRes = await fetch(`https://payments.paypack.rw/api/transactions/find/${paypackRef}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    })
    const verifyData: unknown = await verifyRes.json()
    const verifyStatus = isRecord(verifyData) && typeof verifyData.status === 'string' ? verifyData.status : ''

    if (verifyStatus === 'successful') {
      await activatePayment(payment as PaymentRecord, supabase)
      return NextResponse.json({ success: true, type: payment.metadata?.type })
    } else if (verifyStatus === 'failed') {
      await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id)
      return NextResponse.json({ success: false, status: 'failed' })
    } else {
      return NextResponse.json({ success: false, status: 'pending', message: 'En attente de confirmation MoMo' })
    }
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: getPaymentErrorMessage(err) })
  }
}
