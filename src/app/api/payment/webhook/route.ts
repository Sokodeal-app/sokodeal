import { NextRequest, NextResponse } from 'next/server'
import { createPaymentSupabaseClient, getPaymentErrorMessage } from '../server'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const payload = isRecord(body) ? body : {}
    const data = isRecord(payload.data) ? payload.data : {}

    if (payload.kind !== 'CASHIN' || data.status !== 'successful') {
      return NextResponse.json({ status: 'ignored' })
    }

    const ref = typeof data.ref === 'string' ? data.ref : ''
    if (!ref) return NextResponse.json({ status: 'no_ref' })

    const supabase = createPaymentSupabaseClient()
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('flw_ref', ref)
      .eq('status', 'pending')
      .single()
    if (!payment) return NextResponse.json({ status: 'not_found' })

    const type = payment.metadata?.type
    const userId = payment.user_id

    if (type === 'boost') {
      const adId = payment.metadata?.ad_id
      const days = Number.parseInt(String(payment.metadata?.duration_days), 10)
      const endsAt = new Date()
      endsAt.setDate(endsAt.getDate() + days)
      const { data: boost } = await supabase.from('boosts').insert([{
        user_id: userId, ad_id: adId, duration_days: days, price: payment.amount,
        status: 'active', is_active: true, flw_ref: ref, ends_at: endsAt.toISOString(),
      }]).select().single()
      await supabase.from('ads').update({ is_boosted: true }).eq('id', adId)
      await supabase.from('payments').update({ status: 'success', reference_id: boost?.id, payment_method: 'mobilemoney' }).eq('id', payment.id)
    }

    if (type === 'subscription') {
      const plan = payment.metadata?.plan
      const endsAt = new Date()
      endsAt.setMonth(endsAt.getMonth() + 1)
      const { data: sub } = await supabase.from('subscriptions').insert([{
        user_id: userId, plan, status: 'active', price: payment.amount,
        flw_ref: ref, ends_at: endsAt.toISOString(),
      }]).select().single()
      await supabase.from('users').update({ plan, plan_ends_at: endsAt.toISOString() }).eq('id', userId)
      await supabase.from('payments').update({ status: 'success', reference_id: sub?.id, payment_method: 'mobilemoney' }).eq('id', payment.id)
    }

    return NextResponse.json({ status: 'success' })
  } catch (err: unknown) {
    return NextResponse.json({ error: getPaymentErrorMessage(err) }, { status: 500 })
  }
}
