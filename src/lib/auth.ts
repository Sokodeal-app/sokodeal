import { supabase } from '@/lib/supabase'

type GetUserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>
type GetSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>

let currentUserRequest: Promise<GetUserResult> | null = null
let currentSessionRequest: Promise<GetSessionResult> | null = null

export const isTemporaryAuthError = (error: unknown) => {
  if (!error) return false
  const message = error instanceof Error ? error.message : String(error)
  const name = error instanceof Error ? error.name : ''
  return (
    name === 'NavigatorLockAcquireTimeoutError' ||
    message.includes('NavigatorLockAcquireTimeoutError') ||
    message.includes('Lock broken by another request') ||
    message.includes('auth-token')
  )
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const getCurrentUser = async (): Promise<GetUserResult> => {
  if (!currentUserRequest) {
    currentUserRequest = (async () => {
      try {
        return await supabase.auth.getUser()
      } catch (error) {
        if (isTemporaryAuthError(error)) {
          console.warn('AUTH LOCK ERROR - ignored as temporary', error)
          await wait(300)
          try {
            return await supabase.auth.getUser()
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
        return await supabase.auth.getSession()
      } catch (error) {
        if (isTemporaryAuthError(error)) {
          console.warn('AUTH LOCK ERROR - ignored as temporary', error)
          await wait(300)
          try {
            return await supabase.auth.getSession()
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
