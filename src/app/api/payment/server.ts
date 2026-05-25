import { createClient } from '@supabase/supabase-js'

type RequiredPaymentEnv =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'PAYPACK_CLIENT_ID'
  | 'PAYPACK_CLIENT_SECRET'

export type PaymentSupabaseClient = ReturnType<typeof createPaymentSupabaseClient>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getRequiredPaymentEnv(name: RequiredPaymentEnv) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required payment environment variable: ${name}`)
  }

  return value
}

export function createPaymentSupabaseClient() {
  return createClient(
    getRequiredPaymentEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredPaymentEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

export async function getPaypackToken() {
  const res = await fetch('https://payments.paypack.rw/api/auth/agents/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: getRequiredPaymentEnv('PAYPACK_CLIENT_ID'),
      client_secret: getRequiredPaymentEnv('PAYPACK_CLIENT_SECRET'),
    }),
  })

  const data: unknown = await res.json()

  if (!res.ok) {
    throw new Error('Paypack authorization failed')
  }

  if (!isRecord(data) || typeof data.access !== 'string' || data.access.trim() === '') {
    throw new Error('Paypack token missing')
  }

  return data.access
}

export function getPaymentErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected payment error'
}
