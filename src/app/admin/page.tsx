'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { generateSlug } from '@/lib/slug'
import { getCurrentUser } from '@/lib/auth'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [ads, setAds] = useState<any[]>([])
  const [boosts, setBoosts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    ads: 0, boosts: 0, messages: 0, users: 0,
    activeAds: 0, revenueBoosts: 0
  })

  useEffect(() => {
    const init = async () => {
      let shouldRedirect = false
      try {
      const { data: { user } } = await getCurrentUser()
      if (!user) { shouldRedirect = true; window.location.href = '/'; return }

      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!userData?.is_admin) { shouldRedirect = true; window.location.href = '/'; return }

      setUser(user)
      setIsAdmin(true)
      await loadData()
      } catch (err) {
        console.error('admin init error:', err)
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

  const loadData = async () => {
    const { data: adsData } = await supabase.from('ads').select('*').order('created_at', { ascending: false })
    if (adsData) setAds(adsData)

    const { data: boostsData } = await supabase.from('boosts').select('*, ads(title)').order('created_at', { ascending: false })
    if (boostsData) {
      setBoosts(boostsData)
      const revenue = boostsData.reduce((sum: number, b: any) => sum + (b.price || 0), 0)
      setStats(s => ({ ...s, revenueBoosts: revenue }))
    }

    const { data: msgsData } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(50)
    if (msgsData) setMessages(msgsData)

    const { count: adsCount } = await supabase.from('ads').select('*', { count: 'exact', head: true })
    const { count: activeCount } = await supabase.from('ads').select('*', { count: 'exact', head: true }).eq('is_active', true)
    const { count: boostsCount } = await supabase.from('boosts').select('*', { count: 'exact', head: true })
    const { count: msgsCount } = await supabase.from('messages').select('*', { count: 'exact', head: true })

    setStats(s => ({
      ...s,
      ads: adsCount || 0,
      activeAds: activeCount || 0,
      boosts: boostsCount || 0,
      messages: msgsCount || 0,
    }))
  }

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return
    await supabase.from('ads').delete().eq('id', id)
    setAds(ads.filter(a => a.id !== id))
    setStats(s => ({ ...s, ads: s.ads - 1 }))
  }

  const handleToggleAd = async (id: string, current: boolean) => {
    await supabase.from('ads').update({ is_active: !current }).eq('id', id)
    setAds(ads.map(a => a.id === id ? { ...a, is_active: !current } : a))
    setStats(s => ({ ...s, activeAds: current ? s.activeAds - 1 : s.activeAds + 1 }))
  }

  const catEmoji: any = {
    'immo-vente':'🏡','immo-location':'🏢','immo-terrain':'🌿','voiture':'🚗',
    'moto':'🛵','electronique':'📱','mode':'👗','maison':'🛋️','emploi':'💼',
    'animaux':'🐄','services':'🏗️','agriculture':'🌾','materiaux':'🧱',
    'sante':'💊','sport':'⚽','education':'📚'
  }

  const adsByCategory = ads.reduce((acc: any, ad) => {
    acc[ad.category] = (acc[ad.category] || 0) + 1
    return acc
  }, {})

  const topCategories = Object.entries(adsByCategory)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 6)

  const tabs = [
    { id:'dashboard', label:'📊 Dashboard' },
    { id:'annonces', label:'📋 Annonces', count: stats.ads },
    { id:'boosts', label:'🚀 Boosts', count: stats.boosts },
    { id:'messages', label:'💬 Messages', count: stats.messages },
  ]

  if (loading) return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#111a14'}}>
      <p style={{fontFamily:'Syne,sans-serif', color:'#f5a623', fontWeight:700}}>Vérification...</p>
    </div>
  )

  if (!isAdmin) return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#111a14'}}>
      <p style={{fontFamily:'Syne,sans-serif', color:'#f5a623', fontWeight:700}}>Acces admin indisponible.</p>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', background:'#f0f4f1'}}>
      <style>{`
        @media (max-width: 768px) {
          .admin-stats { grid-template-columns: 1fr 1fr !important; }
          .admin-table { font-size: 0.75rem !important; }
          .cat-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <header style={{background:'#111a14', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 16px rgba(0,0,0,0.4)'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 4%', height:'58px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <a href="/" style={{display:'flex', alignItems:'center', gap:'8px', textDecoration:'none'}}>
              <div style={{width:'32px', height:'32px', background:'#f5a623', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px'}}>🦁</div>
              <span style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', color:'white'}}>Soko<span style={{color:'#f5a623'}}>Deal</span></span>
            </a>
            <span style={{background:'#f5a623', color:'#111a14', padding:'3px 10px', borderRadius:'6px', fontSize:'0.7rem', fontWeight:800}}>ADMIN</span>
          </div>
          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <span style={{color:'rgba(255,255,255,0.5)', fontSize:'0.78rem'}}>{user?.email}</span>
            <a href="/" style={{padding:'6px 12px', background:'transparent', border:'1.5px solid rgba(255,255,255,0.2)', borderRadius:'8px', color:'white', fontFamily:'DM Sans,sans-serif', fontSize:'0.8rem', textDecoration:'none'}}>
              ← Site
            </a>
          </div>
        </div>
      </header>

      <div style={{maxWidth:'1200px', margin:'0 auto', padding:'24px 4%'}}>

        {/* TABS */}
        <div style={{display:'flex', gap:'8px', marginBottom:'20px', overflowX:'auto', paddingBottom:'4px'}}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding:'9px 18px', border:'none', borderRadius:'10px', cursor:'pointer',
              fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', whiteSpace:'nowrap',
              background: activeTab === tab.id ? '#111a14' : 'white',
              color: activeTab === tab.id ? 'white' : '#6b7c6e',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {tab.label}
              {tab.count !== undefined && (
                <span style={{marginLeft:'6px', background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#e8ede9', color: activeTab === tab.id ? 'white' : '#1a7a4a', borderRadius:'10px', padding:'1px 7px', fontSize:'0.72rem'}}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            {/* STATS CARDS */}
            <div className="admin-stats" style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'24px'}}>
              {[
                { label:'Annonces totales', value: stats.ads, icon:'📋', color:'#1a7a4a', sub: stats.activeAds + ' actives' },
                { label:'Boosts vendus', value: stats.boosts, icon:'🚀', color:'#f5a623', sub: 'historique' },
                { label:'Revenus boosts', value: stats.revenueBoosts.toLocaleString() + ' RWF', icon:'💰', color:'#1a3a5c', sub: 'total cumule' },
                { label:'Messages', value: stats.messages, icon:'💬', color:'#7b3fa0', sub: 'echanges' },
              ].map((s, i) => (
                <div key={i} style={{background:'white', borderRadius:'14px', padding:'18px', boxShadow:'0 2px 12px rgba(0,0,0,0.07)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                    <span style={{fontSize:'1.6rem'}}>{s.icon}</span>
                    <span style={{fontSize:'0.7rem', color:'#6b7c6e', background:'#f5f7f5', padding:'2px 8px', borderRadius:'6px'}}>{s.sub}</span>
                  </div>
                  <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.5rem', color:s.color}}>{s.value}</div>
                  <div style={{fontSize:'0.75rem', color:'#6b7c6e', marginTop:'3px'}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* TOP CATEGORIES */}
            <div style={{background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', marginBottom:'20px'}}>
              <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', marginBottom:'20px'}}>📈 Annonces par categorie</h2>
              <div className="cat-grid" style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px'}}>
                {topCategories.map(([cat, count]: any) => {
                  const pct = Math.round((count / stats.ads) * 100) || 0
                  return (
                    <div key={cat} style={{background:'#f5f7f5', borderRadius:'10px', padding:'14px'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                        <span style={{fontSize:'0.85rem', fontWeight:600}}>{catEmoji[cat] || '📦'} {cat}</span>
                        <span style={{fontFamily:'Syne,sans-serif', fontWeight:800, color:'#1a7a4a'}}>{count}</span>
                      </div>
                      <div style={{background:'#e8ede9', borderRadius:'4px', height:'6px', overflow:'hidden'}}>
                        <div style={{background:'#1a7a4a', height:'100%', width: pct + '%', borderRadius:'4px', transition:'width 0.5s'}}/>
                      </div>
                      <div style={{fontSize:'0.7rem', color:'#6b7c6e', marginTop:'4px'}}>{pct}% du total</div>
                    </div>
                  )
                })}
                {topCategories.length === 0 && (
                  <div style={{gridColumn:'span 3', textAlign:'center', color:'#6b7c6e', padding:'20px', fontSize:'0.88rem'}}>
                    Aucune donnee pour l instant
                  </div>
                )}
              </div>
            </div>

            {/* DERNIERS BOOSTS */}
            <div style={{background:'white', borderRadius:'16px', padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,0.07)'}}>
              <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', marginBottom:'16px'}}>🚀 Derniers boosts</h2>
              {boosts.slice(0, 5).length === 0 ? (
                <p style={{color:'#6b7c6e', fontSize:'0.88rem', textAlign:'center', padding:'20px'}}>Aucun boost pour l instant</p>
              ) : boosts.slice(0, 5).map((boost, i) => {
                const isActive = new Date(boost.ends_at) > new Date()
                return (
                  <div key={i} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom: i < 4 ? '1px solid #f0f4f1' : 'none'}}>
                    <div>
                      <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.88rem'}}>{boost.ads?.title || 'Annonce supprimee'}</div>
                      <div style={{fontSize:'0.75rem', color:'#6b7c6e'}}>{boost.duration_days} jours · {new Date(boost.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <span style={{fontFamily:'Syne,sans-serif', fontWeight:800, color:'#1a7a4a', fontSize:'0.9rem'}}>{Number(boost.price).toLocaleString()} RWF</span>
                      <span style={{background: isActive ? '#e8f5ee' : '#f5f7f5', color: isActive ? '#1a7a4a' : '#6b7c6e', padding:'3px 8px', borderRadius:'6px', fontSize:'0.7rem', fontWeight:700}}>
                        {isActive ? '⚡ Actif' : 'Termine'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB: ANNONCES */}
        {activeTab === 'annonces' && (
          <div style={{background:'white', borderRadius:'16px', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', overflow:'hidden'}}>
            <div style={{padding:'16px 20px', borderBottom:'1px solid #e8ede9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem'}}>Toutes les annonces</h2>
              <span style={{fontSize:'0.82rem', color:'#6b7c6e'}}>{ads.length} annonce(s) · {stats.activeAds} actives</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="admin-table" style={{width:'100%', borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'#f5f7f5'}}>
                    {['Annonce','Categorie','Prix','Ville','Date','Statut','Actions'].map(h => (
                      <th key={h} style={{padding:'11px 14px', textAlign:'left', fontSize:'0.72rem', fontWeight:700, color:'#6b7c6e', textTransform:'uppercase', whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad, i) => (
                    <tr key={ad.id} style={{borderTop:'1px solid #f0f4f1', background: i % 2 === 0 ? 'white' : '#fafafa'}}>
                      <td style={{padding:'11px 14px'}}>
                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                          <div style={{width:'32px', height:'32px', borderRadius:'7px', background:'#e8f5ee', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0, overflow:'hidden'}}>
                            {ad.images && ad.images.length > 0 ? (
                              <img src={ad.images[0]} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                            ) : catEmoji[ad.category] || '📦'}
                          </div>
                          <div style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{ad.title}</div>
                        </div>
                      </td>
                      <td style={{padding:'11px 14px', fontSize:'0.78rem', color:'#1a7a4a', fontWeight:600, whiteSpace:'nowrap'}}>{ad.category}</td>
                      <td style={{padding:'11px 14px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', whiteSpace:'nowrap'}}>{Number(ad.price).toLocaleString()} RWF</td>
                      <td style={{padding:'11px 14px', fontSize:'0.78rem', color:'#6b7c6e'}}>{ad.province || '—'}</td>
                      <td style={{padding:'11px 14px', fontSize:'0.75rem', color:'#6b7c6e', whiteSpace:'nowrap'}}>{new Date(ad.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{padding:'11px 14px'}}>
                        <span style={{background: ad.is_active ? '#e8f5ee' : '#fce4ec', color: ad.is_active ? '#1a7a4a' : '#c0392b', padding:'3px 8px', borderRadius:'6px', fontSize:'0.7rem', fontWeight:700, whiteSpace:'nowrap'}}>
                          {ad.is_active ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </td>
                      <td style={{padding:'11px 14px'}}>
                        <div style={{display:'flex', gap:'5px'}}>
                          <button onClick={() => handleToggleAd(ad.id, ad.is_active)} style={{padding:'4px 8px', background: ad.is_active ? '#fff8e7' : '#e8f5ee', color: ad.is_active ? '#7a5c00' : '#1a7a4a', border:'none', borderRadius:'6px', fontSize:'0.7rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap'}}>
                            {ad.is_active ? '⏸' : '▶'}
                          </button>
                          <button onClick={() => window.open('/annonce/' + generateSlug(ad), '_blank')} style={{padding:'4px 8px', background:'#e8f5ee', color:'#1a7a4a', border:'none', borderRadius:'6px', fontSize:'0.7rem', fontWeight:700, cursor:'pointer'}}>
                            👁
                          </button>
                          <button onClick={() => handleDeleteAd(ad.id)} style={{padding:'4px 8px', background:'#fce4ec', color:'#c0392b', border:'none', borderRadius:'6px', fontSize:'0.7rem', fontWeight:700, cursor:'pointer'}}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: BOOSTS */}
        {activeTab === 'boosts' && (
          <div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'20px'}}>
              {[
                { label:'Total boosts vendus', value: stats.boosts, icon:'🚀', color:'#f5a623' },
                { label:'Revenus totaux', value: stats.revenueBoosts.toLocaleString() + ' RWF', icon:'💰', color:'#1a7a4a' },
              ].map((s, i) => (
                <div key={i} style={{background:'white', borderRadius:'14px', padding:'18px', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', display:'flex', alignItems:'center', gap:'14px'}}>
                  <span style={{fontSize:'2rem'}}>{s.icon}</span>
                  <div>
                    <div style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.4rem', color:s.color}}>{s.value}</div>
                    <div style={{fontSize:'0.75rem', color:'#6b7c6e'}}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:'white', borderRadius:'16px', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', overflow:'hidden'}}>
              <div style={{padding:'16px 20px', borderBottom:'1px solid #e8ede9'}}>
                <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem'}}>Historique des boosts</h2>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#f5f7f5'}}>
                      {['Annonce','Duree','Prix','Date debut','Date fin','Statut'].map(h => (
                        <th key={h} style={{padding:'11px 14px', textAlign:'left', fontSize:'0.72rem', fontWeight:700, color:'#6b7c6e', textTransform:'uppercase', whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boosts.map((boost, i) => {
                      const isActive = new Date(boost.ends_at) > new Date()
                      return (
                        <tr key={boost.id} style={{borderTop:'1px solid #f0f4f1', background: i % 2 === 0 ? 'white' : '#fafafa'}}>
                          <td style={{padding:'11px 14px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {boost.ads?.title || 'Annonce supprimee'}
                          </td>
                          <td style={{padding:'11px 14px', fontSize:'0.82rem'}}>{boost.duration_days} jours</td>
                          <td style={{padding:'11px 14px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', color:'#1a7a4a', whiteSpace:'nowrap'}}>{Number(boost.price).toLocaleString()} RWF</td>
                          <td style={{padding:'11px 14px', fontSize:'0.75rem', color:'#6b7c6e', whiteSpace:'nowrap'}}>{new Date(boost.created_at).toLocaleDateString('fr-FR')}</td>
                          <td style={{padding:'11px 14px', fontSize:'0.75rem', color:'#6b7c6e', whiteSpace:'nowrap'}}>{new Date(boost.ends_at).toLocaleDateString('fr-FR')}</td>
                          <td style={{padding:'11px 14px'}}>
                            <span style={{background: isActive ? '#e8f5ee' : '#f5f7f5', color: isActive ? '#1a7a4a' : '#6b7c6e', padding:'3px 8px', borderRadius:'6px', fontSize:'0.7rem', fontWeight:700, whiteSpace:'nowrap'}}>
                              {isActive ? '⚡ Actif' : '✓ Termine'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {boosts.length === 0 && (
                      <tr><td colSpan={6} style={{padding:'40px', textAlign:'center', color:'#6b7c6e', fontSize:'0.88rem'}}>Aucun boost pour l instant</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MESSAGES */}
        {activeTab === 'messages' && (
          <div style={{background:'white', borderRadius:'16px', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', overflow:'hidden'}}>
            <div style={{padding:'16px 20px', borderBottom:'1px solid #e8ede9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem'}}>Derniers messages</h2>
              <span style={{fontSize:'0.82rem', color:'#6b7c6e'}}>{stats.messages} message(s)</span>
            </div>
            {messages.length === 0 ? (
              <div style={{padding:'48px', textAlign:'center'}}>
                <div style={{fontSize:'2.5rem', marginBottom:'12px'}}>💬</div>
                <p style={{color:'#6b7c6e', fontSize:'0.88rem'}}>Aucun message pour l instant</p>
              </div>
            ) : (
              <div>
                {messages.map((msg, i) => (
                  <div key={msg.id} style={{padding:'14px 20px', borderBottom: i < messages.length - 1 ? '1px solid #f0f4f1' : 'none', display:'flex', alignItems:'flex-start', gap:'12px'}}>
                    <div style={{width:'36px', height:'36px', borderRadius:'50%', background:'#e8f5ee', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0}}>
                      💬
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px'}}>
                        <span style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                          {msg.sender_email || 'Utilisateur'}
                        </span>
                        <span style={{fontSize:'0.7rem', color:'#6b7c6e', whiteSpace:'nowrap', marginLeft:'8px'}}>
                          {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p style={{fontSize:'0.82rem', color:'#333', lineHeight:1.5, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                        {msg.content}
                      </p>
                      <div style={{marginTop:'4px'}}>
                        <span style={{background: msg.is_read ? '#f5f7f5' : '#e8f5ee', color: msg.is_read ? '#6b7c6e' : '#1a7a4a', padding:'2px 8px', borderRadius:'5px', fontSize:'0.68rem', fontWeight:600}}>
                          {msg.is_read ? 'Lu' : '● Non lu'}
                        </span>
                      </div>
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
