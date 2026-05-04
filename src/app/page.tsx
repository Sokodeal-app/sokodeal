'use client'
import { Fragment, useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import FavoriteButton from '@/components/FavoriteButton'
import { useUnreadCount } from '@/hooks/useUnreadCount'
import { SUBCATEGORIES } from '@/lib/categories'
import { FEATURE_FLAGS } from '@/lib/feature-flags'
import { LAUNCH_CITIES, LAUNCH_MAIN_CATEGORIES, LAUNCH_SUBCATEGORIES, matchesCategoryGroup } from '@/lib/market-config'
import { generateSlug } from '@/lib/slug'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

// Coordonnées approximatives des villes rwandaises
const VILLE_COORDS: Record<string, [number, number]> = {
  'Kigali': [30.0619, -1.9441],
  'Butare': [29.7392, -2.5967],
  'Musanze': [29.6349, -1.4994],
  'Ruhengeri': [29.6349, -1.4994],
  'Gisenyi': [29.2567, -1.7025],
  'Cyangugu': [28.9077, -2.4847],
  'Kibuye': [29.3497, -2.0603],
  'Byumba': [30.0677, -1.5756],
  'Rwamagana': [30.4344, -1.9494],
  'Rubavu': [29.2567, -1.7025],
  'Rusizi': [28.9077, -2.4847],
  'Huye': [29.7392, -2.5967],
  'Nyagatare': [30.3285, -1.2985],
  'Muhanga': [29.7511, -2.0836],
}

export default function Home() {
  const [activeSection, setActiveSection] = useState('main')
  const [ads, setAds] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
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
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const { unreadCount } = useUnreadCount()

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
    setActiveSection('main')
    setSelectedImmoAd(null)
  }

  // ── Chargement des annonces ──
  useEffect(() => {
    const fetchAds = async () => {
      const { data } = await supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (data) {
        if (!FEATURE_FLAGS.boostedListings) {
          const regularAds = data.map(ad => ({ ...ad, is_boosted: false }))
          setAds(regularAds); setFiltered(regularAds)
          setLoading(false)
          return
        }
        const now = new Date().toISOString()
        const { data: boosts } = await supabase.from('boosts').select('ad_id').eq('is_active', true).gt('ends_at', now)
        const boostedIds = new Set((boosts || []).map((b: any) => b.ad_id))
        const adsWithBoost = data.map(ad => ({ ...ad, is_boosted: boostedIds.has(ad.id) }))
        const sorted = [...adsWithBoost.filter(a => a.is_boosted), ...adsWithBoost.filter(a => !a.is_boosted)]
        setAds(sorted); setFiltered(sorted)
      }
      setLoading(false)
    }
    fetchAds()

    const getUser = async () => {
      const { data: { user } } = await getCurrentUser()
      setUser(user)
    }
    getUser()

    const stored = localStorage.getItem('sokodeal:search-history')
    if (stored) {
      try { setLocalHistory(JSON.parse(stored).slice(0, 10)) } catch {}
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Notifications ──
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('notifs-' + user.id.slice(0, 8))
    ch.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: 'receiver_id=eq.' + user.id
    }, () => {
      setToast({ text: 'Nouveau message recu !', icon: '💬' })
      setTimeout(() => setToast(null), 4000)
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user])

  // ── Initialisation Mapbox ──
  useEffect(() => {
    if (!isImmoMode || !mapRef.current || mapInstanceRef.current) return
    if (!MAPBOX_TOKEN) return

    const initMap = async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      mapboxgl.accessToken = MAPBOX_TOKEN!

      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [30.0619, -1.9441], // Kigali
        zoom: 9,
      })

      map.addControl(new mapboxgl.NavigationControl(), 'top-right')
      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isImmoMode])

  // ── Mise à jour des pins sur la map ──
  useEffect(() => {
    if (!isImmoMode || !mapInstanceRef.current) return

    const updateMarkers = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      // Supprimer les anciens markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      const immoAds = filtered.filter(ad =>
        ['immo-vente', 'immo-location', 'immo-terrain'].includes(ad.category)
      )

      immoAds.forEach(ad => {
        const coords = VILLE_COORDS[ad.province] || VILLE_COORDS['Kigali']

        // Offset léger pour éviter les superpositions
        const offsetLng = (Math.random() - 0.5) * 0.02
        const offsetLat = (Math.random() - 0.5) * 0.02

        const el = document.createElement('div')
        el.innerHTML = `
          <div style="
            background: ${selectedImmoAd?.id === ad.id ? '#0f5233' : (FEATURE_FLAGS.boostedListings && ad.is_boosted) ? '#f5a623' : '#1a7a4a'};
            color: white;
            padding: 6px 10px;
            border-radius: 20px;
            font-family: Syne, sans-serif;
            font-weight: 800;
            font-size: 0.72rem;
            white-space: nowrap;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            border: 2px solid white;
            transition: all 0.15s;
          ">
            ${Number(ad.price).toLocaleString()} RWF
          </div>
        `
        el.style.cursor = 'pointer'
        el.addEventListener('click', () => setSelectedImmoAd(ad))

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([coords[0] + offsetLng, coords[1] + offsetLat])
          .addTo(mapInstanceRef.current)

        markersRef.current.push(marker)
      })
    }

    const timer = setTimeout(updateMarkers, 300)
    return () => clearTimeout(timer)
  }, [filtered, isImmoMode, selectedImmoAd])

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
      setToast({ text: 'Alerte creee !', icon: '🔔' })
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
    let result = [...ads]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(ad => ad.title?.toLowerCase().includes(q) || ad.description?.toLowerCase().includes(q) || ad.category?.toLowerCase().includes(q))
    }

    if (filterCat) {
      result = result.filter(ad => filterSubcat ? ad.category === filterSubcat : matchesCategoryGroup(filterCat, ad.category))
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

    setFiltered(result)

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
  }, [search, filterCat, filterSubcat, filterVille, filterPriceMin, filterPriceMax, filterChambres, filterType, sortBy, ads])

  const resetFilters = () => {
    setSearch(''); setFilterCat(''); setFilterSubcat(''); setFilterVille('')
    setFilterPriceMin(''); setFilterPriceMax(''); setSortBy('recent')
    setFilterChambres(''); setFilterType('')
    setProfileResults([])
    setSelectedImmoAd(null)
  }

  const hasFilters = search || filterCat || filterVille || filterPriceMin || filterPriceMax || sortBy !== 'recent'

  const mockAds = [
    {id:'m1', category:'immo-vente', title:'Villa 4 chambres Kigali Niboye', price:185000000, images:[], province:'Kigali', is_boosted:true, surface:280, chambres:'4'},
    {id:'m2', category:'voiture', title:'Toyota RAV4 2019 45 000 km', price:26500000, images:[], province:'Kigali', is_boosted:false},
    {id:'m3', category:'electronique', title:'Samsung Galaxy S24 Ultra Neuf', price:980000, images:[], province:'Musanze', is_boosted:false},
    {id:'m4', category:'immo-location', title:'Appartement 3 pieces meuble', price:450000, images:[], province:'Butare', is_boosted:false, surface:85, chambres:'3'},
    {id:'m5', category:'moto', title:'Honda CB125 2022 18 000 km', price:3200000, images:[], province:'Gisenyi', is_boosted:false},
    {id:'m6', category:'animaux', title:'Vache laitiere Ankole 2 ans', price:1800000, images:[], province:'Rwamagana', is_boosted:false},
  ]

  const displayAds = ads.length > 0 ? filtered : mockAds
  const immoAds = displayAds.filter(ad => ['immo-vente','immo-location','immo-terrain'].includes(ad.category))

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; max-width: 100vw; }
        @media (max-width: 768px) {
          .hero-title { font-size: 1.55rem !important; }
          .ads-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .btn-signup { display: none !important; }
          .header-inner { padding: 0 4% !important; height: 56px !important; }
          .deposer-btn { padding: 6px 8px !important; font-size: 0.75rem !important; }
          .deposer-text { display: none !important; }
          .hero-section { padding: 24px 4% 22px !important; }
          .mon-compte-label { display: none !important; }
          .search-bar { display: none !important; }
          .save-search-btn { display: none !important; }
        }
        @media (max-width: 900px) {
          .immo-layout { grid-template-columns: 1fr !important; }
          .immo-map-panel { display: none !important; position: static !important; }
          .immo-map-panel.show { display: flex !important; flex-direction: column; }
          .immo-list-panel.hide { display: none !important; }
          .map-toggle-btn { display: block !important; }
        }
        .ad-card { transition: transform 0.18s, box-shadow 0.18s; }
        .ad-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.10) !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .profile-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; transform: translateY(-1px); }
        .profile-card { transition: box-shadow 0.18s, transform 0.18s; }
        .nav-cat { transition: all 0.15s; }
        .nav-cat:hover { color: #1a7a4a !important; }
        .immo-card:hover { border-color: #1a7a4a !important; }
        .immo-card { transition: border-color 0.15s, box-shadow 0.15s; }
        .mapboxgl-map { border-radius: 12px; }
        @import url('https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css');
      `}</style>

      {toast && (
        <div style={{position:'fixed', bottom:'20px', right:'20px', zIndex:9999, background:'#0f5233', color:'white', padding:'12px 18px', borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,0.18)', display:'flex', alignItems:'center', gap:'10px', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', animation:'fadeUp 0.3s ease', maxWidth:'260px'}}>
          <span style={{fontSize:'1.2rem'}}>{toast.icon}</span>
          <div>
            <div style={{fontWeight:700, marginBottom:'4px'}}>{toast.text}</div>
            <button onClick={() => window.location.href='/messages'} style={{background:'#f5a623', border:'none', borderRadius:'6px', padding:'3px 10px', fontSize:'0.75rem', fontWeight:700, color:'#111', cursor:'pointer'}}>Voir</button>
          </div>
          <button onClick={() => setToast(null)} style={{background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'1rem', padding:'0 4px'}}>×</button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={{background:'white', position:'sticky', top:0, zIndex:100, borderBottom:'1px solid #e8ede9', paddingTop:'env(safe-area-inset-top)'}}>
        <div className="header-inner" style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 5%', height:'62px', gap:'14px', maxWidth:'1300px', margin:'0 auto'}}>
          <a href="/" style={{display:'flex', alignItems:'center', gap:'8px', textDecoration:'none', flexShrink:0}}>
            <div style={{width:'34px', height:'34px', background:'#f5a623', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px'}}>🦁</div>
            <span style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.25rem', color:'#111a14'}}>Soko<span style={{color:'#1a7a4a'}}>Deal</span></span>
          </a>

          <div className="search-bar" style={{flex:1, maxWidth:'480px', position:'relative'}}>
            <div style={{display:'flex', background:'#f5f7f5', borderRadius:'9px', overflow:'hidden', border:'1px solid #e8ede9'}}>
              <input type="text" placeholder="Rechercher... ou @username" value={search}
                onChange={e => { setSearch(e.target.value); setActiveSection('main') }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                style={{flex:1, padding:'9px 14px', border:'none', outline:'none', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', background:'transparent', color:'#111a14'}}
              />
              <button style={{background:'#f5a623', border:'none', cursor:'pointer', padding:'9px 16px', fontSize:'1rem', color:'#111a14'}}>🔍</button>
            </div>
            {showSuggestions && localHistory.length > 0 && !search && (
              <div style={{position:'absolute', top:'44px', left:0, right:0, background:'white', borderRadius:'12px', border:'1px solid #e8ede9', boxShadow:'0 8px 24px rgba(0,0,0,0.10)', zIndex:500, overflow:'hidden'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderBottom:'1px solid #f0f4f1'}}>
                  <span style={{fontSize:'0.72rem', fontWeight:700, color:'#6b7c6e', textTransform:'uppercase'}}>Recherches recentes</span>
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
                  <div key={`${item}-${i}`} style={{display:'flex', alignItems:'center', padding:'10px 14px', borderBottom: i < localHistory.length - 1 ? '1px solid #f0f4f1' : 'none'}}>
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
                <button onClick={() => window.location.href='/messages'} style={{position:'relative', width:'38px', height:'38px', background:'#f5f7f5', border:'1px solid #e8ede9', borderRadius:'9px', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  💬
                  {unreadCount > 0 && (
                    <div style={{position:'absolute', top:'-4px', right:'-4px', width:'16px', height:'16px', background:'#e74c3c', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.58rem', fontWeight:800, color:'white'}}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                  )}
                </button>
                <button onClick={() => window.location.href='/profil'} style={{display:'flex', alignItems:'center', gap:'7px', padding:'7px 14px', background:'#f5f7f5', border:'1px solid #e8ede9', borderRadius:'9px', color:'#111a14', fontFamily:'DM Sans,sans-serif', fontSize:'0.85rem', cursor:'pointer'}}>
                  <div style={{width:'24px', height:'24px', borderRadius:'50%', background:'#f5a623', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.78rem', color:'#111a14'}}>
                    {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="mon-compte-label">Mon compte</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => window.location.href='/auth?mode=login'} style={{padding:'8px 16px', border:'1px solid #e8ede9', borderRadius:'9px', color:'#111a14', background:'white', fontFamily:'DM Sans,sans-serif', fontSize:'0.85rem', cursor:'pointer'}}>Connexion</button>
                <button className="btn-signup" onClick={() => window.location.href='/auth?mode=signup'} style={{padding:'8px 16px', border:'none', borderRadius:'9px', color:'white', background:'#1a7a4a', fontFamily:'DM Sans,sans-serif', fontWeight:700, fontSize:'0.85rem', cursor:'pointer'}}>S inscrire</button>
              </>
            )}
            <button className="deposer-btn" onClick={() => window.location.href='/publier'} style={{padding:'8px 18px', background:'#f5a623', border:'none', borderRadius:'9px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#111a14', cursor:'pointer', whiteSpace:'nowrap'}}>
              +<span className="deposer-text"> Deposer</span>
            </button>
          </div>
        </div>

        {/* Navbar catégories */}
        <div style={{borderTop:'1px solid #f0f4f1', padding:'0 5%', display:'flex', justifyContent:'safe center', alignItems:'center', overflowX:'auto', scrollbarWidth:'none', maxWidth:'1300px', margin:'0 auto'}}>
          <a href="#" className="nav-cat" onClick={e => { e.preventDefault(); handleNavCat('') }}
            style={{display:'flex', alignItems:'center', padding:'9px 14px', color: filterCat === '' ? '#1a7a4a' : '#6b7c6e', textDecoration:'none', fontSize:'0.82rem', fontWeight: filterCat === '' ? 700 : 400, whiteSpace:'nowrap', borderBottom: filterCat === '' ? '2px solid #f5a623' : '2px solid transparent'}}>
            Tout
          </a>
          <span style={{color:'#d1d5db', fontSize:'0.4rem', flexShrink:0, margin:'0 2px'}}>●</span>
          {LAUNCH_MAIN_CATEGORIES.map((item, index) => (
            <Fragment key={item.value}>
              <a href="#" className="nav-cat"
                onClick={e => { e.preventDefault(); handleNavCat(item.value) }}
                style={{display:'flex', alignItems:'center', padding:'9px 14px', color: filterCat === item.value ? '#1a7a4a' : '#6b7c6e', textDecoration:'none', fontSize:'0.82rem', fontWeight: filterCat === item.value ? 700 : 400, whiteSpace:'nowrap', borderBottom: filterCat === item.value ? '2px solid #f5a623' : '2px solid transparent'}}>
                {item.label}
              </a>
              {index < LAUNCH_MAIN_CATEGORIES.length - 1 && (
                <span style={{color:'#d1d5db', fontSize:'0.4rem', flexShrink:0, margin:'0 2px'}}>●</span>
              )}
            </Fragment>
          ))}
        </div>

        {/* Sous-catégories */}
        {subcats.length > 0 && !isImmoMode && (
          <div style={{borderTop:'1px solid #f0f4f1', padding:'0 5%', display:'flex', overflowX:'auto', scrollbarWidth:'none', maxWidth:'1300px', margin:'0 auto', background:'#fafafa'}}>
            <a href="#" className="nav-cat"
              onClick={e => { e.preventDefault(); setFilterSubcat('') }}
              style={{display:'flex', alignItems:'center', padding:'7px 12px', color: filterSubcat === '' ? '#0f5233' : '#6b7c6e', textDecoration:'none', fontSize:'0.78rem', fontWeight: filterSubcat === '' ? 700 : 400, whiteSpace:'nowrap', borderBottom: filterSubcat === '' ? '2px solid #1a7a4a' : '2px solid transparent'}}>
              Tous
            </a>
            {subcats.map((sub) => (
              <a key={sub.value} href="#" className="nav-cat"
                onClick={e => { e.preventDefault(); setFilterSubcat(sub.value) }}
                style={{display:'flex', alignItems:'center', padding:'7px 12px', color: filterSubcat === sub.value ? '#0f5233' : '#6b7c6e', textDecoration:'none', fontSize:'0.78rem', fontWeight: filterSubcat === sub.value ? 700 : 400, whiteSpace:'nowrap', borderBottom: filterSubcat === sub.value ? '2px solid #1a7a4a' : '2px solid transparent'}}>
                {sub.label}
              </a>
            ))}
          </div>
        )}

        {/* ✅ Filtres immo inline dans le header */}
        {isImmoMode && (
          <div style={{borderTop:'1px solid #f0f4f1', padding:'8px 5%', background:'#f8fdf9', maxWidth:'1300px', margin:'0 auto', display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
            {/* Type de bien */}
            <select value={filterSubcat} onChange={e => setFilterSubcat(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer', color:'#111a14'}}>
              <option value="">Tout type</option>
              <option value="immo-vente">🏡 Vente</option>
              <option value="immo-location">🏢 Location</option>
              <option value="immo-terrain">🌿 Terrain</option>
            </select>

            {/* Ville */}
            <select value={filterVille} onChange={e => setFilterVille(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer', color:'#111a14'}}>
              <option value="">Toutes villes</option>
              {villes.map(v => <option key={v} value={v}>{v}</option>)}
            </select>

            {/* Chambres */}
            <select value={filterChambres} onChange={e => setFilterChambres(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer', color:'#111a14'}}>
              <option value="">Chambres</option>
              {['1','2','3','4','5','6+'].map(n => <option key={n} value={n}>{n} ch.</option>)}
            </select>

            {/* Prix min */}
            <input type="number" placeholder="Prix min" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', width:'110px', color:'#111a14'}}/>

            {/* Prix max */}
            <input type="number" placeholder="Prix max" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', width:'110px', color:'#111a14'}}/>

            {/* Tri */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{padding:'7px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer', color:'#111a14'}}>
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

      {/* ── RECHERCHE @USERNAME ── */}
      {search.startsWith('@') && (
        <div style={{maxWidth:'1300px', margin:'0 auto', padding:'24px 5%'}}>
          <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', marginBottom:'14px', color:'#111a14'}}>Profils pour "{search}"</h2>
          {searchingProfiles ? (
            <p style={{color:'#6b7c6e', fontSize:'0.88rem'}}>Recherche en cours...</p>
          ) : profileResults.length === 0 ? (
            <div style={{background:'white', borderRadius:'12px', padding:'40px', textAlign:'center', border:'1px solid #e8ede9'}}>
              <div style={{fontSize:'2rem', marginBottom:'8px'}}>😕</div>
              <p style={{color:'#6b7c6e', fontSize:'0.88rem'}}>Aucun profil trouve pour "{search}"</p>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {profileResults.map((profile: any) => (
                <div key={profile.id} className="profile-card"
                  onClick={() => window.location.href='/u/' + profile.username}
                  style={{background:'white', borderRadius:'12px', padding:'16px 20px', border:'1px solid #e8ede9', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer'}}>
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
          <div className="hero-section" style={{background:'linear-gradient(135deg, #0f5233 0%, #1a7a4a 100%)', padding:'30px 5% 26px', borderRadius:'16px', overflow:'hidden'}}>
            <div style={{maxWidth:'100%', margin:'0 auto', textAlign:'center'}}>
              <p style={{color:'rgba(255,255,255,0.72)', fontSize:'0.76rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'8px', textAlign:'center'}}>Kigali</p>
              <h1 className="hero-title" style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.9rem', color:'white', lineHeight:1.15, marginBottom:'10px', textAlign:'center'}}>
                Achetez et vendez partout au Rwanda
              </h1>
              <p style={{color:'rgba(255,255,255,0.68)', fontSize:'0.9rem', margin:'0 auto', maxWidth:'460px', lineHeight:1.5, textAlign:'center'}}>Immobilier, vehicules, tech, mode et services entre particuliers.</p>
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
              style={{display:'none', padding:'10px', background: showMap ? '#1a7a4a' : '#f5f7f5', color: showMap ? 'white' : '#111a14', border:'1px solid #e8ede9', borderRadius:'10px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.85rem', cursor:'pointer', marginBottom:'4px'}}>
              {showMap ? 'Voir la liste' : 'Voir la carte'}
            </button>

            {loading ? (
              <div style={{textAlign:'center', padding:'60px', color:'#6b7c6e'}}>Chargement...</div>
            ) : immoAds.length === 0 ? (
              <div style={{background:'white', borderRadius:'14px', padding:'40px', textAlign:'center', border:'1px solid #e8ede9'}}>
                <div style={{fontSize:'2.5rem', marginBottom:'12px'}}>Immo</div>
                <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, marginBottom:'8px', color:'#111a14'}}>Aucun bien trouve</h3>
                <p style={{color:'#6b7c6e', marginBottom:'20px', fontSize:'0.88rem'}}>Modifiez vos filtres</p>
                <button onClick={resetFilters} style={{padding:'10px 24px', background:'#1a7a4a', color:'white', border:'none', borderRadius:'9px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer'}}>
                  Voir tout
                </button>
              </div>
            ) : immoAds.map((ad: any) => (
              <div key={ad.id} className="immo-card"
                onClick={() => { setSelectedImmoAd(ad); window.location.href='/annonce/' + generateSlug(ad) }}
                style={{background:'white', borderRadius:'14px', overflow:'hidden', cursor:'pointer', border: selectedImmoAd?.id === ad.id ? '2px solid #1a7a4a' : (FEATURE_FLAGS.boostedListings && ad.is_boosted ? '1.5px solid #f5a623' : '1px solid #e8ede9'), boxShadow: selectedImmoAd?.id === ad.id ? '0 4px 20px rgba(26,122,74,0.15)' : '0 1px 4px rgba(0,0,0,0.06)', display:'grid', gridTemplateColumns:'140px 1fr'}}>

                <div style={{height:'130px', background:'#f5f7f5', overflow:'hidden', position:'relative', flexShrink:0}}>
                  {ad.images && ad.images.length > 0 ? (
                    <img src={ad.images[0]} alt={ad.title} style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                  ) : (
                    <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', opacity:0.55}}>Photo</div>
                  )}
                  <div style={{position:'absolute', top:'8px', left:'8px', display:'flex', gap:'4px', flexDirection:'column'}}>
                    {FEATURE_FLAGS.boostedListings && ad.is_boosted && (
                      <span style={{background:'#f5a623', color:'#111a14', padding:'2px 6px', borderRadius:'5px', fontSize:'0.6rem', fontWeight:800}}>Mis en avant</span>
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
                    <div style={{fontFamily:'DM Sans,sans-serif', fontWeight:800, fontSize:'1rem', color:'#0f5233', marginBottom:'3px', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.01em'}}>
                      {Number(ad.price).toLocaleString()} <span style={{fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e'}}>RWF{ad.category === 'immo-location' ? '/mois' : ''}</span>
                    </div>
                    <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#111a14', marginBottom:'8px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                      {ad.title}
                    </div>
                    <div style={{display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'6px'}}>
                      {ad.surface && <span style={{fontSize:'0.7rem', color:'#6b7c6e'}}>Surface {ad.surface} m2</span>}
                      {ad.chambres && <span style={{fontSize:'0.7rem', color:'#6b7c6e'}}>{ad.chambres} ch.</span>}
                      {ad.salles_de_bain && <span style={{fontSize:'0.7rem', color:'#6b7c6e'}}>{ad.salles_de_bain} sdb</span>}
                      {ad.surface && ad.price && ad.category !== 'immo-location' && (
                        <span style={{fontSize:'0.7rem', color:'#1a7a4a', fontWeight:600}}>
                          {Math.round(ad.price / ad.surface).toLocaleString()} RWF/m2
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px'}}>
                    <span style={{fontSize:'0.7rem', color:'#6b7c6e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                      {ad.province}{ad.district ? ' - ' + ad.district : ''}
                    </span>
                    <div onClick={e => e.stopPropagation()}>
                      <FavoriteButton adId={ad.id} onLogin={() => window.location.href='/auth?mode=login'} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Colonne droite - map + espace libre */}
          <div className={`immo-map-panel ${showMap ? 'show' : ''}`}
            style={{position:'sticky', top:'140px', display:'flex', flexDirection:'column', gap:'16px'}}>

            <div style={{borderRadius:'14px', overflow:'hidden', border:'1px solid #e8ede9', boxShadow:'0 2px 12px rgba(0,0,0,0.08)', aspectRatio:'1 / 1', position:'relative', background:'#e8ede9', minHeight:'320px'}}>
              <div ref={mapRef} style={{width:'100%', height:'100%'}} />

              {!MAPBOX_TOKEN && (
                <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px', color:'#6b7c6e'}}>
                  <div style={{fontSize:'1rem', fontWeight:700}}>Carte</div>
                  <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem'}}>Carte non disponible</p>
                </div>
              )}
            </div>

            {selectedImmoAd && (
              <div style={{background:'white', borderRadius:'12px', padding:'14px 16px', border:'1px solid #e8ede9', boxShadow:'0 4px 16px rgba(0,0,0,0.08)', display:'flex', gap:'12px', alignItems:'center'}}>
                <div style={{width:'52px', height:'52px', borderRadius:'8px', overflow:'hidden', flexShrink:0}}>
                  {selectedImmoAd.images?.[0] ? (
                    <img src={selectedImmoAd.images[0]} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                  ) : (
                    <div style={{width:'100%', height:'100%', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem'}}>Photo</div>
                  )}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.88rem', color:'#0f5233', marginBottom:'2px'}}>
                    {Number(selectedImmoAd.price).toLocaleString()} RWF
                  </div>
                  <div style={{fontSize:'0.75rem', color:'#111a14', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {selectedImmoAd.title}
                  </div>
                  <div style={{fontSize:'0.68rem', color:'#6b7c6e'}}>{selectedImmoAd.province}</div>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'5px', flexShrink:0}}>
                  <button onClick={() => window.location.href='/annonce/' + generateSlug(selectedImmoAd)}
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
      {!search.startsWith('@') && activeSection === 'main' && !isImmoMode && (
        <div style={{padding:'24px 5%', maxWidth:'1300px', margin:'0 auto'}}>
          <div style={{background:'white', borderRadius:'12px', padding:'12px 16px', marginBottom:'20px', border:'1px solid #e8ede9'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', flexWrap:'wrap'}}>
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <button onClick={() => setShowFilters(!showFilters)} style={{display:'flex', alignItems:'center', gap:'5px', padding:'7px 13px', background: showFilters ? '#1a7a4a' : '#f5f7f5', color: showFilters ? 'white' : '#111a14', border:'1px solid ' + (showFilters ? '#1a7a4a' : '#e8ede9'), borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.82rem', cursor:'pointer'}}>
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
                    {searchSaved ? 'Alerte creee !' : 'Creer une alerte'}
                  </button>
                )}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{padding:'7px 10px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer', color:'#111a14'}}>
                  <option value="recent">Plus recent</option>
                  <option value="ancien">Plus ancien</option>
                  <option value="moins-cher">Moins cher</option>
                  <option value="plus-cher">Plus cher</option>
                </select>
                <span style={{fontSize:'0.8rem', color:'#6b7c6e', whiteSpace:'nowrap'}}>
                  {ads.length > 0 ? filtered.length + ' annonce(s)' : '6 annonces'}
                </span>
              </div>
            </div>

            {showFilters && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #f0f4f1'}}>
                <div>
                  <label style={{display:'block', fontSize:'0.7rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Sous-categorie</label>
                  <select value={filterSubcat} onChange={e => setFilterSubcat(e.target.value)} style={{width:'100%', padding:'8px 10px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer'}} disabled={subcats.length === 0}>
                    <option value="">{subcats.length === 0 ? 'Choisir une catégorie' : 'Toutes'}</option>
                    {subcats.filter(s => s.value !== '').map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{display:'block', fontSize:'0.7rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Ville</label>
                  <select value={filterVille} onChange={e => setFilterVille(e.target.value)} style={{width:'100%', padding:'8px 10px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'white', cursor:'pointer'}}>
                    <option value="">Toutes</option>
                    {villes.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block', fontSize:'0.7rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Prix (RWF)</label>
                  <div style={{display:'flex', gap:'6px'}}>
                    <input type="number" placeholder="Min" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)} style={{width:'50%', padding:'8px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.78rem', outline:'none', background:'white'}}/>
                    <input type="number" placeholder="Max" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)} style={{width:'50%', padding:'8px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.78rem', outline:'none', background:'white'}}/>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{textAlign:'center', padding:'60px', color:'#6b7c6e'}}>Chargement...</div>
          ) : displayAds.length === 0 ? (
            <div style={{background:'white', borderRadius:'14px', padding:'56px', textAlign:'center', border:'1px solid #e8ede9'}}>
              <div style={{fontSize:'2.5rem', marginBottom:'12px'}}>🔍</div>
              <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, marginBottom:'8px', color:'#111a14'}}>Aucun resultat</h3>
              <p style={{color:'#6b7c6e', marginBottom:'20px', fontSize:'0.9rem'}}>Essayez d autres termes ou filtres</p>
              <button onClick={resetFilters} style={{padding:'10px 24px', background:'#1a7a4a', color:'white', border:'none', borderRadius:'9px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer'}}>
                Voir toutes les annonces
              </button>
            </div>
          ) : (
            <div className="ads-grid" style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px'}}>
              {displayAds.map((ad: any) => (
                <div key={ad.id} className="ad-card" onClick={() => window.location.href='/annonce/' + generateSlug(ad)}
                  style={{background:'white', borderRadius:'14px', overflow:'hidden', cursor:'pointer', border: FEATURE_FLAGS.boostedListings && ad.is_boosted ? '1.5px solid #f5a623' : '1px solid #e8ede9', boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                  <div style={{height:'176px', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3.5rem', overflow:'hidden', position:'relative'}}>
                    {ad.images && ad.images.length > 0 ? (
                      <img src={ad.images[0]} alt={ad.title} style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                    ) : (
                      <span style={{opacity:0.5}}>{catEmoji[ad.category] || '📦'}</span>
                    )}
                    {FEATURE_FLAGS.boostedListings && ad.is_boosted && (
                      <div style={{position:'absolute', top:'10px', left:'10px', background:'#f5a623', color:'#111a14', padding:'3px 9px', borderRadius:'6px', fontSize:'0.68rem', fontWeight:800}}>
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
                    <div style={{position:'absolute', top:'10px', right:'10px'}} onClick={e => e.stopPropagation()}>
                      <FavoriteButton adId={ad.id} onLogin={() => window.location.href='/auth?mode=login'} />
                    </div>
                  </div>
                  <div style={{padding:'14px'}}>
                    <div style={{fontSize:'0.66rem', fontWeight:600, color:'#1a7a4a', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'5px'}}>
                      {ad.subcategory ? ad.subcategory : ad.category}
                    </div>
                    <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.93rem', marginBottom:'5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#111a14'}}>{ad.title}</div>
                    <div style={{fontFamily:'DM Sans,sans-serif', fontWeight:800, fontSize:'1rem', color:'#0f5233', marginBottom:'8px', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.01em'}}>
                      {Number(ad.price).toLocaleString()} <span style={{fontSize:'0.75rem', fontWeight:600}}>RWF</span>
                    </div>
                    <div style={{fontSize:'0.72rem', color:'#6b7c6e', marginBottom:'10px', height:'18px', overflow:'hidden'}}>
                      {ad.province && <>📍 {ad.province}</>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); window.location.href='/annonce/' + generateSlug(ad) }} style={{width:'100%', padding:'8px', background:'#f5f7f5', color:'#0f5233', border:'1px solid #d4e6da', borderRadius:'8px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.8rem', cursor:'pointer'}}>
                      Voir l annonce
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
          <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.4rem', marginBottom:'20px', color:'#111a14'}}>💼 Offres d emploi</h2>
          {[
            {co:'🏦', title:'Developpeur Full-Stack Senior', company:'Bank of Kigali', loc:'Kigali', salary:'1 200 000 - 1 800 000 RWF/mois', type:'CDI'},
            {co:'🏥', title:'Infirmier diplome', company:'King Faisal Hospital', loc:'Kigali', salary:'700 000 - 950 000 RWF/mois', type:'CDI'},
            {co:'🌍', title:'Responsable Programmes', company:'Save the Children Rwanda', loc:'Kigali', salary:'1 500 000 - 2 000 000 RWF/mois', type:'CDD'},
          ].map((job, i) => (
            <div key={i} style={{background:'white', borderRadius:'12px', padding:'18px 20px', border:'1px solid #e8ede9', marginBottom:'10px', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer'}}>
              <div style={{fontSize:'1.6rem', flexShrink:0}}>{job.co}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.92rem', marginBottom:'3px', color:'#111a14'}}>{job.title}</div>
                <div style={{fontSize:'0.8rem', color:'#1a7a4a', fontWeight:600, marginBottom:'2px'}}>{job.company}</div>
                <div style={{fontSize:'0.75rem', color:'#6b7c6e'}}>📍 {job.loc} · {job.type}</div>
              </div>
              <div style={{textAlign:'right', flexShrink:0}}>
                <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, color:'#111a14', fontSize:'0.82rem', marginBottom:'6px'}}>{job.salary}</div>
                <button onClick={() => window.location.href='/auth'} style={{padding:'6px 14px', background:'#0f5233', color:'white', border:'none', borderRadius:'8px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.78rem', cursor:'pointer'}}>Postuler</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FOOTER ── */}
      {!isImmoMode && (
        <footer style={{background:'#0f5233', color:'rgba(255,255,255,0.6)', padding:'36px 5%', marginTop:'40px'}}>
          <div style={{maxWidth:'1300px', margin:'0 auto', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'16px', alignItems:'center'}}>
            <div>
              <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.15rem', color:'white', marginBottom:'4px'}}>Soko<span style={{color:'#f5a623'}}>Deal</span></div>
              <p style={{fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', maxWidth:'240px', lineHeight:1.6}}>La premiere plateforme d annonces d Afrique.</p>
            </div>
            <div style={{display:'flex', gap:'20px', fontSize:'0.8rem', alignItems:'center'}}>
              <a href="/admin" style={{color:'rgba(255,255,255,0.3)', textDecoration:'none'}}>Admin</a>
              <a href="/cgu" style={{color:'rgba(255,255,255,0.3)', textDecoration:'none'}}>CGU</a>
              <span style={{color:'rgba(255,255,255,0.4)'}}>2025 SokoDeal · Made in Africa</span>
            </div>
          </div>
        </footer>
      )}
    </>
  )
}
