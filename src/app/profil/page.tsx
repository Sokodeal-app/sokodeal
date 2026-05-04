'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { useFavorites } from '@/hooks/useFavorites'
import FavoriteButton from '@/components/FavoriteButton'
import Header from '@/components/Header'
import { FEATURE_FLAGS } from '@/lib/feature-flags'
import { LAUNCH_CITIES } from '@/lib/market-config'
import { generateSlug } from '@/lib/slug'

function AlertesTab({ userId }: { userId: string }) {
  const [searches, setSearches] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSubTab, setActiveSubTab] = useState<'alertes' | 'historique'>('alertes')
  const [showNewAlert, setShowNewAlert] = useState(false)
  const [alertForm, setAlertForm] = useState({ query: '', category: '', province: '', price_min: '', price_max: '' })
  const [savingAlert, setSavingAlert] = useState(false)

  const categories = [
    { value:'immo-vente', label:' Immobilier Vente' },
    { value:'immo-location', label:' Immobilier Location' },
    { value:'immo-terrain', label:' Terrain' },
    { value:'voiture', label:' Voitures' },
    { value:'moto', label:' Motos' },
    { value:'electronique', label:' Electronique' },
    { value:'mode', label:' Mode' },
    { value:'maison', label:' Maison' },
    { value:'emploi', label:' Emploi' },
    { value:'animaux', label:' Animaux' },
    { value:'services', label:' Services' },
    { value:'agriculture', label:' Agriculture' },
    { value:'materiaux', label:' Materiaux' },
    { value:'sante', label:' Sante' },
    { value:'sport', label:' Sport' },
    { value:'education', label:' Education' },
  ]

  const villes = LAUNCH_CITIES

  useEffect(() => {
    const load = async () => {
      const [{ data: alertsData }, { data: histData }] = await Promise.all([
        supabase.from('saved_searches').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('search_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
      ])
      if (alertsData) setSearches(alertsData)
      if (histData) {
        const seen = new Set()
        const unique = histData.filter((h: any) => {
          const key = (h.query || '') + (h.category || '') + (h.province || '')
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        setHistory(unique)
      }
      setLoading(false)
    }
    load()
  }, [userId])

  const handleCreateAlert = async () => {
    if (!alertForm.query && !alertForm.category && !alertForm.province) return
    setSavingAlert(true)
    const { error } = await supabase.from('saved_searches').insert([{
      user_id: userId,
      query: alertForm.query || null,
      category: alertForm.category || null,
      province: alertForm.province || null,
      price_min: alertForm.price_min ? parseInt(alertForm.price_min) : null,
      price_max: alertForm.price_max ? parseInt(alertForm.price_max) : null,
      alert_enabled: true,
    }])
    setSavingAlert(false)
    if (!error) {
      const { data } = await supabase.from('saved_searches').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (data) setSearches(data)
      setShowNewAlert(false)
      setAlertForm({ query: '', category: '', province: '', price_min: '', price_max: '' })
    }
  }

  const handleAlertFromHistory = async (h: any) => {
    await supabase.from('saved_searches').insert([{
      user_id: userId,
      query: h.query || null,
      category: h.category || null,
      province: h.province || null,
      alert_enabled: true,
    }])
    const { data } = await supabase.from('saved_searches').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (data) setSearches(data)
    setActiveSubTab('alertes')
  }

  const toggleAlert = async (id: string, current: boolean) => {
    await supabase.from('saved_searches').update({ alert_enabled: !current }).eq('id', id)
    setSearches(prev => prev.map(s => s.id === id ? { ...s, alert_enabled: !current } : s))
  }

  const deleteAlert = async (id: string) => {
    await supabase.from('saved_searches').delete().eq('id', id)
    setSearches(prev => prev.filter(s => s.id !== id))
  }

  const deleteHistory = async (id: string) => {
    await supabase.from('search_history').delete().eq('id', id)
    setHistory(prev => prev.filter(h => h.id !== id))
  }

  const renderTags = (s: any) => (
    <div style={{display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap'}}>
      {s.query && <span style={{background:'#e8f5ee', color:'#1a7a4a', padding:'2px 8px', borderRadius:'6px', fontSize:'0.72rem', fontWeight:600}}> {s.query}</span>}
      {s.category && <span style={{background:'#f5f7f5', color:'#6b7c6e', padding:'2px 8px', borderRadius:'6px', fontSize:'0.72rem', fontWeight:600}}>{s.category}</span>}
      {s.province && <span style={{background:'#f5f7f5', color:'#6b7c6e', padding:'2px 8px', borderRadius:'6px', fontSize:'0.72rem', fontWeight:600}}> {s.province}</span>}
      {s.price_min && <span style={{background:'#f5f7f5', color:'#6b7c6e', padding:'2px 8px', borderRadius:'6px', fontSize:'0.72rem', fontWeight:600}}>Min: {Number(s.price_min).toLocaleString()} RWF</span>}
      {s.price_max && <span style={{background:'#f5f7f5', color:'#6b7c6e', padding:'2px 8px', borderRadius:'6px', fontSize:'0.72rem', fontWeight:600}}>Max: {Number(s.price_max).toLocaleString()} RWF</span>}
    </div>
  )

  if (loading) return <div style={{textAlign:'center', padding:'40px', color:'#6b7c6e'}}>Chargement...</div>

  return (
    <div>
      <div style={{display:'flex', gap:'6px', marginBottom:'16px'}}>
        {[
          { id:'alertes', label:' Mes alertes', count: searches.length },
          { id:'historique', label:' Historique', count: history.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} style={{
            padding:'8px 16px', border: activeSubTab === tab.id ? 'none' : '1px solid #e8ede9',
            borderRadius:'9px', cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            fontWeight:600, fontSize:'0.82rem',
            background: activeSubTab === tab.id ? '#1a7a4a' : 'white',
            color: activeSubTab === tab.id ? 'white' : '#6b7c6e',
          }}>
            {tab.label} <span style={{marginLeft:'4px', background: activeSubTab === tab.id ? 'rgba(255,255,255,0.25)' : '#f5f7f5', padding:'1px 6px', borderRadius:'8px', fontSize:'0.72rem'}}>{tab.count}</span>
          </button>
        ))}
      </div>

      {activeSubTab === 'alertes' && (
        <div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px'}}>
            <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', color:'#111a14'}}> Alertes</h2>
            <button onClick={() => setShowNewAlert(!showNewAlert)} style={{padding:'8px 16px', background:'#1a7a4a', border:'none', borderRadius:'9px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', color:'white', cursor:'pointer'}}>
              + Nouvelle alerte
            </button>
          </div>

          {showNewAlert && (
            <div style={{background:'white', borderRadius:'14px', padding:'20px', border:'1.5px solid #1a7a4a', marginBottom:'16px'}}>
              <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'14px', color:'#111a14'}}>Creer une alerte</h3>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
                <div style={{gridColumn:'span 2'}}>
                  <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Mot-cle</label>
                  <input value={alertForm.query} onChange={e => setAlertForm({...alertForm, query: e.target.value})}
                    placeholder="Ex: iPhone, Toyota, Appartement..."
                    style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', outline:'none', color:'#111a14', background:'#fafaf9'}} />
                </div>
                <div>
                  <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Categorie</label>
                  <select value={alertForm.category} onChange={e => setAlertForm({...alertForm, category: e.target.value})}
                    style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', outline:'none', color:'#111a14', background:'#fafaf9'}}>
                    <option value="">Toutes</option>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Ville</label>
                  <select value={alertForm.province} onChange={e => setAlertForm({...alertForm, province: e.target.value})}
                    style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', outline:'none', color:'#111a14', background:'#fafaf9'}}>
                    <option value="">Toutes</option>
                    {villes.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Prix min (RWF)</label>
                  <input type="number" value={alertForm.price_min} onChange={e => setAlertForm({...alertForm, price_min: e.target.value})}
                    placeholder="0"
                    style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', outline:'none', color:'#111a14', background:'#fafaf9'}} />
                </div>
                <div>
                  <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Prix max (RWF)</label>
                  <input type="number" value={alertForm.price_max} onChange={e => setAlertForm({...alertForm, price_max: e.target.value})}
                    placeholder="Max"
                    style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', outline:'none', color:'#111a14', background:'#fafaf9'}} />
                </div>
              </div>
              <div style={{display:'flex', gap:'8px'}}>
                <button onClick={handleCreateAlert} disabled={savingAlert || (!alertForm.query && !alertForm.category && !alertForm.province)}
                  style={{flex:1, padding:'11px', background: savingAlert ? '#ccc' : '#1a7a4a', border:'none', borderRadius:'9px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.9rem', color:'white', cursor:'pointer'}}>
                  {savingAlert ? 'Chargement...' : 'Creer l alerte'}
                </button>
                <button onClick={() => setShowNewAlert(false)} style={{padding:'11px 16px', background:'#f5f7f5', border:'1px solid #e8ede9', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.88rem', color:'#6b7c6e', cursor:'pointer'}}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {searches.length === 0 ? (
            <div style={{background:'white', borderRadius:'14px', padding:'48px', textAlign:'center', border:'1px solid #e8ede9'}}>
              <div style={{fontSize:'2.5rem', marginBottom:'12px'}}></div>
              <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, marginBottom:'8px', color:'#111a14'}}>Aucune alerte</h3>
              <p style={{color:'#6b7c6e', marginBottom:'20px', fontSize:'0.88rem'}}>Creez une alerte pour etre notifie des nouvelles annonces</p>
              <button onClick={() => setShowNewAlert(true)} style={{padding:'10px 24px', background:'#1a7a4a', color:'white', border:'none', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer'}}>
                + Creer une alerte
              </button>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {searches.map((s: any) => (
                <div key={s.id} style={{background:'white', borderRadius:'12px', padding:'16px 20px', border:'1px solid #e8ede9'}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap'}}>
                    <div style={{flex:1, minWidth:0}}>
                      {renderTags(s)}
                      <div style={{fontSize:'0.7rem', color:'#9ca3af', marginTop:'6px'}}>
                        Creee le {new Date(s.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'long'})}
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'6px', flexShrink:0}}>
                      <button onClick={() => toggleAlert(s.id, s.alert_enabled)} style={{
                        padding:'5px 10px', borderRadius:'7px',
                        border:'1px solid ' + (s.alert_enabled ? '#b7dfca' : '#e8ede9'),
                        background: s.alert_enabled ? '#e8f5ee' : '#f5f7f5',
                        color: s.alert_enabled ? '#1a7a4a' : '#6b7c6e',
                        fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.75rem', cursor:'pointer'
                      }}>
                        {s.alert_enabled ? 'Active' : 'Off'}
                      </button>
                      <button onClick={() => deleteAlert(s.id)} style={{padding:'5px 10px', borderRadius:'7px', border:'1px solid #ffd6d6', background:'#fff1f0', color:'#c0392b', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.75rem', cursor:'pointer'}}>
                        Suppr.
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'historique' && (
        <div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px'}}>
            <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', color:'#111a14'}}>Historique des recherches</h2>
            {history.length > 0 && (
              <button onClick={async () => {
                await supabase.from('search_history').delete().eq('user_id', userId)
                setHistory([])
              }} style={{padding:'7px 14px', background:'#fff1f0', border:'1px solid #ffd6d6', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.78rem', color:'#c0392b', cursor:'pointer'}}>
                Tout effacer
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{background:'white', borderRadius:'14px', padding:'48px', textAlign:'center', border:'1px solid #e8ede9'}}>
              <div style={{fontSize:'2.5rem', marginBottom:'12px'}}></div>
              <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, marginBottom:'8px', color:'#111a14'}}>Aucun historique</h3>
              <p style={{color:'#6b7c6e', fontSize:'0.88rem'}}>Vos recherches apparaitront ici automatiquement</p>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
              {history.map((h: any) => (
                <div key={h.id} style={{background:'white', borderRadius:'12px', padding:'14px 16px', border:'1px solid #e8ede9', display:'flex', alignItems:'center', gap:'12px'}}>
                  <div style={{flex:1, minWidth:0}}>
                    {renderTags(h)}
                    <div style={{fontSize:'0.7rem', color:'#9ca3af', marginTop:'4px'}}>
                      {new Date(h.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'long'})}
                    </div>
                  </div>
                  <div style={{display:'flex', gap:'6px', flexShrink:0}}>
                    <button onClick={() => handleAlertFromHistory(h)} style={{padding:'5px 10px', borderRadius:'7px', border:'1px solid #b7dfca', background:'#e8f5ee', color:'#1a7a4a', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.72rem', cursor:'pointer', whiteSpace:'nowrap'}}>
                      Creer alerte
                    </button>
                    <button onClick={() => deleteHistory(h.id)} style={{padding:'5px 8px', borderRadius:'7px', border:'1px solid #ffd6d6', background:'#fff1f0', color:'#c0392b', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.72rem', cursor:'pointer'}}>
                      Suppr.
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatsTab({ userId, ads }: { userId: string, ads: any[] }) {
  const [views, setViews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      setError('')

      const visibleAds = ads.filter(ad => !ad.deleted_at)
      const adIds = visibleAds.map(ad => ad.id).filter(Boolean)
      if (adIds.length === 0) {
        setViews([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('ad_views')
        .select('*')
        .in('ad_id', adIds)
        .order('created_at', { ascending: false })

      if (error) {
        setError('Les statistiques de vues ne sont pas encore disponibles.')
        setViews([])
        setLoading(false)
        return
      }

      setViews(data || [])
      setLoading(false)
    }

    loadStats()
  }, [userId, ads])

  const visibleAds = ads.filter(ad => !ad.deleted_at)
  const soldAds = visibleAds.filter(ad => ad.is_sold)
  const activeAds = visibleAds.filter(ad => ad.is_active && !ad.is_sold)
  const totalViews = views.length
  const visitorIds = new Set(views.map(view => view.viewer_id).filter(Boolean))
  const anonymousViews = views.filter(view => !view.viewer_id).length
  const uniqueVisitors = visitorIds.size + anonymousViews
  const lastSevenDays = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentViews = views.filter(view => view.created_at && new Date(view.created_at).getTime() >= lastSevenDays).length
  const averageViews = visibleAds.length > 0 ? Math.round(totalViews / visibleAds.length) : 0
  const soldRate = visibleAds.length > 0 ? Math.round((soldAds.length / visibleAds.length) * 100) : 0

  const topAds = visibleAds
    .map(ad => ({
      ...ad,
      views_count: views.filter(view => view.ad_id === ad.id).length,
    }))
    .sort((a, b) => b.views_count - a.views_count)
    .slice(0, 5)

  const statCards = [
    { label: 'Vues totales', value: totalViews.toLocaleString('fr-FR'), detail: recentViews + ' sur 7 jours', icon: '' },
    { label: 'Visiteurs', value: uniqueVisitors.toLocaleString('fr-FR'), detail: 'profils uniques et anonymes', icon: '' },
    { label: 'Moyenne', value: averageViews.toLocaleString('fr-FR'), detail: 'vues par annonce', icon: '' },
    { label: 'Vendus', value: soldAds.length.toLocaleString('fr-FR'), detail: soldRate + '% des annonces', icon: '' },
  ]

  if (loading) {
    return (
      <div style={{background:'white', borderRadius:'14px', padding:'40px', border:'1px solid #e8ede9', textAlign:'center', color:'#6b7c6e'}}>
        Chargement des statistiques...
      </div>
    )
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'16px', flexWrap:'wrap'}}>
        <div>
          <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.15rem', color:'#111a14', marginBottom:'6px'}}>Statistiques</h2>
          <p style={{color:'#6b7c6e', fontSize:'0.86rem'}}>Vue d ensemble de vos annonces et de leur performance.</p>
        </div>
        <span style={{background:'#e8f5ee', color:'#1a7a4a', padding:'6px 10px', borderRadius:'8px', fontSize:'0.75rem', fontWeight:700, border:'1px solid #b7dfca'}}>
          {ads.length} annonce(s)
        </span>
      </div>

      {error && (
        <div style={{background:'#fffbeb', border:'1px solid #fde68a', color:'#78350f', borderRadius:'12px', padding:'12px 14px', fontSize:'0.84rem', marginBottom:'14px'}}>
          {error}
        </div>
      )}

      <div className="profil-grid" style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'16px'}}>
        {statCards.map(card => (
          <div key={card.label} style={{background:'white', borderRadius:'14px', padding:'18px', border:'1px solid #e8ede9'}}>
            {card.icon && <div style={{fontSize:'1.4rem', marginBottom:'10px'}}>{card.icon}</div>}
            <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.45rem', color:'#111a14', marginBottom:'4px'}}>{card.value}</div>
            <div style={{fontWeight:700, fontSize:'0.82rem', color:'#111a14', marginBottom:'4px'}}>{card.label}</div>
            <div style={{fontSize:'0.74rem', color:'#6b7c6e'}}>{card.detail}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1.2fr .8fr', gap:'14px'}}>
        <div style={{background:'white', borderRadius:'14px', padding:'18px', border:'1px solid #e8ede9'}}>
          <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.98rem', color:'#111a14', marginBottom:'14px'}}>Annonces les plus vues</h3>
          {topAds.length === 0 ? (
            <div style={{textAlign:'center', padding:'28px', color:'#6b7c6e', fontSize:'0.86rem'}}>Aucune annonce pour le moment.</div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {topAds.map(ad => (
                <div key={ad.id} style={{display:'flex', alignItems:'center', gap:'12px', padding:'10px', borderRadius:'10px', background:'#f5f7f5', border:'1px solid #e8ede9'}}>
                  <div style={{width:'54px', height:'54px', borderRadius:'8px', overflow:'hidden', background:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                    {ad.images?.[0] ? (
                      <img src={ad.images[0]} alt={ad.title} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                      <span style={{fontSize:'1.4rem'}}></span>
                    )}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontWeight:800, color:'#111a14', fontSize:'0.86rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{ad.title}</div>
                    <div style={{fontSize:'0.75rem', color:'#6b7c6e'}}>{Number(ad.price || 0).toLocaleString('fr-FR')} RWF</div>
                  </div>
                  <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, color:'#1a7a4a', fontSize:'0.95rem', whiteSpace:'nowrap'}}>
                    {ad.views_count} vue{ad.views_count > 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{background:'white', borderRadius:'14px', padding:'18px', border:'1px solid #e8ede9'}}>
          <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.98rem', color:'#111a14', marginBottom:'14px'}}>Etat du compte vendeur</h3>
          {[
            { label: 'Annonces actives', value: activeAds.length },
            { label: 'Annonces vendues', value: soldAds.length },
            { label: 'Vues recentes', value: recentViews },
            { label: 'Taux de vente', value: soldRate + '%' },
          ].map(row => (
            <div key={row.label} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f0f4f1'}}>
              <span style={{fontSize:'0.82rem', color:'#6b7c6e'}}>{row.label}</span>
              <strong style={{fontFamily:'Syne,sans-serif', color:'#111a14'}}>{row.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ProfilPage() {
  const [user, setUser] = useState<any>(null)
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('annonces')
  const [editMode, setEditMode] = useState(false)
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', location: '', username: '' })
  const [msg, setMsg] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [selectedBoost, setSelectedBoost] = useState<any>(null)
  const [selectedAd, setSelectedAd] = useState<any>(null)
  const [boostMsg, setBoostMsg] = useState('')
  const [boostLoading, setBoostLoading] = useState(false)
  const [favoriteAds, setFavoriteAds] = useState<any[]>([])
  const [favLoading, setFavLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [hideReadReceipts, setHideReadReceipts] = useState(false)

  const { favorites } = useFavorites()

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

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfileForm({
        full_name: userData?.full_name || user.user_metadata?.full_name || '',
        phone: userData?.phone || user.user_metadata?.phone || '',
        location: user.user_metadata?.location || '',
        username: userData?.username || '',
      })
      setHideReadReceipts(!!userData?.hide_read_receipts)

      const { data } = await supabase.from('ads').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (data) setAds(data)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (activeTab !== 'favoris' || favorites.length === 0) {
      if (activeTab === 'favoris') setFavoriteAds([])
      return
    }
    const fetchFavAds = async () => {
      setFavLoading(true)
      const { data } = await supabase.from('ads').select('*').in('id', favorites).eq('is_active', true).is('deleted_at', null)
      if (data) setFavoriteAds(data)
      setFavLoading(false)
    }
    fetchFavAds()
  }, [activeTab, favorites])

  const handleLogout = async () => {
    setLogoutLoading(true)
    setLogoutError('')
    const { error } = await supabase.auth.signOut()
    if (error) {
      setLogoutError(error.message)
      setLogoutLoading(false)
      return
    }
    setUser(null)
    setAds([])
    setFavoriteAds([])
    window.location.href = '/'
  }

  const validateUsername = (value: string) => {
    if (!value) return ''
    if (value.length < 3) return 'Minimum 3 caracteres'
    if (value.length > 20) return 'Maximum 20 caracteres'
    if (!/^[a-z0-9_]+$/.test(value)) return 'Lettres minuscules, chiffres et _ seulement'
    return ''
  }

  const handleSaveProfile = async () => {
    const uErr = validateUsername(profileForm.username)
    if (uErr) { setUsernameError(uErr); return }

    if (profileForm.username) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', profileForm.username)
        .neq('id', user.id)
        .single()
      if (existing) { setUsernameError('Ce username est deja pris'); return }
    }

    await supabase.auth.updateUser({ data: { full_name: profileForm.full_name, phone: profileForm.phone, location: profileForm.location } })

    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        username: profileForm.username || null,
      })

    if (error) { setMsg('Erreur : ' + error.message); return }
    setMsg('Profil mis a jour !')
    setEditMode(false)
    setUsernameError('')
    setTimeout(() => setMsg(''), 3000)
  }

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return
    await supabase.from('ads').update({
      is_active: false,
      deleted_at: new Date().toISOString(),
      delete_reason: 'user_deleted',
    }).eq('id', id).eq('user_id', user.id)
    setAds(prev => prev.filter(a => a.id !== id))
  }

  const handleMarkSold = async (id: string) => {
    if (!confirm("Marquer comme vendue ? L'annonce restera visible 24h puis se déplacera dans \"Vendus\".")) return
    const soldAt = new Date().toISOString()
    await supabase.from('ads').update({
      is_sold: true,
      sold_at: soldAt,
    }).eq('id', id).eq('user_id', user.id)
    setAds(prev => prev.map(a => a.id === id ? { ...a, is_sold: true, sold_at: soldAt } : a))
  }

  const handleBoost = async () => {
    if (!selectedBoost || !selectedAd) return
    setBoostLoading(true)
    const days = selectedBoost.name.includes('3') ? 3 : selectedBoost.name.includes('7') ? 7 : 30
    const ends = new Date()
    ends.setDate(ends.getDate() + days)
    const { error } = await supabase.from('boosts').insert([{
      ad_id: selectedAd.id, user_id: user.id,
      duration_days: days, price: parseInt(selectedBoost.price.replace(' ', '')),
      ends_at: ends.toISOString(),
    }])
    setBoostLoading(false)
    if (error) { setBoostMsg('Erreur : ' + error.message); return }
    setBoostMsg('Annonce boostee !')
    setTimeout(() => { setSelectedBoost(null); setSelectedAd(null); setBoostMsg('') }, 2000)
  }

  const catEmoji: any = {
    'immo-vente':'','immo-location':'','immo-terrain':'','voiture':'',
    'moto':'','electronique':'','mode':'','maison':'','emploi':'',
    'animaux':'','services':'','agriculture':'','materiaux':'',
    'sante':'','sport':'','education':''
  }

  const boostPlans = [
    { name:'Boost 3 jours', price:'2 000', icon:'', color:'#f59e0b', features:['Top 3 jours','Badge Booste','2x vues'] },
    { name:'Boost 7 jours', price:'4 000', icon:'', color:'#1a7a4a', features:['Top 7 jours','Badge Booste','5x vues'], popular:true },
    { name:'Boost 30 jours', price:'12 000', icon:'', color:'#0f5233', features:['Top 30 jours','Badge Premium','10x vues'] },
  ]

  const HEURES_24 = 24 * 60 * 60 * 1000

  const mesAnnonces = ads.filter(a => {
    if (a.deleted_at) return false
    if (!a.is_sold) return true
    if (!a.sold_at) return true
    return (Date.now() - new Date(a.sold_at).getTime()) < HEURES_24
  })

  const vendues = ads.filter(a => a.is_sold && !a.deleted_at)
  const soldCount = vendues.length

  const tabs = [
    { id:'annonces', label:'Mes annonces', count: mesAnnonces.length },
    { id:'favoris', label:'Favoris', count: favorites.length },
    { id:'profil', label:'Mon profil', count: null },
    ...(FEATURE_FLAGS.monetization ? [
      { id:'abonnement', label:'Abonnement', count: null },
      { id:'boosts', label:'Boosts', count: null },
    ] : []),
    { id:'alertes', label:'Alertes', count: null },
    ...(FEATURE_FLAGS.advancedUserStats ? [
      { id:'stats', label:'Stats', count: null },
    ] : []),
    { id:'vendus', label:'Vendus', count: soldCount },
  ]

  if (loading) return (
    <div style={{minHeight:'100vh', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <p style={{fontFamily:'Syne,sans-serif', color:'#1a7a4a', fontWeight:700}}>Chargement...</p>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', background:'#f5f7f5'}}>
      <style>{`
        @media (max-width: 768px) {
          .profil-grid { grid-template-columns: 1fr 1fr !important; }
          .ads-grid-3 { grid-template-columns: 1fr 1fr !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
          .boost-grid { grid-template-columns: 1fr !important; }
          .fav-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .ads-grid-3 { grid-template-columns: 1fr !important; }
          .fav-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {selectedBoost && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}>
          <div style={{background:'white', borderRadius:'16px', padding:'28px', maxWidth:'420px', width:'100%', border:'1px solid #e8ede9', boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
            <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', marginBottom:'16px', color:'#111a14'}}>
              {selectedBoost.icon} {selectedBoost.name}
            </h2>
            {selectedAd ? (
              <>
                <div style={{background:'#f5f7f5', borderRadius:'10px', padding:'14px', marginBottom:'16px', border:'1px solid #e8ede9'}}>
                  <div style={{fontSize:'0.78rem', color:'#6b7c6e', marginBottom:'4px'}}>Annonce selectionnee</div>
                  <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.9rem', color:'#111a14'}}>{selectedAd.title}</div>
                </div>
                <div style={{background:'#f5f7f5', borderRadius:'10px', padding:'14px', marginBottom:'16px', border:'1px solid #e8ede9'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                    <span style={{fontSize:'0.82rem', color:'#6b7c6e'}}>Duree</span>
                    <span style={{fontWeight:700, fontSize:'0.85rem', color:'#111a14'}}>{selectedBoost.name}</span>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span style={{fontSize:'0.82rem', color:'#6b7c6e'}}>Prix</span>
                    <span style={{fontFamily:'Syne,sans-serif', fontWeight:800, color:'#1a7a4a', fontSize:'1rem'}}>{selectedBoost.price} RWF</span>
                  </div>
                </div>
                {boostMsg && <p style={{background:'#e8f5ee', color:'#1a7a4a', padding:'10px', borderRadius:'8px', fontSize:'0.82rem', marginBottom:'12px'}}>{boostMsg}</p>}
                <button onClick={handleBoost} disabled={boostLoading} style={{width:'100%', padding:'12px', background: boostLoading ? '#ccc' : '#1a7a4a', border:'none', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.95rem', color:'white', cursor: boostLoading ? 'not-allowed' : 'pointer', marginBottom:'10px'}}>
                  {boostLoading ? 'En cours...' : 'Confirmer le boost'}
                </button>
              </>
            ) : (
              <>
                <p style={{color:'#6b7c6e', fontSize:'0.85rem', marginBottom:'12px'}}>Choisissez l annonce a booster :</p>
                <div style={{display:'flex', flexDirection:'column', gap:'8px', marginBottom:'14px', maxHeight:'220px', overflowY:'auto'}}>
                  {ads.length === 0 ? (
                    <p style={{color:'#6b7c6e', fontSize:'0.82rem'}}>Aucune annonce disponible.</p>
                  ) : ads.map((ad: any) => (
                    <div key={ad.id} onClick={() => setSelectedAd(ad)} style={{display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'#f5f7f5', borderRadius:'9px', cursor:'pointer', border: selectedAd?.id === ad.id ? '1.5px solid #1a7a4a' : '1px solid #e8ede9'}}>
                      <span style={{fontSize:'1.2rem'}}>{catEmoji[ad.category] || ''}</span>
                      <div>
                        <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#111a14'}}>{ad.title}</div>
                        <div style={{fontSize:'0.72rem', color:'#6b7c6e'}}>{Number(ad.price).toLocaleString()} RWF</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button onClick={() => { setSelectedBoost(null); setSelectedAd(null); setBoostMsg('') }} style={{width:'100%', padding:'10px', background:'transparent', border:'1px solid #e8ede9', borderRadius:'10px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.88rem', color:'#6b7c6e', cursor:'pointer'}}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <Header />

      <div style={{background:'linear-gradient(135deg, #0f5233 0%, #1a7a4a 100%)', padding:'28px 5% 50px'}}>
        <div style={{maxWidth:'1100px', margin:'0 auto', display:'flex', alignItems:'center', gap:'16px'}}>
          <div style={{width:'56px', height:'56px', borderRadius:'50%', background:'#f5a623', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', fontWeight:800, color:'#111a14', fontFamily:'Syne,sans-serif', flexShrink:0}}>
            {(profileForm.full_name || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', color:'white', marginBottom:'3px'}}>
              {profileForm.full_name || 'Mon Profil'}
            </h1>
            {profileForm.username && (
              <p style={{color:'#f5a623', fontSize:'0.82rem', fontWeight:700, marginBottom:'4px'}}>@{profileForm.username}</p>
            )}
            <p style={{color:'rgba(255,255,255,0.65)', fontSize:'0.82rem', marginBottom:'8px'}}>{user?.email}</p>
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
              <span style={{background:'rgba(255,255,255,0.12)', color:'white', padding:'3px 10px', borderRadius:'20px', fontSize:'0.72rem', fontWeight:600}}>Membre SokoDeal</span>
              <span style={{background:'rgba(245,166,35,0.25)', color:'#f5a623', padding:'3px 10px', borderRadius:'20px', fontSize:'0.72rem', fontWeight:600}}>{ads.length} annonce(s)</span>
              {favorites.length > 0 && (
                <span style={{background:'rgba(239,68,68,0.2)', color:'#fca5a5', padding:'3px 10px', borderRadius:'20px', fontSize:'0.72rem', fontWeight:600}}>{favorites.length} favori(s)</span>
              )}
              {profileForm.username && (
                <a href={'/u/' + profileForm.username} style={{background:'rgba(255,255,255,0.15)', color:'white', padding:'3px 10px', borderRadius:'20px', fontSize:'0.72rem', fontWeight:600, textDecoration:'none'}}>
                  Voir mon profil public
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:'1100px', margin:'-22px auto 0', padding:'0 5% 40px'}}>

        <div className="profil-grid" style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'20px'}}>
          {[
            { label:'Annonces', value: mesAnnonces.length, icon:'', color:'#1a7a4a' },
            { label:'Favoris', value: favorites.length, icon:'', color:'#ef4444' },
            { label:'Messages', value:'-', icon:'', color:'#6b7c6e' },
            { label:'Vendus', value: soldCount, icon:'', color:'#f59e0b' },
          ].map((s, i) => (
            <div key={i} onClick={() => s.label === 'Favoris' ? setActiveTab('favoris') : s.label === 'Vendus' ? setActiveTab('vendus') : null}
              style={{background:'white', borderRadius:'12px', padding:'14px', border:'1px solid #e8ede9', textAlign:'center', cursor: s.label === 'Favoris' || s.label === 'Vendus' ? 'pointer' : 'default'}}>
              {s.icon && <div style={{fontSize:'1.4rem', marginBottom:'4px'}}>{s.icon}</div>}
              <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.3rem', color:s.color}}>{s.value}</div>
              <div style={{fontSize:'0.7rem', color:'#6b7c6e', marginTop:'2px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex', gap:'6px', marginBottom:'16px', overflowX:'auto', paddingBottom:'4px', scrollbarWidth:'none'}}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding:'8px 16px', border: activeTab === tab.id ? 'none' : '1px solid #e8ede9',
              borderRadius:'9px', cursor:'pointer', fontFamily:'DM Sans,sans-serif',
              fontWeight:600, fontSize:'0.82rem', whiteSpace:'nowrap',
              background: activeTab === tab.id ? '#1a7a4a' : 'white',
              color: activeTab === tab.id ? 'white' : '#6b7c6e',
            }}>
              {tab.label}
              {tab.count !== null && (
                <span style={{marginLeft:'5px', background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : '#f5f7f5', color: activeTab === tab.id ? 'white' : '#6b7c6e', borderRadius:'8px', padding:'1px 6px', fontSize:'0.72rem'}}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'annonces' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px'}}>
              <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', color:'#111a14'}}>Mes annonces</h2>
              <button onClick={() => window.location.href='/publier'} style={{padding:'8px 16px', background:'#1a7a4a', color:'white', border:'none', borderRadius:'9px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', cursor:'pointer'}}>
                + Nouvelle
              </button>
            </div>
            {mesAnnonces.length === 0 ? (
              <div style={{background:'white', borderRadius:'14px', padding:'48px', textAlign:'center', border:'1px solid #e8ede9'}}>
                <div style={{fontSize:'2.5rem', marginBottom:'12px'}}></div>
                <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, marginBottom:'8px', color:'#111a14'}}>Aucune annonce</h3>
                <p style={{color:'#6b7c6e', marginBottom:'20px', fontSize:'0.88rem'}}>Publiez votre premiere annonce gratuitement</p>
                <button onClick={() => window.location.href='/publier'} style={{padding:'10px 24px', background:'#1a7a4a', color:'white', border:'none', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer'}}>
                  + Publier
                </button>
              </div>
            ) : (
              <div className="ads-grid-3" style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px'}}>
                {mesAnnonces.map((ad: any) => (
                  <div key={ad.id} style={{background:'white', borderRadius:'12px', overflow:'hidden', border:'1px solid #e8ede9'}}>
                    <div style={{height:'120px', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', position:'relative', overflow:'hidden'}}>
                      {ad.images && ad.images.length > 0 ? (
                        <img src={ad.images[0]} alt={ad.title} style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                      ) : (
                        <span style={{opacity:0.5}}>{catEmoji[ad.category] || ''}</span>
                      )}
                      <span style={{position:'absolute', top:'6px', left:'6px', background: ad.is_sold ? '#f59e0b' : '#1a7a4a', color:'white', fontSize:'0.62rem', fontWeight:700, padding:'2px 7px', borderRadius:'5px'}}>
                        {ad.is_sold ? 'VENDU' : 'Active'}
                      </span>
                    </div>
                    <div style={{padding:'10px'}}>
                      <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#111a14'}}>{ad.title}</div>
                      <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, color:'#1a7a4a', fontSize:'0.9rem', marginBottom:'8px'}}>{Number(ad.price).toLocaleString()} RWF</div>
                      <div style={{display:'flex', gap:'5px'}}>
                        <button onClick={() => window.location.href='/annonce/' + generateSlug(ad)} style={{flex:1, padding:'6px', background:'#f5f7f5', border:'1px solid #e8ede9', borderRadius:'6px', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', cursor:'pointer'}}>
                          Voir
                        </button>
                        {!ad.is_sold ? (
                          <>
                            <button onClick={() => window.location.href='/modifier/' + ad.id} style={{flex:1, padding:'6px', background:'#e8f5ee', border:'1px solid #b7dfca', borderRadius:'6px', fontSize:'0.72rem', fontWeight:600, color:'#1a7a4a', cursor:'pointer'}}>
                              Modifier
                            </button>
                            <button onClick={() => handleMarkSold(ad.id)} style={{flex:1, padding:'6px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'6px', fontSize:'0.72rem', fontWeight:600, color:'#78350f', cursor:'pointer'}}>
                              Vendu
                            </button>
                          </>
                        ) : (
                          <div style={{flex:1, padding:'6px', background:'#f0f4f1', border:'1px solid #e8ede9', borderRadius:'6px', fontSize:'0.72rem', fontWeight:700, color:'#1a7a4a', textAlign:'center'}}>
                            Vendu
                          </div>
                        )}
                        <button onClick={() => handleDeleteAd(ad.id)} style={{flex:1, padding:'6px', background:'#fff1f0', border:'1px solid #ffd6d6', borderRadius:'6px', fontSize:'0.72rem', fontWeight:600, color:'#c0392b', cursor:'pointer'}}>
                          Suppr.
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favoris' && (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px'}}>
              <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', color:'#111a14'}}>Mes favoris</h2>
              <span style={{fontSize:'0.82rem', color:'#6b7c6e'}}>{favorites.length} annonce(s)</span>
            </div>
            {favLoading ? (
              <div style={{textAlign:'center', padding:'60px', color:'#6b7c6e'}}>Chargement...</div>
            ) : favoriteAds.length === 0 ? (
              <div style={{background:'white', borderRadius:'14px', padding:'48px', textAlign:'center', border:'1px solid #e8ede9'}}>
                <div style={{fontSize:'2.5rem', marginBottom:'12px'}}></div>
                <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, marginBottom:'8px', color:'#111a14'}}>Aucun favori</h3>
                <p style={{color:'#6b7c6e', marginBottom:'20px', fontSize:'0.88rem'}}>Cliquez sur le coeur d une annonce pour la sauvegarder</p>
                <button onClick={() => window.location.href='/'} style={{padding:'10px 24px', background:'#1a7a4a', color:'white', border:'none', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:700, cursor:'pointer'}}>
                  Parcourir les annonces
                </button>
              </div>
            ) : (
              <div className="fav-grid" style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px'}}>
                {favoriteAds.map((ad: any) => (
                  <div key={ad.id} style={{background:'white', borderRadius:'12px', overflow:'hidden', border:'1px solid #e8ede9', cursor:'pointer'}} onClick={() => window.location.href='/annonce/' + generateSlug(ad)}>
                    <div style={{height:'140px', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', position:'relative', overflow:'hidden'}}>
                      {ad.images && ad.images.length > 0 ? (
                        <img src={ad.images[0]} alt={ad.title} style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                      ) : (
                        <span style={{opacity:0.5}}>{catEmoji[ad.category] || ''}</span>
                      )}
                      <div style={{position:'absolute', top:'8px', right:'8px'}} onClick={e => e.stopPropagation()}>
                        <FavoriteButton adId={ad.id} size="sm" onLogin={() => {}} />
                      </div>
                    </div>
                    <div style={{padding:'10px'}}>
                      <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#111a14'}}>{ad.title}</div>
                      <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, color:'#0f5233', fontSize:'0.95rem'}}>{Number(ad.price).toLocaleString()} RWF</div>
                      {ad.province && <div style={{fontSize:'0.7rem', color:'#6b7c6e', marginTop:'3px'}}> {ad.province}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profil' && (
          <div style={{background:'white', borderRadius:'14px', padding:'24px', border:'1px solid #e8ede9'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', color:'#111a14'}}>Informations personnelles</h2>
              <button onClick={() => setEditMode(!editMode)} style={{padding:'7px 16px', background: editMode ? '#fff1f0' : '#f5f7f5', color: editMode ? '#c0392b' : '#111a14', border:'1px solid ' + (editMode ? '#ffd6d6' : '#e8ede9'), borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.82rem', cursor:'pointer'}}>
                {editMode ? 'Annuler' : 'Modifier'}
              </button>
            </div>
            {msg && <p style={{background:'#e8f5ee', color:'#1a7a4a', padding:'10px', borderRadius:'8px', fontSize:'0.82rem', marginBottom:'14px', border:'1px solid #b7dfca'}}>{msg}</p>}

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px'}}>
              <div style={{gridColumn:'span 2'}}>
                <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.04em'}}>Username</label>
                {editMode ? (
                  <div>
                    <div style={{display:'flex', alignItems:'center', border:'1px solid ' + (usernameError ? '#ffd6d6' : '#e8ede9'), borderRadius:'8px', overflow:'hidden', background:'#fafaf9'}}>
                      <span style={{padding:'10px 12px', color:'#6b7c6e', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', background:'#f5f7f5', borderRight:'1px solid #e8ede9'}}>@</span>
                      <input type="text" value={profileForm.username} placeholder="monusername"
                        onChange={e => { setProfileForm({...profileForm, username: e.target.value.toLowerCase()}); setUsernameError(validateUsername(e.target.value)) }}
                        style={{flex:1, padding:'10px 12px', border:'none', outline:'none', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', background:'transparent', color:'#111a14'}}
                      />
                    </div>
                    {usernameError && <p style={{color:'#c0392b', fontSize:'0.72rem', marginTop:'4px'}}>{usernameError}</p>}
                  </div>
                ) : (
                  <div style={{padding:'10px 12px', background:'#f5f7f5', borderRadius:'8px', fontSize:'0.88rem', color: profileForm.username ? '#111a14' : '#aaa', border:'1px solid #e8ede9'}}>
                    {profileForm.username ? '@' + profileForm.username : 'Pas encore de username'}
                  </div>
                )}
              </div>

              {[
                { label:'Nom complet', key:'full_name', placeholder:'Votre nom', icon:'' },
                { label:'Telephone', key:'phone', placeholder:'+250 780 000 000', icon:'' },
                { label:'Localisation', key:'location', placeholder:'Kigali, Rwanda', icon:'' },
              ].map(field => (
                <div key={field.key} style={{gridColumn: field.key === 'full_name' ? 'span 2' : 'span 1'}}>
                  <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.04em'}}>
                    {field.icon} {field.label}
                  </label>
                  {editMode ? (
                    <input type="text" value={(profileForm as any)[field.key]} placeholder={field.placeholder}
                      onChange={e => setProfileForm({...profileForm, [field.key]: e.target.value})}
                      style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', outline:'none', background:'#fafaf9', color:'#111a14'}}
                    />
                  ) : (
                    <div style={{padding:'10px 12px', background:'#f5f7f5', borderRadius:'8px', fontSize:'0.88rem', color:(profileForm as any)[field.key] ? '#111a14' : '#aaa', border:'1px solid #e8ede9'}}>
                      {(profileForm as any)[field.key] || field.placeholder}
                    </div>
                  )}
                </div>
              ))}

              <div style={{gridColumn:'span 2'}}>
                <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.04em'}}>Email</label>
                <div style={{padding:'10px 12px', background:'#f5f7f5', borderRadius:'8px', fontSize:'0.88rem', color:'#6b7c6e', border:'1px solid #e8ede9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span>{user?.email}</span>
                  <span style={{fontSize:'0.72rem', color:'#1a7a4a', fontWeight:600}}>Verifie</span>
                </div>
              </div>
            </div>

            {editMode && (
              <button onClick={handleSaveProfile} style={{marginTop:'16px', width:'100%', padding:'12px', background:'#1a7a4a', border:'none', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.95rem', color:'white', cursor:'pointer'}}>
                Sauvegarder
              </button>
            )}
            <div style={{marginTop:'24px', paddingTop:'20px', borderTop:'1px solid #e8ede9'}}>
              {logoutError && (
                <p style={{background:'#fff1f0', color:'#c0392b', padding:'10px', borderRadius:'8px', fontSize:'0.82rem', marginBottom:'10px', border:'1px solid #ffd6d6'}}>
                  {logoutError}
                </p>
              )}
              <button onClick={handleLogout} disabled={logoutLoading} style={{padding:'9px 20px', background: logoutLoading ? '#f5f7f5' : '#fff1f0', border:'1px solid #ffd6d6', borderRadius:'8px', color: logoutLoading ? '#6b7c6e' : '#c0392b', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.82rem', cursor: logoutLoading ? 'not-allowed' : 'pointer'}}>
                {logoutLoading ? 'Deconnexion...' : 'Se deconnecter'}
              </button>
              <div style={{marginTop:'16px', paddingTop:'16px', borderTop:'1px solid #e8ede9'}}>
                <label style={{display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', gap:'16px'}}>
                  <div>
                    <div style={{fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.85rem', color:'#111a14'}}>
                      Accusés de lecture
                    </div>
                    <div style={{fontSize:'0.72rem', color:'#6b7c6e', marginTop:'2px'}}>
                      Afficher "Vu" quand vous lisez un message
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!hideReadReceipts}
                    onChange={async (e) => {
                      const hide = !e.target.checked
                      setHideReadReceipts(hide)
                      await supabase.from('users').update({ hide_read_receipts: hide }).eq('id', user.id)
                    }}
                    style={{width:'18px', height:'18px', accentColor:'#1a7a4a', cursor:'pointer'}}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'abonnement' && (
  <div style={{textAlign:'center', padding:'40px'}}>
    <div style={{fontSize:'2.5rem', marginBottom:'12px'}}></div>
    <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', marginBottom:'8px', color:'#111a14'}}>
      Plans & Boosts
    </h2>
    <p style={{color:'#6b7c6e', fontSize:'0.88rem', marginBottom:'24px'}}>
      Grez votre abonnement et boostez vos annonces
    </p>
    <button onClick={() => window.location.href='/abonnement'}
      style={{padding:'13px 32px', background:'#1a7a4a', border:'none', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.95rem', color:'white', cursor:'pointer'}}>
      Voir les plans 
    </button>
  </div>
)}

        {activeTab === 'boosts' && (
  <div style={{textAlign:'center', padding:'40px'}}>
    <div style={{fontSize:'2.5rem', marginBottom:'12px'}}></div>
    <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', marginBottom:'8px', color:'#111a14'}}>
      Booster une annonce
    </h2>
    <p style={{color:'#6b7c6e', fontSize:'0.88rem', marginBottom:'24px'}}>
      Mettez vos annonces en avant et augmentez leur visibilit
    </p>
    <button onClick={() => window.location.href='/abonnement'}
      style={{padding:'13px 32px', background:'#f5a623', border:'none', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.95rem', color:'#111a14', cursor:'pointer'}}>
      Booster une annonce 
    </button>
  </div>
)}

        {activeTab === 'alertes' && user && (
          <AlertesTab userId={user.id} />
        )}

        {activeTab === 'stats' && user && (
          <StatsTab userId={user.id} ads={ads} />
        )}

        {activeTab === 'vendus' && (
          <div>
            <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', marginBottom:'14px', color:'#111a14'}}>Articles vendus</h2>
            {vendues.length === 0 ? (
              <div style={{background:'white', borderRadius:'14px', padding:'40px', border:'1px solid #e8ede9', textAlign:'center'}}>
                <div style={{fontSize:'2.5rem', marginBottom:'12px'}}></div>
                <h3 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', marginBottom:'8px', color:'#111a14'}}>Aucune vente</h3>
                <p style={{color:'#6b7c6e', fontSize:'0.88rem'}}>Vos articles vendus apparaitront ici</p>
              </div>
            ) : (
              <div className="ads-grid-3" style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px'}}>
                {vendues.map((ad: any) => (
                  <div key={ad.id} style={{background:'white', borderRadius:'12px', overflow:'hidden', border:'1px solid #e8ede9', opacity:0.8}}>
                    <div style={{height:'120px', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', position:'relative', overflow:'hidden'}}>
                      {ad.images && ad.images.length > 0 ? (
                        <img src={ad.images[0]} alt={ad.title} style={{width:'100%', height:'100%', objectFit:'cover', filter:'grayscale(30%)'}}/>
                      ) : (
                        <span style={{opacity:0.5}}>{catEmoji[ad.category] || ''}</span>
                      )}
                      <span style={{position:'absolute', top:'6px', left:'6px', background:'#f59e0b', color:'white', fontSize:'0.62rem', fontWeight:700, padding:'2px 7px', borderRadius:'5px'}}>VENDU</span>
                    </div>
                    <div style={{padding:'10px'}}>
                      <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#111a14'}}>{ad.title}</div>
                      <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, color:'#6b7c6e', fontSize:'0.9rem', marginBottom:'4px'}}>{Number(ad.price).toLocaleString()} RWF</div>
                      {ad.sold_at && <div style={{fontSize:'0.7rem', color:'#9ca3af'}}>Vendu le {new Date(ad.sold_at).toLocaleDateString('fr-FR')}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
