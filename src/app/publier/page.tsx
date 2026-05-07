'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { SUBCATEGORIES } from '@/lib/categories'
import { LAUNCH_CITIES, LAUNCH_MAIN_CATEGORIES, LAUNCH_SUBCATEGORIES } from '@/lib/market-config'
import ImageCropModal from '@/components/ImageCropModal'

const INDICATIFS = [
  { code: '+250', flag: '🇷🇼', pays: 'Rwanda' },
  { code: '+243', flag: '🇨🇩', pays: 'RD Congo' },
  { code: '+256', flag: '🇺🇬', pays: 'Uganda' },
  { code: '+255', flag: '🇹🇿', pays: 'Tanzania' },
  { code: '+254', flag: '🇰🇪', pays: 'Kenya' },
  { code: '+257', flag: '🇧🇮', pays: 'Burundi' },
  { code: '+33', flag: '🇫🇷', pays: 'France' },
  { code: '+32', flag: '🇧🇪', pays: 'Belgique' },
  { code: '+1', flag: '🇺🇸', pays: 'USA/Canada' },
]

const isImmo = (cat: string) => ['immo-vente', 'immo-location', 'immo-terrain'].includes(cat)
const MAX_PHOTOS = 5
const PUBLISH_DRAFT_KEY = 'sokodeal:publish-draft'

export default function PublierPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropIndex, setCropIndex] = useState(0)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [recropIndex, setRecropIndex] = useState<number | null>(null)
  const [draftReady, setDraftReady] = useState(false)
  const skipNextDraftSaveRef = useRef(false)
  const [form, setForm] = useState({
    title: '', category: '', subcategory: '', price: '', description: '',
    ville: '', district: '',
    phone: '', phone_indicatif: '+250',
    whatsapp: '', whatsapp_indicatif: '+250',
    whatsapp_same: true,
    hide_phone: false,
  })
  const [immoForm, setImmoForm] = useState({
    immo_type: '', surface: '', surface_terrain: '',
    chambres: '', salles_de_bain: '', etage: '',
    meuble: false, etat: '', charges_incluses: false,
  })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(PUBLISH_DRAFT_KEY)
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        if (draft?.form) setForm((prev) => ({ ...prev, ...draft.form }))
        if (draft?.immoForm) setImmoForm((prev) => ({ ...prev, ...draft.immoForm }))
        const photoCount = Number(draft?.photoCount || 0)
        setMsg(photoCount > 0
          ? 'Votre brouillon a ete restaure. Veuillez rajouter vos photos pour finaliser l annonce.'
          : 'Votre brouillon a ete restaure.')
        skipNextDraftSaveRef.current = true
        // Supprimer immediatement apres restauration : usage unique.
        window.localStorage.removeItem(PUBLISH_DRAFT_KEY)
      } catch {
        window.localStorage.removeItem(PUBLISH_DRAFT_KEY)
      }
    }
    setDraftReady(true)
  }, [])

  useEffect(() => {
    if (!draftReady || success) return
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false
      return
    }
    const hasDraftContent = Object.values(form).some(value => Boolean(value)) ||
      Object.values(immoForm).some(value => Boolean(value)) ||
      photos.length > 0
    if (!hasDraftContent) return
    window.localStorage.setItem(PUBLISH_DRAFT_KEY, JSON.stringify({
      form,
      immoForm,
      photoCount: photos.length,
      savedAt: Date.now(),
    }))
  }, [draftReady, form, immoForm, photos.length, success])

  const savePublishDraft = () => {
    window.localStorage.setItem(PUBLISH_DRAFT_KEY, JSON.stringify({
      form,
      immoForm,
      photoCount: photos.length,
      savedAt: Date.now(),
    }))
  }

  const clearPublishDraft = () => {
    window.localStorage.removeItem(PUBLISH_DRAFT_KEY)
  }

  // Sous-catégories disponibles pour la catégorie choisie
  const launchSubcats = LAUNCH_SUBCATEGORIES[form.category] || []
  const subcats = launchSubcats.length > 0 ? launchSubcats : (SUBCATEGORIES[form.category] || [])
  const publishCategory = launchSubcats.length > 0 ? form.subcategory : form.category
  const isImmoSelected = form.category === 'immo' || isImmo(publishCategory)

  const handleCategoryChange = (cat: string) => {
    setForm({ ...form, category: cat, subcategory: '' })
  }

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length === 0) return
    e.target.value = ''

    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      setMsg('Vous avez deja 5 photos.')
      return
    }

    const toProcess = newFiles.slice(0, remaining)
    if (newFiles.length > remaining) {
      setMsg('Vous pouvez ajouter maximum 5 photos. Les photos en plus ont ete ignorees.')
    } else {
      setMsg('')
    }
    setPendingFiles(toProcess)
    setCropIndex(0)
    setCropFile(toProcess[0])
  }

  const handleCropConfirm = (croppedFile: File) => {
    setPhotos(prev => [...prev, croppedFile].slice(0, MAX_PHOTOS))
    const nextIndex = cropIndex + 1
    if (nextIndex < pendingFiles.length) {
      setCropIndex(nextIndex)
      setCropFile(pendingFiles[nextIndex])
    } else {
      setCropFile(null)
      setPendingFiles([])
      setCropIndex(0)
    }
  }

  const handleCropCancel = () => {
    setCropFile(null)
    setPendingFiles([])
    setCropIndex(0)
  }

  const handleSubmit = async () => {
    if (!form.title || !form.category || !form.price) {
      setMsg('Titre, catégorie et prix sont obligatoires'); return
    }
    if (launchSubcats.length > 0 && !form.subcategory) {
      setMsg('Choisissez une précision pour cette catégorie'); return
    }
    if (!form.hide_phone && !form.phone) {
      setMsg('Ajoutez un numéro ou activez "Contact via messagerie uniquement"'); return
    }
    if (photos.length > MAX_PHOTOS) {
      setPhotos(photos.slice(0, MAX_PHOTOS))
      setMsg('Vous pouvez ajouter maximum 5 photos.')
      return
    }
    setLoading(true); setMsg('')
    const { data: { user } } = await getCurrentUser()
    if (!user) {
      savePublishDraft()
      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
        url: window.location.pathname,
        state: {}
      }))
      window.location.href = '/auth?mode=login'
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('plan, is_verified')
      .eq('id', user.id)
      .single()

    if (!userData?.is_verified) {
      setLoading(false)
      savePublishDraft()
      setMsg('🔒 Vous devez vérifier votre identité avant de publier une annonce.')
      setTimeout(() => window.location.href = '/verification-identite', 2000)
      return
    }

    const plan = userData?.plan || 'gratuit'
    if (plan === 'gratuit') {
      const { count } = await supabase
        .from('ads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true)
      if ((count || 0) >= 5) {
        setMsg('🔒 Limite atteinte — Le plan gratuit permet 5 annonces actives maximum.')
        setLoading(false)
        return
      }
    }

    const imageUrls: string[] = []
    for (const photo of photos.slice(0, MAX_PHOTOS)) {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${photo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { data, error } = await supabase.storage.from('annonces').upload(fileName, photo)
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('annonces').getPublicUrl(fileName)
        imageUrls.push(urlData.publicUrl)
      }
    }

    const fullPhone = form.phone ? form.phone_indicatif + ' ' + form.phone : ''
    const fullWhatsapp = form.whatsapp_same
      ? fullPhone
      : (form.whatsapp ? form.whatsapp_indicatif + ' ' + form.whatsapp : '')

    const adData: any = {
      title: form.title,
      category: publishCategory,
      subcategory: form.subcategory || null,
      price: parseFloat(form.price),
      description: form.description,
      province: form.ville,
      district: form.district,
      phone: fullPhone,
      whatsapp: fullWhatsapp,
      hide_phone: form.hide_phone,
      images: imageUrls,
      is_active: true,
      user_id: user.id,
    }

    if (isImmoSelected) {
      if (immoForm.immo_type) adData.immo_type = immoForm.immo_type
      if (immoForm.surface) adData.surface = parseInt(immoForm.surface)
      if (immoForm.surface_terrain) adData.surface_terrain = parseInt(immoForm.surface_terrain)
      if (immoForm.chambres) adData.chambres = parseInt(immoForm.chambres)
      if (immoForm.salles_de_bain) adData.salles_de_bain = parseInt(immoForm.salles_de_bain)
      if (immoForm.etage) adData.etage = parseInt(immoForm.etage)
      if (immoForm.etat) adData.etat = immoForm.etat
      adData.meuble = immoForm.meuble
      adData.charges_incluses = immoForm.charges_incluses
    }

    const { error } = await supabase.from('ads').insert([adData])
    if (error) { setMsg(error.message); setLoading(false); return }
    setSuccess(true); setLoading(false)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1px solid #e8ede9',
    borderRadius: '9px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.92rem',
    outline: 'none', background: '#fafaf9', marginBottom: '12px', display: 'block',
    boxSizing: 'border-box', color: '#111a14'
  }

  const label: React.CSSProperties = {
    display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#6b7c6e',
    marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em'
  }

  const villes = LAUNCH_CITIES

  const immoTypes: any = {
    'immo-vente': ['Appartement','Villa','Studio','Duplex','Bureau','Commerce','Autre'],
    'immo-location': ['Appartement','Villa','Studio','Duplex','Bureau','Commerce','Autre'],
    'immo-terrain': ['Terrain nu','Terrain agricole','Terrain commercial','Terrain résidentiel'],
  }

  if (success) return (
    <div style={{minHeight:'100vh', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{background:'white', borderRadius:'16px', padding:'40px', maxWidth:'440px', width:'100%', textAlign:'center', border:'1px solid #e8ede9', boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
        <div style={{width:'64px', height:'64px', background:'#e8f5ee', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', margin:'0 auto 16px'}}>🎉</div>
        <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', marginBottom:'8px', color:'#111a14'}}>Annonce publiée !</h2>
        <p style={{color:'#6b7c6e', marginBottom:'24px', fontSize:'0.88rem', lineHeight:1.6}}>Votre annonce est maintenant visible sur SokoDeal.</p>
        <a href="/publier" style={{display:'block', padding:'12px', background:'#f5a623', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.95rem', color:'#111a14', textDecoration:'none', marginBottom:'10px'}}>
          + Publier une autre annonce
        </a>
        <a href="/" style={{display:'block', padding:'12px', background:'#1a7a4a', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.95rem', color:'white', textDecoration:'none'}}>
          Voir les annonces
        </a>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}}>
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspect={4 / 3}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
      {recropIndex !== null && photos[recropIndex] && (
        <ImageCropModal
          file={photos[recropIndex]}
          aspect={4 / 3}
          onConfirm={(croppedFile) => {
            const newPhotos = [...photos]
            newPhotos[recropIndex] = croppedFile
            setPhotos(newPhotos)
            setRecropIndex(null)
          }}
          onCancel={() => setRecropIndex(null)}
        />
      )}
      <div style={{background:'white', borderRadius:'16px', padding:'28px', maxWidth:'540px', width:'100%', border:'1px solid #e8ede9', boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>

        <div style={{textAlign:'center', marginBottom:'20px'}}>
          <button
            onClick={() => {
              clearPublishDraft()
              window.location.href = '/'
            }}
            style={{background:'none', border:'none', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'8px', textDecoration:'none', padding:0}}
          >
            <div style={{width:'34px', height:'34px', background:'#f5a623', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px'}}>🦁</div>
            <span style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', color:'#111a14'}}>Soko<span style={{color:'#1a7a4a'}}>Deal</span></span>
          </button>
        </div>

        <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.15rem', marginBottom:'4px', color:'#111a14'}}>Déposer une annonce</h1>
        <p style={{color:'#6b7c6e', fontSize:'0.82rem', marginBottom:'20px'}}>Gratuit · Publié en 2 minutes</p>

        {/* CATEGORIE */}
        <label style={label}>Catégorie</label>
        <select value={form.category} onChange={e => handleCategoryChange(e.target.value)} style={{...inp, cursor:'pointer'}}>
          <option value="">Choisir une catégorie</option>
          {LAUNCH_MAIN_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* ✅ SOUS-CATEGORIE — apparaît si la catégorie a des sous-catégories */}
        {subcats.length > 0 && (
          <div style={{marginBottom:'4px'}}>
            <label style={label}>Précision</label>
            <select
              value={form.subcategory}
              onChange={e => setForm({...form, subcategory: e.target.value})}
              style={{...inp, cursor:'pointer'}}
            >
              <option value="">Choisir...</option>
              {subcats.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* CHAMPS IMMO DYNAMIQUES */}
        {isImmoSelected && (
          <div style={{background:'#e8f5ee', borderRadius:'12px', padding:'16px', marginBottom:'16px', border:'1px solid #b7dfca'}}>
            <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', color:'#1a7a4a', marginBottom:'14px'}}>
              🏡 Informations immobilières
            </p>

            <label style={label}>Type de bien</label>
            <select value={immoForm.immo_type} onChange={e => setImmoForm({...immoForm, immo_type: e.target.value})}
              style={{...inp, marginBottom:'10px'}}>
              <option value="">Choisir...</option>
              {(immoTypes[publishCategory] || []).map((t: string) => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Surface habitable */}
            <label style={label}>Surface habitable (m²)</label>
            <input type="number" placeholder="Ex: 85" value={immoForm.surface}
              onChange={e => setImmoForm({...immoForm, surface: e.target.value})}
              style={{...inp, marginBottom:'10px'}} />

            {/* ✅ Surface terrain pour tous les types immo */}
            <label style={label}>Surface terrain (m²)</label>
            <input type="number" placeholder="Ex: 500" value={immoForm.surface_terrain}
              onChange={e => setImmoForm({...immoForm, surface_terrain: e.target.value})}
              style={{...inp, marginBottom:'10px'}} />

            {publishCategory !== 'immo-terrain' && (
              <>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                  <div>
                    <label style={label}>Chambres</label>
                    <select value={immoForm.chambres} onChange={e => setImmoForm({...immoForm, chambres: e.target.value})}
                      style={{...inp, marginBottom:0}}>
                      <option value="">-</option>
                      {['Studio','1','2','3','4','5','6+'].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={label}>Salles de bain</label>
                    <select value={immoForm.salles_de_bain} onChange={e => setImmoForm({...immoForm, salles_de_bain: e.target.value})}
                      style={{...inp, marginBottom:0}}>
                      <option value="">-</option>
                      {['1','2','3','4+'].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                  <div>
                    <label style={label}>Étage</label>
                    <select value={immoForm.etage} onChange={e => setImmoForm({...immoForm, etage: e.target.value})}
                      style={{...inp, marginBottom:0}}>
                      <option value="">-</option>
                      {['RDC','1','2','3','4','5+'].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={label}>État</label>
                    <select value={immoForm.etat} onChange={e => setImmoForm({...immoForm, etat: e.target.value})}
                      style={{...inp, marginBottom:0}}>
                      <option value="">-</option>
                      <option value="neuf">Neuf</option>
                      <option value="bon-etat">Bon état</option>
                      <option value="a-renover">À rénover</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {publishCategory === 'immo-location' && (
              <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding:'10px', background:'white', borderRadius:'8px', border:'1px solid #e8ede9'}}>
                  <input type="checkbox" checked={immoForm.meuble} onChange={e => setImmoForm({...immoForm, meuble: e.target.checked})}
                    style={{width:'15px', height:'15px', accentColor:'#1a7a4a', cursor:'pointer'}} />
                  <span style={{fontSize:'0.82rem', color:'#111a14', fontFamily:'DM Sans,sans-serif', fontWeight:600}}>Meublé</span>
                </label>
                <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', padding:'10px', background:'white', borderRadius:'8px', border:'1px solid #e8ede9'}}>
                  <input type="checkbox" checked={immoForm.charges_incluses} onChange={e => setImmoForm({...immoForm, charges_incluses: e.target.checked})}
                    style={{width:'15px', height:'15px', accentColor:'#1a7a4a', cursor:'pointer'}} />
                  <span style={{fontSize:'0.82rem', color:'#111a14', fontFamily:'DM Sans,sans-serif', fontWeight:600}}>Charges incluses</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* TITRE */}
        <label style={label}>Titre</label>
        <input type="text" placeholder="Ex : Villa 4 chambres avec jardin" value={form.title}
          onChange={e => setForm({...form, title: e.target.value})} style={inp}/>

        {/* PRIX */}
        <label style={label}>Prix (RWF){publishCategory === 'immo-location' ? ' / mois' : ''}</label>
        <input type="number" placeholder="Ex: 85000000" value={form.price}
          onChange={e => setForm({...form, price: e.target.value})} style={inp}/>

        {/* VILLE */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
          <div>
            <label style={label}>Ville</label>
            <select value={form.ville} onChange={e => setForm({...form, ville: e.target.value})}
              style={{...inp, cursor:'pointer', marginBottom:'12px'}}>
              <option value="">Choisir</option>
              {villes.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Quartier</label>
            <input type="text" placeholder="Ex : Kicukiro, Kimironko" value={form.district}
              onChange={e => setForm({...form, district: e.target.value})} style={inp}/>
          </div>
        </div>

        {/* DESCRIPTION */}
        <label style={label}>Description du produit</label>
        <textarea
          placeholder={isImmoSelected
            ? "Décrivez le bien : emplacement, état, équipements..."
            : form.category === 'animaux'
            ? "Race, âge, sexe, vaccins, caractère..."
            : "Ex : Caméra en bon état, utilisée 2 mois, avec accessoires"}
          value={form.description}
          onChange={e => setForm({...form, description: e.target.value})}
          style={{...inp, minHeight: isImmoSelected ? '120px' : '80px', resize:'vertical'}}/>
        <div style={{fontSize:'0.72rem', color:'#6b7c6e', marginTop:'-6px', marginBottom:'12px', fontFamily:'DM Sans,sans-serif'}}>
          Ajoute des détails pour donner envie d’acheter.
        </div>

        {/* TELEPHONE */}
        <label style={label}>📞 Téléphone</label>
        <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
          <select value={form.phone_indicatif} onChange={e => setForm({...form, phone_indicatif: e.target.value})}
            style={{padding:'11px 8px', border:'1px solid #e8ede9', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'#fafaf9', color:'#111a14', cursor:'pointer', flexShrink:0}}>
            {INDICATIFS.map(i => <option key={i.code} value={i.code}>{i.flag} {i.code}</option>)}
          </select>
          <input type="tel" placeholder="780 000 000" value={form.phone}
            onChange={e => setForm({...form, phone: e.target.value})}
            disabled={form.hide_phone}
            style={{flex:1, padding:'11px 14px', border:'1px solid #e8ede9', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontSize:'0.92rem', outline:'none', background: form.hide_phone ? '#f5f7f5' : '#fafaf9', color:'#111a14'}} />
        </div>

        <label style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', cursor:'pointer'}}>
          <input type="checkbox" checked={form.whatsapp_same} onChange={e => setForm({...form, whatsapp_same: e.target.checked})}
            style={{width:'15px', height:'15px', accentColor:'#1a7a4a', cursor:'pointer'}} />
          <span style={{fontSize:'0.82rem', color:'#6b7c6e', fontFamily:'DM Sans,sans-serif'}}>💬 Mon numéro WhatsApp est le même que mon téléphone</span>
        </label>

        {!form.whatsapp_same && (
          <>
            <label style={label}>💬 WhatsApp</label>
            <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
              <select value={form.whatsapp_indicatif} onChange={e => setForm({...form, whatsapp_indicatif: e.target.value})}
                style={{padding:'11px 8px', border:'1px solid #e8ede9', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'#fafaf9', color:'#111a14', cursor:'pointer', flexShrink:0}}>
                {INDICATIFS.map(i => <option key={i.code} value={i.code}>{i.flag} {i.code}</option>)}
              </select>
              <input type="tel" placeholder="780 000 000" value={form.whatsapp}
                onChange={e => setForm({...form, whatsapp: e.target.value})}
                style={{flex:1, padding:'11px 14px', border:'1px solid #e8ede9', borderRadius:'9px', fontFamily:'DM Sans,sans-serif', fontSize:'0.92rem', outline:'none', background:'#fafaf9', color:'#111a14'}} />
            </div>
          </>
        )}

        <label style={{display:'flex', alignItems:'flex-start', gap:'10px', cursor:'pointer', padding:'12px', background:'#f5f7f5', borderRadius:'9px', border:'1px solid #e8ede9', marginBottom:'16px'}}>
          <input type="checkbox" checked={form.hide_phone} onChange={e => setForm({...form, hide_phone: e.target.checked, phone: e.target.checked ? '' : form.phone})}
            style={{width:'16px', height:'16px', accentColor:'#1a7a4a', cursor:'pointer', marginTop:'2px'}} />
          <div>
            <div style={{fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.85rem', color:'#111a14'}}>🔒 Cacher mon numéro de téléphone</div>
            <div style={{fontSize:'0.72rem', color:'#6b7c6e', marginTop:'2px'}}>Les acheteurs pourront me contacter uniquement via la messagerie SokoDeal</div>
          </div>
        </label>

        {/* PHOTOS */}
        <div style={{marginBottom:'16px'}}>
          <label style={label}>Photos ({photos.length}/{MAX_PHOTOS})</label>
          {photos.length < MAX_PHOTOS && (
            <input type="file" accept="image/*" multiple onChange={handlePhotos}
              style={{width:'100%', padding:'10px', border:'1.5px dashed #e8ede9', borderRadius:'9px', background:'#fafaf9', cursor:'pointer', boxSizing:'border-box', marginBottom:'10px'}}
            />
          )}
          <p style={{fontSize:'0.74rem', color:'#6b7c6e', marginBottom:'8px'}}>Vous pouvez ajouter maximum 5 photos.</p>
          {photos.length > 0 && (
            <div>
              <p style={{fontSize:'0.75rem', color:'#6b7c6e', marginBottom:'8px'}}>Cliquez sur une photo pour la mettre en première position</p>
              <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                {photos.map((photo, i) => (
                  <div key={i} style={{position:'relative', cursor:'pointer'}}>
                    <img
                      src={URL.createObjectURL(photo)}
                      alt=""
                      onClick={() => {
                        if (i === 0) return
                        const newPhotos = [...photos]
                        const [selected] = newPhotos.splice(i, 1)
                        newPhotos.unshift(selected)
                        setPhotos(newPhotos)
                      }}
                      style={{width:'76px', height:'76px', objectFit:'cover', borderRadius:'9px', border: i === 0 ? '2.5px solid #1a7a4a' : '2px solid #e8ede9'}}
                    />
                    {i === 0 && (
                      <div style={{position:'absolute', bottom:'4px', left:'50%', transform:'translateX(-50%)', background:'#1a7a4a', color:'white', fontSize:'0.52rem', fontWeight:800, padding:'2px 5px', borderRadius:'4px', whiteSpace:'nowrap'}}>
                        PRINCIPALE
                      </div>
                    )}
                    <button
                      onClick={ev => { ev.stopPropagation(); setRecropIndex(i) }}
                      style={{position:'absolute', top:'-5px', left:'-5px', width:'18px', height:'18px', background:'#f5a623', color:'#111a14', border:'none', borderRadius:'50%', fontSize:'0.65rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800}}
                      title="Recadrer"
                    >{'\u2702'}</button>
                    <button
                      onClick={ev => { ev.stopPropagation(); setPhotos(photos.filter((_,j) => j !== i)); setMsg('') }}
                      style={{position:'absolute', top:'-5px', right:'-5px', width:'18px', height:'18px', background:'#e74c3c', color:'white', border:'none', borderRadius:'50%', fontSize:'0.65rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800}}
                    >{'\u00d7'}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {msg && (
          <div style={{background: msg.includes('🔒') ? '#fff7ed' : '#fff1f0', border:'1px solid ' + (msg.includes('🔒') ? '#fed7aa' : '#ffd6d6'), color: msg.includes('🔒') ? '#ea580c' : '#c0392b', padding:'10px 14px', borderRadius:'8px', fontSize:'0.82rem', marginBottom:'14px'}}>
            {msg}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width:'100%', padding:'13px', background: loading ? '#ccc' : '#1a7a4a', border:'none',
          borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:800,
          fontSize:'0.95rem', color:'white', cursor: loading ? 'not-allowed' : 'pointer', marginBottom:'12px'
        }}>{loading ? '⏳ Publication...' : 'Publier mon annonce'}</button>

        <button
          onClick={() => {
            clearPublishDraft()
            window.location.href = '/'
          }}
          style={{display:'block', textAlign:'center', color:'#6b7c6e', fontSize:'0.82rem', background:'none', border:'none', cursor:'pointer', width:'100%', padding:'8px'}}
        >
          Retour
        </button>
      </div>
    </div>
  )
}
