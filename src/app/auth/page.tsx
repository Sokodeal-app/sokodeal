'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (window.location.search.includes('mode=signup')) {
      window.location.href = '/verification'
      return
    }

    // Si déjà connecté → rediriger
    getCurrentUser().then(({ data }) => {
      if (data.user) redirectAfterLogin()
    })
  }, [])

  const redirectAfterLogin = () => {
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
    <div style={{ minHeight: '100vh', background: '#f5f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '38px', height: '38px', background: '#f5a623', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px' }}>🦁</div>
            <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#111a14' }}>Soko<span style={{ color: '#1a7a4a' }}>Deal</span></span>
          </a>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #e8ede9', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.2rem', marginBottom: '4px', color: '#111a14' }}>
            Bon retour 👋
          </h2>
          <p style={{ color: '#6b7c6e', fontSize: '0.82rem', marginBottom: '24px' }}>
            Connectez-vous à votre compte SokoDeal
          </p>

          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b7c6e', marginBottom: '5px', textTransform: 'uppercase' }}>Email</label>
          <input type="email" placeholder="jean@email.com" value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e0e0e0', borderRadius: '10px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.9rem', outline: 'none', background: '#fafafa', color: '#222', boxSizing: 'border-box', marginBottom: '14px', display: 'block' }} />

          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b7c6e', marginBottom: '5px', textTransform: 'uppercase' }}>Mot de passe</label>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Votre mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', padding: '11px 40px 11px 14px', border: '1.5px solid #e0e0e0', borderRadius: '10px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.9rem', outline: 'none', background: '#fafafa', color: '#222', boxSizing: 'border-box' }}
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {error && (
            <div style={{ background: '#fff1f0', border: '1px solid #ffd6d6', color: '#c0392b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '14px' }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#ccc' : '#1a7a4a', border: 'none', borderRadius: '10px', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.95rem', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '16px' }}>
            {loading ? '⏳ Connexion...' : 'Se connecter'}
          </button>

          <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '1px solid #f0f4f1' }}>
            <p style={{ fontSize: '0.85rem', color: '#6b7c6e', marginBottom: '12px' }}>Pas encore de compte ?</p>
            <a href="/verification" style={{ display: 'block', padding: '12px', background: '#f5a623', borderRadius: '10px', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.92rem', color: '#111a14', textDecoration: 'none' }}>
              Créer un compte →
            </a>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem', color: '#9ca3af' }}>
          © 2025 SokoDeal · Made in Africa 🌍
        </p>
      </div>
    </div>
  )
}
