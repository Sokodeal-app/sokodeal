'use client'
import { Fragment, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { supabasePublic } from '@/lib/supabase-public'
import { useAuth } from '@/components/AuthProvider'
import FavoriteButton from '@/components/FavoriteButton'
import { ListingCard } from '@/components/listings'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { SUBCATEGORIES } from '@/lib/categories'
import { FEATURE_FLAGS } from '@/lib/feature-flags'
import { getApproxCoords } from '@/lib/locations'
import { LAUNCH_CITIES, LAUNCH_MAIN_CATEGORIES, LAUNCH_SUBCATEGORIES, matchesCategoryGroup } from '@/lib/market-config'
import { generateSlug } from '@/lib/slug'
import { formatPrice, formatRelativeTime } from '@/lib/format'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export default function Home() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('main')
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoadedAds, setHasLoadedAds] = useState(false)
  const { user } = useAuth()
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [localHistory, setLocalHistory] = useState<string[]>([])
  const [filterCat, setFilterCat] = useState('')
  const [filterSubcat, setFilterSubcat] = useState('')
  const [filterVille, setFilterVille] = useState('')
  const [filterPriceMin, setFilterPriceMin] = useState('')
  const [filterPriceMax, setFilterPriceMax] = useState('')
  const [filterChambres, setFilterChambres] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [showFilters, setShowFilters] = useState(false)
  const [toast, setToast] = useState<any>(null)
  const [profileResults, setProfileResults] = useState<any[]>([])
  const [searchingProfiles, setSearchingProfiles] = useState(false)
  const [searchSaved, setSearchSaved] = useState(false)
  const [selectedImmoAd, setSelectedImmoAd] = useState<any>(null)
  const [showMap, setShowMap] = useState(false) // mobile map toggle
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const adsLengthRef = useRef(0)
  const hasLoadedAdsRef = useRef(false)
  const { unreadCount } = useUnreadCount()
  const favorites: string[] = []

  const isImmoMode = filterCat === 'immo' || filterCat === 'immo-vente' || filterCat === 'immo-location' || filterCat === 'immo-terrain'

  const villes = LAUNCH_CITIES

  const catEmoji: any = {
    'immo-vente':'🏡','immo-location':'🏢','immo-terrain':'🌿',
    'voiture':'🚗','moto':'🛵','electronique':'📱','mode':'👗',
    'maison':'🛋️','emploi':'💼','animaux':'🐄','services':'🏗️',
    'agriculture':'🌾','materiaux':'🧱','sante':'💊','sport':'⚽','education':'📚'
  }

  const catLabel: any = {
    'immo-vente':'Vente','immo-location':'Location','immo-terrain':'Terrain',
  }

  const subcats = LAUNCH_SUBCATEGORIES[filterCat] || SUBCATEGORIES[filterCat] || []

  const handleNavCat = (cat: string) => {
    setFilterCat(cat)
    setFilterSubcat('')
    setFilterChambres('')
    setFilterType('')
    setFilterVille('')
    setFilterPriceMin('')
    setFilterPriceMax('')
    setSortBy('recent')
    setSearch('')
    setActiveSection('main')
    setSelectedImmoAd(null)
  }

  const fetchAds = useCallback(async () => {
    try {
      const { data, error } = await supabasePublic
        .from('ads')
        .select('id, title, price, images, province, district, category, subcategory, created_at, is_active, is_sold, is_boosted, sold_at, deleted_at, surface, chambres, salles_de_bain, immo_type, user_id, latitude, longitude')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('FETCH ADS ERROR', JSON.stringify(error))
        return
      }

      if (data) {
        if (!FEATURE_FLAGS.boostedListings) {
          const regularAds = data.map(ad => ({
            ...ad,
            is_boosted: false,
            _coords: getApproxCoords(ad.province, ad.district, ad.id),
          }))
          setAds(regularAds)
          return
        }
        const now = new Date().toISOString()
        const { data: boosts } = await supabase.from('boosts').select('ad_id').eq('is_active', true).gt('ends_at', now)
        const boostedIds = new Set((boosts || []).map((b: any) => b.ad_id))
        const adsWithBoost = data.map(ad => ({
          ...ad,
          is_boosted: boostedIds.has(ad.id),
          _coords: getApproxCoords(ad.province, ad.district, ad.id),
        }))
        const sorted = [...adsWithBoost.filter(a => a.is_boosted), ...adsWithBoost.filter(a => !a.is_boosted)]
        setAds(sorted)
      }
    } catch (err) {
      console.error('FETCH ADS CATCH', err)
    } finally {
      setHasLoadedAds(true)
      setLoading(false)
    }
  }, [])

  // ── Chargement des annonces ──
  useEffect(() => {
    fetchAds()

    const stored = localStorage.getItem('sokodeal:search-history')
    if (stored) {
      try { setLocalHistory(JSON.parse(stored).slice(0, 10)) } catch {}
    }
  }, [fetchAds])

  useEffect(() => {
    let cancelled = false

    const loadAdminFlag = async () => {
      if (!user) {
        setIsUserAdmin(false)
        return
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      if (error) {
        console.error('HOME is_admin error', error)
        setIsUserAdmin(false)
        return
      }

      setIsUserAdmin(!!userData?.is_admin)
    }

    loadAdminFlag()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    adsLengthRef.current = ads.length
  }, [ads.length])

  useEffect(() => {
    hasLoadedAdsRef.current = hasLoadedAds
  }, [hasLoadedAds])

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || !hasLoadedAdsRef.current || adsLengthRef.current === 0) {
        fetchAds()
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [fetchAds])

  const filteredAds = useMemo(() => {
    let result = [...ads]

    if (search.trim() && !search.startsWith('@')) {
      const q = search.toLowerCase()
      result = result.filter(ad =>
        ad.title?.toLowerCase().includes(q) ||
        ad.description?.toLowerCase().includes(q) ||
        ad.category?.toLowerCase().includes(q)
      )
    }

    if (filterCat) {
      result = result.filter(ad =>
        filterSubcat
          ? ad.category === filterSubcat
          : matchesCategoryGroup(filterCat, ad.category)
      )
    }

    if (filterVille) result = result.filter(ad => ad.province?.toLowerCase().includes(filterVille.toLowerCase()))
    if (filterPriceMin) result = result.filter(ad => ad.price >= parseInt(filterPriceMin))
    if (filterPriceMax) result = result.filter(ad => ad.price <= parseInt(filterPriceMax))
    if (filterChambres) result = result.filter(ad => ad.chambres === filterChambres)
    if (filterType) result = result.filter(ad => ad.immo_type === filterType)

    if (sortBy === 'recent') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sortBy === 'ancien') result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    else if (sortBy === 'moins-cher') result.sort((a, b) => a.price - b.price)
    else if (sortBy === 'plus-cher') result.sort((a, b) => b.price - a.price)

    return result
  }, [ads, search, filterCat, filterSubcat, filterVille, filterPriceMin, filterPriceMax, filterChambres, filterType, sortBy])

  // ── Notifications ──
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('notifs-' + user.id.slice(0, 8))
    ch.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: 'receiver_id=eq.' + user.id
    }, () => {
      setToast({ text: 'Nouveau message reçu !', icon: '💬' })
      setTimeout(() => setToast(null), 4000)
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user])

  // ── Initialisation Mapbox ──
  useEffect(() => {
    if (!isImmoMode || !mapRef.current || mapInstanceRef.current) return
    if (!MAPBOX_TOKEN) return
    const isMobileMapPanel = window.matchMedia('(max-width: 900px)').matches
    if (isMobileMapPanel && !showMap) return

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      mapboxgl.accessToken = MAPBOX_TOKEN!

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [30.0619, -1.9441], // Kigali
        zoom: 12,
      })

      map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      mapInstanceRef.current = map

      map.on('load', () => {
        requestAnimationFrame(() => map.resize())
        setTimeout(() => map.resize(), 300)
        setMapReady(true)
      })
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        setMapReady(false)
      }
    }
  }, [isImmoMode, showMap])

  useEffect(() => {
    if (!isImmoMode || !showMap || !mapInstanceRef.current) return

    setTimeout(() => {
      mapInstanceRef.current?.resize()
    }, 100)

    setTimeout(() => {
      mapInstanceRef.current?.resize()
    }, 300)
  }, [isImmoMode, showMap])

  // ── Mise à jour des pins sur la map ──
  useEffect(() => {
    if (!isImmoMode || !mapReady || !mapInstanceRef.current) return

    // Supprimer les anciens markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const updateMarkers = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      // Filtrer les annonces immo
      const immoAds = filteredAds.filter(ad =>
        ['immo-vente', 'immo-location', 'immo-terrain'].includes(ad.category)
      )

      // Créer les nouveaux markers
      immoAds.forEach(ad => {
        const coords = ad._coords
        if (!coords) return

        const el = document.createElement('div')
        el.textContent = formatPrice(ad.price)
        el.style.background = selectedImmoAd?.id === ad.id ? '#0f5233' : '#1a7a4a'
        el.style.color = 'white'
        el.style.padding = '5px 10px'
        el.style.borderRadius = '20px'
        el.style.fontFamily = "'DM Sans', sans-serif"
        el.style.fontWeight = '800'
        el.style.fontSize = '11px'
        el.style.whiteSpace = 'nowrap'
        el.style.cursor = 'pointer'
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
        el.style.border = '2px solid white'
        el.style.lineHeight = '1.4'
        el.style.fontVariantNumeric = 'lining-nums tabular-nums'
        el.style.fontFeatureSettings = '"lnum" 1, "tnum" 1, "onum" 0'
        el.addEventListener('click', () => setSelectedImmoAd(ad))

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
        })
          .setLngLat([coords.lng, coords.lat])
          .addTo(mapInstanceRef.current)

        markersRef.current.push(marker)
      })
    }

    updateMarkers()
  }, [filteredAds, isImmoMode, selectedImmoAd?.id, mapReady])

  // ── Filtrage ──
  const saveToHistory = async (q: string, cat: string, ville: string) => {
    if (!user || (!q && !cat && !ville)) return
    await supabase.from('search_history').insert([{ user_id: user.id, query: q || null, category: cat || null, province: ville || null }])
  }

  const handleSaveSearch = async () => {
    if (!user) {
      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
        url: window.location.pathname,
        state: {}
      }))
      window.location.href = '/auth?mode=login'
      return
    }
    if (!search && !filterCat && !filterVille && !filterPriceMin && !filterPriceMax) return
    const { error } = await supabase.from('saved_searches').insert([{
      user_id: user.id, query: search || null, category: filterCat || null,
      province: filterVille || null,
      price_min: filterPriceMin ? parseInt(filterPriceMin) : null,
      price_max: filterPriceMax ? parseInt(filterPriceMax) : null,
      alert_enabled: true,
    }])
    if (!error) {
      setSearchSaved(true)
      setToast({ text: 'Alerte créée !', icon: '🔔', href: '/profil?tab=alertes' })
      setTimeout(() => { setSearchSaved(false); setToast(null) }, 3000)
    }
  }

  useEffect(() => {
    if (search.startsWith('@')) {
      const q = search.slice(1).toLowerCase()
      if (q.length >= 1) {
        setSearchingProfiles(true)
        supabase.from('users').select('*').ilike('username', q + '%').limit(5).then(({ data }) => {
          setProfileResults(data || [])
          setSearchingProfiles(false)
        })
      } else { setProfileResults([]) }
      return
    }

    setProfileResults([])
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      const cleanSearch = search.trim()

      if (cleanSearch && cleanSearch.length > 2) {
        try {
          const stored = localStorage.getItem('sokodeal:search-history')
          const existing: string[] = stored ? JSON.parse(stored) : []
          const updated = [cleanSearch, ...existing.filter(s => s !== cleanSearch)].slice(0, 10)
          localStorage.setItem('sokodeal:search-history', JSON.stringify(updated))
          setLocalHistory(updated)
        } catch {}
      }

      if (cleanSearch || filterCat || filterVille) saveToHistory(cleanSearch, filterCat, filterVille)
    }, 1500)
    return () => clearTimeout(timer)
  }, [search, filterCat, filterVille])

  const resetFilters = () => {
    setSearch(''); setFilterCat(''); setFilterSubcat(''); setFilterVille('')
    setFilterPriceMin(''); setFilterPriceMax(''); setSortBy('recent')
    setFilterChambres(''); setFilterType('')
    setActiveSection('main')
    setProfileResults([])
    setSelectedImmoAd(null)
  }

  const hasFilters = search || filterCat || filterVille || filterPriceMin || filterPriceMax || sortBy !== 'recent'

  const displayAds = ads.length > 0 ? filteredAds : []
  const immoAds = displayAds.filter(ad => ['immo-vente','immo-location','immo-terrain'].includes(ad.category))
  const cardSkeletons = Array.from({ length: 8 })

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { line-height: 1.4; }
        html, body { overflow-x: hidden; max-width: 100vw; background: #faf9f7; }
        @media (max-width: 768px) {
          .hero-title { font-size: 2rem !important; line-height: 1.02 !important; }
          .hero-section { grid-template-columns: 1fr !important; padding: 24px 5.5% !important; min-height: 360px !important; }
          .hero-cta { width: 100% !important; justify-content: center !important; }
          .hero-premium { background-position: center right !important; }
          .hero-premium-gradient {
            background: linear-gradient(
              90deg,
              #faf9f7 0%,
              rgba(250,249,247,0.98) 35%,
              rgba(250,249,247,0.82) 65%,
              rgba(250,249,247,0.45) 100%
            ) !important;
          }
          .ads-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .btn-signup { display: none !important; }
          .header-inner { padding: 0 3.5% !important; height: 56px !important; gap: 6px !important; }
          .header-logo-mark { width: 30px !important; height: 30px !important; font-size: 15px !important; border-radius: 8px !important; }
          .header-logo-name { font-size: 1.05rem !important; }
          .login-btn { padding: 7px 10px !important; font-size: 0.78rem !important; }
          .deposer-btn { padding: 7px 9px !important; font-size: 0.72rem !important; border-radius: 10px !important; }
          .deposer-text { display: inline !important; }
          .mon-compte-label { display: none !important; }
          .search-bar { display: none !important; }
          .mobile-top-search { display: block !important; }
          .main-cat-nav { justify-content: flex-start !important; gap: 8px !important; padding: 8px 5% 10px !important; scroll-padding-left: 5%; }
          .main-cat-nav .nav-cat { background: white !important; border: 1px solid #e8e4de !important; border-radius: 999px !important; padding: 8px 13px !important; font-size: 0.8rem !important; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
          .main-cat-nav .cat-separator { display: none !important; }
          .save-search-btn { display: none !important; }
          .home-results-wrap { margin-top: 20px !important; }
          .home-filter-card { padding: 10px 12px !important; margin-bottom: 18px !important; }
          .home-filter-card > div:first-child { align-items: center !important; }
          .home-count { font-size: 0.74rem !important; }
          .ad-card-media {
            height: 150px !important;
            position: relative !important;
            overflow: hidden !important;
          }
          .ad-card-body { padding: 10px !important; }
          .ad-card-category { font-size: 0.6rem !important; margin-bottom: 4px !important; }
          .ad-view-button { display: none !important; }
        }
        @media (max-width: 900px) {
          .immo-layout { grid-template-columns: 1fr !important; }
          .immo-map-panel { display: none !important; position: static !important; }
          .immo-map-panel.show { display: flex !important; flex-direction: column; }
          .immo-list-panel.hide { display: none !important; }
          .map-toggle-btn { display: block !important; }
          .cat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 500px) {
          .cat-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) { .hero-cards { display: none !important; } }
        .ad-card { transition: transform 0.18s, box-shadow 0.18s; }
        .ad-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.10) !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .profile-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
        .profile-card { transition: box-shadow 0.18s, transform 0.18s; }
        .nav-cat { transition: all 0.15s; }
        .nav-cat:hover { color: #1a7a4a !important; }
        .immo-card:hover { border-color: #1a7a4a !important; }
        .immo-card { transition: border-color 0.15s, box-shadow 0.15s; }
      `}</style>

      {toast && (
        <div style={{position:'fixed', bottom:'20px', right:'20px', zIndex:9999, background:'#0f5233', color:'white', padding:'12px 18px', borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,0.18)', display:'flex', alignItems:'center', gap:'10px', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', animation:'fadeUp 0.3s ease', maxWidth:'260px'}}>
          <span style={{fontSize:'1.2rem'}}>{toast.icon}</span>
          <div>
            <div style={{fontWeight:700, marginBottom:'4px'}}>{toast.text}</div>
            <button onClick={() => window.location.href=toast.href || '/messages'} style={{background:'#1a7a4a', border:'none', borderRadius:'6px', padding:'3px 10px', fontSize:'0.75rem', fontWeight:700, color:'white', cursor:'pointer'}}>Voir</button>
          </div>
          <button onClick={() => setToast(null)} style={{background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'1rem', padding:'0 4px'}}>×</button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={{background:'#faf9f7', position:'sticky', top:0, zIndex:100, borderBottom:'1px solid #e8e4de', paddingTop:'env(safe-area-inset-top)'}}>
        <div className="header-inner" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 5%', height:'62px', gap:'14px', maxWidth:'1300px', margin:'0 auto'}}>
          <a href="/" style={{display:'flex', alignItems:'center', gap:'8px', textDecoration:'none', flexShrink:0}}>
            <div className="header-logo-mark" style={{width:'34px', height:'34px', background:'#1a7a4a', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'17px', color:'white'}}>S</div>
            <span className="header-logo-name" style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.25rem', color:'#111a14'}}>Soko<span style={{color:'#1a7a4a'}}>Deal</span></span>
          </a>

          <div className="search-bar" style={{flex:1, maxWidth:'480px', position:'relative'}}>
            <div style={{display:'flex', background:'white', borderRadius:'9px', overflow:'hidden', border:'1px solid #e8e4de'}}>
              <input type="text" placeholder="Rechercher... ou @username" value={search}
                onChange={e => { setSearch(e.target.value); setActiveSection('main') }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                style={{flex:1, padding:'9px 14px', border:'none', outline:'none', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', background:'transparent', color:'#111a14'}}
              />
              <button style={{background:'#1a7a4a', border:'none', cursor:'pointer', padding:'9px 16px', fontSize:'1rem', color:'white'}}>🔍</button>
            </div>
            {showSuggestions && localHistory.length > 0 && !search && (
              <div style={{position:'absolute', top:'44px', left:0, right:0, background:'white', borderRadius:'12px', border:'1px solid #e8e4de', boxShadow:'0 8px 24px rgba(0,0,0,0.10)', zIndex:500, overflow:'hidden'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderBottom:'1px solid #e8e4de'}}>
                  <span style={{fontSize:'0.72rem', fontWeight:700, color:'#6b7c6e', textTransform:'uppercase'}}>Recherches récentes</span>
                  <button
                    onMouseDown={() => {
                      localStorage.removeItem('sokodeal:search-history')
                      setLocalHistory([])
                      setShowSuggestions(false)
                    }}
                    style={{fontSize:'0.72rem', color:'#c0392b', background:'none', border:'none', cursor:'pointer', fontWeight:600}}
                  >
                    Tout effacer
                  </button>
                </div>
                {localHistory.map((item, i) => (
                  <div key={`${item}-${i}`} style={{display:'flex', alignItems:'center', padding:'10px 14px', borderBottom: i < localHistory.length - 1 ? '1px solid #e8e4de' : 'none'}}>
                    <span style={{fontSize:'0.85rem', marginRight:'8px'}}>🕐</span>
                    <span
                      onMouseDown={() => { setSearch(item); setShowSuggestions(false); setActiveSection('main') }}
                      style={{flex:1, fontSize:'0.85rem', color:'#111a14', cursor:'pointer', fontFamily:'DM Sans,sans-serif'}}
                    >
                      {item}
                    </span>
                    <button
                      onMouseDown={() => {
                        const updated = localHistory.filter((_, j) => j !== i)
                        setLocalHistory(updated)
                        localStorage.setItem('sokodeal:search-history', JSON.stringify(updated))
                      }}
                      style={{background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:'1rem', padding:'0 4px'}}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{display:'flex', alignItems:'center', gap:'8px', flexShrink:0}}>
            {user ? (
              <>
                <button onClick={() => router.push('/messages')} style={{position:'relative', width:'38px', height:'38px', background:'white', border:'1px solid #e8e4de', borderRadius:'9px', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  💬
                  {unreadCount > 0 && (
                    <div style={{position:'absolute', top:'-4px', right:'-4px', width:'16px', height:'16px', background:'#e74c3c', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.58rem', fontWeight:800, color:'white'}}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </button>
                <button onClick={() => router.push('/profil')} style={{display:'flex', alignItems:'center', gap:'7px', padding:'7px 14px', background:'white', border:'1px solid #e8e4de', borderRadius:'9px', color:'#111a14', fontFamily:'DM Sans,sans-serif', fontSize:'0.85rem', cursor:'pointer'}}>
                  <div style={{width:'24px', height:'24px', borderRadius:'50%', background:'#1a7a4a', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.78rem', color:'white'}}>
                    {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="mon-compte-label">Mon compte</span>
                </button>
              </>
            ) : (
              <>
                <button className="login-btn" onClick={() => router.push('/auth?mode=login')} style={{padding:'8px 16px', border:'1px solid #1a7a4a', borderRadius:'9px', color:'#1a7a4a', background:'white', fontFamily:'DM Sans,sans-serif', fontSize:'0.85rem', cursor:'pointer'}}>Connexion</button>
                <button className="btn-signup" onClick={() => router.push('/auth?mode=signup')} style={{padding:'8px 16px', border:'none', borderRadius:'9px', color:'white', background:'#1a7a4a', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'0.85rem', cursor:'pointer'}}>S’inscrire</button>
              </>
            )}
            <button className="deposer-btn" onClick={() => router.push('/publier')} style={{padding:'8px 18px', background:'#1a7a4a', border:'none', borderRadius:'9px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', color:'white', cursor:'pointer', whiteSpace:'nowrap'}}>
              +<span className="deposer-text"> Publier</span>
            </button>
          </div>
        </div>

        {/* Navbar catégories */}
        <div className="main-cat-nav" style={{padding:'0 5%', display:'flex', justifyContent:'safe center', alignItems:'center', overflowX:'auto', scrollbarWidth:'none', maxWidth:'1300px', margin:'0 auto', background:'#faf9f7'}}>
          <a href="#" className="nav-cat" onClick={e => { e.preventDefault(); handleNavCat('') }}
            style={{display:'flex', alignItems:'center', padding:'9px 14px', color: filterCat === '' ? '#1a7a4a' : '#6b7c6e', textDecoration:'none', fontSize:'0.82rem', fontWeight: filterCat === '' ? 700 : 500, whiteSpace:'nowrap', borderBottom: filterCat === '' ? '2px solid #1a7a4a' : '2px solid transparent'}}>
            Tout
          </a>
          <span className="cat-separator" style={{color:'#c8c4be', fontSize:'0.4rem', flexShrink:0, margin:'0 2px'}}>●</span>
          {LAUNCH_MAIN_CATEGORIES.map((item, index) => (
            <Fragment key={item.value}>
              <a href="#" className="nav-cat"
                onClick={e => { e.preventDefault(); handleNavCat(item.value) }}
                style={{display:'flex', alignItems:'center', padding:'9px 14px', color: filterCat === item.value ? '#1a7a4a' : '#6b7c6e', textDecoration:'none', fontSize:'0.82rem', fontWeight: filterCat === item.value ? 700 : 500, whiteSpace:'nowrap', borderBottom: filterCat === item.value ? '2px solid #1a7a4a' : '2px solid transparent'}}>
                {item.label}
              </a>
              {index < LAUNCH_MAIN_CATEGORIES.length - 1 && (
                <span className="cat-separator" style={{color:'#c8c4be', fontSize:'0.4rem', flexShrink:0, margin:'0 2px'}}>●</span>
              )}
            </Fragment>
          ))}
        </div>

        {/* Sous-catégories */}
        {subcats.length > 0 && !isImmoMode && (
          <div style={{borderTop:'1px solid #e8e4de', padding:'0 5%', display:'flex', overflowX:'auto', scrollbarWidth:'none', maxWidth:'1300px', margin:'0 auto', background:'#faf9f7'}}>
            <a href="#" className="nav-cat"
              onClick={e => { e.preventDefault(); setFilterSubcat('') }}
              style={{display:'flex', alignItems:'center', padding:'7px 12px', color: filterSubcat === '' ? '#1a7a4a' : '#6b7c6e', textDecoration:'none', fontSize:'0.78rem', fontWeight: filterSubcat === '' ? 700 : 500, whiteSpace:'nowrap', borderBottom: filterSubcat === '' ? '2px solid #1a7a4a' : '2px solid transparent'}}>
              Tous
            </a>
            {subcats.map((sub) => (
              <a key={sub.value} href="#" className="nav-cat"
                onClick={e => { e.preventDefault(); setFilterSubcat(sub.value) }}
                style={{display:'flex', alignItems:'center', padding:'7px 12px', color: filterSubcat === sub.value ? '#1a7a4a' : '#6b7c6e', textDecoration:'none', fontSize:'0.78rem', fontWeight: filterSubcat === sub.value ? 700 : 500, whiteSpace:'nowrap', borderBottom: filterSubcat === sub.value ? '2px solid #1a7a4a' : '2px solid transparent'}}>
                {sub.label}
              </a>
            ))}
          </div>
        )}

        {/* ✅ Filtres immo inline dans le header */}
        {isImmoMode && (
          <div style={{borderTop:'1px solid #e8e4de', padding:'8px 5%', background:'#faf9f7', maxWidth:'1300px', margin:'0 auto', display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
            {/* Type de bien */}
            <select value={filterSubcat} onChange={e => setFilterSubcat(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer', color:'#111a14'}}>
              <option value="">Tout type</option>
              <option value="immo-vente">🏡 Vente</option>
              <option value="immo-location">🏢 Location</option>
              <option value="immo-terrain">🌿 Terrain</option>
            </select>

            {/* Ville */}
            <select value={filterVille} onChange={e => setFilterVille(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer', color:'#111a14'}}>
              <option value="">Toutes villes</option>
              {villes.map(v => <option key={v} value={v}>{v}</option>)}
            </select>

            {/* Chambres */}
            <select value={filterChambres} onChange={e => setFilterChambres(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer', color:'#111a14'}}>
              <option value="">Chambres</option>
              {['1','2','3','4','5','6+'].map(n => <option key={n} value={n}>{n} ch.</option>)}
            </select>

            {/* Prix min */}
            <input type="number" placeholder="Prix min" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:"'DM Sans', sans-serif", fontSize:'0.82rem', outline:'none', background:'white', width:'110px', color:'#111a14', fontVariantNumeric:'lining-nums tabular-nums', fontFeatureSettings:'"lnum" 1, "tnum" 1, "onum" 0'}}/>

            {/* Prix max */}
            <input type="number" placeholder="Prix max" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:"'DM Sans', sans-serif", fontSize:'0.82rem', outline:'none', background:'white', width:'110px', color:'#111a14', fontVariantNumeric:'lining-nums tabular-nums', fontFeatureSettings:'"lnum" 1, "tnum" 1, "onum" 0'}}/>

            {/* Tri */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer', color:'#111a14'}}>
              <option value="recent">Plus récent</option>
              <option value="moins-cher">Moins cher</option>
              <option value="plus-cher">Plus cher</option>
            </select>

            <span style={{fontSize:'0.78rem', color:'#6b7c6e', marginLeft:'auto'}}>{immoAds.length} bien(s)</span>

            {hasFilters && (
              <button onClick={resetFilters} style={{padding:'7px 12px', background:'#fff7ed', color:'#ea580c', border:'1px solid #fed7aa', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.78rem', cursor:'pointer'}}>
                Effacer
              </button>
            )}

          </div>
        )}
      </header>

      <div className="mobile-top-search" style={{display:'none', padding:'10px 5% 4px', background:'#faf9f7'}}>
        <div style={{display:'flex', alignItems:'center', background:'white', borderRadius:'12px', overflow:'hidden', border:'1px solid #e8e4de', boxShadow:'0 2px 10px rgba(0,0,0,0.04)'}}>
          <input
            type="text"
            placeholder="Que recherchez-vous ?"
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveSection('main') }}
            style={{flex:1, minWidth:0, padding:'12px 14px', border:'none', outline:'none', fontFamily:'DM Sans,sans-serif', fontSize:'0.92rem', background:'transparent', color:'#111a14'}}
          />
          <button
            onClick={() => setActiveSection('main')}
            aria-label="Rechercher"
            style={{width:'46px', alignSelf:'stretch', background:'#1a7a4a', border:'none', color:'white', fontSize:'1rem', cursor:'pointer'}}
          >
            🔍
          </button>
        </div>
      </div>

      {/* ── RECHERCHE @USERNAME ── */}
      {search.startsWith('@') && (
        <div style={{maxWidth:'1300px', margin:'0 auto', padding:'24px 5%'}}>
          <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', marginBottom:'14px', color:'#111a14'}}>Profils pour "{search}"</h2>
          {searchingProfiles ? (
            <p style={{color:'#6b7c6e', fontSize:'0.88rem'}}>Recherche en cours...</p>
          ) : profileResults.length === 0 ? (
            <div style={{background:'white', borderRadius:'12px', padding:'40px', textAlign:'center', border:'1px solid #e8e4de'}}>
              <div style={{fontSize:'2rem', marginBottom:'8px'}}>😕</div>
              <p style={{color:'#6b7c6e', fontSize:'0.88rem'}}>Aucun profil trouvé pour "{search}"</p>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {profileResults.map((profile: any) => (
                <div key={profile.id} className="profile-card"
                  onClick={() => window.location.href='/u/' + profile.username}
                  style={{background:'white', borderRadius:'12px', padding:'16px 20px', border:'1px solid #e8e4de', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer'}}>
                  <div style={{width:'52px', height:'52px', borderRadius:'50%', background:'#1a7a4a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.3rem', color:'white', flexShrink:0}}>
                    {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', color:'#111a14', marginBottom:'3px'}}>{profile.full_name || '@' + profile.username}</div>
                    <div style={{fontSize:'0.78rem', color:'#1a7a4a', fontWeight:600}}>@{profile.username}</div>
                    {profile.bio && <div style={{fontSize:'0.75rem', color:'#6b7c6e', marginTop:'3px'}}>{profile.bio}</div>}
                  </div>
                  <span style={{fontSize:'0.78rem', color:'#6b7c6e', fontWeight:600, flexShrink:0}}>Voir le profil →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HERO ── */}
      {!search.startsWith('@') && activeSection === 'main' && !search && !filterCat && (
        <div style={{padding:'24px 5% 0', maxWidth:'1300px', margin:'0 auto', width:'100%', boxSizing:'border-box'}}>
          <div className="hero-section hero-premium" style={{position:'relative', overflow:'hidden', background:'#faf9f7', backgroundImage:"url('https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1400&q=80')", backgroundSize:'cover', backgroundPosition:'right center', backgroundRepeat:'no-repeat', minHeight:'420px', padding:'48px 5%', borderRadius:'16px', display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:'32px', alignItems:'center', border:'1px solid #e8e4de'}}>
            <div className="hero-premium-gradient" style={{position:'absolute', inset:0, background:'linear-gradient(90deg, #faf9f7 0%, rgba(250,249,247,0.95) 25%, rgba(250,249,247,0.6) 45%, rgba(250,249,247,0.2) 65%, transparent 80%)', zIndex:1, pointerEvents:'none'}} />
            <div style={{maxWidth:'520px', position:'relative', zIndex:2}}>
              <div style={{display:'inline-flex', alignItems:'center', background:'#e8f5ee', color:'#1a7a4a', borderRadius:'20px', padding:'7px 13px', fontSize:'0.72rem', fontWeight:700, marginBottom:'20px', letterSpacing:'0.04em'}}>
                ⭐ LE MARKETPLACE N°1 AU RWANDA
              </div>
              <h1 className="hero-title" style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'3rem', color:'#111a14', lineHeight:1.1, marginBottom:0}}>
                Achetez.<br/>
                Vendez.<br/>
                Louez.<br/>
                <span style={{color:'#1a7a4a'}}>Sans effort.</span>
              </h1>
              <p style={{color:'#6b7c6e', fontSize:'0.95rem', marginTop:'16px', maxWidth:'380px', lineHeight:1.6}}>
                Des milliers d’annonces près de chez vous. Simple, rapide et sécurisé.
              </p>
              <button className="hero-cta" onClick={() => document.getElementById('explore-rapidement')?.scrollIntoView({ behavior: 'smooth' })}
                style={{display:'inline-flex', alignItems:'center', justifyContent:'center', background:'#1a7a4a', color:'white', padding:'14px 28px', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginTop:'28px', border:'none', cursor:'pointer'}}>
                Voir les annonces
              </button>
            </div>
            <div style={{position:'relative', zIndex:2, minHeight:'280px', display:'flex', alignItems:'center', justifyContent:'center'}} className="hero-cards">
              {ads.slice(0, 2).map((ad, i) => (
                <div
                  key={ad.id}
                  onClick={() => router.push('/annonce/' + generateSlug(ad))}
                  style={{
                    position:'absolute',
                    top: i === 0 ? '0px' : 'auto',
                    bottom: i === 1 ? '0px' : 'auto',
                    left: i === 0 ? '5%' : 'auto',
                    right: i === 1 ? '0%' : 'auto',
                    width:'175px',
                    background:'white', borderRadius:'14px', overflow:'hidden',
                    boxShadow:'0 12px 40px rgba(0,0,0,0.14)',
                    transition:'transform 0.2s ease',
                    cursor:'pointer', border:'1px solid #e8e4de',
                    zIndex: i === 0 ? 2 : 1,
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{height:'90px', background:'#f0f7f3', overflow:'hidden'}}>
                    {ad.images?.[0] ? (
                      <img src={ad.images[0]} alt={ad.title} width={175} height={90} loading="lazy" decoding="async" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                    ) : (
                      <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', opacity:0.4}}>
                        {catEmoji[ad.category] || '📦'}
                      </div>
                    )}
                  </div>
                  <div style={{padding:'8px 10px'}}>
                    <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.75rem', color:'#111a14', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'3px'}}>
                      {ad.title}
                    </div>
                    <div style={{fontFamily:"'DM Sans', sans-serif", fontWeight:800, fontSize:'0.85rem', color:'#1a7a4a', fontVariantNumeric:'lining-nums tabular-nums', fontFeatureSettings:'"lnum" 1, "tnum" 1, "onum" 0'}}>
                      {formatPrice(ad.price)}
                    </div>
                    <div style={{fontSize:'0.65rem', color:'#6b7c6e', marginTop:'2px', fontFamily:"'DM Sans', sans-serif"}}>
                      📍 {ad.province}{formatRelativeTime(ad.created_at) && <span> · {formatRelativeTime(ad.created_at)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE IMMO - Layout 2 colonnes */}
      {!search.startsWith('@') && activeSection === 'main' && isImmoMode && (
        <div style={{
          maxWidth: '1300px',
          margin: '0 auto',
          padding: '16px 5%',
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: '20px',
          alignItems: 'start',
        }} className="immo-layout">

          {/* Colonne gauche - liste annonces */}
          <div className={`immo-list-panel ${showMap ? 'hide' : ''}`}
            style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>

            <button onClick={() => setShowMap(!showMap)}
              className="map-toggle-btn"
              style={{display:'none', padding:'10px', background: showMap ? '#1a7a4a' : '#faf9f7', color: showMap ? 'white' : '#111a14', border:'1px solid #e8e4de', borderRadius:'10px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', marginBottom:'4px'}}>
              {showMap ? 'Voir la liste' : 'Voir la carte'}
            </button>

            {loading && !hasLoadedAds && ads.length === 0 ? (
              <div style={{display:'grid', gap:'12px'}}>
                {cardSkeletons.slice(0, 4).map((_, i) => (
                  <div key={i} style={{background:'white', borderRadius:'14px', overflow:'hidden', border:'1px solid #e8e4de', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', display:'grid', gridTemplateColumns:'140px 1fr'}}>
                    <div style={{height:'130px', background:'#f1efeb'}} />
                    <div style={{padding:'12px'}}>
                      <div style={{height:'12px', width:'72%', background:'#f1efeb', borderRadius:'6px', marginBottom:'10px'}} />
                      <div style={{height:'15px', width:'45%', background:'#e8e4de', borderRadius:'6px', marginBottom:'10px'}} />
                      <div style={{height:'10px', width:'34%', background:'#f1efeb', borderRadius:'6px'}} />
                    </div>
                  </div>
                ))}
              </div>
            ) : immoAds.length === 0 ? (
              <div style={{background:'white', borderRadius:'14px', padding:'40px', textAlign:'center', border:'1px solid #e8e4de'}}>
                <div style={{fontSize:'2.5rem', marginBottom:'12px'}}>Immo</div>
                <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, marginBottom:'8px', color:'#111a14'}}>Aucun bien trouvé</h3>
                <p style={{color:'#6b7c6e', marginBottom:'20px', fontSize:'0.88rem'}}>Modifiez vos filtres</p>
                <button onClick={resetFilters} style={{padding:'10px 24px', background:'#1a7a4a', color:'white', border:'none', borderRadius:'9px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer'}}>
                  Voir tout
                </button>
              </div>
            ) : immoAds.map((ad: any) => (
              <div key={ad.id} className="immo-card"
                onClick={() => { setSelectedImmoAd(ad); router.push('/annonce/' + generateSlug(ad)) }}
                style={{background:'white', borderRadius:'14px', overflow:'hidden', cursor:'pointer', border: selectedImmoAd?.id === ad.id ? '2px solid #1a7a4a' : (FEATURE_FLAGS.boostedListings && ad.is_boosted ? '1.5px solid #1a7a4a' : '1px solid #e8e4de'), boxShadow: selectedImmoAd?.id === ad.id ? '0 4px 20px rgba(26,122,74,0.15)' : '0 1px 4px rgba(0,0,0,0.06)', display:'grid', gridTemplateColumns:'140px 1fr'}}>

                <div style={{height:'130px', background:'#faf9f7', overflow:'hidden', position:'relative', flexShrink:0}}>
                  {ad.images && ad.images.length > 0 ? (
                    <img src={ad.images[0]} alt={ad.title} width={140} height={130} loading="lazy" decoding="async" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                  ) : (
                    <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', opacity:0.55}}>Photo</div>
                  )}
                  <div style={{position:'absolute', top:'8px', left:'8px', display:'flex', gap:'4px', flexDirection:'column'}}>
                    {FEATURE_FLAGS.boostedListings && ad.is_boosted && (
                      <span style={{background:'#1a7a4a', color:'white', padding:'2px 6px', borderRadius:'5px', fontSize:'0.6rem', fontWeight:800}}>Mis en avant</span>
                    )}
                    {ad.is_sold && (
                      <span style={{background:'#f59e0b', color:'white', padding:'2px 6px', borderRadius:'5px', fontSize:'0.6rem', fontWeight:800}}>VENDU</span>
                    )}
                    <span style={{background: ad.category === 'immo-vente' ? '#1a7a4a' : ad.category === 'immo-location' ? '#0f5233' : '#6b7c6e', color:'white', padding:'2px 6px', borderRadius:'5px', fontSize:'0.6rem', fontWeight:700}}>
                      {catLabel[ad.category] || ad.category}
                    </span>
                  </div>
                </div>

                <div style={{padding:'12px 14px', display:'flex', flexDirection:'column', justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontFamily:"'DM Sans', sans-serif", fontWeight:800, fontSize:'1rem', color:'#0f5233', marginBottom:'3px', fontVariantNumeric:'lining-nums tabular-nums', fontFeatureSettings:'"lnum" 1, "tnum" 1, "onum" 0', letterSpacing:'-0.01em'}}>
                      {formatPrice(ad.price)}{ad.category === 'immo-location' && <span style={{fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e'}}> /mois</span>}
                    </div>
                    <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#111a14', marginBottom:'8px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                      {ad.title}
                    </div>
                    <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'6px'}}>
                      {ad.surface && <span style={{fontSize:'0.7rem', color:'#6b7c6e'}}>Surface {ad.surface} m2</span>}
                      {ad.chambres && <span style={{fontSize:'0.7rem', color:'#6b7c6e'}}>{ad.chambres} ch.</span>}
                      {ad.salles_de_bain && <span style={{fontSize:'0.7rem', color:'#6b7c6e'}}>{ad.salles_de_bain} sdb</span>}
                      {ad.surface && ad.price && ad.category !== 'immo-location' && (
                        <span style={{fontSize:'0.7rem', color:'#1a7a4a', fontWeight:600, fontVariantNumeric:'lining-nums tabular-nums', fontFeatureSettings:'"lnum" 1, "tnum" 1, "onum" 0'}}>
                          {formatPrice(Math.round(ad.price / ad.surface)).replace(' RWF', ' RWF/m2')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px'}}>
                    <span style={{fontSize:'0.7rem', color:'#6b7c6e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                      {ad.province}{ad.district ? ' - ' + ad.district : ''}
                      {formatRelativeTime(ad.created_at) && <span> · {formatRelativeTime(ad.created_at)}</span>}
                    </span>
                    <div onClick={e => e.stopPropagation()}>
                      <FavoriteButton adId={ad.id} onLogin={() => router.push('/auth?mode=login')} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Colonne droite - map + espace libre */}
          <div className={`immo-map-panel ${showMap ? 'show' : ''}`}
            style={{position:'sticky', top:'140px', display:'flex', flexDirection:'column', gap:'16px'}}>

            <div style={{borderRadius:'14px', border:'1px solid #e8e4de', boxShadow:'0 2px 12px rgba(0,0,0,0.08)', aspectRatio:'1 / 1', position:'relative', background:'#e8e4de', minHeight:'320px', isolation:'isolate'}}>
              <div ref={mapRef} style={{width:'100%', height:'100%', borderRadius:'14px'}} />

              {!MAPBOX_TOKEN && (
                <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px', color:'#6b7c6e'}}>
                  <div style={{fontSize:'1rem', fontWeight:700}}>Carte</div>
                  <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem'}}>Carte non disponible</p>
                </div>
              )}
            </div>

            {selectedImmoAd && (
              <div style={{background:'white', borderRadius:'12px', padding:'14px 16px', border:'1px solid #e8e4de', boxShadow:'0 4px 16px rgba(0,0,0,0.08)', display:'flex', gap:'12px', alignItems:'center'}}>
                <div style={{width:'52px', height:'52px', borderRadius:'8px', overflow:'hidden', flexShrink:0}}>
                  {selectedImmoAd.images?.[0] ? (
                    <img src={selectedImmoAd.images[0]} alt="" width={52} height={52} loading="lazy" decoding="async" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                  ) : (
                    <div style={{width:'100%', height:'100%', background:'#faf9f7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem'}}>Photo</div>
                  )}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:"'DM Sans', sans-serif", fontWeight:800, fontSize:'0.88rem', color:'#0f5233', marginBottom:'2px', fontVariantNumeric:'lining-nums tabular-nums', fontFeatureSettings:'"lnum" 1, "tnum" 1, "onum" 0'}}>
                    {formatPrice(selectedImmoAd.price)}
                  </div>
                  <div style={{fontSize:'0.75rem', color:'#111a14', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {selectedImmoAd.title}
                  </div>
                  <div style={{fontSize:'0.68rem', color:'#6b7c6e', fontFamily:"'DM Sans', sans-serif"}}>
                    {selectedImmoAd.province}{formatRelativeTime(selectedImmoAd.created_at) && <span> · {formatRelativeTime(selectedImmoAd.created_at)}</span>}
                  </div>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'5px', flexShrink:0}}>
                  <button onClick={() => router.push('/annonce/' + generateSlug(selectedImmoAd))}
                    style={{padding:'6px 10px', background:'#1a7a4a', border:'none', borderRadius:'7px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.72rem', color:'white', cursor:'pointer'}}>
                    Voir
                  </button>
                  <button onClick={() => setSelectedImmoAd(null)}
                    style={{padding:'4px', background:'transparent', border:'none', color:'#9ca3af', cursor:'pointer', fontSize:'0.75rem', textAlign:'center'}}>
                    x
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODE NORMAL — Grid annonces ── */}
      {!search && !filterCat && !isImmoMode && user && ads.length > 0 && (
        <div style={{padding:'32px 5% 0', maxWidth:'1300px', margin:'0 auto', marginTop:'40px', width:'100%', boxSizing:'border-box'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', gap:'14px', flexWrap:'wrap'}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <div style={{width:'32px', height:'32px', background:'#fef9c3', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem'}}>⭐</div>
              <div>
                <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', color:'#111a14', letterSpacing:'-0.3px', marginBottom:'4px'}}>Recommandé pour vous</div>
                <div style={{fontSize:'0.75rem', color:'#6b7c6e', opacity:0.8}}>Basé sur vos favoris, recherches, historique et alertes</div>
              </div>
            </div>
            <button onClick={() => router.push('/profil?tab=alertes')} style={{display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:'white', border:'1px solid #e8e4de', borderRadius:'10px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.78rem', color:'#111a14', cursor:'pointer'}}>
              🔔 Gérer mes alertes
            </button>
          </div>
          <div style={{display:'flex', gap:'14px', overflowX:'auto', scrollbarWidth:'none', paddingBottom:'8px', WebkitOverflowScrolling:'touch'}}>
            {[...ads].sort((a, b) => (favorites?.includes(b.id) ? 1 : 0) - (favorites?.includes(a.id) ? 1 : 0)).slice(0, 8).map((ad: any) => (
              <div key={ad.id} style={{flexShrink:0, width:'180px'}}>
                <ListingCard
                  id={ad.id}
                  title={ad.title}
                  price={ad.price}
                  currency="RWF"
                  city={ad.province}
                  district={ad.district}
                  category={ad.category}
                  images={ad.images}
                  createdAt={ad.created_at}
                  isSold={ad.is_sold}
                  isNew={(Date.now() - new Date(ad.created_at).getTime()) / (1000*60*60*24) < 7}
                  isFavorited={false}
                  href={'/annonce/' + generateSlug(ad)}
                  variant="compact"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!search && !filterCat && !isImmoMode && (
        <div id="explore-rapidement" style={{padding:'24px 5% 32px', maxWidth:'1300px', margin:'0 auto', marginTop:'32px', width:'100%', boxSizing:'border-box'}}>
          <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px'}}>
            <span style={{fontSize:'1.2rem'}}>⚡</span>
            <span style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', color:'#111a14', letterSpacing:'-0.3px', marginBottom:'4px'}}>Explorez rapidement</span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'12px'}} className="cat-grid">
            {[
              { icon:'🏡', label:'Logement', sub:'Maisons, appartements, chambres à louer', cat:'immo' },
              { icon:'🚗', label:'Véhicules', sub:'Voitures, motos, camions...', cat:'voiture' },
              { icon:'📱', label:'Tech', sub:'Téléphones, ordinateurs, accessoires...', cat:'electronique' },
              { icon:'👗', label:'Mode', sub:'Vêtements, chaussures, accessoires...', cat:'mode' },
              { icon:'💼', label:'Emplois & Services', sub:"Offres d'emploi, services...", cat:'services' },
            ].map((item) => (
              <div key={item.cat} onClick={() => handleNavCat(item.cat)} style={{background:'white', borderRadius:'14px', padding:'16px', border:'1px solid #e8e4de', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', transition:'all 0.2s ease'}} onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a7a4a'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e4de'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                <div style={{width:'42px', height:'42px', borderRadius:'10px', background:'#f0f7f3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0}}>{item.icon}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#111a14', marginBottom:'2px'}}>{item.label}</div>
                  <div style={{fontSize:'0.7rem', color:'#6b7c6e', lineHeight:1.4}}>{item.sub}</div>
                </div>
                <span style={{color:'#1a7a4a', fontSize:'0.9rem', flexShrink:0}}>→</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!search.startsWith('@') && activeSection === 'main' && !isImmoMode && (
        <div className="home-results-wrap" style={{padding:'0 5% 24px', maxWidth:'1300px', margin:'0 auto', marginTop:'32px'}}>
          <div className="home-filter-card" style={{background:'white', borderRadius:'12px', padding:'12px 16px', marginBottom:'20px', border:'1px solid #e8e4de'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', flexWrap:'wrap'}}>
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <button onClick={() => setShowFilters(!showFilters)} style={{display:'flex', alignItems:'center', gap:'5px', padding:'7px 13px', background: showFilters ? '#1a7a4a' : '#faf9f7', color: showFilters ? 'white' : '#111a14', border:'1px solid ' + (showFilters ? '#1a7a4a' : '#e8e4de'), borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.82rem', cursor:'pointer'}}>
                  Filtres {showFilters ? '▲' : '▼'}
                </button>
                {hasFilters && (
                  <button onClick={resetFilters} style={{padding:'7px 12px', background:'#fff7ed', color:'#ea580c', border:'1px solid #fed7aa', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.78rem', cursor:'pointer'}}>
                    Effacer
                  </button>
                )}
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                {hasFilters && (
                  <button className="save-search-btn" onClick={handleSaveSearch} style={{padding:'7px 12px', background: searchSaved ? '#e8f5ee' : '#fffbeb', border:'1px solid ' + (searchSaved ? '#b7dfca' : '#fde68a'), borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.78rem', color: searchSaved ? '#1a7a4a' : '#78350f', cursor:'pointer', whiteSpace:'nowrap'}}>
                    {searchSaved ? 'Alerte créée !' : 'Créer une alerte'}
                  </button>
                )}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{padding:'7px 10px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer', color:'#111a14'}}>
                  <option value="recent">Plus récent</option>
                  <option value="ancien">Plus ancien</option>
                  <option value="moins-cher">Moins cher</option>
                  <option value="plus-cher">Plus cher</option>
                </select>
                <span className="home-count" style={{fontSize:'0.8rem', color:'#6b7c6e', whiteSpace:'nowrap'}}>
                  {displayAds.length + ' annonces disponibles'}
                </span>
              </div>
            </div>

            {showFilters && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #e8e4de'}}>
                <div>
                  <label style={{display:'block', fontSize:'0.7rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Sous-catégorie</label>
                  <select value={filterSubcat} onChange={e => setFilterSubcat(e.target.value)} style={{width:'100%', padding:'8px 10px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer'}} disabled={subcats.length === 0}>
                    <option value="">{subcats.length === 0 ? 'Choisir une catégorie' : 'Toutes'}</option>
                    {subcats.filter(s => s.value !== '').map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{display:'block', fontSize:'0.7rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Ville</label>
                  <select value={filterVille} onChange={e => setFilterVille(e.target.value)} style={{width:'100%', padding:'8px 10px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer'}}>
                    <option value="">Toutes</option>
                    {villes.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block', fontSize:'0.7rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Prix (RWF)</label>
                  <div style={{display:'flex', gap:'6px'}}>
                    <input type="number" placeholder="Min" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)} style={{width:'50%', padding:'8px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:"'DM Sans', sans-serif", fontSize:'0.78rem', outline:'none', background:'white', fontVariantNumeric:'lining-nums tabular-nums', fontFeatureSettings:'"lnum" 1, "tnum" 1, "onum" 0'}}/>
                    <input type="number" placeholder="Max" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)} style={{width:'50%', padding:'8px', border:'1px solid #e8e4de', borderRadius:'8px', fontFamily:"'DM Sans', sans-serif", fontSize:'0.78rem', outline:'none', background:'white', fontVariantNumeric:'lining-nums tabular-nums', fontFeatureSettings:'"lnum" 1, "tnum" 1, "onum" 0'}}/>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading && !hasLoadedAds && ads.length === 0 ? (
            <div className="ads-grid" style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px'}}>
              {cardSkeletons.map((_, i) => (
                <div key={i} style={{background:'white', borderRadius:'16px', overflow:'hidden', border:'1px solid #e8e4de', boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                  <div style={{height:'180px', background:'#f1efeb'}} />
                  <div style={{padding:'12px'}}>
                    <div style={{height:'12px', width:'78%', background:'#f1efeb', borderRadius:'6px', marginBottom:'10px'}} />
                    <div style={{height:'16px', width:'52%', background:'#e8e4de', borderRadius:'6px', marginBottom:'10px'}} />
                    <div style={{height:'10px', width:'38%', background:'#f1efeb', borderRadius:'6px', marginBottom:'12px'}} />
                    <div style={{height:'34px', background:'#f0f7f3', borderRadius:'8px'}} />
                  </div>
                </div>
              ))}
            </div>
          ) : displayAds.length === 0 ? (
            <div style={{background:'white', borderRadius:'14px', padding:'56px', textAlign:'center', border:'1px solid #e8e4de'}}>
              <div style={{fontSize:'2.5rem', marginBottom:'12px'}}>🔍</div>
              <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, marginBottom:'8px', color:'#111a14'}}>Aucun résultat</h3>
              <p style={{color:'#6b7c6e', marginBottom:'20px', fontSize:'0.9rem'}}>Essayez d’autres termes ou filtres</p>
              <button onClick={resetFilters} style={{padding:'10px 24px', background:'#1a7a4a', color:'white', border:'none', borderRadius:'9px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer'}}>
                Voir toutes les annonces
              </button>
            </div>
          ) : (
            <div className="ads-grid" style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px'}}>
              {displayAds.map((ad: any) => (
                <div key={ad.id} className="ad-card" onClick={() => router.push('/annonce/' + generateSlug(ad))}
                  style={{background:'white', borderRadius:'16px', overflow:'hidden', cursor:'pointer', border: FEATURE_FLAGS.boostedListings && ad.is_boosted ? '1.5px solid #1a7a4a' : '1px solid #e8e4de', boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                  <div className="ad-card-media" style={{height:'180px', background:'#faf9f7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3.5rem', overflow:'hidden', position:'relative'}}>
                    {ad.images && ad.images.length > 0 ? (
                      <img src={ad.images[0]} alt={ad.title} width={300} height={180} loading="lazy" decoding="async" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                    ) : (
                      <span style={{opacity:0.5}}>{catEmoji[ad.category] || '📦'}</span>
                    )}
                    {FEATURE_FLAGS.boostedListings && ad.is_boosted && (
                      <div style={{position:'absolute', top:'10px', left:'10px', background:'#1a7a4a', color:'white', padding:'3px 9px', borderRadius:'6px', fontSize:'0.68rem', fontWeight:800}}>
                        Mis en avant
                      </div>
                    )}
                    {ad.is_sold && (
                      <div style={{
                        position: 'absolute',
                        top: FEATURE_FLAGS.boostedListings && ad.is_boosted ? '38px' : '10px',
                        left: '10px',
                        background: '#f59e0b',
                        color: 'white',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                      }}>
                        VENDU
                      </div>
                    )}
                    <div style={{position:'absolute', top:'10px', right:'10px', zIndex:10}} onClick={e => e.stopPropagation()}>
                      <FavoriteButton adId={ad.id} onLogin={() => router.push('/auth?mode=login')} />
                    </div>
                  </div>
                  <div className="ad-card-body" style={{padding:'14px'}}>
                    <div className="ad-card-category" style={{fontSize:'0.66rem', fontWeight:600, color:'#1a7a4a', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'5px'}}>
                      {ad.subcategory ? ad.subcategory : ad.category}
                    </div>
                    <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.9rem', marginBottom:'5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#111a14'}}>{ad.title}</div>
                    <div style={{fontFamily:"'DM Sans', sans-serif", fontWeight:800, fontSize:'1rem', color:'#1a7a4a', marginBottom:'8px', fontVariantNumeric:'lining-nums tabular-nums', fontFeatureSettings:'"lnum" 1, "tnum" 1, "onum" 0', letterSpacing:'-0.01em'}}>
                      {formatPrice(ad.price)}
                    </div>
                    <div style={{fontSize:'0.72rem', color:'#6b7c6e', marginBottom:'10px', height:'18px', overflow:'hidden', fontFamily:"'DM Sans', sans-serif"}}>
                      {ad.province && <>📍 {ad.province}</>}{formatRelativeTime(ad.created_at) && <span> · {formatRelativeTime(ad.created_at)}</span>}
                    </div>
                    <button className="ad-view-button" onClick={e => { e.stopPropagation(); router.push('/annonce/' + generateSlug(ad)) }} style={{width:'100%', padding:'8px', background:'#f0f7f3', color:'#1a7a4a', border:'1px solid #d4e6da', borderRadius:'8px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.8rem', cursor:'pointer'}}>
                      Voir l’annonce
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── JOBS ── */}
      {activeSection === 'jobs' && (
        <div style={{padding:'32px 5%', maxWidth:'1300px', margin:'0 auto'}}>
          <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.4rem', marginBottom:'20px', color:'#111a14'}}>💼 Offres d’emploi</h2>
          {[
            {co:'🏦', title:'Développeur Full-Stack Senior', company:'Bank of Kigali', loc:'Kigali', salary:'1 200 000 - 1 800 000 RWF/mois', type:'CDI'},
            {co:'🏥', title:'Infirmier diplômé', company:'King Faisal Hospital', loc:'Kigali', salary:'700 000 - 950 000 RWF/mois', type:'CDI'},
            {co:'🌍', title:'Responsable Programmes', company:'Save the Children Rwanda', loc:'Kigali', salary:'1 500 000 - 2 000 000 RWF/mois', type:'CDD'},
          ].map((job, i) => (
            <div key={i} style={{background:'white', borderRadius:'12px', padding:'18px 20px', border:'1px solid #e8e4de', marginBottom:'10px', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer'}}>
              <div style={{fontSize:'1.6rem', flexShrink:0}}>{job.co}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.92rem', marginBottom:'3px', color:'#111a14'}}>{job.title}</div>
                <div style={{fontSize:'0.8rem', color:'#1a7a4a', fontWeight:600, marginBottom:'2px'}}>{job.company}</div>
                <div style={{fontSize:'0.75rem', color:'#6b7c6e'}}>📍 {job.loc} · {job.type}</div>
              </div>
              <div style={{textAlign:'right', flexShrink:0}}>
                <div style={{fontFamily:"'DM Sans', sans-serif", fontWeight:700, color:'#111a14', fontSize:'0.82rem', marginBottom:'6px', fontVariantNumeric:'lining-nums tabular-nums', fontFeatureSettings:'"lnum" 1, "tnum" 1, "onum" 0'}}>{job.salary}</div>
                <button onClick={() => router.push('/auth')} style={{padding:'6px 14px', background:'#0f5233', color:'white', border:'none', borderRadius:'8px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.78rem', cursor:'pointer'}}>Postuler</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FOOTER ── */}
      {!isImmoMode && (
        <footer style={{background:'#111a14', color:'rgba(255,255,255,0.5)', padding:'48px 5%', marginTop:'40px'}}>
          <div style={{maxWidth:'1300px', margin:'0 auto', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'16px', alignItems:'center'}}>
            <div>
              <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.15rem', color:'white', marginBottom:'4px'}}>Soko<span style={{color:'#4ade80'}}>Deal</span></div>
              <p style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', maxWidth:'240px', lineHeight:1.6}}>La première plateforme d’annonces d’Afrique.</p>
            </div>
            <div style={{display:'flex', gap:'20px', fontSize:'0.8rem', alignItems:'center'}}>
              {user && isUserAdmin && (
                <a href="/admin" style={{color:'rgba(255,255,255,0.3)', textDecoration:'none'}}>Admin</a>
              )}
              <a href="/cgu" style={{color:'rgba(255,255,255,0.3)', textDecoration:'none'}}>CGU</a>
              <span style={{color:'rgba(255,255,255,0.4)'}}>2025 SokoDeal · Made in Africa</span>
            </div>
          </div>
        </footer>
      )}
    </>
  )
}
