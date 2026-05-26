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

type AdRecord = {
  id: string
  user_id: string | null
  title: string
  category: string
  price: string | number | null
  description?: string | null
  images?: string[] | null
  province?: string | null
  district?: string | null
  created_at: string
  whatsapp?: string | null
  phone?: string | null
  hide_phone?: boolean | null
  is_active?: boolean | null
  immo_type?: string | null
  surface?: string | number | null
  surface_terrain?: string | number | null
  chambres?: string | number | null
  salles_de_bain?: string | number | null
  etage?: string | number | null
  etat?: string | null
  meuble?: boolean | null
  charges_incluses?: boolean | null
}

type SellerRecord = {
  id: string
  username?: string | null
  full_name?: string | null
  is_verified?: boolean | null
  bio?: string | null
  created_at: string
  ads_count?: number | null
}

type UserRecord = {
  id: string
  email?: string
}

type CategoryMap = Record<string, string>

type ListingSchema = {
  '@context': 'https://schema.org'
  '@type': 'Vehicle' | 'RealEstateListing' | 'Product'
  name: string
  description: string
  image: string[]
  offers: {
    '@type': 'Offer'
    price: string | number | null
    priceCurrency: 'RWF'
    availability: 'https://schema.org/InStock'
    url: string
  }
  seller: {
    '@type': 'Person'
    name: string
  }
  locationCreated?: {
    '@type': 'Place'
    name: string
  }
}

const getSlugSource = (ad: AdRecord) => ({
  id: ad.id,
  title: ad.title,
  category: ad.category,
  province: ad.province || undefined,
})

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
    <div style={{background:'#e8f5ee', borderRadius:'12px', padding:'12px', border:'1px solid #b7dfca', marginBottom:'12px', textAlign:'center', fontSize:'0.82rem', color:'#15803D', fontWeight:600}}>
      Signalement envoye. Merci !
    </div>
  )

  return (
    <div style={{marginBottom:'12px'}}>
      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{width:'100%', padding:'10px', background:'transparent', border:'1px solid #E8E0D4', borderRadius:'9px', fontFamily:'Inter, system-ui, sans-serif', fontWeight:600, fontSize:'0.82rem', color:'#6F6B63', cursor:'pointer'}}>
          Signaler cette annonce
        </button>
      ) : (
        <div style={{background:'#fff1f0', borderRadius:'12px', padding:'14px', border:'1px solid #ffd6d6'}}>
          <p style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#c0392b', marginBottom:'10px'}}>Signaler cette annonce</p>
          <select value={reason} onChange={e => setReason(e.target.value)}
            style={{width:'100%', padding:'9px 12px', border:'1px solid #ffd6d6', borderRadius:'8px', fontFamily:'Inter, system-ui, sans-serif', fontSize:'0.82rem', outline:'none', color:'#111827', background:'white', marginBottom:'10px'}}>
            <option value="">Choisir une raison...</option>
            <option value="arnaque">Arnaque / Fraude</option>
            <option value="contenu-inapproprie">Contenu inapproprie</option>
            <option value="faux-produit">Faux produit</option>
            <option value="prix-abusif">Prix abusif</option>
            <option value="doublon">Annonce en doublon</option>
            <option value="autre">Autre</option>
          </select>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={handleReport} disabled={sending || !reason} style={{flex:1, padding:'9px', background: !reason ? '#ccc' : '#c0392b', border:'none', borderRadius:'8px', fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.82rem', color:'white', cursor: !reason ? 'not-allowed' : 'pointer'}}>
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
            <button onClick={() => setShowForm(false)} style={{padding:'9px 14px', background:'transparent', border:'1px solid #E8E0D4', borderRadius:'8px', fontFamily:'Inter, system-ui, sans-serif', fontWeight:600, fontSize:'0.82rem', color:'#6F6B63', cursor:'pointer'}}>
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
  const [ad, setAd] = useState<AdRecord | null>(null)
  const [seller, setSeller] = useState<SellerRecord | null>(null)  // ✅ profil vendeur
  const [user, setUser] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)
  const [message, setMessage] = useState('Bonjour, cette annonce est-elle disponible ?')
  const [messageTouched, setMessageTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [shared, setShared] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [showMessageComposer, setShowMessageComposer] = useState(false)

  const catEmoji: CategoryMap = {
    'immo-vente':'🏡','immo-location':'🏢','immo-terrain':'🌿','voiture':'🚗',
    'moto':'🛵','electronique':'📱','mode':'👗','maison':'🛋️','emploi':'💼',
    'animaux':'🐄','services':'🏗️','agriculture':'🌾','materiaux':'🧱',
    'sante':'💊','sport':'⚽','education':'📚'
  }

  const catLabel: CategoryMap = {
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
      let data: AdRecord | null = null

      if (isFullUUID(rawId)) {
        const result = await supabase.from('ads').select('*').eq('id', rawId).single()
        data = result.data as AdRecord | null
        if (data) {
          window.location.replace('/annonce/' + generateSlug(getSlugSource(data)))
          return
        }
      } else {
        const parts = rawId.split('-')
        const shortId = parts[parts.length - 1] || extractIdFromSlug(rawId)

        const { data: fallbackData } = await supabase
          .from('ads')
          .select('*')
          .limit(1000)

        const fallbackRecords = fallbackData as AdRecord[] | null
        data = fallbackRecords?.find((item) =>
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
          setSeller(sellerData as SellerRecord | null)
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
    canonical.href = window.location.origin + '/annonce/' + generateSlug(getSlugSource(ad))
  }, [ad])

  useEffect(() => {
    if (!ad) return

    const isVehicle = ['voiture', 'moto'].includes(ad.category)
    const isRealEstate = ['immo-vente', 'immo-location', 'immo-terrain'].includes(ad.category)

    const schema: ListingSchema = {
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

  useEffect(() => {
    const header = document.querySelector('.detail-page-header')
    if (!header) return
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 80)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ✅ Contact → redirige directement vers la messagerie
  const handleContact = async () => {
    if (!ad) return
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
    return ad ? 'https://sokodeal.app/annonce/' + generateSlug(getSlugSource(ad)) : 'https://sokodeal.app'
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
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF7EF'}}>
      <p style={{fontFamily:'Inter, system-ui, sans-serif', color:'#15803D', fontWeight:700}}>Chargement...</p>
    </div>
  )

  if (!ad) return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FAF7EF'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'3rem', marginBottom:'12px'}}>😕</div>
        <h2 style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:800, marginBottom:'8px', color:'#111827'}}>Annonce introuvable</h2>
        <Link href="/" style={{color:'#15803D', fontWeight:600, textDecoration:'none'}}>Retour</Link>
      </div>
    </div>
  )

  const images = ad.images || []
  const hasPhotos = images.length > 0
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
    <div className="ad-detail-page" style={{minHeight:'100vh', background:'#FAF7EF'}}>
      <style>{`
        .mobile-photo-count,
        .mobile-seller-card,
        .mobile-action-bar,
        .mobile-trust-chips,
        .description-toggle,
        .mobile-similar-section,
        .mobile-report-block,
        .mobile-safety,
        .mobile-description-empty,
        .mobile-photo-controls,
        .mobile-message-drawer {
          display: none;
        }
        @media (max-width: 768px) {
          .detail-page-header {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 100 !important;
            background: transparent !important;
            transition: background 200ms ease, border-color 200ms ease !important;
          }
          .detail-page-header.scrolled {
            background: rgba(250,247,239,0.95) !important;
            backdrop-filter: blur(10px) !important;
            border-bottom: 1px solid #E8E0D4 !important;
          }
          .detail-page-header header {
            display: none !important;
            background: transparent !important;
            border-bottom-color: transparent !important;
            backdrop-filter: none !important;
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
            background: #FAF7EF !important;
            padding-bottom: calc(92px + env(safe-area-inset-bottom)) !important;
          }
          .detail-layout {
            grid-template-columns: 1fr !important;
            padding: 0 0 18px !important;
            gap: 0 !important;
            max-width: none !important;
          }
          .detail-left {
            min-width: 0 !important;
            background: #FAF7EF !important;
            border-radius: 24px 24px 0 0 !important;
            margin-top: -48px !important;
            position: relative !important;
            z-index: 10 !important;
            padding-top: 16px !important;
            overflow: visible !important;
          }
          .detail-right {
            position: static !important;
          }
          .photo-card {
            background: #111827 !important;
            position: relative !important;
            z-index: 1 !important;
            margin-bottom: 0 !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .main-photo-frame {
            height: 420px !important;
            aspect-ratio: unset !important;
            font-size: 4rem !important;
            position: relative !important;
            border-radius: 0 !important;
            overflow: hidden !important;
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
            font-family: Inter, system-ui, sans-serif;
            font-size: 0.74rem;
            font-weight: 700;
            backdrop-filter: blur(8px);
          }
          .mobile-photo-controls {
            display: flex !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            padding-top: calc(20px + env(safe-area-inset-top)) !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
            justify-content: space-between !important;
            align-items: center !important;
            z-index: 10 !important;
            pointer-events: none !important;
            box-sizing: border-box !important;
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
            font-family: Inter, system-ui, sans-serif;
            font-weight: 800;
            font-size: 0.92rem;
            cursor: pointer;
            pointer-events: auto !important;
          }
          .mobile-floating-control button {
            box-shadow: none !important;
            background: transparent !important;
            backdrop-filter: none !important;
          }
          .thumb-strip {
            position: relative !important;
            z-index: 2 !important;
            margin-top: 0 !important;
            background: #FAF7EF !important;
            border-radius: 0 !important;
            padding: 14px 20px 10px !important;
            box-shadow: none !important;
            gap: 8px !important;
            scroll-snap-type: x proximity;
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
          .safety-card,
          .mobile-seller-card,
          .mobile-similar-section {
            width: 100% !important;
            box-sizing: border-box !important;
            border-radius: 0 !important;
            border: none !important;
            border-bottom: none !important;
            border-top: none !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .main-info-card {
            padding: 16px 20px !important;
            margin: 0 0 4px 0 !important;
          }
          .description-card,
          .map-card,
          .details-card {
            padding: 12px 20px !important;
            margin: 0 0 4px 0 !important;
          }
          .contact-card {
            display: none !important;
          }
          .desktop-report-block,
          .desktop-safety {
            display: none !important;
          }
          .ad-title {
            font-size: 1.2rem !important;
            font-weight: 700 !important;
            line-height: 1.3 !important;
            color: #111827 !important;
            margin-bottom: 6px !important;
            -webkit-line-clamp: unset !important;
            overflow: visible !important;
            display: block !important;
            letter-spacing: -0.01em !important;
          }
          .ad-price {
            font-size: 1.45rem !important;
            font-weight: 700 !important;
            color: #15803D !important;
            letter-spacing: -0.01em !important;
            font-variant-numeric: lining-nums tabular-nums !important;
          }
          .description-card h2,
          .map-card h2,
          .details-card h2 {
            text-transform: none !important;
            font-size: 16px !important;
            font-weight: 600 !important;
            letter-spacing: 0 !important;
            color: #111827 !important;
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
            color: #15803D;
            border: 1px solid #e8e0d4;
            font-family: Inter, system-ui, sans-serif;
            font-size: 0.72rem;
            font-weight: 700;
            line-height: 1;
          }
          .mobile-trust-chip--green {
            background: #E7F6EC;
            color: #15803D;
            border-color: #E8E0D4;
          }
          .desktop-seller-card {
            display: none !important;
          }
          .mobile-seller-card {
            display: block !important;
            padding: 0 20px !important;
            margin: 0 0 4px 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            border: none !important;
            border-bottom: none !important;
            border-top: none !important;
            box-shadow: none !important;
          }
          .mobile-seller-card > a > div,
          .mobile-seller-card > div {
            background: #FAF7EF !important;
            border-radius: 20px !important;
            border: 1px solid #E8E0D4 !important;
            box-shadow: 0 4px 16px rgba(60,40,10,0.05) !important;
            padding: 16px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
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
            font-family: Inter, system-ui, sans-serif !important;
            font-size: 0.9rem !important;
            font-weight: 800 !important;
            line-height: 1.25 !important;
            word-break: break-word;
            color: #111827 !important;
            font-variant-numeric: lining-nums tabular-nums !important;
            font-feature-settings: "lnum" 1, "tnum" 1, "onum" 0 !important;
          }
          .safety-card {
            width: auto !important;
            margin: 0 20px 6px !important;
            background: #FFFCF7 !important;
            border-radius: 16px !important;
            border: 1px solid #E8E0D4 !important;
            padding: 12px !important;
            box-shadow: none !important;
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
            font-family: Inter, system-ui, sans-serif;
            font-size: 0.78rem;
            font-weight: 800;
          }
          .mobile-description-empty {
            display: block !important;
          }
          .mobile-similar-section {
            display: block !important;
            width: 100% !important;
            background: transparent;
            border: none;
            border-top: none !important;
            border-bottom: none !important;
            box-shadow: none !important;
            padding: 12px 20px !important;
            margin: 0 0 4px 0 !important;
            box-sizing: border-box !important;
          }
          .mobile-report-block {
            display: block !important;
          }
          .mobile-safety {
            display: block !important;
            background: #FFFCF7 !important;
            border-radius: 16px !important;
            border: 1px solid #E8E0D4 !important;
            padding: 14px !important;
            box-shadow: none !important;
          }
          .mobile-safety h3 {
            font-size: 13px !important;
            font-weight: 600 !important;
            color: #111827 !important;
            text-transform: none !important;
            margin-bottom: 8px !important;
            letter-spacing: 0 !important;
          }
          .mobile-action-bar {
            display: grid !important;
            align-items: center !important;
            gap: 8px !important;
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 320 !important;
            padding: 12px 20px !important;
            padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important;
            background: rgba(250,247,239,0.96) !important;
            border-top: 1px solid #E8E0D4 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            backdrop-filter: blur(12px) !important;
          }
          .mobile-action-primary,
          .mobile-action-secondary {
            font-family: Inter, system-ui, sans-serif;
            text-decoration: none;
            display: flex !important;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            white-space: nowrap;
            cursor: pointer;
          }
          .mobile-favorite-action {
            height: 44px !important;
            border-radius: 12px !important;
            border: 1px solid #E8E0D4 !important;
            background: #FFFCF7 !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            padding: 0 10px !important;
            cursor: pointer !important;
          }
          .mobile-favorite-label {
            font-size: 12px !important;
            font-weight: 500 !important;
            color: #6F6B63 !important;
            font-family: Inter, system-ui, sans-serif !important;
          }
          .mobile-action-primary {
            height: 44px !important;
            border-radius: 12px !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            background: #15803D !important;
            color: white !important;
            border: none !important;
            gap: 8px !important;
            font-family: Inter, system-ui, sans-serif !important;
          }
          .mobile-action-primary:disabled {
            background: #dce5dd;
            color: #6F6B63;
          }
          .mobile-action-secondary {
            width: 44px !important;
            height: 44px !important;
            border-radius: 50% !important;
            border: 1px solid #E8E0D4 !important;
            background: #FFFCF7 !important;
            flex-direction: column !important;
            gap: 0 !important;
            padding: 0 !important;
            font-size: 20px !important;
            color: #111827;
          }
          .mobile-action-secondary[href*="wa.me"],
          .mobile-action-secondary:not(:disabled):has(svg) {
            background: #25D366 !important;
            border-color: #25D366 !important;
          }
          .mobile-action-secondary:disabled {
            color: rgba(111,107,99,0.48);
            background: rgba(255,252,247,0.58);
            cursor: not-allowed;
          }
          .mobile-action-secondary-label {
            display: none !important;
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
        <div style={{maxWidth:'1100px', margin:'0 auto', fontSize:'0.78rem', color:'#6F6B63', display:'flex', alignItems:'center', gap:'6px'}}>
          <Link href="/" style={{color:'#15803D', textDecoration:'none', fontWeight:600}}>Accueil</Link>
          <span>/</span>
          <span>{catLabel[ad.category] || ad.category}</span>
          <span>/</span>
          <span style={{color:'#111827', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'200px'}}>{ad.title}</span>
        </div>
      </div>

      <div className="detail-layout" style={{maxWidth:'1100px', margin:'0 auto', padding:'20px 5%', display:'grid', gridTemplateColumns:'1fr 340px', gap:'20px', alignItems:'start'}}>

        {/* COLONNE GAUCHE */}
        <div className="detail-left">
          {/* Photos */}
          <div className="photo-card" style={{background:'white', borderRadius:'14px', overflow:'hidden', border:'1px solid #E8E0D4', marginBottom:'16px'}}>
            <div className="main-photo-frame" style={{height:'auto', aspectRatio:'4/3', background:'#111827', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'5rem', position:'relative', overflow:'hidden', cursor:'grab'}}>
              {hasPhotos ? (
                <img
                  src={images[activePhoto]}
                  alt={ad.title}
                  width={760}
                  height={300}
                  decoding="async"
                  style={{width:'100%', height:'100%', objectFit:'cover'}}
                />
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
              <div className="photo-category-badge" style={{position:'absolute', top:'12px', left:'12px', background:'white', color:'#111827', padding:'4px 10px', borderRadius:'7px', fontSize:'0.75rem', fontWeight:600, border:'1px solid #E8E0D4'}}>
                {catEmoji[ad.category]} {catLabel[ad.category] || ad.category}
              </div>
              {hasPhotos && (
                <div className="mobile-photo-count">
                  {activePhoto + 1} / {images.length}
                </div>
              )}
            </div>
            {hasPhotos && images.length > 1 && (
              <div className="thumb-strip" style={{display:'flex', gap:'6px', padding:'10px 14px', overflowX:'auto'}}>
                {images.map((img: string, i: number) => (
                  <div className={`thumb-item ${activePhoto === i ? 'thumb-item-active' : ''}`} key={i} onClick={() => setActivePhoto(i)} style={{width:'60px', height:'60px', flexShrink:0, borderRadius:'8px', overflow:'hidden', cursor:'pointer', border: activePhoto === i ? '2px solid #15803D' : '2px solid transparent', opacity: activePhoto === i ? 1 : 0.6}}>
                    <img src={img} alt="" width={60} height={60} loading="lazy" decoding="async" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Titre + Prix + Partage */}
          <div className="main-info-card" style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #E8E0D4', marginBottom:'16px'}}>
            <h1 className="ad-title" style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:800, fontSize:'1.3rem', marginBottom:'12px', lineHeight:1.3, color:'#111827'}}>
              {ad.title}
            </h1>
            <div className="ad-price" style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:800, fontSize:'1.7rem', color:'#15803D'}}>
              {formatPrice(ad.price)}
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', fontSize:'13px', color:'#6F6B63', marginTop:'8px'}}>
              {ad.province && <span>📍 {ad.province}{ad.district ? ' · ' + ad.district : ''}</span>}
              <span>·</span>
              <span>{new Date(ad.created_at).toLocaleDateString('fr-FR')}</span>
            </div>

            {/* ✅ Bouton partage déplacé ici, bien visible */}
            <div className="mobile-trust-chips">
              {seller?.is_verified && <span className="mobile-trust-chip mobile-trust-chip--green">Vendeur vérifié</span>}
              <span className="mobile-trust-chip">Répond via SokoDeal</span>
              <span className="mobile-trust-chip">Conseils sécurité</span>
            </div>

            <div className="share-block" style={{marginTop:'14px', position:'relative', display:'inline-block'}} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowShareMenu(!showShareMenu)}
                style={{display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#FAF7EF', border:'1px solid #E8E0D4', borderRadius:'9px', cursor:'pointer', fontFamily:'Inter, system-ui, sans-serif', fontWeight:600, fontSize:'0.82rem', color:'#111827'}}>
                🔗 {shared ? 'Lien copie !' : 'Partager'}
              </button>
              {showShareMenu && (
                <div style={{position:'absolute', top:'40px', left:0, background:'white', borderRadius:'10px', border:'1px solid #E8E0D4', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', padding:'6px', minWidth:'180px', zIndex:200}}
                  onClick={e => e.stopPropagation()}>
                  {canNativeShare && (
                    <button onClick={handleNativeShare} style={{width:'100%', padding:'9px 12px', background:'none', border:'none', borderRadius:'7px', cursor:'pointer', fontFamily:'Inter, system-ui, sans-serif', fontSize:'0.82rem', color:'#111827', textAlign:'left'}}>
                      📱 Partager via...
                    </button>
                  )}
                  <button onClick={handleCopyLink} style={{width:'100%', padding:'9px 12px', background:'none', border:'none', borderRadius:'7px', cursor:'pointer', fontFamily:'Inter, system-ui, sans-serif', fontSize:'0.82rem', color:'#111827', textAlign:'left'}}>
                    🔗 Copier le lien
                  </button>
                  <a href={waShareUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowShareMenu(false)}
                    style={{display:'block', padding:'9px 12px', borderRadius:'7px', fontFamily:'Inter, system-ui, sans-serif', fontSize:'0.82rem', color:'#111827', textDecoration:'none'}}>
                    💬 WhatsApp
                  </a>
                  <a href={fbUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowShareMenu(false)}
                    style={{display:'block', padding:'9px 12px', borderRadius:'7px', fontFamily:'Inter, system-ui, sans-serif', fontSize:'0.82rem', color:'#111827', textDecoration:'none'}}>
                    📘 Facebook
                  </a>
                  <a href={twUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowShareMenu(false)}
                    style={{display:'block', padding:'9px 12px', borderRadius:'7px', fontFamily:'Inter, system-ui, sans-serif', fontSize:'0.82rem', color:'#111827', textDecoration:'none'}}>
                    𝕏 Twitter / X
                  </a>
                </div>
              )}
            </div>
          </div>

          {seller && (
            <>
            <Link href={`/u/${seller.username || seller.id}`} className="mobile-seller-card" style={{textDecoration:'none', color:'inherit'}}>
              <div style={{background:'#FAF7EF', borderRadius:'20px', padding:'16px', border:'1px solid #E8E0D4', boxShadow:'0 4px 16px rgba(60,40,10,0.05)', display:'flex', flexDirection:'column', gap:'0'}}>
                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                  <div style={{width:'48px', height:'48px', borderRadius:'50%', background:'#15803D', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'1.1rem', color:'white', flexShrink:0}}>
                    {(seller.full_name || seller.username || 'V')[0].toUpperCase()}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px'}}>
                      <span style={{fontWeight:700, fontSize:'15px', color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                        {seller.full_name || '@' + seller.username}
                      </span>
                      {seller.is_verified && <span style={{fontSize:'11px', color:'#15803D', fontWeight:600, flexShrink:0, background:'#E7F6EC', border:'1px solid #E8E0D4', borderRadius:'999px', padding:'2px 7px'}}>{'V\u00e9rifi\u00e9'}</span>}
                    </div>
                    {seller.username && (
                      <div style={{fontSize:'13px', color:'#15803D', fontWeight:600, marginBottom:'2px'}}>@{seller.username}</div>
                    )}
                    <div style={{fontSize:'12px', color:'#6F6B63'}}>
                      Membre depuis {new Date(seller.created_at).toLocaleDateString('fr-FR', {month:'long', year:'numeric'})}
                      {seller.ads_count ? ` \u00b7 ${seller.ads_count} annonces` : ''}
                    </div>
                  </div>
                  <span style={{color:'#15803D', fontSize:'18px', fontWeight:600, flexShrink:0}}>{'\u2192'}</span>
                </div>
                <div style={{marginTop:'12px', padding:'10px 12px', background:'#E7F6EC', borderRadius:'12px', display:'flex', alignItems:'center', gap:'8px', fontSize:'13px', color:'#15803D', fontWeight:500}}>
                  <span>{'\u23f1'}</span>
                  <span>{'R\u00e9pond g\u00e9n\u00e9ralement en moins d\'1h'}</span>
                </div>
              </div>
            </Link>
            </>
          )}

          {/* Description */}
          {(ad.description || !ad.description) && (
            <div className={`description-card ${!ad.description ? 'mobile-description-empty' : ''}`} style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #E8E0D4', marginBottom:'16px'}}>
              <h2 style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'12px', color:'#111827', textTransform:'uppercase', letterSpacing:'0.04em'}}>Description</h2>
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
            <div className="map-card" style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #E8E0D4', marginBottom:'16px'}}>
              <h2 style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'14px', color:'#111827', textTransform:'uppercase', letterSpacing:'0.04em'}}>
                📍 Localisation approximative
              </h2>
              <div style={{borderRadius:'10px', overflow:'hidden', height:'220px', border:'1px solid #E8E0D4'}}>
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
                  <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#6F6B63', fontSize:'0.88rem'}}>
                    Localisation non disponible
                  </div>
                )}
              </div>
              <p style={{fontSize:'0.78rem', color:'#6F6B63', marginTop:'10px', display:'flex', alignItems:'center', gap:'6px'}}>
                <span>📍</span>
                <span>{[ad.district, ad.province].filter(Boolean).join(', ')}</span>
                <span style={{fontSize:'0.7rem', color:'#9ca3af', marginLeft:'4px'}}>· Localisation approximative</span>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent([ad.district, ad.province, 'Rwanda'].filter(Boolean).join(', '))}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{color:'#15803D', fontWeight:600, textDecoration:'none', marginLeft:'auto', fontSize:'0.75rem'}}
                >
                  Ouvrir dans Maps →
                </a>
              </p>
            </div>
          )}

          {/* Détails */}
          <div className="details-card" style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #E8E0D4'}}>
            <h2 style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'14px', color:'#111827', textTransform:'uppercase', letterSpacing:'0.04em'}}>Détails</h2>
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
                <div key={i} className={`detail-item ${isLongDetail ? 'detail-item-long' : ''}`} style={{background:'#FAF7EF', borderRadius:'9px', padding:'11px 13px', border:'1px solid #E8E0D4'}}>
                  <div className="detail-label" style={{fontSize:'0.7rem', color:'#6F6B63', fontWeight:600, marginBottom:'3px', textTransform:'uppercase'}}>{item.icon} {item.label}</div>
                  <div className="detail-value" style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#111827'}}>{valueText}</div>
                </div>
                )
              })}
            </div>
          </div>

          <div className="mobile-similar-section">
            <h2 style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:800, fontSize:'0.98rem', color:'#111827', marginBottom:'8px'}}>
              Annonces similaires
            </h2>
            <p style={{fontFamily:'Inter, system-ui, sans-serif', fontSize:'0.82rem', color:'#6F6B63', lineHeight:1.55, margin:0}}>
              Annonces similaires bientôt disponibles.
            </p>
          </div>
          {/* Mobile - signaler */}
          <div className="mobile-report-block" style={{padding: '0 20px', marginBottom: '4px'}}>
            <ReportButton adId={ad.id} userId={user?.id} />
          </div>

          {/* Mobile - conseils securite */}
          <div
            className="safety-card mobile-safety"
            style={{
              margin: '0 20px 24px',
              padding: '14px',
              background: '#FFFCF7',
              borderRadius: '16px',
              border: '1px solid #E8E0D4'
            }}
          >
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '8px'
            }}>{'Conseils de s\u00e9curit\u00e9'}</h3>
            {[
              "Ne payez jamais \u00e0 l'avance sans voir l'article",
              'Rencontrez le vendeur dans un lieu public',
              "V\u00e9rifiez l'article avant tout paiement"
            ].map((tip, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '5px',
                fontSize: '13px',
                color: '#6F6B63'
              }}>
                <span style={{
                  color: '#15803D',
                  fontWeight: 700,
                  flexShrink: 0
                }}>{'\u2713'}</span>
                {tip}
              </div>
            ))}
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="detail-right" style={{position:'sticky', top:'78px'}}>

          {/* ✅ Profil vendeur */}
          {seller && (
            <Link href={`/u/${seller.username || seller.id}`} style={{textDecoration:'none'}}>
            <div
              className="desktop-seller-card"
              style={{background:'white', borderRadius:'14px', padding:'16px 20px', border:'1px solid #E8E0D4', marginBottom:'12px', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', transition:'box-shadow 0.15s'}}
              onMouseEnter={e => (e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow='none')}
            >
              <div style={{width:'48px', height:'48px', borderRadius:'50%', background:'#15803D', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, system-ui, sans-serif', fontWeight:800, fontSize:'1.2rem', color:'white', flexShrink:0}}>
                {(seller.full_name || seller.username || 'V')[0].toUpperCase()}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.9rem', color:'#111827', display:'flex', alignItems:'center', gap:'5px'}}>
                  {seller.full_name || '@' + seller.username}
                  {seller.is_verified && <span style={{fontSize:'0.75rem'}}>✅</span>}
                </div>
                {seller.username && (
                  <div style={{fontSize:'0.75rem', color:'#15803D', fontWeight:600}}>@{seller.username}</div>
                )}
                <div style={{fontSize:'0.72rem', color:'#6F6B63', marginTop:'2px'}}>
                  Membre depuis {new Date(seller.created_at).toLocaleDateString('fr-FR', {month:'long', year:'numeric'})}
                </div>
              </div>
              <span style={{color:'#15803D', fontWeight:700, fontSize:'0.85rem', flexShrink:0}}>→</span>
            </div>
            </Link>
          )}

          {/* Contact vendeur */}
          <div className="contact-card" style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #E8E0D4', marginBottom:'12px'}}>
            <h2 style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'16px', color:'#111827', textTransform:'uppercase', letterSpacing:'0.04em'}}>Contacter le vendeur</h2>

            {ad.hide_phone && (
              <div style={{background:'#FAF7EF', borderRadius:'9px', padding:'12px', border:'1px solid #E8E0D4', marginBottom:'10px', textAlign:'center'}}>
                <div style={{fontSize:'1.5rem', marginBottom:'6px'}}>🔒</div>
                <p style={{fontSize:'0.82rem', color:'#6F6B63', fontFamily:'Inter, system-ui, sans-serif'}}>Ce vendeur prefere etre contacte via la messagerie SokoDeal</p>
              </div>
            )}
            <textarea
              value={message}
              onChange={e => { setMessage(e.target.value); setMessageTouched(true) }}
              onFocus={() => setMessageTouched(true)}
              rows={4}
              style={{width:'100%', padding:'11px 13px', border:'1px solid #E8E0D4', borderRadius:'9px', fontFamily:'Inter, system-ui, sans-serif', fontSize:'0.88rem', outline:'none', resize:'vertical', background:'#FFFCF7', marginBottom:'10px', boxSizing:'border-box', color: messageTouched ? '#111827' : '#9ca3af', cursor:'text'}}
            />
            <button onClick={handleContact} disabled={sending || !message.trim()} style={{
              width:'100%', padding:'12px',
              background: sending || !message.trim() ? '#E8E0D4' : '#15803D',
              border:'none', borderRadius:'9px', fontFamily:'Inter, system-ui, sans-serif', fontWeight:700,
              fontSize:'0.9rem', color: sending || !message.trim() ? '#6F6B63' : 'white',
              cursor: sending || !message.trim() ? 'not-allowed' : 'pointer', marginBottom:'8px'
            }}>
              {sending ? 'Envoi...' : '💬 Envoyer le message'}
            </button>
            {!user && (
              <p style={{fontSize:'0.75rem', color:'#6F6B63', textAlign:'center', marginBottom:'8px'}}>
                <a href="/auth?mode=login" onClick={() => {
                  sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
                    url: window.location.pathname,
                    state: { message }
                  }))
                }} style={{color:'#15803D', fontWeight:700}}>Connectez-vous</a> pour envoyer un message
              </p>
            )}
            {!ad.hide_phone && ad.phone && (
              user ? (
                <a href={'tel:' + ad.phone} style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'11px', background:'#FAF7EF', borderRadius:'9px', fontFamily:'Inter, system-ui, sans-serif', fontWeight:600, fontSize:'0.88rem', color:'#111827', textDecoration:'none', marginTop:'8px', boxSizing:'border-box', border:'1px solid #E8E0D4'}}>
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
                  style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'11px', background:'#FAF7EF', borderRadius:'9px', fontFamily:'Inter, system-ui, sans-serif', fontWeight:600, fontSize:'0.88rem', color:'#111827', border:'1px solid #E8E0D4', cursor:'pointer', marginTop:'8px', boxSizing:'border-box'}}
                >
                  📞 Téléphone
                </button>
              )
            )}
            {!ad.hide_phone && (ad.whatsapp || ad.phone) && (
              user ? (
                <a href={'https://wa.me/' + waPhone + '?text=' + waText} target="_blank" rel="noopener noreferrer"
                  style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'11px', background:'#25D366', borderRadius:'9px', fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.88rem', color:'white', textDecoration:'none', marginTop:'8px', boxSizing:'border-box'}}>
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
                  style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', width:'100%', padding:'11px', background:'#25D366', borderRadius:'9px', fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.88rem', color:'white', border:'none', cursor:'pointer', marginTop:'8px', boxSizing:'border-box', opacity:0.7}}
                >
                  💬 WhatsApp
                </button>
              )
            )}
          </div>

          <div className="desktop-report-block">
            <ReportButton adId={ad.id} userId={user?.id} />
          </div>

          <div className="safety-card desktop-safety" style={{background:'#fffbeb', borderRadius:'12px', padding:'14px', border:'1px solid #fde68a'}}>
            <h3 style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:700, fontSize:'0.82rem', marginBottom:'8px', color:'#78350f', textTransform:'uppercase', letterSpacing:'0.04em'}}>
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

      <div className="mobile-action-bar" style={{gridTemplateColumns: canUseWhatsApp && canUsePhone ? 'auto 1fr 44px 44px' : (canUseWhatsApp || canUsePhone) ? 'auto 1fr 44px' : 'auto 1fr'}}>
        <div className="mobile-favorite-action">
          <FavoriteButton adId={ad.id} size="sm" onLogin={() => {
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
          💬 Message
        </button>
        {canUseWhatsApp && (
          user ? (
            <a
              href={'https://wa.me/' + waPhone + '?text=' + waText}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width:'44px', height:'44px',
                borderRadius:'50%',
                background:'#25D366',
                display:'flex', alignItems:'center',
                justifyContent:'center',
                flexShrink: 0,
                textDecoration: 'none'
              }}
              aria-label="WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.535 5.943L.057 23.93l6.184-1.622A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.889 9.889 0 01-5.031-1.378l-.360-.214-3.733.979.996-3.648-.235-.374A9.861 9.861 0 012.106 12C2.106 6.54 6.54 2.106 12 2.106S21.894 6.54 21.894 12 16.46 21.894 12 21.894z"/>
              </svg>
            </a>
          ) : (
            <button
              type="button"
              onClick={redirectToLoginWithMessage}
              style={{
                width:'44px', height:'44px',
                borderRadius:'50%',
                background:'#25D366',
                border:'none', cursor:'pointer',
                display:'flex', alignItems:'center',
                justifyContent:'center',
                flexShrink: 0
              }}
              aria-label="WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.535 5.943L.057 23.93l6.184-1.622A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.889 9.889 0 01-5.031-1.378l-.360-.214-3.733.979.996-3.648-.235-.374A9.861 9.861 0 012.106 12C2.106 6.54 6.54 2.106 12 2.106S21.894 6.54 21.894 12 16.46 21.894 12 21.894z"/>
              </svg>
            </button>
          )
        )}
        {canUsePhone && (
          user ? (
            <a
              href={'tel:' + ad.phone}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '1px solid #E8E0D4',
                background: '#FFFCF7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                textDecoration: 'none',
                fontSize: '20px'
              }}
              aria-label={'T\u00e9l\u00e9phone'}
            >
              {'\u{1F4DE}'}
            </a>
          ) : (
            <button
              type="button"
              onClick={redirectToLoginWithMessage}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '1px solid #E8E0D4',
                background: '#FFFCF7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
                fontSize: '20px'
              }}
              aria-label={'T\u00e9l\u00e9phone'}
            >
              {'\u{1F4DE}'}
            </button>
          )
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
              <div style={{fontFamily:'Inter, system-ui, sans-serif', fontWeight:800, fontSize:'1rem', color:'#111827', marginBottom:'3px'}}>
                Envoyer un message
              </div>
              <div style={{fontFamily:'Inter, system-ui, sans-serif', fontSize:'0.78rem', color:'#6F6B63'}}>
                Modifiez le texte avant l’envoi.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMessageComposer(false)}
              style={{width:'34px', height:'34px', borderRadius:'50%', border:'1px solid #e8e4de', background:'#FAF7EF', color:'#111827', fontWeight:800, cursor:'pointer'}}
            >
              ×
            </button>
          </div>
          <textarea
            value={message}
            onChange={e => { setMessage(e.target.value); setMessageTouched(true) }}
            rows={4}
            style={{width:'100%', padding:'12px 13px', border:'1px solid #e8e4de', borderRadius:'14px', fontFamily:'Inter, system-ui, sans-serif', fontSize:'0.92rem', outline:'none', resize:'vertical', background:'#faf9f7', marginBottom:'12px', boxSizing:'border-box', color:'#111827'}}
          />
          <button
            onClick={async () => {
              await handleContact()
              if (user) setShowMessageComposer(false)
            }}
            disabled={sending || !message.trim()}
            style={{width:'100%', height:'46px', borderRadius:'14px', border:'none', background: sending || !message.trim() ? '#dce5dd' : '#15803D', color: sending || !message.trim() ? '#6F6B63' : 'white', fontFamily:'Inter, system-ui, sans-serif', fontWeight:800, fontSize:'0.9rem', cursor: sending || !message.trim() ? 'not-allowed' : 'pointer'}}
          >
            {sending ? 'Envoi...' : 'Envoyer le message'}
          </button>
        </div>
      </div>

    </div>
  )
}
