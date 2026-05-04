'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import Header from '@/components/Header'
import { FEATURE_FLAGS } from '@/lib/feature-flags'

const PLANS = [
  {
    id: 'gratuit',
    name: 'Gratuit',
    price: 0,
    period: 'pour toujours',
    color: '#6b7c6e',
    icon: '🌱',
    features: [
      '5 annonces actives simultanées',
      '5 photos par annonce',
      'Support standard',
      'Profil public',
    ],
    limitations: [
      'Pas de boost inclus',
      'Pas de badge Pro',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 8000,
    period: 'par mois',
    color: '#1a7a4a',
    icon: '⭐',
    popular: true,
    features: [
      'Annonces illimitées',
      '5 photos par annonce',
      'Badge Pro ⭐ sur le profil',
      '1 boost 7 jours offert/mois',
      'Support prioritaire (24h)',
      'Dashboard stats de base',
      'Vues, messages, favoris par annonce',
      'Graphique vues sur 30 jours',
    ],
  },
  {
    id: 'agence',
    name: 'Agence',
    price: 25000,
    period: 'par mois',
    color: '#0f5233',
    icon: '🏢',
    features: [
      'Tout du plan Pro',
      'Page agence dédiée 🏢',
      'Badge Agence Vérifiée',
      '3 boosts 7 jours offerts/mois',
      'Support dédié WhatsApp (2h)',
      'Dashboard avancé complet',
      'Comparaison mois par mois',
      'Taux de conversion (vues → messages)',
      'Calendrier d\'activité',
      'Carte des visiteurs par ville',
      'Mots-clés qui mènent à vos annonces',
      'Meilleure heure pour publier',
      'Export CSV des statistiques',
      'Alertes performance annonces',
    ],
  },
]

const BOOST_PLANS = [
  { days: 1, label: '24 heures', price: 500, icon: '⚡', color: '#f59e0b', desc: '2x plus de vues' },
  { days: 3, label: '3 jours', price: 1000, icon: '🔥', color: '#ef4444', desc: '3x plus de vues' },
  { days: 7, label: '7 jours', price: 2000, icon: '💎', color: '#1a7a4a', desc: '5x plus de vues', popular: true },
  { days: 30, label: '30 jours', price: 6000, icon: '👑', color: '#0f5233', desc: '10x plus de vues' },
]

export default function AbonnementPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [ads, setAds] = useState<any[]>([])
  const [activeBoosts, setActiveBoosts] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'plans' | 'boost' | 'historique'>('plans')
  const [selectedAd, setSelectedAd] = useState<any>(null)
  const [selectedBoost, setSelectedBoost] = useState<any>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [phone, setPhone] = useState('')
  const [waitingConfirm, setWaitingConfirm] = useState(false)
  const [currentPaymentId, setCurrentPaymentId] = useState('')
  const [pollCount, setPollCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await getCurrentUser()
      if (!user) {
        sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
          url: window.location.pathname,
          state: {}
        }))
        window.location.href = '/auth?mode=login'
        return
      }
      setUser(user)

      const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(userData)

      const { data: adsData } = await supabase.from('ads').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false })
      setAds(adsData || [])

      const now = new Date().toISOString()
      const { data: boostsData } = await supabase.from('boosts').select('*, ad:ad_id(title, images)').eq('user_id', user.id).eq('is_active', true).gt('ends_at', now)
      setActiveBoosts(boostsData || [])

      const { data: paymentsData } = await supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      setPayments(paymentsData || [])

      setLoading(false)
    }
    init()
  }, [])

  // Polling pour vérifier le paiement MoMo
  const startPolling = (paymentId: string) => {
    setCurrentPaymentId(paymentId)
    setWaitingConfirm(true)
    setPollCount(0)
    let count = 0
    const interval = setInterval(async () => {
      count++
      setPollCount(count)
      const res = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
      })
      const data = await res.json()
      if (data.success) {
        clearInterval(interval)
        setWaitingConfirm(false)
        setProcessingPayment(false)
        window.location.href = '/abonnement?success=1'
      } else if (data.status === 'failed') {
        clearInterval(interval)
        setWaitingConfirm(false)
        setProcessingPayment(false)
        setPaymentError('Paiement refusé. Réessayez.')
      } else if (count >= 20) {
        // Timeout après 2 minutes
        clearInterval(interval)
        setWaitingConfirm(false)
        setProcessingPayment(false)
        setPaymentError('Délai dépassé. Vérifiez votre téléphone et réessayez.')
      }
    }, 6000) // vérifier toutes les 6 secondes
  }

  const initiatePayment = async (type: string, extra: any) => {
    setPaymentError('')
    const cleanPhone = phone.replace(/\s+/g, '').replace('+250', '0').replace('250', '0')
    if (!/^07[0-9]{8}$/.test(cleanPhone)) {
      setPaymentError('Numéro invalide — format: 07XXXXXXXX')
      return
    }
    setProcessingPayment(true)
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, user_id: user.id, phone: cleanPhone, ...extra }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      startPolling(data.payment_id)
    } catch (err: any) {
      setPaymentError(err.message || 'Erreur de paiement')
      setProcessingPayment(false)
    }
  }

  const handleSubscribe = (planId: string) => {
    if (!user || planId === 'gratuit') return
    initiatePayment('subscription', { plan: planId })
  }

  const handleBoost = () => {
    if (!user || !selectedAd || !selectedBoost) return
    initiatePayment('boost', { ad_id: selectedAd.id, duration_days: String(selectedBoost.days) })
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const formatPrice = (n: number) => n.toLocaleString() + ' RWF'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7f5' }}>
      <p style={{ fontFamily: 'Syne,sans-serif', color: '#1a7a4a', fontWeight: 700 }}>⏳ Chargement...</p>
    </div>
  )

  if (!FEATURE_FLAGS.monetization) return (
    <div style={{ minHeight: '100vh', background: '#f5f7f5' }}>
      <Header />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '56px 5%', textAlign: 'center' }}>
        <div style={{ fontSize: '2.6rem', marginBottom: '14px' }}>🌱</div>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.5rem', marginBottom: '10px', color: '#111a14' }}>
          SokoDeal est gratuit
        </h1>
        <p style={{ color: '#6b7c6e', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
          Les abonnements, boosts et paiements sont temporairement masques pendant la phase de lancement.
        </p>
        <button onClick={() => window.location.href='/publier'}
          style={{ padding: '13px 28px', background: '#1a7a4a', border: 'none', borderRadius: '10px', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.95rem', color: 'white', cursor: 'pointer' }}>
          Publier une annonce gratuitement
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7f5' }}>
      <style>{`
        @media (max-width: 768px) {
          .plans-grid { grid-template-columns: 1fr !important; }
          .boost-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .boost-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Header />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 5% 60px' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.5rem', marginBottom: '4px', color: '#111a14' }}>
          Plans & Boosts
        </h1>
        <p style={{ color: '#6b7c6e', fontSize: '0.88rem', marginBottom: '28px' }}>
          Plan actuel : <strong style={{ color: '#1a7a4a' }}>{profile?.plan === 'agence' ? '🏢 Agence' : profile?.plan === 'pro' ? '⭐ Pro' : '🌱 Gratuit'}</strong>
          {profile?.plan_ends_at && <span style={{ color: '#9ca3af', marginLeft: '8px' }}>· expire le {formatDate(profile.plan_ends_at)}</span>}
        </p>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'white', padding: '6px', borderRadius: '12px', border: '1px solid #e8ede9', width: 'fit-content' }}>
          {[
            { id: 'plans', label: '📋 Abonnements' },
            { id: 'boost', label: '⚡ Booster une annonce' },
            { id: 'historique', label: '📜 Historique' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', background: tab === t.id ? '#1a7a4a' : 'transparent', color: tab === t.id ? 'white' : '#6b7c6e', transition: 'all 0.2s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PLANS ── */}
        {tab === 'plans' && (
          <div className="plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            {PLANS.map(plan => {
              const isCurrent = profile?.plan === plan.id || (!profile?.plan && plan.id === 'gratuit')
              return (
                <div key={plan.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', border: plan.popular ? '2px solid #1a7a4a' : '1px solid #e8ede9', position: 'relative', boxShadow: plan.popular ? '0 8px 32px rgba(26,122,74,0.12)' : '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {plan.popular && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#1a7a4a', color: 'white', padding: '4px 14px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      ⭐ Le plus populaire
                    </div>
                  )}
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#e8f5ee', color: '#1a7a4a', padding: '2px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700 }}>
                      Plan actuel
                    </div>
                  )}

                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{plan.icon}</div>
                  <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.1rem', color: plan.color, marginBottom: '4px' }}>{plan.name}</h2>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#111a14', marginBottom: '2px' }}>
                    {plan.price === 0 ? 'Gratuit' : formatPrice(plan.price)}
                  </div>
                  {plan.price > 0 && <div style={{ fontSize: '0.75rem', color: '#6b7c6e', marginBottom: '20px' }}>{plan.period}</div>}
                  {plan.price === 0 && <div style={{ height: '20px', marginBottom: '20px' }} />}

                  <div style={{ marginBottom: '20px' }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '0.8rem', color: '#333', alignItems: 'flex-start' }}>
                        <span style={{ color: '#1a7a4a', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                      </div>
                    ))}
                    {plan.limitations?.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '0.8rem', color: '#9ca3af', alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0 }}>✗</span> {f}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent || plan.id === 'gratuit' || processingPayment}
                    style={{
                      width: '100%', padding: '12px', border: 'none', borderRadius: '10px',
                      fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.9rem', cursor: isCurrent || plan.id === 'gratuit' ? 'default' : 'pointer',
                      background: isCurrent || plan.id === 'gratuit' ? '#f5f7f5' : plan.color,
                      color: isCurrent || plan.id === 'gratuit' ? '#6b7c6e' : 'white',
                    }}>
                    {processingPayment ? '⏳...' : isCurrent ? 'Plan actuel' : plan.id === 'gratuit' ? 'Plan par défaut' : `Choisir ${plan.name} →`}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ── BOOST ── */}
        {tab === 'boost' && (
          <div>
            {/* Boosts actifs */}
            {activeBoosts.length > 0 && (
              <div style={{ background: '#e8f5ee', borderRadius: '12px', padding: '16px', border: '1px solid #b7dfca', marginBottom: '24px' }}>
                <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#1a7a4a', marginBottom: '12px' }}>
                  ⚡ Boosts actifs ({activeBoosts.length})
                </h3>
                {activeBoosts.map((boost, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#111a14' }}>{boost.ad?.title || 'Annonce'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7c6e' }}>Expire le {formatDate(boost.ends_at)}</div>
                    </div>
                    <span style={{ background: '#f5a623', color: '#111a14', padding: '3px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>En avant</span>
                  </div>
                ))}
              </div>
            )}

            <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.1rem', marginBottom: '6px', color: '#111a14' }}>
              Booster une annonce
            </h2>
            <p style={{ color: '#6b7c6e', fontSize: '0.85rem', marginBottom: '20px' }}>
              Un boost met votre annonce en tête de liste et augmente sa visibilité.
            </p>

            {/* Choisir l'annonce */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #e8ede9', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b7c6e', marginBottom: '10px', textTransform: 'uppercase' }}>
                1. Choisir l'annonce à booster
              </label>
              {ads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#6b7c6e', fontSize: '0.85rem' }}>
                  Vous n'avez pas d'annonces actives.{' '}
                  <a href="/publier" style={{ color: '#1a7a4a', fontWeight: 600 }}>Publier une annonce</a>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ads.map(ad => (
                    <div key={ad.id} onClick={() => setSelectedAd(selectedAd?.id === ad.id ? null : ad)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', border: selectedAd?.id === ad.id ? '2px solid #1a7a4a' : '1px solid #e8ede9', cursor: 'pointer', background: selectedAd?.id === ad.id ? '#f0f8f4' : 'white', transition: 'all 0.15s' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f5f7f5', overflow: 'hidden', flexShrink: 0 }}>
                        {ad.images?.[0] ? <img src={ad.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#111a14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7c6e' }}>{Number(ad.price).toLocaleString()} RWF · {ad.province}</div>
                      </div>
                      {ad.is_boosted && <span style={{ background: '#f5a623', color: '#111a14', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>Déjà boosté</span>}
                      {selectedAd?.id === ad.id && <span style={{ color: '#1a7a4a', fontSize: '1.2rem', flexShrink: 0 }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Choisir la durée */}
            {selectedAd && (
              <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #e8ede9', marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b7c6e', marginBottom: '14px', textTransform: 'uppercase' }}>
                  2. Choisir la durée du boost
                </label>
                <div className="boost-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                  {BOOST_PLANS.map(boost => (
                    <div key={boost.days} onClick={() => setSelectedBoost(selectedBoost?.days === boost.days ? null : boost)}
                      style={{ padding: '16px', borderRadius: '12px', border: selectedBoost?.days === boost.days ? `2px solid ${boost.color}` : '1px solid #e8ede9', cursor: 'pointer', textAlign: 'center', background: selectedBoost?.days === boost.days ? '#f0f8f4' : 'white', transition: 'all 0.15s', position: 'relative' }}>
                      {boost.popular && (
                        <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', background: '#1a7a4a', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.58rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Populaire</div>
                      )}
                      <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{boost.icon}</div>
                      <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.82rem', color: '#111a14', marginBottom: '2px' }}>{boost.label}</div>
                      <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.95rem', color: boost.color, marginBottom: '4px' }}>{formatPrice(boost.price)}</div>
                      <div style={{ fontSize: '0.68rem', color: '#6b7c6e' }}>{boost.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Récap + payer */}
            {selectedAd && selectedBoost && (
              <div style={{ background: '#0f5233', borderRadius: '14px', padding: '20px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>
                      {selectedBoost.icon} Boost {selectedBoost.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>{selectedAd.title}</div>
                  </div>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#f5a623' }}>
                    {formatPrice(selectedBoost.price)}
                  </div>
                </div>

                {paymentError && (
                  <div style={{ background: 'rgba(255,0,0,0.2)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: '8px', padding: '10px', fontSize: '0.82rem', marginBottom: '12px' }}>
                    ⚠️ {paymentError}
                  </div>
                )}

                <button onClick={handleBoost} disabled={processingPayment}
                  style={{ width: '100%', padding: '14px', background: '#f5a623', border: 'none', borderRadius: '10px', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1rem', color: '#111a14', cursor: processingPayment ? 'not-allowed' : 'pointer' }}>
                  {processingPayment ? '⏳ Redirection...' : `💳 Payer ${formatPrice(selectedBoost.price)}`}
                </button>
                <p style={{ fontSize: '0.72rem', opacity: 0.6, textAlign: 'center', marginTop: '10px' }}>
                  Paiement sécurisé · Mobile Money & Carte bancaire
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORIQUE ── */}
        {tab === 'historique' && (
          <div>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.1rem', marginBottom: '16px', color: '#111a14' }}>
              Historique des paiements
            </h2>
            {payments.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '14px', padding: '48px', textAlign: 'center', border: '1px solid #e8ede9' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📜</div>
                <p style={{ color: '#6b7c6e', fontSize: '0.88rem' }}>Aucun paiement pour l'instant</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {payments.map((p, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e8ede9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#111a14', marginBottom: '3px' }}>
                        {p.type === 'boost' ? '⚡ Boost annonce' : '📋 Abonnement ' + (p.metadata?.plan || '')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7c6e' }}>{formatDate(p.created_at)}</div>
                      {p.flw_ref && <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '2px' }}>Réf: {p.flw_ref}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#111a14', marginBottom: '4px' }}>
                        {formatPrice(p.amount)}
                      </div>
                      <span style={{
                        background: p.status === 'success' ? '#e8f5ee' : p.status === 'failed' ? '#fff1f0' : '#fffbeb',
                        color: p.status === 'success' ? '#1a7a4a' : p.status === 'failed' ? '#c0392b' : '#78350f',
                        padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700
                      }}>
                        {p.status === 'success' ? '✅ Réussi' : p.status === 'failed' ? '❌ Échoué' : '⏳ En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Champ téléphone MoMo global ── */}
        {!waitingConfirm && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e8ede9', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '1.3rem' }}>📱</div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b7c6e', marginBottom: '5px', textTransform: 'uppercase' }}>
                Numéro Mobile Money (MTN / Airtel)
              </label>
              <input
                type="tel"
                placeholder="078 000 00 00"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e0e0e0', borderRadius: '9px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.9rem', outline: 'none', background: '#fafafa', color: '#222', boxSizing: 'border-box' }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Vous recevrez une notification pour confirmer</p>
          </div>
        )}

        {/* ── En attente de confirmation MoMo ── */}
        {waitingConfirm && (
          <div style={{ background: '#0f5233', borderRadius: '14px', padding: '28px', textAlign: 'center', marginTop: '20px', color: 'white' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📱</div>
            <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.1rem', marginBottom: '8px' }}>
              Confirmez sur votre téléphone !
            </h3>
            <p style={{ fontSize: '0.88rem', opacity: 0.8, marginBottom: '16px', lineHeight: 1.6 }}>
              Une notification Mobile Money a été envoyée au <strong>{phone}</strong>.<br />
              Entrez votre PIN MoMo pour valider le paiement.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: '10px', height: '10px', background: '#f5a623', borderRadius: '50%', animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <style>{`@keyframes bounce { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-8px);opacity:1} }`}</style>
            <p style={{ fontSize: '0.72rem', opacity: 0.5 }}>Vérification {pollCount}/20 · Patientez...</p>
          </div>
        )}

        {paymentError && (
          <div style={{ background: '#fff1f0', border: '1px solid #ffd6d6', color: '#c0392b', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', marginTop: '16px' }}>
            ⚠️ {paymentError}
          </div>
        )}
      </div>
    </div>
  )
}
