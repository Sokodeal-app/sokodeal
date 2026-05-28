import { supabase } from '@/lib/supabase'

type GetUserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>
type GetSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>

let currentUserRequest: Promise<GetUserResult> | null = null
let currentSessionRequest: Promise<GetSessionResult> | null = null

export const isTemporaryAuthError = (error: unknown) => {
  if (!error) return false
  const message = error instanceof Error ? error.message : String(error)
  const name = error instanceof Error ? error.name : ''
  const normalized = `${name} ${message}`.toLowerCase()
  return (
    name === 'NavigatorLockAcquireTimeoutError' ||
    message.includes('AUTH_CALL_TIMEOUT') ||
    message.includes('NavigatorLockAcquireTimeoutError') ||
    message.includes('Lock broken by another request') ||
    message.includes('auth-token') ||
    normalized.includes('lock') ||
    normalized.includes('timeout')
  )
}

export const isAuthCallTimeout = (error: unknown) => (
  error instanceof Error && error.message === 'AUTH_CALL_TIMEOUT'
)

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function withTimeout<T>(promise: Promise<T>, ms = 1800): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('AUTH_CALL_TIMEOUT'))
    }, ms)

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout))
  })
}

export const getCurrentUser = async (): Promise<GetUserResult> => {
  if (!currentUserRequest) {
    currentUserRequest = (async () => {
      try {
        return await withTimeout(supabase.auth.getUser())
      } catch (error) {
        if (isTemporaryAuthError(error)) {
          await wait(300)
          try {
            return await withTimeout(supabase.auth.getUser())
          } catch (retryError) {
            console.error('Supabase getUser failed after retry:', retryError)
            return { data: { user: null }, error: retryError } as GetUserResult
          }
        }

        console.error('Supabase getUser failed:', error)
        return { data: { user: null }, error } as GetUserResult
      }
    })()
      .finally(() => {
        currentUserRequest = null
      })
  }

  return currentUserRequest
}

export const getCurrentSession = async (): Promise<GetSessionResult> => {
  if (!currentSessionRequest) {
    currentSessionRequest = (async () => {
      try {
        return await withTimeout(supabase.auth.getSession())
      } catch (error) {
        if (isTemporaryAuthError(error)) {
          await wait(300)
          try {
            return await withTimeout(supabase.auth.getSession())
          } catch (retryError) {
            console.error('Supabase getSession failed after retry:', retryError)
            return { data: { session: null }, error: retryError } as GetSessionResult
          }
        }

        console.error('Supabase getSession failed:', error)
        return { data: { session: null }, error } as GetSessionResult
      }
    })()
      .finally(() => {
        currentSessionRequest = null
      })
  }

  return currentSessionRequest
}

export async function waitForCurrentSession(maxAttempts = 4, delayMs = 400): Promise<GetSessionResult> {
  let lastResult: GetSessionResult | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getCurrentSession()
    lastResult = result

    if (result?.data?.session) {
      return result
    }

    if (attempt < maxAttempts) {
      await wait(delayMs)
    }
  }

  return lastResult || getCurrentSession()
}

export async function waitForCurrentUser(maxAttempts = 4, delayMs = 400): Promise<GetUserResult> {
  let lastResult: GetUserResult | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getCurrentUser()
    lastResult = result

    if (result?.data?.user) {
      return result
    }

    if (attempt < maxAttempts) {
      await wait(delayMs)
    }
  }

  return lastResult || getCurrentUser()
}
