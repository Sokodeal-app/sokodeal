'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout'
import { Button, Card, Input } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import styles from './Auth.module.css'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function redirectAfterLogin() {
    const savedRedirect = sessionStorage.getItem('sokodeal:redirect')
    if (savedRedirect) {
      try {
        const { url } = JSON.parse(savedRedirect)
        if (url) {
          window.location.href = url
          return
        }
      } catch {}
    }
    window.location.href = '/'
  }

  useEffect(() => {
    if (window.location.search.includes('mode=signup')) {
      window.location.href = '/verification'
      return
    }

    getCurrentUser().then(({ data }) => {
      if (data.user) redirectAfterLogin()
    })
  }, [])

  const handleLogin = async () => {
    setError('')
    if (!email.includes('@')) return setError('Email invalide.')
    if (!password) return setError('Mot de passe requis.')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError('Email ou mot de passe incorrect.'); setLoading(false); return }
    redirectAfterLogin()
  }

  return (
    <AppShell variant="auth" maxWidth="mobile">
      <div className={styles.wrap}>
        <div className={styles.brandWrap}>
          <Link href="/" className={styles.brand} aria-label={"Retour \u00e0 l'accueil SokoDeal"}>
            <span className={styles.brandMark}>SD</span>
            <span className={styles.brandName}>Soko<span className={styles.brandAccent}>Deal</span></span>
          </Link>
        </div>

        <Card padding="lg" className={styles.card}>
          <div className={styles.intro}>
            <h1 className={styles.title}>Bon retour</h1>
            <p className={styles.subtitle}>{'Connectez-vous \u00e0 votre compte SokoDeal.'}</p>
          </div>

          <div className={styles.form}>
            <Input
              id="auth-email"
              label="Email"
              type="email"
              placeholder="jean@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />

            <Input
              id="auth-password"
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              placeholder="Votre mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className={styles.passwordButton}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? 'Masquer' : 'Voir'}
                </button>
              }
            />

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <Button onClick={handleLogin} disabled={loading} loading={loading} fullWidth size="lg">
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </div>

          <div className={styles.signup}>
            <p className={styles.signupText}>Pas encore de compte ?</p>
            <Button href="/verification" variant="soft" fullWidth>
              {'Cr\u00e9er un compte'}
            </Button>
          </div>
        </Card>

        <p className={styles.footer}>
          © 2025 SokoDeal · Made in Africa
        </p>
      </div>
    </AppShell>
  )
}
