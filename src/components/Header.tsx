'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useUnreadCount } from '@/hooks/useUnreadCount'

const UI_TEXT = {
  home: 'Accueil SokoDeal',
  messages: 'Messages',
  profile: 'Mon compte',
  logout: 'Se deconnecter',
  logoutLoading: 'Sortie...',
  login: 'Connexion',
  publish: 'Publier',
}

export default function Header() {
  const router = useRouter()
  const { user } = useAuth()
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const { unreadCount } = useUnreadCount()
  const userInitial = (user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()
  const unreadLabel = unreadCount > 9 ? '9+' : String(unreadCount)
  const messagesLabel = unreadCount > 0 ? `${UI_TEXT.messages} (${unreadCount} non lu(s))` : UI_TEXT.messages

  const handleLogout = async () => {
    setLogoutLoading(true)
    setLogoutError('')
    const { error } = await supabase.auth.signOut()

    if (error) {
      setLogoutError(error.message)
      setLogoutLoading(false)
      return
    }

    window.location.href = '/'
  }

  return (
    <header className="sd-header">
      <div className="sd-header__inner">
        <Link href="/" className="sd-header__brand" aria-label={UI_TEXT.home}>
          <span className="sd-header__brand-mark" aria-hidden="true">S</span>
          <span className="sd-header__brand-text">
            Soko<span className="sd-header__brand-accent">Deal</span>
          </span>
        </Link>

        <div className="sd-header__actions">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => router.push('/messages')}
                className="sd-header__icon-button"
                aria-label={messagesLabel}
              >
                <span aria-hidden="true">💬</span>
                {unreadCount > 0 && (
                  <span className="sd-header__badge" aria-hidden="true">
                    {unreadLabel}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push('/profil')}
                className="sd-header__account-button"
                aria-label={UI_TEXT.profile}
              >
                <span className="sd-header__avatar" aria-hidden="true">{userInitial}</span>
                <span className="sd-header__optional-label">{UI_TEXT.profile}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutLoading}
                title={UI_TEXT.logout}
                className="sd-header__logout-button"
                aria-label={logoutLoading ? UI_TEXT.logoutLoading : UI_TEXT.logout}
              >
                <span className="sd-header__button-icon" aria-hidden="true">⏻</span>
                <span className="sd-header__optional-label">
                  {logoutLoading ? UI_TEXT.logoutLoading : UI_TEXT.logout}
                </span>
              </button>
              {logoutError && (
                <div className="sd-header__error" role="alert">
                  {logoutError}
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/auth?mode=login')}
              className="sd-header__button"
            >
              {UI_TEXT.login}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/publier')}
            className="sd-header__publish-button"
            aria-label={UI_TEXT.publish}
          >
            <span aria-hidden="true">+</span>
            <span className="sd-header__publish-label"> {UI_TEXT.publish}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
