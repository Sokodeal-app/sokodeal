import { NextRequest, NextResponse } from 'next/server'
import { createPaymentSupabaseClient, getPaypackToken, getPaymentErrorMessage } from './server'

const BOOST_PRICES: Record<string, number> = { '1': 500, '3': 1000, '7': 2000, '30': 6000 }
const SUBSCRIPTION_PRICES: Record<string, number> = { pro: 8000, agence: 25000 }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    const payload = isRecord(body) ? body : {}
    const type = typeof payload.type === 'string' ? payload.type : ''
    const plan = typeof payload.plan === 'string' ? payload.plan : ''
    const adId = typeof payload.ad_id === 'string' ? payload.ad_id : ''
    const durationDays = typeof payload.duration_days === 'string' || typeof payload.duration_days === 'number'
      ? String(payload.duration_days)
      : ''
    const userId = typeof payload.user_id === 'string' ? payload.user_id : ''
    const phone = typeof payload.phone === 'string' ? payload.phone : ''

    if (!type || !userId || !phone) {
      return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 })
    }

    const cleanPhone = phone.replace(/\s+/g, '').replace('+250', '0').replace('250', '0')
    if (!/^07[0-9]{8}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'Numero invalide (format: 07XXXXXXXX)' }, { status: 400 })
    }

    let amount = 0
    const meta: Record<string, unknown> = { type, user_id: userId }

    if (type === 'boost') {
      if (!BOOST_PRICES[durationDays] || !adId) return NextResponse.json({ error: 'Boost invalide' }, { status: 400 })
      amount = BOOST_PRICES[durationDays]
      meta.ad_id = adId
      meta.duration_days = durationDays
    } else if (type === 'subscription') {
      if (!SUBSCRIPTION_PRICES[plan]) return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
      amount = SUBSCRIPTION_PRICES[plan]
      meta.plan = plan
    } else {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    const supabase = createPaymentSupabaseClient()
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{ user_id: userId, type, amount, status: 'pending', metadata: meta }])
      .select()
      .single()
    if (paymentError) throw paymentError

    const token = await getPaypackToken()
    if (!token) throw new Error('Token Paypack introuvable')

    const paypackRes = await fetch('https://payments.paypack.rw/api/transactions/cashin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': payment.id,
      },
      body: JSON.stringify({ amount, number: cleanPhone }),
    })

    const paypackData = await paypackRes.json()
    if (paypackData.error) throw new Error(paypackData.error)

    await supabase.from('payments').update({ flw_ref: paypackData.ref }).eq('id', payment.id)

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      ref: paypackData.ref,
      message: 'Confirmez le paiement sur votre telephone Mobile Money',
    })
  } catch (err: unknown) {
    console.error('Payment error:', err)
    return NextResponse.json({ error: getPaymentErrorMessage(err) }, { status: 500 })
  }
}
