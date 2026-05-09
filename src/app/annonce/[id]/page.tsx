'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import Header from '@/components/Header'
import { getApproxCoords } from '@/lib/locations'
import { extractIdFromSlug, generateSlug, isFullUUID } from '@/lib/slug'

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
  const [message, setMessage] = useState('Bonjour, je suis interesse par cette annonce.')
  const [messageTouched, setMessageTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [shared, setShared] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

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

  return (
    <div style={{minHeight:'100vh', background:'#f5f7f5'}}>
      <style>{`
        @media (max-width: 768px) {
          .detail-layout { grid-template-columns: 1fr !important; }
          .detail-right { position: static !important; }
          .detail-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <Header />

      <div style={{background:'white', borderBottom:'1px solid #f0f4f1', padding:'10px 5%'}}>
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
        <div>
          {/* Photos */}
          <div style={{background:'white', borderRadius:'14px', overflow:'hidden', border:'1px solid #e8ede9', marginBottom:'16px'}}>
            <div style={{height:'300px', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'5rem', position:'relative', overflow:'hidden'}}>
              {hasPhotos ? (
                <img src={ad.images[activePhoto]} alt={ad.title} style={{width:'100%', height:'100%', objectFit:'cover'}} />
              ) : (
                <span style={{opacity:0.4}}>{catEmoji[ad.category] || '📦'}</span>
              )}
              <div style={{position:'absolute', top:'12px', left:'12px', background:'white', color:'#111a14', padding:'4px 10px', borderRadius:'7px', fontSize:'0.75rem', fontWeight:600, border:'1px solid #e8ede9'}}>
                {catEmoji[ad.category]} {catLabel[ad.category] || ad.category}
              </div>
            </div>
            {hasPhotos && ad.images.length > 1 && (
              <div style={{display:'flex', gap:'6px', padding:'10px 14px', overflowX:'auto'}}>
                {ad.images.map((img: string, i: number) => (
                  <div key={i} onClick={() => setActivePhoto(i)} style={{width:'60px', height:'60px', flexShrink:0, borderRadius:'8px', overflow:'hidden', cursor:'pointer', border: activePhoto === i ? '2px solid #1a7a4a' : '2px solid transparent', opacity: activePhoto === i ? 1 : 0.6}}>
                    <img src={img} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Titre + Prix + Partage */}
          <div style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'16px'}}>
            <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.3rem', marginBottom:'12px', lineHeight:1.3, color:'#111a14'}}>
              {ad.title}
            </h1>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px'}}>
              <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.7rem', color:'#0f5233'}}>
                {Number(ad.price).toLocaleString()} <span style={{fontSize:'0.9rem', fontWeight:600, color:'#6b7c6e'}}>RWF</span>
              </div>
              <div style={{display:'flex', gap:'6px', flexWrap:'wrap', alignItems:'center'}}>
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
            <div style={{marginTop:'14px', position:'relative', display:'inline-block'}} onClick={e => e.stopPropagation()}>
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

          {/* Description */}
          {ad.description && (
            <div style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'16px'}}>
              <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'12px', color:'#111a14', textTransform:'uppercase', letterSpacing:'0.04em'}}>Description</h2>
              <p style={{color:'#333', lineHeight:1.8, fontSize:'0.92rem', whiteSpace:'pre-wrap'}}>{ad.description}</p>
            </div>
          )}

          {/* ✅ Map OpenStreetMap */}
          {(ad.province || ad.district) && (
            <div style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'16px'}}>
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
          <div style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9'}}>
            <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'14px', color:'#111a14', textTransform:'uppercase', letterSpacing:'0.04em'}}>Details</h2>
            <div className="detail-grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
              {[
                { label:'Categorie', value: catLabel[ad.category] || ad.category, icon:'🏷️' },
                { label:'Prix', value: Number(ad.price).toLocaleString() + ' RWF', icon:'💰' },
                { label:'Ville', value: ad.province || '-', icon:'🗺️' },
                { label:'District', value: ad.district || '-', icon:'📍' },
                { label:'Publie le', value: new Date(ad.created_at).toLocaleDateString('fr-FR'), icon:'📅' },
                { label:'Statut', value: ad.is_active ? 'Active' : 'Inactive', icon:'🔘' },
                ...(ad.immo_type ? [{ label:'Type', value: ad.immo_type, icon:'🏡' }] : []),
                ...(ad.surface ? [{ label:'Surface habitable', value: ad.surface + ' m²', icon:'📐' }] : []),
                ...(ad.surface_terrain ? [{ label:'Surface terrain', value: ad.surface_terrain + ' m²', icon:'🌿' }] : []),
                ...(ad.chambres ? [{ label:'Chambres', value: ad.chambres, icon:'🛏️' }] : []),
                ...(ad.salles_de_bain ? [{ label:'Salles de bain', value: ad.salles_de_bain, icon:'🚿' }] : []),
                ...(ad.etage ? [{ label:'Etage', value: ad.etage, icon:'🏢' }] : []),
                ...(ad.etat ? [{ label:'Etat', value: ad.etat === 'neuf' ? 'Neuf' : ad.etat === 'bon-etat' ? 'Bon etat' : 'A renover', icon:'✨' }] : []),
                ...(ad.meuble ? [{ label:'Meuble', value: 'Oui', icon:'🛋️' }] : []),
                ...(ad.charges_incluses ? [{ label:'Charges', value: 'Incluses', icon:'💡' }] : []),
              ].map((item, i) => (
                <div key={i} style={{background:'#f5f7f5', borderRadius:'9px', padding:'11px 13px', border:'1px solid #e8ede9'}}>
                  <div style={{fontSize:'0.7rem', color:'#6b7c6e', fontWeight:600, marginBottom:'3px', textTransform:'uppercase'}}>{item.icon} {item.label}</div>
                  <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#111a14'}}>{String(item.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="detail-right" style={{position:'sticky', top:'78px'}}>

          {/* ✅ Profil vendeur */}
          {seller && (
            <Link href={`/u/${seller.username || seller.id}`} style={{textDecoration:'none'}}>
            <div
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
          <div style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'12px'}}>
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

          <div style={{background:'#fffbeb', borderRadius:'12px', padding:'14px', border:'1px solid #fde68a'}}>
            <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', marginBottom:'8px', color:'#78350f', textTransform:'uppercase', letterSpacing:'0.04em'}}>
              Conseils de securite
            </h3>
            {[
              'Ne payez jamais a l avance sans voir l article',
              'Rencontrez le vendeur dans un lieu public',
              'Verifiez l article avant tout paiement'
            ].map((tip, i) => (
              <div key={i} style={{display:'flex', gap:'6px', marginBottom:'5px', fontSize:'0.75rem', color:'#78350f'}}>
                <span style={{fontWeight:700, flexShrink:0}}>✓</span> {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
