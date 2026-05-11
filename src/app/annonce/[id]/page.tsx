'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import Header from '@/components/Header'
import FavoriteButton from '@/components/FavoriteButton'
import { getApproxCoords } from '@/lib/locations'
import { extractIdFromSlug, generateSlug, isFullUUID } from '@/lib/slug'
import { formatPrice } from '@/lib/format'

function ReportButton({ adId, userId }: { adId: string, userId?: string }) {
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const handleReport = async () => {
    if (!userId) {
      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
        url: window.location.pathname,
        state: {}
      }))
      window.location.href = '/auth?mode=login'
      return
    }
    if (!reason) return
    setSending(true)
    await supabase.from('reports').insert([{ ad_id: adId, reporter_id: userId, reason }])
    setSending(false)
    setDone(true)
    setShowForm(false)
  }

  if (done) return (
    <div style={{background:'#e8f5ee', borderRadius:'12px', padding:'12px', border:'1px solid #b7dfca', marginBottom:'12px', textAlign:'center', fontSize:'0.82rem', color:'#1a7a4a', fontWeight:600}}>
      Signalement envoye. Merci !
    </div>
  )

  return (
    <div style={{marginBottom:'12px'}}>
      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{width:'100%', padding:'10px', background:'transparent', border:'1px solid #e8ede9', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.82rem', color:'#6b7c6e', cursor:'pointer'}}>
          Signaler cette annonce
        </button>
      ) : (
        <div style={{background:'#fff1f0', borderRadius:'12px', padding:'14px', border:'1px solid #ffd6d6'}}>
          <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#c0392b', marginBottom:'10px'}}>Signaler cette annonce</p>
          <select value={reason} onChange={e => setReason(e.target.value)}
            style={{width:'100%', padding:'9px 12px', border:'1px solid #ffd6d6', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', color:'#111a14', background:'white', marginBottom:'10px'}}>
            <option value="">Choisir une raison...</option>
            <option value="arnaque">Arnaque / Fraude</option>
            <option value="contenu-inapproprie">Contenu inapproprie</option>
            <option value="faux-produit">Faux produit</option>
            <option value="prix-abusif">Prix abusif</option>
            <option value="doublon">Annonce en doublon</option>
            <option value="autre">Autre</option>
          </select>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={handleReport} disabled={sending || !reason} style={{flex:1, padding:'9px', background: !reason ? '#ccc' : '#c0392b', border:'none', borderRadius:'8px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', color:'white', cursor: !reason ? 'not-allowed' : 'pointer'}}>
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
            <button onClick={() => setShowForm(false)} style={{padding:'9px 14px', background:'transparent', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.82rem', color:'#6b7c6e', cursor:'pointer'}}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnnonceDetail() {
  const { id } = useParams()
  const [ad, setAd] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)  // ✅ profil vendeur
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)
  const [msgSent, setMsgSent] = useState(false)
  const [message, setMessage] = useState('Bonjour, cette annonce est-elle disponible ?')
  const [messageTouched, setMessageTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [shared, setShared] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [showMessageComposer, setShowMessageComposer] = useState(false)

  const catEmoji: any = {
    'immo-vente':'🏡','immo-location':'🏢','immo-terrain':'🌿','voiture':'🚗',
    'moto':'🛵','electronique':'📱','mode':'👗','maison':'🛋️','emploi':'💼',
    'animaux':'🐄','services':'🏗️','agriculture':'🌾','materiaux':'🧱',
    'sante':'💊','sport':'⚽','education':'📚'
  }

  const catLabel: any = {
    'immo-vente':'Immobilier Vente','immo-location':'Immobilier Location',
    'immo-terrain':'Terrain','voiture':'Voitures','moto':'Motos',
    'electronique':'Electronique','mode':'Mode','maison':'Maison',
    'emploi':'Emploi','animaux':'Animaux','services':'Services',
    'agriculture':'Agriculture','materiaux':'Materiaux',
    'sante':'Sante','sport':'Sport','education':'Education'
  }

  useEffect(() => {
    const init = async () => {
      try {
      const rawId = Array.isArray(id) ? id[0] : String(id || '')
      let data: any = null

      if (isFullUUID(rawId)) {
        const result = await supabase.from('ads').select('*').eq('id', rawId).single()
        data = result.data
        if (data) {
          window.location.replace('/annonce/' + generateSlug(data))
          return
        }
      } else {
        const parts = rawId.split('-')
        const shortId = parts[parts.length - 1] || extractIdFromSlug(rawId)

        const { data: fallbackData } = await supabase
          .from('ads')
          .select('*')
          .limit(1000)

        data = fallbackData?.find((item: any) =>
          String(item.id || '').replace(/-/g, '').startsWith(shortId)
        ) || null
      }

      if (data) {
        setAd(data)
        // ✅ Charger le profil du vendeur
        if (data.user_id) {
          const { data: sellerData } = await supabase
            .from('users')
            .select('id, username, full_name, is_verified, bio, created_at, ads_count')
            .eq('id', data.user_id)
            .single()
          setSeller(sellerData)
        }
      } else {
        return
      }
      const { data: authData } = await getCurrentUser()
      setUser(authData.user)

      // Restaurer message si retour apres connexion, puis supprimer immediatement.
      const savedRedirect = sessionStorage.getItem('sokodeal:redirect')
      if (savedRedirect) {
        try {
          const { url, state } = JSON.parse(savedRedirect)
          if (url === window.location.pathname && state?.message) {
            setMessage(state.message)
            setMessageTouched(true)
          }
        } catch {}
        sessionStorage.removeItem('sokodeal:redirect')
      }

      // Enregistrer la vue sans compter le vendeur lui-meme.
      if (data && authData.user?.id !== data.user_id) {
        void supabase.from('ad_views').insert([{
          ad_id: data.id,
          viewer_id: authData.user?.id || null,
        }])
      }

      } catch (err) {
        console.error('annonce init error:', err)
      } finally {
        setShowMessageComposer(false)
        setLoading(false)
      }
    }
    init()
  }, [id])

  useEffect(() => {
    if (!loading) return
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 8000)
    return () => clearTimeout(timeout)
  }, [loading])

  useEffect(() => {
    if (!showShareMenu) return
    const close = () => setShowShareMenu(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [showShareMenu])

  useEffect(() => {
    if (!ad) return

    document.title = `${ad.title} - ${Number(ad.price).toLocaleString()} RWF | SokoDeal`

    const desc = ad.description
      ? ad.description.slice(0, 155)
      : `${ad.title} a ${ad.province || 'Kigali'} pour ${Number(ad.price).toLocaleString()} RWF sur SokoDeal.`

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement
      if (!el) {
        el = document.createElement('meta')
        el.name = name
        document.head.appendChild(el)
      }
      el.content = content
    }

    const setOG = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', property)
        document.head.appendChild(el)
      }
      el.content = content
    }

    setMeta('description', desc)
    setOG('og:title', ad.title)
    setOG('og:description', desc)
    setOG('og:image', ad.images?.[0] || '')
    setOG('og:url', window.location.href)
    setOG('og:type', 'website')

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = window.location.origin + '/annonce/' + generateSlug(ad)
  }, [ad])

  useEffect(() => {
    if (!ad) return

    const isVehicle = ['voiture', 'moto'].includes(ad.category)
    const isRealEstate = ['immo-vente', 'immo-location', 'immo-terrain'].includes(ad.category)

    const schema: any = {
      '@context': 'https://schema.org',
      '@type': isVehicle ? 'Vehicle' : isRealEstate ? 'RealEstateListing' : 'Product',
      name: ad.title,
      description: ad.description || ad.title,
      image: ad.images || [],
      offers: {
        '@type': 'Offer',
        price: ad.price,
        priceCurrency: 'RWF',
        availability: 'https://schema.org/InStock',
        url: window.location.href,
      },
      seller: {
        '@type': 'Person',
        name: seller?.full_name || 'Vendeur SokoDeal',
      },
    }

    if (ad.province) {
      schema.locationCreated = { '@type': 'Place', name: ad.province + ', Rwanda' }
    }

    let scriptEl = document.getElementById('jsonld-ad') as HTMLScriptElement
    if (!scriptEl) {
      scriptEl = document.createElement('script')
      scriptEl.id = 'jsonld-ad'
      scriptEl.type = 'application/ld+json'
      document.head.appendChild(scriptEl)
    }
    scriptEl.textContent = JSON.stringify(schema)

    return () => { scriptEl?.remove() }
  }, [ad, seller])

  // ✅ Contact → redirige directement vers la messagerie
  const handleContact = async () => {
    if (!message.trim()) return
    if (!user) {
      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
        url: window.location.pathname,
        state: { message }
      }))
      window.location.href = '/auth?mode=login'
      return
    }
    setSending(true)
    await supabase.from('messages').insert([{
      ad_id: ad.id,
      sender_id: user.id,
      receiver_id: ad.user_id,
      sender_email: user.email,
      receiver_email: '',
      content: message,
    }])
    setSending(false)
    window.location.href = '/messages'
  }

  const getShareUrl = () => {
    if (typeof window !== 'undefined') return window.location.href
    return ad ? 'https://sokodeal.app/annonce/' + generateSlug(ad) : 'https://sokodeal.app'
  }

  const shareText = ad ? ad.title + ' - ' + Number(ad.price).toLocaleString() + ' RWF sur SokoDeal' : ''

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getShareUrl())
    setShared(true)
    setShowShareMenu(false)
    setTimeout(() => setShared(false), 2500)
  }

  const handleNativeShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: ad?.title, text: shareText, url: getShareUrl() })
      setShowShareMenu(false)
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  if (loading) return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f7f5'}}>
      <p style={{fontFamily:'Syne,sans-serif', color:'#1a7a4a', fontWeight:700}}>Chargement...</p>
    </div>
  )

  if (!ad) return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f7f5'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'3rem', marginBottom:'12px'}}>😕</div>
        <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, marginBottom:'8px', color:'#111a14'}}>Annonce introuvable</h2>
        <a href="/" style={{color:'#1a7a4a', fontWeight:600, textDecoration:'none'}}>Retour</a>
      </div>
    </div>
  )

  const hasPhotos = ad.images && ad.images.length > 0
  const waPhone = (ad.whatsapp || ad.phone || '').replace(/\s+/g, '').replace('+', '')
  const waText = encodeURIComponent('Bonjour, annonce SokoDeal : ' + ad.title + ' ' + getShareUrl())
  const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(getShareUrl())
  const twUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText + ' ' + getShareUrl())
  const waShareUrl = 'https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + getShareUrl())

  const coords = getApproxCoords(ad.province, ad.district, ad.id)
  const canUsePhone = !ad.hide_phone && Boolean(ad.phone)
  const canUseWhatsApp = !ad.hide_phone && Boolean(ad.whatsapp || ad.phone)
  const redirectToLoginWithMessage = () => {
    sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
      url: window.location.pathname,
      state: { message }
    }))
    window.location.href = '/auth?mode=login'
  }

  return (
    <div className="ad-detail-page" style={{minHeight:'100vh', background:'#f5f7f5'}}>
      <style>{`
        .mobile-photo-count,
        .mobile-seller-card,
        .mobile-action-bar,
        .mobile-trust-chips,
        .description-toggle,
        .mobile-similar-section,
        .mobile-description-empty,
        .mobile-photo-controls,
        .mobile-message-drawer {
          display: none;
        }
        @media (max-width: 768px) {
          .detail-page-header {
            display: none !important;
          }
          .detail-page-header header {
            background: rgba(250,249,247,0.96) !important;
            backdrop-filter: blur(10px);
          }
          .detail-page-header header > div {
            height: 48px !important;
            padding-left: 4% !important;
            padding-right: 4% !important;
          }
          .detail-breadcrumb {
            display: none !important;
          }
          .ad-detail-page {
            padding-bottom: calc(92px + env(safe-area-inset-bottom)) !important;
            background: #FAF7EF !important;
          }
          .detail-layout {
            grid-template-columns: 1fr !important;
            padding: 0 0 18px !important;
            gap: 0 !important;
            max-width: none !important;
          }
          .detail-left {
            min-width: 0 !important;
          }
          .detail-right {
            position: static !important;
          }
          .photo-card {
            border-radius: 0 0 26px 26px !important;
            margin-bottom: 0 !important;
            border: none !important;
            box-shadow: 0 10px 30px rgba(17,26,20,0.10) !important;
          }
          .main-photo-frame {
            height: auto !important;
            aspect-ratio: 4 / 3 !important;
            font-size: 4rem !important;
          }
          .photo-category-badge {
            top: auto !important;
            bottom: 10px !important;
            left: 10px !important;
            background: rgba(255,252,247,0.92) !important;
            backdrop-filter: blur(8px);
          }
          .mobile-photo-count {
            display: block !important;
            position: absolute;
            right: 10px;
            bottom: 10px;
            padding: 5px 9px;
            border-radius: 999px;
            background: rgba(17,26,20,0.62);
            color: white;
            font-family: DM Sans, sans-serif;
            font-size: 0.74rem;
            font-weight: 700;
            backdrop-filter: blur(8px);
          }
          .mobile-photo-controls {
            display: flex !important;
            position: absolute;
            top: calc(12px + env(safe-area-inset-top));
            left: 12px;
            right: 12px;
            justify-content: space-between;
            align-items: center;
            z-index: 4;
            pointer-events: none;
          }
          .mobile-photo-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .mobile-floating-control {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 1px solid rgba(232,224,212,0.78);
            background: rgba(255,252,247,0.88);
            color: #111827;
            box-shadow: 0 8px 22px rgba(17,26,20,0.16);
            backdrop-filter: blur(12px);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-family: Syne, sans-serif;
            font-weight: 800;
            font-size: 0.92rem;
            cursor: pointer;
            pointer-events: auto;
          }
          .mobile-floating-control button {
            box-shadow: none !important;
            background: transparent !important;
            backdrop-filter: none !important;
          }
          .thumb-strip {
            padding: 11px 4% 14px !important;
            gap: 8px !important;
            scroll-snap-type: x proximity;
            background: #FAF7EF;
          }
          .thumb-item {
            width: 58px !important;
            height: 58px !important;
            border-radius: 14px !important;
            scroll-snap-align: start;
            opacity: 0.78 !important;
            box-shadow: 0 3px 10px rgba(17,26,20,0.08);
          }
          .thumb-item-active {
            opacity: 1 !important;
            border-color: #15803D !important;
            box-shadow: 0 5px 14px rgba(21,128,61,0.18);
          }
          .main-info-card,
          .description-card,
          .map-card,
          .details-card,
          .safety-card {
            width: calc(100% - 8%) !important;
            margin: 0 auto 10px !important;
            border-radius: 0 !important;
            padding: 18px 0 !important;
            border: none !important;
            border-bottom: 1px solid rgba(232,224,212,0.46) !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .contact-card {
            display: none !important;
          }
          .ad-title {
            font-family: Syne, sans-serif !important;
            font-size: 1.32rem !important;
            line-height: 1.2 !important;
            font-weight: 700 !important;
            margin-bottom: 10px !important;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            color: #111827 !important;
          }
          .ad-price {
            font-family: 'DM Sans', sans-serif !important;
            font-size: 1.72rem !important;
            line-height: 1.06 !important;
            font-weight: 800 !important;
            color: #15803D !important;
            letter-spacing: -0.01em !important;
            font-variant-numeric: lining-nums tabular-nums !important;
            font-feature-settings: "lnum" 1, "tnum" 1, "onum" 0 !important;
          }
          .ad-meta-row {
            width: 100% !important;
            margin-top: 10px !important;
            justify-content: flex-start !important;
          }
          .ad-meta-row span {
            background: #FFFCF7 !important;
            border-color: #E8E0D4 !important;
            color: #6F6B63 !important;
          }
          .mobile-trust-chips {
            display: flex !important;
            gap: 7px;
            flex-wrap: wrap;
            margin-top: 14px;
          }
          .mobile-trust-chips {
            display: none !important;
          }
          .share-block {
            display: none !important;
          }
          .mobile-trust-chip {
            padding: 7px 10px;
            border-radius: 999px;
            background: #fffcf7;
            color: #0f5233;
            border: 1px solid #e8e0d4;
            font-family: DM Sans, sans-serif;
            font-size: 0.72rem;
            font-weight: 700;
            line-height: 1;
          }
          .mobile-trust-chip--green {
            background: #f0f7f3;
            color: #15803D;
            border-color: #d8eadf;
          }
          .desktop-seller-card {
            display: none !important;
          }
          .mobile-seller-card {
            display: block !important;
            width: calc(100% - 8%);
            margin: 0 auto 8px;
          }
          .mobile-seller-card > div {
            background: rgba(255,252,247,0.72) !important;
            border: 1px solid rgba(232,224,212,0.36) !important;
            box-shadow: none !important;
            padding: 15px 0 !important;
            border-radius: 0 !important;
          }
          .detail-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px 14px !important;
          }
          .detail-item {
            border-radius: 0 !important;
            padding: 8px 0 !important;
            background: transparent !important;
            border: none !important;
            border-bottom: 1px solid rgba(232,224,212,0.32) !important;
          }
          .detail-item-long {
            grid-column: 1 / -1;
          }
          .detail-label {
            font-size: 0.66rem !important;
            letter-spacing: 0.02em;
            color: rgba(111,107,99,0.78) !important;
          }
          .detail-value {
            font-family: 'DM Sans', sans-serif !important;
            font-size: 0.9rem !important;
            font-weight: 800 !important;
            line-height: 1.25 !important;
            word-break: break-word;
            color: #111827 !important;
            font-variant-numeric: lining-nums tabular-nums !important;
            font-feature-settings: "lnum" 1, "tnum" 1, "onum" 0 !important;
          }
          .safety-card {
            background: rgba(255,252,247,0.46) !important;
            border-radius: 16px !important;
            border: 1px solid rgba(232,224,212,0.32) !important;
            padding: 12px !important;
            margin-top: 6px !important;
            margin-bottom: 12px !important;
          }
          .safety-card h3 {
            color: #6b5b2f !important;
            font-size: 0.7rem !important;
            margin-bottom: 6px !important;
          }
          .safety-card div {
            color: #7c6a3a !important;
            font-size: 0.7rem !important;
            margin-bottom: 3px !important;
          }
          .description-text-mobile-collapsed {
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .description-toggle {
            display: inline-flex !important;
            margin-top: 12px;
            padding: 8px 12px;
            background: #FFFCF7;
            border: 1px solid #E8E0D4;
            border-radius: 10px;
            color: #15803D;
            font-family: DM Sans, sans-serif;
            font-size: 0.78rem;
            font-weight: 800;
          }
          .mobile-description-empty {
            display: block !important;
          }
          .mobile-similar-section {
            display: block !important;
            width: calc(100% - 8%);
            background: transparent;
            border: none;
            border-top: 1px solid rgba(232,224,212,0.46);
            padding: 18px 0;
            margin: 6px auto 12px;
          }
          .mobile-action-bar {
            display: grid !important;
            grid-template-columns: 46px minmax(92px, 1fr) 50px 50px;
            align-items: center;
            gap: 6px;
            position: fixed;
            left: 4%;
            right: 4%;
            bottom: calc(10px + env(safe-area-inset-bottom));
            z-index: 320;
            padding: 9px;
            background: rgba(255,252,247,0.92);
            border: 1px solid rgba(232,224,212,0.86);
            border-radius: 22px;
            box-shadow: 0 12px 34px rgba(17,26,20,0.16);
            backdrop-filter: blur(18px);
          }
          .mobile-action-primary,
          .mobile-action-secondary {
            height: 44px;
            border-radius: 12px;
            font-family: DM Sans, sans-serif;
            font-weight: 800;
            font-size: 0.74rem;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            white-space: nowrap;
            cursor: pointer;
          }
          .mobile-favorite-action {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            min-width: 0;
          }
          .mobile-favorite-label {
            font-family: DM Sans, sans-serif;
            font-size: 0.62rem;
            font-weight: 700;
            color: #6F6B63;
            line-height: 1;
          }
          .mobile-action-primary {
            background: #15803D;
            color: white;
            border: none;
            font-size: 0.86rem;
          }
          .mobile-action-primary:disabled {
            background: #dce5dd;
            color: #6F6B63;
          }
          .mobile-action-secondary {
            background: #FFFCF7;
            color: #111827;
            border: 1px solid #E8E0D4;
            padding: 0 6px;
            flex-direction: column;
            gap: 1px;
            line-height: 1.05;
          }
          .mobile-action-secondary:disabled {
            color: rgba(111,107,99,0.48);
            background: rgba(255,252,247,0.58);
            cursor: not-allowed;
          }
          .mobile-action-secondary-icon {
            font-size: 0.94rem;
            line-height: 1;
          }
          .mobile-action-secondary-label {
            font-size: 0.52rem;
            line-height: 1;
          }
          .mobile-message-drawer {
            display: block !important;
            position: fixed;
            inset: 0;
            z-index: 420;
            pointer-events: none;
          }
          .mobile-message-drawer-backdrop {
            position: absolute;
            inset: 0;
            border: none;
            background: rgba(17,26,20,0.32);
            opacity: 0;
            transition: opacity 0.18s ease;
          }
          .mobile-message-drawer-panel {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            padding: 16px 4% calc(16px + env(safe-area-inset-bottom));
            background: #FFFCF7;
            border-radius: 24px 24px 0 0;
            box-shadow: 0 -16px 42px rgba(17,26,20,0.18);
            transform: translateY(110%);
            transition: transform 0.18s ease;
          }
          .mobile-message-drawer.is-open {
            pointer-events: auto;
          }
          .mobile-message-drawer.is-open .mobile-message-drawer-backdrop {
            opacity: 1;
          }
          .mobile-message-drawer.is-open .mobile-message-drawer-panel {
            transform: translateY(0);
          }
          .map-card iframe,
          .map-card [title="Localisation"] {
            height: 150px !important;
          }
          .map-card > div {
            height: 150px !important;
          }
        }
      `}</style>

      <div className="detail-page-header">
        <Header />
      </div>

      <div className="detail-breadcrumb" style={{background:'white', borderBottom:'1px solid #f0f4f1', padding:'10px 5%'}}>
        <div style={{maxWidth:'1100px', margin:'0 auto', fontSize:'0.78rem', color:'#6b7c6e', display:'flex', alignItems:'center', gap:'6px'}}>
          <a href="/" style={{color:'#1a7a4a', textDecoration:'none', fontWeight:600}}>Accueil</a>
          <span>/</span>
          <span>{catLabel[ad.category] || ad.category}</span>
          <span>/</span>
          <span style={{color:'#111a14', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'200px'}}>{ad.title}</span>
        </div>
      </div>

      <div className="detail-layout" style={{maxWidth:'1100px', margin:'0 auto', padding:'20px 5%', display:'grid', gridTemplateColumns:'1fr 340px', gap:'20px', alignItems:'start'}}>

        {/* COLONNE GAUCHE */}
        <div className="detail-left">
          {/* Photos */}
          <div className="photo-card" style={{background:'white', borderRadius:'14px', overflow:'hidden', border:'1px solid #e8ede9', marginBottom:'16px'}}>
            <div className="main-photo-frame" style={{height:'300px', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'5rem', position:'relative', overflow:'hidden'}}>
              {hasPhotos ? (
                <img src={ad.images[activePhoto]} alt={ad.title} width={760} height={300} decoding="async" style={{width:'100%', height:'100%', objectFit:'cover'}} />
              ) : (
                <span style={{opacity:0.4}}>{catEmoji[ad.category] || '📦'}</span>
              )}
              <div className="mobile-photo-controls">
                <button type="button" className="mobile-floating-control" aria-label="Retour" onClick={() => window.history.back()}>
                  ←
                </button>
                <div className="mobile-photo-actions">
                  <button type="button" className="mobile-floating-control" aria-label="Partager" onClick={canNativeShare ? handleNativeShare : handleCopyLink}>
                    ↗
                  </button>
                  <div className="mobile-floating-control" aria-label="Favori">
                    <FavoriteButton adId={ad.id} size="md" onLogin={() => {
                      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
                        url: window.location.pathname,
                        state: {}
                      }))
                      window.location.href = '/auth?mode=login'
                    }} />
                  </div>
                </div>
              </div>
              <div className="photo-category-badge" style={{position:'absolute', top:'12px', left:'12px', background:'white', color:'#111a14', padding:'4px 10px', borderRadius:'7px', fontSize:'0.75rem', fontWeight:600, border:'1px solid #e8ede9'}}>
                {catEmoji[ad.category]} {catLabel[ad.category] || ad.category}
              </div>
              {hasPhotos && (
                <div className="mobile-photo-count">
                  {activePhoto + 1} / {ad.images.length}
                </div>
              )}
            </div>
            {hasPhotos && ad.images.length > 1 && (
              <div className="thumb-strip" style={{display:'flex', gap:'6px', padding:'10px 14px', overflowX:'auto'}}>
                {ad.images.map((img: string, i: number) => (
                  <div className={`thumb-item ${activePhoto === i ? 'thumb-item-active' : ''}`} key={i} onClick={() => setActivePhoto(i)} style={{width:'60px', height:'60px', flexShrink:0, borderRadius:'8px', overflow:'hidden', cursor:'pointer', border: activePhoto === i ? '2px solid #1a7a4a' : '2px solid transparent', opacity: activePhoto === i ? 1 : 0.6}}>
                    <img src={img} alt="" width={60} height={60} loading="lazy" decoding="async" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Titre + Prix + Partage */}
          <div className="main-info-card" style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'16px'}}>
            <h1 className="ad-title" style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.3rem', marginBottom:'12px', lineHeight:1.3, color:'#111a14'}}>
              {ad.title}
            </h1>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px'}}>
              <div className="ad-price" style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.7rem', color:'#0f5233'}}>
                {formatPrice(ad.price)}
              </div>
              <div className="ad-meta-row" style={{display:'flex', gap:'6px', flexWrap:'wrap', alignItems:'center'}}>
                {ad.province && (
                  <span style={{background:'#f5f7f5', color:'#111a14', padding:'5px 10px', borderRadius:'7px', fontSize:'0.75rem', fontWeight:600, border:'1px solid #e8ede9'}}>
                    {ad.province}{ad.district ? ' - ' + ad.district : ''}
                  </span>
                )}
                <span style={{background:'#f5f7f5', color:'#6b7c6e', padding:'5px 10px', borderRadius:'7px', fontSize:'0.75rem', border:'1px solid #e8ede9'}}>
                  {new Date(ad.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            {/* ✅ Bouton partage déplacé ici, bien visible */}
            <div className="mobile-trust-chips">
              {seller?.is_verified && <span className="mobile-trust-chip mobile-trust-chip--green">Vendeur vérifié</span>}
              <span className="mobile-trust-chip">Répond via SokoDeal</span>
              <span className="mobile-trust-chip">Conseils sécurité</span>
            </div>

            <div className="share-block" style={{marginTop:'14px', position:'relative', display:'inline-block'}} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowShareMenu(!showShareMenu)}
                style={{display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#f5f7f5', border:'1px solid #e8ede9', borderRadius:'9px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.82rem', color:'#111a14'}}>
                🔗 {shared ? 'Lien copie !' : 'Partager'}
              </button>
              {showShareMenu && (
                <div style={{position:'absolute', top:'40px', left:0, background:'white', borderRadius:'10px', border:'1px solid #e8ede9', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', padding:'6px', minWidth:'180px', zIndex:200}}
                  onClick={e => e.stopPropagation()}>
                  {canNativeShare && (
                    <button onClick={handleNativeShare} style={{width:'100%', padding:'9px 12px', background:'none', border:'none', borderRadius:'7px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', color:'#111a14', textAlign:'left'}}>
                      📱 Partager via...
                    </button>
                  )}
                  <button onClick={handleCopyLink} style={{width:'100%', padding:'9px 12px', background:'none', border:'none', borderRadius:'7px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', color:'#111a14', textAlign:'left'}}>
                    🔗 Copier le lien
                  </button>
                  <a href={waShareUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowShareMenu(false)}
                    style={{display:'block', padding:'9px 12px', borderRadius:'7px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', color:'#111a14', textDecoration:'none'}}>
                    💬 WhatsApp
                  </a>
                  <a href={fbUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowShareMenu(false)}
                    style={{display:'block', padding:'9px 12px', borderRadius:'7px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', color:'#111a14', textDecoration:'none'}}>
                    📘 Facebook
                  </a>
                  <a href={twUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowShareMenu(false)}
                    style={{display:'block', padding:'9px 12px', borderRadius:'7px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', color:'#111a14', textDecoration:'none'}}>
                    𝕏 Twitter / X
                  </a>
                </div>
              )}
            </div>
          </div>

          {seller && (
            <Link href={`/u/${seller.username || seller.id}`} className="mobile-seller-card" style={{textDecoration:'none', color:'inherit'}}>
              <div style={{background:'#FFFCF7', borderRadius:'24px', padding:'17px', border:'1px solid #E8E0D4', marginBottom:'12px', display:'flex', alignItems:'center', gap:'13px', boxShadow:'0 8px 24px rgba(17,26,20,0.06)'}}>
                <div style={{width:'58px', height:'58px', borderRadius:'50%', background:'#1a7a4a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.3rem', color:'white', flexShrink:0, boxShadow:'0 4px 14px rgba(26,122,74,0.18)'}}>
                  {(seller.full_name || seller.username || 'V')[0].toUpperCase()}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', alignItems:'center', gap:'7px', marginBottom:'3px'}}>
                    <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.95rem', color:'#111a14', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                      {seller.full_name || '@' + seller.username}
                    </div>
                    {seller.is_verified && <span style={{fontSize:'0.7rem', color:'#1a7a4a', fontWeight:800, flexShrink:0, background:'#f0f7f3', border:'1px solid #d8eadf', borderRadius:'999px', padding:'3px 7px'}}>Vérifié</span>}
                  </div>
                  {seller.username && (
                    <div style={{fontSize:'0.76rem', color:'#1a7a4a', fontWeight:700, marginBottom:'3px'}}>@{seller.username}</div>
                  )}
                  <div style={{fontSize:'0.72rem', color:'#8a7f70', lineHeight:1.45}}>
                    Membre depuis {new Date(seller.created_at).toLocaleDateString('fr-FR', {month:'long', year:'numeric'})}
                    {seller.ads_count ? ` · ${seller.ads_count} annonces` : ''}
                  </div>
                  <div style={{fontSize:'0.72rem', color:'#6b7c6e', lineHeight:1.45, marginTop:'3px', fontWeight:700}}>
                    Répond via SokoDeal
                  </div>
                </div>
                <span style={{color:'#1a7a4a', fontWeight:800, fontSize:'1rem', flexShrink:0}}>→</span>
              </div>
            </Link>
          )}

          {/* Description */}
          {(ad.description || !ad.description) && (
            <div className={`description-card ${!ad.description ? 'mobile-description-empty' : ''}`} style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'16px'}}>
              <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'12px', color:'#111a14', textTransform:'uppercase', letterSpacing:'0.04em'}}>Description</h2>
              <p className={!descriptionExpanded && ad.description ? 'description-text-mobile-collapsed' : ''} style={{color:'#333', lineHeight:1.8, fontSize:'0.92rem', whiteSpace:'pre-wrap', margin:0}}>
                {ad.description || 'Le vendeur n’a pas ajouté de description.'}
              </p>
              {ad.description && ad.description.length > 160 && (
                <button className="description-toggle" type="button" onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
                  {descriptionExpanded ? 'Voir moins' : 'Voir plus'}
                </button>
              )}
            </div>
          )}

          {/* ✅ Map OpenStreetMap */}
          {(ad.province || ad.district) && (
            <div className="map-card" style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'16px'}}>
              <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'14px', color:'#111a14', textTransform:'uppercase', letterSpacing:'0.04em'}}>
                📍 Localisation approximative
              </h2>
              <div style={{borderRadius:'10px', overflow:'hidden', height:'220px', border:'1px solid #e8ede9'}}>
                {coords ? (
                  <iframe
                    title="Localisation"
                    width="100%"
                    height="220"
                    style={{border:0, display:'block'}}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01}%2C${coords.lat - 0.01}%2C${coords.lng + 0.01}%2C${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
                    allowFullScreen
                  />
                ) : (
                  <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7c6e', fontSize:'0.88rem'}}>
                    Localisation non disponible
                  </div>
                )}
              </div>
              <p style={{fontSize:'0.78rem', color:'#6b7c6e', marginTop:'10px', display:'flex', alignItems:'center', gap:'6px'}}>
                <span>📍</span>
                <span>{[ad.district, ad.province].filter(Boolean).join(', ')}</span>
                <span style={{fontSize:'0.7rem', color:'#9ca3af', marginLeft:'4px'}}>· Localisation approximative</span>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent([ad.district, ad.province, 'Rwanda'].filter(Boolean).join(', '))}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{color:'#1a7a4a', fontWeight:600, textDecoration:'none', marginLeft:'auto', fontSize:'0.75rem'}}
                >
                  Ouvrir dans Maps →
                </a>
              </p>
            </div>
          )}

          {/* Détails */}
          <div className="details-card" style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9'}}>
            <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'14px', color:'#111a14', textTransform:'uppercase', letterSpacing:'0.04em'}}>Détails</h2>
            <div className="detail-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
              {[
                { label:'Catégorie', value: catLabel[ad.category] || ad.category, icon:'🏷️' },
                { label:'Prix', value: formatPrice(ad.price), icon:'💰' },
                { label:'Ville', value: ad.province || '-', icon:'🗺️' },
                { label:'District', value: ad.district || '-', icon:'📍' },
                { label:'Publié le', value: new Date(ad.created_at).toLocaleDateString('fr-FR'), icon:'📅' },
                { label:'Statut', value: ad.is_active ? 'Active' : 'Inactive', icon:'🔘' },
                ...(ad.immo_type ? [{ label:'Type', value: ad.immo_type, icon:'🏡' }] : []),
                ...(ad.surface ? [{ label:'Surface habitable', value: ad.surface + ' m²', icon:'📐' }] : []),
                ...(ad.surface_terrain ? [{ label:'Surface terrain', value: ad.surface_terrain + ' m²', icon:'🌿' }] : []),
                ...(ad.chambres ? [{ label:'Chambres', value: ad.chambres, icon:'🛏️' }] : []),
                ...(ad.salles_de_bain ? [{ label:'Salles de bain', value: ad.salles_de_bain, icon:'🚿' }] : []),
                ...(ad.etage ? [{ label:'Étage', value: ad.etage, icon:'🏢' }] : []),
                ...(ad.etat ? [{ label:'État', value: ad.etat === 'neuf' ? 'Neuf' : ad.etat === 'bon-etat' ? 'Bon état' : 'À rénover', icon:'✨' }] : []),
                ...(ad.meuble ? [{ label:'Meublé', value: 'Oui', icon:'🛋️' }] : []),
                ...(ad.charges_incluses ? [{ label:'Charges', value: 'Incluses', icon:'💡' }] : []),
              ].map((item, i) => {
                const valueText = String(item.value)
                const isLongDetail = valueText.length > 18 || item.label.length > 14
                return (
                <div key={i} className={`detail-item ${isLongDetail ? 'detail-item-long' : ''}`} style={{background:'#f5f7f5', borderRadius:'9px', padding:'11px 13px', border:'1px solid #e8ede9'}}>
                  <div className="detail-label" style={{fontSize:'0.7rem', color:'#6b7c6e', fontWeight:600, marginBottom:'3px', textTransform:'uppercase'}}>{item.icon} {item.label}</div>
                  <div className="detail-value" style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#111a14'}}>{valueText}</div>
                </div>
                )
              })}
            </div>
          </div>

          <div className="mobile-similar-section">
            <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.98rem', color:'#111a14', marginBottom:'8px'}}>
              Annonces similaires
            </h2>
            <p style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', color:'#6b7c6e', lineHeight:1.55, margin:0}}>
              Annonces similaires bientôt disponibles.
            </p>
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="detail-right" style={{position:'sticky', top:'78px'}}>

          {/* ✅ Profil vendeur */}
          {seller && (
            <Link href={`/u/${seller.username || seller.id}`} style={{textDecoration:'none'}}>
            <div
              className="desktop-seller-card"
              style={{background:'white', borderRadius:'14px', padding:'16px 20px', border:'1px solid #e8ede9', marginBottom:'12px', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', transition:'box-shadow 0.15s'}}
              onMouseEnter={e => (e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}
            >
              <div style={{width:'48px', height:'48px', borderRadius:'50%', background:'#1a7a4a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', color:'white', flexShrink:0}}>
                {(seller.full_name || seller.username || 'V')[0].toUpperCase()}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.9rem', color:'#111a14', display:'flex', alignItems:'center', gap:'5px'}}>
                  {seller.full_name || '@' + seller.username}
                  {seller.is_verified && <span style={{fontSize:'0.75rem'}}>✅</span>}
                </div>
                {seller.username && (
                  <div style={{fontSize:'0.75rem', color:'#1a7a4a', fontWeight:600}}>@{seller.username}</div>
                )}
                <div style={{fontSize:'0.72rem', color:'#6b7c6e', marginTop:'2px'}}>
                  Membre depuis {new Date(seller.created_at).toLocaleDateString('fr-FR', {month:'long', year:'numeric'})}
                </div>
              </div>
              <span style={{color:'#1a7a4a', fontWeight:700, fontSize:'0.85rem', flexShrink:0}}>→</span>
            </div>
            </Link>
          )}

          {/* Contact vendeur */}
          <div className="contact-card" style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'12px'}}>
            <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'16px', color:'#111a14', textTransform:'uppercase', letterSpacing:'0.04em'}}>Contacter le vendeur</h2>

            {ad.hide_phone && (
              <div style={{background:'#f5f7f5', borderRadius:'9px', padding:'12px', border:'1px solid #e8ede9', marginBottom:'10px', textAlign:'center'}}>
                <div style={{fontSize:'1.5rem', marginBottom:'6px'}}>🔒</div>
                <p style={{fontSize:'0.82rem', color:'#6b7c6e', fontFamily:'DM Sans,sans-serif'}}>Ce vendeur prefere etre contacte via la messagerie SokoDeal</p>
              </div>
            )}
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); setMessageTouched(true) }}
              onFocus={() => setMessageTouched(true)}
              rows={4}
              style={{width:'100%', padding:'11px 13px', border:'1px solid #e8ede9', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', outline:'none', resize:'vertical', background:'#fafaf9', marginBottom:'10px', boxSizing:'border-box', color: messageTouched ? '#111a14' : '#9ca3af', cursor:'text'}}
            />
            <button onClick={handleContact} disabled={sending || !message.trim()} style={{
              width:'100%', padding:'12px',
              background: sending || !message.trim() ? '#e8ede9' : '#1a7a4a',
              border:'none', borderRadius:'9px', fontFamily:'Syne,sans-serif', fontWeight:700,
              fontSize:'0.9rem', color: sending || !message.trim() ? '#6b7c6e' : 'white',
              cursor: sending || !message.trim() ? 'not-allowed' : 'pointer', marginBottom:'8px'
            }}>
              {sending ? 'Envoi...' : '💬 Envoyer le message'}
            </button>
            {!user && (
              <p style={{fontSize:'0.75rem', color:'#6b7c6e', textAlign:'center', marginBottom:'8px'}}>
                <a href="/auth?mode=login" onClick={() => {
                  sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
                    url: window.location.pathname,
                    state: { message }
                  }))
                }} style={{color:'#1a7a4a', fontWeight:700}}>Connectez-vous</a> pour envoyer un message
              </p>
            )}
            {!ad.hide_phone && ad.phone && (
              user ? (
                <a href={'tel:' + ad.phone} style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'11px', background:'#f5f7f5', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.88rem', color:'#111a14', textDecoration:'none', marginTop:'8px', boxSizing:'border-box', border:'1px solid #e8ede9'}}>
                  Tel {ad.phone}
                </a>
              ) : (
                <button
                  onClick={() => {
                    sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
                      url: window.location.pathname,
                      state: { message }
                    }))
                    window.location.href = '/auth?mode=login'
                  }}
                  style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'11px', background:'#f5f7f5', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.88rem', color:'#111a14', border:'1px solid #e8ede9', cursor:'pointer', marginTop:'8px', boxSizing:'border-box'}}
                >
                  📞 Téléphone
                </button>
              )
            )}
            {!ad.hide_phone && (ad.whatsapp || ad.phone) && (
              user ? (
                <a href={'https://wa.me/' + waPhone + '?text=' + waText} target="_blank" rel="noopener noreferrer"
                  style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'11px', background:'#25D366', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'0.88rem', color:'white', textDecoration:'none', marginTop:'8px', boxSizing:'border-box'}}>
                  WhatsApp
                </a>
              ) : (
                <button
                  onClick={() => {
                    sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
                      url: window.location.pathname,
                      state: { message }
                    }))
                    window.location.href = '/auth?mode=login'
                  }}
                  style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'11px', background:'#25D366', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'0.88rem', color:'white', border:'none', cursor:'pointer', marginTop:'8px', boxSizing:'border-box', opacity:0.7}}
                >
                  💬 WhatsApp
                </button>
              )
            )}
          </div>

          <ReportButton adId={ad.id} userId={user?.id} />

          <div className="safety-card" style={{background:'#fffbeb', borderRadius:'12px', padding:'14px', border:'1px solid #fde68a'}}>
            <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', marginBottom:'8px', color:'#78350f', textTransform:'uppercase', letterSpacing:'0.04em'}}>
              Conseils de sécurité
            </h3>
            {[
              'Ne payez jamais à l’avance sans voir l’article',
              'Rencontrez le vendeur dans un lieu public',
              'Vérifiez l’article avant tout paiement'
            ].map((tip, i) => (
              <div key={i} style={{display:'flex', gap:'6px', marginBottom:'5px', fontSize:'0.75rem', color:'#78350f'}}>
                <span style={{fontWeight:700, flexShrink:0}}>✓</span> {tip}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mobile-action-bar">
        <div className="mobile-favorite-action">
          <FavoriteButton adId={ad.id} size="md" onLogin={() => {
            sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
              url: window.location.pathname,
              state: {}
            }))
            window.location.href = '/auth?mode=login'
          }} />
          <span className="mobile-favorite-label">Favori</span>
        </div>
        <button
          onClick={() => {
            if (!messageTouched && !message.trim()) {
              setMessage('Bonjour, cette annonce est-elle disponible ?')
            }
            setShowMessageComposer(true)
          }}
          className="mobile-action-primary"
        >
          Message
        </button>
        {user && canUseWhatsApp ? (
          <a
            href={'https://wa.me/' + waPhone + '?text=' + waText}
            target="_blank"
            rel="noopener noreferrer"
            className="mobile-action-secondary"
          >
            <span className="mobile-action-secondary-icon">💬</span>
            <span className="mobile-action-secondary-label">WhatsApp</span>
          </a>
        ) : (
          <button
            type="button"
            className="mobile-action-secondary"
            disabled={!canUseWhatsApp}
            onClick={canUseWhatsApp ? redirectToLoginWithMessage : undefined}
          >
            <span className="mobile-action-secondary-icon">💬</span>
            <span className="mobile-action-secondary-label">WhatsApp</span>
          </button>
        )}
        {user && canUsePhone ? (
          <a href={'tel:' + ad.phone} className="mobile-action-secondary">
            <span className="mobile-action-secondary-icon">📞</span>
            <span className="mobile-action-secondary-label">Téléphone</span>
          </a>
        ) : (
          <button
            type="button"
            className="mobile-action-secondary"
            disabled={!canUsePhone}
            onClick={canUsePhone ? redirectToLoginWithMessage : undefined}
          >
            <span className="mobile-action-secondary-icon">📞</span>
            <span className="mobile-action-secondary-label">Téléphone</span>
          </button>
        )}
      </div>

      <div className={`mobile-message-drawer ${showMessageComposer ? 'is-open' : ''}`}>
        <button
          type="button"
          aria-label="Fermer le message"
          className="mobile-message-drawer-backdrop"
          onClick={() => setShowMessageComposer(false)}
        />
        <div className="mobile-message-drawer-panel">
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', marginBottom:'12px'}}>
            <div>
              <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1rem', color:'#111a14', marginBottom:'3px'}}>
                Envoyer un message
              </div>
              <div style={{fontFamily:'DM Sans,sans-serif', fontSize:'0.78rem', color:'#6b7c6e'}}>
                Modifiez le texte avant l’envoi.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMessageComposer(false)}
              style={{width:'34px', height:'34px', borderRadius:'50%', border:'1px solid #e8e4de', background:'#f5f7f5', color:'#111a14', fontWeight:800, cursor:'pointer'}}
            >
              ×
            </button>
          </div>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setMessageTouched(true) }}
            rows={4}
            style={{width:'100%', padding:'12px 13px', border:'1px solid #e8e4de', borderRadius:'14px', fontFamily:'DM Sans,sans-serif', fontSize:'0.92rem', outline:'none', resize:'vertical', background:'#faf9f7', marginBottom:'12px', boxSizing:'border-box', color:'#111a14'}}
          />
          <button
            onClick={async () => {
              await handleContact()
              if (user) setShowMessageComposer(false)
            }}
            disabled={sending || !message.trim()}
            style={{width:'100%', height:'46px', borderRadius:'14px', border:'none', background: sending || !message.trim() ? '#dce5dd' : '#1a7a4a', color: sending || !message.trim() ? '#6b7c6e' : 'white', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.9rem', cursor: sending || !message.trim() ? 'not-allowed' : 'pointer'}}
          >
            {sending ? 'Envoi...' : 'Envoyer le message'}
          </button>
        </div>
      </div>

    </div>
  )
}
