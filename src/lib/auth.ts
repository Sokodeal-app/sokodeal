import { supabase } from '@/lib/supabase'

type GetUserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>

let currentUserRequest: Promise<GetUserResult> | null = null

export const getCurrentUser = async (): Promise<GetUserResult> => {
  if (!currentUserRequest) {
    currentUserRequest = supabase.auth.getUser()
      .catch((error) => {
        console.warn('Supabase getUser failed:', error)
        return { data: { user: null }, error } as GetUserResult
      })
      .finally(() => {
        currentUserRequest = null
      })
  }

  return currentUserRequest
}
