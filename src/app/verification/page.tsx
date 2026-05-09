'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

const PUBLISH_DRAFT_KEY = 'sokodeal:publish-draft'

const PASSWORD_RULES = [
  { label: '8 caracteres minimum', test: (value: string) => value.length >= 8 },
  { label: '1 majuscule', test: (value: string) => /[A-Z]/.test(value) },
  { label: '1 minuscule', test: (value: string) => /[a-z]/.test(value) },
  { label: '1 chiffre', test: (value: string) => /\d/.test(value) },
  { label: '1 symbole', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
]

const validatePassword = (value: string) => {
  const missingRule = PASSWORD_RULES.find(rule => !rule.test(value))
  return missingRule ? 'Mot de passe incomplet : ajoutez ' + missingRule.label.toLowerCase() + '.' : ''
}

const readableAuthError = (message: string) => {
  const lower = message.toLowerCase()
  const waitMatch = message.match(/(\d+)\s*seconds?/i)

  if (lower.includes('security purposes') || lower.includes('rate limit')) {
    return waitMatch
      ? 'Trop de tentatives avec cet email. Attendez ' + waitMatch[1] + ' secondes puis reessayez.'
      : 'Trop de tentatives avec cet email. Attendez un peu puis reessayez.'
  }

  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'Un compte existe deja avec cet email. Essayez de vous connecter.'
  }

  if (lower.includes('password')) {
    return 'Le mot de passe ne respecte pas les regles demandees.'
  }

  return message || 'Impossible de creer le compte. Reessayez.'
}

export default function VerificationPage() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState<'account' | 'cgu' | 'uploading' | 'success'>('account')
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [acceptCGU, setAcceptCGU] = useState(false)
  const [acceptArnaque, setAcceptArnaque] = useState(false)
  const [hasPublishDraft, setHasPublishDraft] = useState(false)

  useEffect(() => {
    const init = async () => {
      let shouldRedirect = false
      try {
        setHasPublishDraft(!!window.localStorage.getItem(PUBLISH_DRAFT_KEY))
        const { data: { user } } = await getCurrentUser()
        if (user) {
          shouldRedirect = true
          window.location.href = window.localStorage.getItem(PUBLISH_DRAFT_KEY) ? '/publier' : '/'
          return
        }
      } catch (err) {
        console.error('verification init error:', err)
      } finally {
        if (!shouldRedirect) setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!loading) return
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 8000)
    return () => clearTimeout(timeout)
  }, [loading])

  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true)
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle()
      setUsernameAvailable(!data)
      setCheckingUsername(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  const handleAccount = async () => {
    setError('')
    const cleanEmail = email.trim().toLowerCase()
    const cleanUsername = username.trim().toLowerCase()
    const passwordError = validatePassword(password)

    if (!fullName.trim()) return setError('Le nom complet est requis.')
    if (!cleanEmail.includes('@')) return setError('Email invalide.')
    if (!cleanUsername || cleanUsername.length < 3) return setError('Username : 3 caracteres minimum.')
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) return setError('Username : lettres, chiffres et _ uniquement.')
    if (checkingUsername) return setError('Verification du username en cours. Patientez une seconde.')
    if (usernameAvailable !== true) return setError('Attendez la verification du username.')
    if (passwordError) {
      setPasswordTouched(true)
      return setError(passwordError)
    }

    setStep('cgu')
  }

  const handleFinal = async () => {
    setError('')
    if (!acceptCGU) return setError('Vous devez accepter les CGU.')
    if (!acceptArnaque) return setError('Vous devez accepter la politique anti-arnaque.')

    setUploading(true)
    setStep('uploading')
    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanUsername = username.trim().toLowerCase()
      const passwordError = validatePassword(password)

      if (passwordError) throw new Error(passwordError)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: fullName.trim() } }
      })
      if (authError) throw new Error(readableAuthError(authError.message))

      const userId = authData.user?.id
      if (!userId) throw new Error('Erreur creation compte. Reessayez.')

      const { error: profileError } = await supabase.from('users').upsert({
        id: userId,
        email: cleanEmail,
        full_name: fullName.trim(),
        username: cleanUsername,
        id_verification_status: 'pending',
        is_verified: false,
      })
      if (profileError) throw profileError

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      if (signInError) throw new Error('Compte cree mais connexion automatique echouee. Connectez-vous manuellement.')

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

      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Erreur. Reessayez.')
      setStep('cgu')
    } finally {
      setUploading(false)
    }
  }

  const stepIndex = { account: 0, cgu: 1, uploading: 1, success: 2 }[step]
  const passwordError = validatePassword(password)
  const showPasswordRules = passwordTouched || password.length > 0
  const accountFormReady = !!fullName.trim()
    && email.trim().includes('@')
    && username.trim().length >= 3
    && usernameAvailable === true
    && !checkingUsername
    && !passwordError

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: '10px',
    fontFamily: 'DM Sans,sans-serif',
    fontSize: '0.9rem',
    outline: 'none',
    background: '#fafafa',
    color: '#222',
    boxSizing: 'border-box',
    marginBottom: '14px',
    display: 'block'
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f5' }}>
      <p style={{ fontFamily: 'Syne,sans-serif', color: '#1a7a4a', fontWeight: 700 }}>Chargement...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '36px', height: '36px', background: '#f5a623', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#111a14' }}>SD</div>
            <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#111a14' }}>Soko<span style={{ color: '#1a7a4a' }}>Deal</span></span>
          </a>
        </div>

        {step !== 'success' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            {['Compte', 'Conditions'].map((label, i) => {
              const done = i < stepIndex
              const active = i === stepIndex
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: done ? '#1a7a4a' : active ? '#f5a623' : '#e8ede9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: done || active ? 'white' : '#6b7c6e'
                    }}>
                      {done ? 'OK' : i + 1}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: active ? '#111a14' : '#6b7c6e', fontWeight: active ? 700 : 400 }}>{label}</span>
                  </div>
                  {i < 1 && <div style={{ width: '40px', height: '2px', background: done ? '#1a7a4a' : '#e8ede9', marginBottom: '14px' }} />}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid #e8ede9', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {step === 'account' && (
            <>
              <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.2rem', marginBottom: '4px', color: '#111a14' }}>Creer un compte</h1>
              <p style={{ color: '#6b7c6e', fontSize: '0.82rem', marginBottom: '20px' }}>Rejoignez la marketplace du Rwanda</p>

              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b7c6e', marginBottom: '5px', textTransform: 'uppercase' }}>Nom complet</label>
              <input type="text" placeholder="Jean Mutabazi" value={fullName} onChange={e => setFullName(e.target.value)} style={inp} />

              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b7c6e', marginBottom: '5px', textTransform: 'uppercase' }}>Email</label>
              <input type="email" placeholder="jean@email.com" value={email} onChange={e => setEmail(e.target.value)} style={inp} />

              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b7c6e', marginBottom: '5px', textTransform: 'uppercase' }}>Username</label>
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <input
                  type="text"
                  placeholder="jean123"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  style={{ ...inp, marginBottom: 0, paddingRight: '92px', borderColor: usernameAvailable === false ? '#e63946' : usernameAvailable === true ? '#1a7a4a' : '#e0e0e0' }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 700, color: usernameAvailable === true ? '#1a7a4a' : '#6b7c6e' }}>
                  {checkingUsername ? 'Verification...' : usernameAvailable === true ? 'Disponible' : usernameAvailable === false ? 'Pris' : ''}
                </span>
              </div>

              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b7c6e', marginBottom: '5px', textTransform: 'uppercase' }}>Mot de passe</label>
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="8 caracteres minimum"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordTouched(true) }}
                  onBlur={() => setPasswordTouched(true)}
                  style={{ ...inp, marginBottom: 0, paddingRight: '80px' }}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#1a7a4a', fontWeight: 700 }}>
                  {showPassword ? 'Masquer' : 'Voir'}
                </button>
              </div>

              {showPasswordRules && (
                <div style={{ marginBottom: '14px' }}>
                  {PASSWORD_RULES.map((rule, i) => {
                    const ok = rule.test(password)
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: ok ? '#1a7a4a' : '#9ca3af', marginBottom: '3px' }}>
                        <span>{ok ? 'OK' : '-'}</span>
                        {rule.label}
                      </div>
                    )
                  })}
                </div>
              )}

              {error && <div style={{ background: '#fff1f0', border: '1px solid #ffd6d6', color: '#c0392b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '14px' }}>{error}</div>}

              <button onClick={handleAccount} disabled={!accountFormReady} style={{ width: '100%', padding: '13px', background: !accountFormReady ? '#ccc' : '#1a7a4a', border: 'none', borderRadius: '10px', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.95rem', color: 'white', cursor: !accountFormReady ? 'not-allowed' : 'pointer', marginBottom: '14px' }}>
                Continuer
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#6b7c6e' }}>
                Deja un compte ?{' '}
                <a href="/auth?mode=login" style={{ color: '#1a7a4a', fontWeight: 700, textDecoration: 'none' }}>Se connecter</a>
              </p>
            </>
          )}

          {step === 'cgu' && (
            <>
              <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.2rem', marginBottom: '4px', color: '#111a14' }}>Conditions d'utilisation</h1>
              <p style={{ color: '#6b7c6e', fontSize: '0.82rem', marginBottom: '20px' }}>Derniere etape avant de creer votre compte.</p>

              <div style={{ background: '#f5f7f5', borderRadius: '10px', padding: '14px', marginBottom: '14px', border: '1px solid #e8ede9', maxHeight: '160px', overflowY: 'auto' }}>
                <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.82rem', marginBottom: '8px', color: '#111a14' }}>Conditions Generales d'Utilisation</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7c6e', lineHeight: 1.7 }}>
                  SokoDeal est une plateforme de mise en relation entre acheteurs et vendeurs. En utilisant SokoDeal, vous acceptez de fournir des informations exactes, de ne pas publier de contenu illegal, trompeur ou frauduleux. SokoDeal se reserve le droit de supprimer tout contenu ou compte ne respectant pas ces regles.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '14px' }}>
                <input type="checkbox" checked={acceptCGU} onChange={e => setAcceptCGU(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#1a7a4a', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: '#333', lineHeight: 1.5 }}>
                  J'ai lu et j'accepte les <a href="/cgu" target="_blank" style={{ color: '#1a7a4a', fontWeight: 700 }}>Conditions Generales d'Utilisation</a>
                </span>
              </label>

              <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '14px', marginBottom: '14px', border: '1px solid #fde68a' }}>
                <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.82rem', marginBottom: '8px', color: '#78350f' }}>Politique anti-arnaque</p>
                <p style={{ fontSize: '0.75rem', color: '#78350f', lineHeight: 1.7 }}>
                  Nous vous conseillons de toujours rencontrer le vendeur dans un lieu public, de verifier l'article avant paiement, et de ne jamais envoyer d'argent a l'avance.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}>
                <input type="checkbox" checked={acceptArnaque} onChange={e => setAcceptArnaque(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#1a7a4a', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: '#333', lineHeight: 1.5 }}>
                  Je comprends les conseils anti-arnaque et j'accepte d'utiliser la plateforme avec prudence.
                </span>
              </label>

              {error && <div style={{ background: '#fff1f0', border: '1px solid #ffd6d6', color: '#c0392b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '14px' }}>{error}</div>}

              <button onClick={handleFinal} disabled={uploading || !acceptCGU || !acceptArnaque}
                style={{ width: '100%', padding: '13px', background: uploading || !acceptCGU || !acceptArnaque ? '#e8ede9' : '#1a7a4a', border: 'none', borderRadius: '10px', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.95rem', color: uploading || !acceptCGU || !acceptArnaque ? '#6b7c6e' : 'white', cursor: uploading || !acceptCGU || !acceptArnaque ? 'not-allowed' : 'pointer', marginBottom: '10px' }}>
                {uploading ? 'Creation...' : 'Creer mon compte'}
              </button>
              <button onClick={() => { setError(''); setStep('account') }}
                style={{ width: '100%', padding: '11px', background: 'transparent', border: '1px solid #e8ede9', borderRadius: '10px', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: '0.85rem', color: '#6b7c6e', cursor: 'pointer' }}>
                Retour
              </button>
            </>
          )}

          {step === 'uploading' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.2rem', marginBottom: '8px', color: '#111a14' }}>Creation en cours...</h2>
              <p style={{ color: '#6b7c6e', fontSize: '0.88rem' }}>Quelques secondes...</p>
            </div>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: '72px', height: '72px', background: '#e8f5ee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: '#1a7a4a', margin: '0 auto 16px' }}>OK</div>
              <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.3rem', marginBottom: '8px', color: '#111a14' }}>Bienvenue sur SokoDeal !</h2>
              <p style={{ color: '#6b7c6e', marginBottom: '24px', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Votre compte est cree et actif. Vous etes connecte !
              </p>
              <button onClick={() => window.location.href = '/publier'}
                style={{ width: '100%', padding: '13px', background: '#1a7a4a', border: 'none', borderRadius: '10px', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.95rem', color: 'white', cursor: 'pointer', marginBottom: '10px' }}>
                {hasPublishDraft ? 'Reprendre mon annonce' : 'Publier une annonce'}
              </button>
              <button onClick={() => window.location.href = '/'}
                style={{ width: '100%', padding: '13px', background: '#f5f7f5', border: '1px solid #e8ede9', borderRadius: '10px', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: '0.88rem', color: '#6b7c6e', cursor: 'pointer' }}>
                Voir les annonces
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem', color: '#9ca3af' }}>
          2025 SokoDeal
        </p>
      </div>
    </div>
  )
}
