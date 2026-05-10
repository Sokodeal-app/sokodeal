'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getCurrentSession } from '@/lib/auth'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshAuth = useCallback(async () => {
    try {
      const { data, error } = await getCurrentSession()
      if (error) {
        console.error('AuthProvider getSession error:', error)
        return
      }

      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }

      if (nextSession?.user) {
        setSession(nextSession)
        setUser(nextSession.user)
        setLoading(false)
        return
      }

      if (event === 'INITIAL_SESSION') {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [refreshAuth])

  useEffect(() => {
    const handlePageShow = () => {
      refreshAuth()
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [refreshAuth])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    isAuthenticated: !!user,
    refreshAuth,
  }), [user, session, loading, refreshAuth])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
