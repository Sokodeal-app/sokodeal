'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { useUnreadCount } from '@/hooks/useUnreadCount'

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const { unreadCount } = useUnreadCount()

  const refreshUser = useCallback(async () => {
    const { data: { user } } = await getCurrentUser()
    setUser(user ?? null)
  }, [])

  useEffect(() => {
    refreshUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        return
      }

      if (session?.user) {
        setUser(session.user)
      }
    })
    return () => subscription.unsubscribe()
  }, [refreshUser])

  useEffect(() => {
    const handlePageShow = () => {
      refreshUser()
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [refreshUser])

  const handleLogout = async () => {
    setLogoutLoading(true)
    setLogoutError('')
    const { error } = await supabase.auth.signOut()

    if (error) {
      setLogoutError(error.message)
      setLogoutLoading(false)
      return
    }

    setUser(null)
    window.location.href = '/'
  }

  return (
    <>
      <style>{`
        .header-logo-text { display: block; }
        .header-search { display: flex; }
        @media (max-width: 768px) {
          .header-logo-text { display: none !important; }
          .header-search { display: none !important; }
          .mon-compte-label { display: none !important; }
          .deposer-text { display: none !important; }
        }
      `}</style>
      <header style={{ background: 'white', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #e8ede9', paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4%', height: '58px', gap: '10px', maxWidth: '1300px', margin: '0 auto' }}>

          {/* LOGO */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: '34px', height: '34px', background: '#f5a623', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>🦁</div>
            <span className="header-logo-text" style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.25rem', color: '#111a14' }}>
              Soko<span style={{ color: '#1a7a4a' }}>Deal</span>
            </span>
          </a>

          {/* BOUTONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, position: 'relative' }}>
            {user ? (
              <>
                <button onClick={() => router.push('/messages')} style={{ position: 'relative', width: '38px', height: '38px', background: '#f5f7f5', border: '1px solid #e8ede9', borderRadius: '9px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  💬
                  {unreadCount > 0 && (
                    <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: '#e74c3c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800, color: 'white' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </button>
                <button onClick={() => router.push('/profil')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#f5f7f5', border: '1px solid #e8ede9', borderRadius: '9px', color: '#111a14', fontFamily: 'DM Sans,sans-serif', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f5a623', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', color: '#111a14', flexShrink: 0 }}>
                    {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="mon-compte-label">Mon compte</span>
                </button>
                <button onClick={handleLogout} disabled={logoutLoading} title="Se deconnecter" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: logoutLoading ? '#f5f7f5' : '#fff1f0', border: '1px solid #ffd6d6', borderRadius: '9px', color: logoutLoading ? '#6b7c6e' : '#c0392b', fontFamily: 'DM Sans,sans-serif', fontSize: '0.82rem', fontWeight: 700, cursor: logoutLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>⏻</span>
                  <span className="mon-compte-label">{logoutLoading ? 'Sortie...' : 'Se deconnecter'}</span>
                </button>
                {logoutError && (
                  <div style={{ position: 'absolute', top: '44px', right: 0, background: '#fff1f0', border: '1px solid #ffd6d6', color: '#c0392b', borderRadius: '8px', padding: '8px 10px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.75rem', width: '220px', boxShadow: '0 8px 24px rgba(17,26,20,.12)' }}>
                    {logoutError}
                  </div>
                )}
              </>
            ) : (
              <>
                <button onClick={() => router.push('/auth?mode=login')} style={{ padding: '7px 12px', border: '1px solid #e8ede9', borderRadius: '9px', color: '#111a14', background: 'white', fontFamily: 'DM Sans,sans-serif', fontSize: '0.82rem', cursor: 'pointer' }}>
                  Connexion
                </button>
              </>
            )}
            <button onClick={() => router.push('/publier')} style={{ padding: '7px 12px', background: '#f5a623', border: 'none', borderRadius: '9px', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.82rem', color: '#111a14', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              +<span className="deposer-text"> Publier</span>
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
