'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import mapboxgl from 'mapbox-gl'
import Header from '@/components/Header'
import { generateSlug } from '@/lib/slug'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

const CATEGORIES_IMMO = [
  { value: '', label: 'Tout' },
  { value: 'immo-vente', label: '🏡 Vente' },
  { value: 'immo-location', label: '🏢 Location' },
  { value: 'immo-terrain', label: '🌿 Terrain' },
]

const QUARTIERS = [
  'Tous', 'Kicukiro', 'Nyarugenge', 'Gasabo', 'Kimironko',
  'Remera', 'Gikondo', 'Nyamirambo', 'Kibagabaga', 'Gisozi',
  'Kanombe', 'Niboye', 'Kagarama', 'Masaka'
]

export default function ImmoPage() {
  const mapContainer = useRef<any>(null)
  const map = useRef<any>(null)
  const markers = useRef<any[]>([])

  const [ads, setAds] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [selectedAd, setSelectedAd] = useState<any>(null)
  const [showMap, setShowMap] = useState(true)

  const [filterCat, setFilterCat] = useState('')
  const [filterQuartier, setFilterQuartier] = useState('Tous')
  const [filterPriceMin, setFilterPriceMin] = useState('')
  const [filterPriceMax, setFilterPriceMax] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await getCurrentUser()
        setUser(user)

        const { data } = await supabase
          .from('ads')
          .select('*')
          .eq('is_active', true)
          .in('category', ['immo-vente', 'immo-location', 'immo-terrain'])
          .order('created_at', { ascending: false })

        if (data) {
          const adsWithCoords = data.map(ad => ({
            ...ad,
            lng: 30.0619 + (Math.random() - 0.5) * 0.08,
            lat: -1.9441 + (Math.random() - 0.5) * 0.08,
          }))
          setAds(adsWithCoords)
          setFiltered(adsWithCoords)
        }
      } catch (err) {
        console.error('immo init error:', err)
      } finally {
        setLoading(false)
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
    if (!mapContainer.current || map.current || !showMap) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [30.0619, -1.9441],
      zoom: 12,
    })
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
  }, [showMap])

  useEffect(() => {
    if (!map.current) return
    markers.current.forEach(m => m.remove())
    markers.current = []

    filtered.forEach(ad => {
      const color = ad.category === 'immo-vente' ? '#1a7a4a' : ad.category === 'immo-location' ? '#f5a623' : '#6b7c6e'
      const el = document.createElement('div')
      el.style.cssText = `
        background: ${color};
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 800;
        font-family: Syne, sans-serif;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        white-space: nowrap;
        border: 2px solid white;
      `
      el.innerText = Number(ad.price).toLocaleString() + ' RWF'
      el.addEventListener('click', () => setSelectedAd(ad))

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([ad.lng, ad.lat])
        .addTo(map.current)
      markers.current.push(marker)
    })
  }, [filtered])

  useEffect(() => {
    let result = [...ads]
    if (search) result = result.filter(ad => ad.title?.toLowerCase().includes(search.toLowerCase()) || ad.description?.toLowerCase().includes(search.toLowerCase()))
    if (filterCat) result = result.filter(ad => ad.category === filterCat)
    if (filterQuartier !== 'Tous') result = result.filter(ad => ad.district?.toLowerCase().includes(filterQuartier.toLowerCase()) || ad.province?.toLowerCase().includes(filterQuartier.toLowerCase()))
    if (filterPriceMin) result = result.filter(ad => ad.price >= parseInt(filterPriceMin))
    if (filterPriceMax) result = result.filter(ad => ad.price <= parseInt(filterPriceMax))
    if (sortBy === 'prix-asc') result.sort((a, b) => a.price - b.price)
    else if (sortBy === 'prix-desc') result.sort((a, b) => b.price - a.price)
    else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setFiltered(result)
  }, [search, filterCat, filterQuartier, filterPriceMin, filterPriceMax, sortBy, ads])

  const catLabel: any = {
    'immo-vente': 'Vente',
    'immo-location': 'Location',
    'immo-terrain': 'Terrain',
  }

  const catColor: any = {
    'immo-vente': '#1a7a4a',
    'immo-location': '#f5a623',
    'immo-terrain': '#6b7c6e',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7f5', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .immo-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important; }
        .immo-card { transition: transform 0.18s, box-shadow 0.18s; }
        .map-panel { transition: width 0.3s ease, opacity 0.3s ease; }
        @media (max-width: 768px) {
          .immo-layout { flex-direction: column !important; }
          .map-panel { width: 100% !important; height: 300px !important; position: static !important; }
        }
      `}</style>

      <Header />

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg, #0f5233 0%, #1a7a4a 100%)', padding: '32px 5%' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'white', marginBottom: '8px' }}>
            Trouvez votre bien immobilier au Rwanda
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {filtered.length} bien(s) disponible(s)
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', background: 'white', borderRadius: '10px', overflow: 'hidden' }}>
              <input
                type="text"
                placeholder="Rechercher un bien..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, padding: '12px 16px', border: 'none', outline: 'none', fontFamily: 'DM Sans,sans-serif', fontSize: '0.9rem', color: '#111a14' }}
              />
              <button style={{ background: '#f5a623', border: 'none', padding: '12px 18px', cursor: 'pointer', fontSize: '1rem' }}>🔍</button>
            </div>
            {CATEGORIES_IMMO.map(cat => (
              <button key={cat.value} onClick={() => setFilterCat(cat.value)}
                style={{ padding: '12px 18px', background: filterCat === cat.value ? 'white' : 'rgba(255,255,255,0.15)', color: filterCat === cat.value ? '#1a7a4a' : 'white', border: 'none', borderRadius: '10px', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FILTRES */}
      <div style={{ background: 'white', borderBottom: '1px solid #e8ede9', padding: '12px 5%' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterQuartier} onChange={e => setFilterQuartier(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e8ede9', borderRadius: '8px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.82rem', outline: 'none', background: 'white', cursor: 'pointer', color: '#111a14' }}>
            {QUARTIERS.map(q => <option key={q} value={q}>{q === 'Tous' ? 'Quartier' : q}</option>)}
          </select>

          <input type="number" placeholder="Prix min (RWF)" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e8ede9', borderRadius: '8px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.82rem', outline: 'none', width: '150px', color: '#111a14' }} />

          <input type="number" placeholder="Prix max (RWF)" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e8ede9', borderRadius: '8px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.82rem', outline: 'none', width: '150px', color: '#111a14' }} />

          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e8ede9', borderRadius: '8px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.82rem', outline: 'none', background: 'white', cursor: 'pointer', color: '#111a14' }}>
            <option value="recent">Plus recent</option>
            <option value="prix-asc">Prix croissant</option>
            <option value="prix-desc">Prix decroissant</option>
          </select>

          <span style={{ fontSize: '0.82rem', color: '#6b7c6e', marginLeft: 'auto' }}>{filtered.length} bien(s)</span>

          {(filterCat || filterQuartier !== 'Tous' || filterPriceMin || filterPriceMax || search) && (
            <button onClick={() => { setFilterCat(''); setFilterQuartier('Tous'); setFilterPriceMin(''); setFilterPriceMax(''); setSearch('') }}
              style={{ padding: '8px 12px', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '8px', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
              Effacer filtres
            </button>
          )}
        </div>
      </div>

      {/* LAYOUT */}
      <div className="immo-layout" style={{ display: 'flex', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '16px 5%', gap: showMap ? '16px' : '0' }}>

        {/* LISTE */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7c6e' }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '14px', padding: '48px', textAlign: 'center', border: '1px solid #e8ede9' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏡</div>
              <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, marginBottom: '8px', color: '#111a14' }}>Aucun bien trouve</h3>
              <p style={{ color: '#6b7c6e', fontSize: '0.88rem' }}>Modifiez vos filtres ou publiez une annonce</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: showMap ? '1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
              {filtered.map((ad: any) => (
                showMap ? (
                  // VUE LISTE AVEC CARTE
                  <div key={ad.id} className="immo-card"
                    onClick={() => { setSelectedAd(ad); if (map.current) map.current.flyTo({ center: [ad.lng, ad.lat], zoom: 15 }) }}
                    style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', border: selectedAd?.id === ad.id ? '2px solid #1a7a4a' : '1px solid #e8ede9', display: 'flex', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: '180px', minHeight: '130px', background: '#f5f7f5', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', overflow: 'hidden', position: 'relative' }}>
                      {ad.images && ad.images.length > 0 ? (
                        <img src={ad.images[0]} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ opacity: 0.4 }}>🏡</span>
                      )}
                      <div style={{ position: 'absolute', top: '8px', left: '8px', background: catColor[ad.category] || '#6b7c6e', color: 'white', padding: '3px 8px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: 700 }}>
                        {catLabel[ad.category] || ad.category}
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: '14px', minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#111a14', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                          {ad.title}
                        </h3>
                        <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0f5233', flexShrink: 0 }}>
                          {Number(ad.price).toLocaleString()} <span style={{ fontSize: '0.7rem', color: '#6b7c6e' }}>RWF</span>
                          {ad.category === 'immo-location' && <span style={{ fontSize: '0.62rem', color: '#6b7c6e' }}>/mois</span>}
                        </div>
                      </div>
                      {ad.province && <div style={{ fontSize: '0.75rem', color: '#6b7c6e', marginBottom: '6px' }}>📍 {ad.province}{ad.district ? ' · ' + ad.district : ''}</div>}
                      {ad.description && <p style={{ fontSize: '0.75rem', color: '#6b7c6e', margin: '0 0 10px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{ad.description}</p>}
                      <button onClick={e => { e.stopPropagation(); window.location.href = '/annonce/' + generateSlug(ad) }}
                        style={{ padding: '6px 14px', background: '#1a7a4a', color: 'white', border: 'none', borderRadius: '7px', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                        Voir le bien
                      </button>
                    </div>
                  </div>
                ) : (
                  // VUE GRILLE SANS CARTE
                  <div key={ad.id} className="immo-card"
                    onClick={() => window.location.href = '/annonce/' + generateSlug(ad)}
                    style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #e8ede9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ height: '180px', background: '#f5f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', overflow: 'hidden', position: 'relative' }}>
                      {ad.images && ad.images.length > 0 ? (
                        <img src={ad.images[0]} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ opacity: 0.4 }}>🏡</span>
                      )}
                      <div style={{ position: 'absolute', top: '8px', left: '8px', background: catColor[ad.category] || '#6b7c6e', color: 'white', padding: '3px 8px', borderRadius: '5px', fontSize: '0.65rem', fontWeight: 700 }}>
                        {catLabel[ad.category] || ad.category}
                      </div>
                    </div>
                    <div style={{ padding: '14px' }}>
                      <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#111a14', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ad.title}
                      </h3>
                      <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0f5233', marginBottom: '6px' }}>
                        {Number(ad.price).toLocaleString()} <span style={{ fontSize: '0.7rem', color: '#6b7c6e' }}>RWF</span>
                        {ad.category === 'immo-location' && <span style={{ fontSize: '0.62rem', color: '#6b7c6e' }}>/mois</span>}
                      </div>
                      {ad.province && <div style={{ fontSize: '0.75rem', color: '#6b7c6e', marginBottom: '10px' }}>📍 {ad.province}{ad.district ? ' · ' + ad.district : ''}</div>}
                      <button onClick={e => { e.stopPropagation(); window.location.href = '/annonce/' + generateSlug(ad) }}
                        style={{ width: '100%', padding: '8px', background: '#f5f7f5', color: '#0f5233', border: '1px solid #d4e6da', borderRadius: '8px', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                        Voir le bien
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        {/* CARTE */}
        <div className="map-panel" style={{ width: showMap ? '480px' : '0px', flexShrink: 0, position: 'sticky', top: '74px', height: 'calc(100vh - 90px)', overflow: 'hidden', transition: 'width 0.3s ease' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e8ede9' }} />

          {selectedAd && showMap && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', background: 'white', borderRadius: '12px', padding: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #e8ede9' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#f5f7f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  {selectedAd.images?.[0] ? <img src={selectedAd.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏡'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#111a14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedAd.title}</div>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, color: '#0f5233', fontSize: '0.9rem' }}>{Number(selectedAd.price).toLocaleString()} RWF</div>
                  {selectedAd.province && <div style={{ fontSize: '0.72rem', color: '#6b7c6e' }}>📍 {selectedAd.province}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => window.location.href = '/annonce/' + generateSlug(selectedAd)}
                    style={{ padding: '6px 12px', background: '#1a7a4a', color: 'white', border: 'none', borderRadius: '7px', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                    Voir
                  </button>
                  <button onClick={() => setSelectedAd(null)}
                    style={{ padding: '6px 12px', background: '#f5f7f5', color: '#6b7c6e', border: '1px solid #e8ede9', borderRadius: '7px', fontFamily: 'DM Sans,sans-serif', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
