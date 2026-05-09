'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { useParams } from 'next/navigation'
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

export default function ModifierAnnoncePage() {
  const { id } = useParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploadingImg, setUploadingImg] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [cropIndex, setCropIndex] = useState(0)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [recropUrl, setRecropUrl] = useState<string | null>(null)
  const [recropFile, setRecropFile] = useState<File | null>(null)
  const [convertingRecrop, setConvertingRecrop] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    province: '',
    phone: '',
    phone_indicatif: '+250',
    whatsapp: '',
    whatsapp_indicatif: '+250',
    whatsapp_same: true,
    hide_phone: false,
  })

  const categories = [
    { value:'immo-vente', label:'🏡 Immobilier — Vente' },
    { value:'immo-location', label:'🏢 Immobilier — Location' },
    { value:'immo-terrain', label:'🌿 Terrain' },
    { value:'voiture', label:'🚗 Voiture' },
    { value:'moto', label:'🛵 Moto' },
    { value:'electronique', label:'📱 Électronique' },
    { value:'mode', label:'👗 Mode & Vêtements' },
    { value:'maison', label:'🛋️ Maison & Jardin' },
    { value:'emploi', label:'💼 Emploi' },
    { value:'services', label:'🏗️ Services' },
    { value:'agriculture', label:'🌾 Agriculture' },
    { value:'animaux', label:'🐄 Animaux' },
    { value:'materiaux', label:'🧱 Matériaux' },
    { value:'sante', label:'💊 Santé & Beauté' },
    { value:'sport', label:'⚽ Sport & Loisirs' },
    { value:'education', label:'📚 Éducation' },
  ]

  const provinces = ['Kigali','Province du Nord','Province du Sud','Province de l\'Est','Province de l\'Ouest']

  useEffect(() => {
    const init = async () => {
      let shouldRedirect = false
      try {
      const { data: { user } } = await getCurrentUser()
      if (!user) {
        sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
          url: window.location.pathname,
          state: {}
        }))
        shouldRedirect = true
        window.location.href = '/auth?mode=login'
        return
      }
      setUser(user)

      const { data: ad } = await supabase.from('ads').select('*').eq('id', id).single()
      if (!ad) { shouldRedirect = true; window.location.href = '/profil'; return }
      if (ad.user_id !== user.id) { shouldRedirect = true; window.location.href = '/profil'; return }

      // Extraire indicatif et numéro du téléphone stocké
      const parsePhone = (full: string) => {
        const ind = INDICATIFS.find(i => full?.startsWith(i.code))
        if (ind) return { indicatif: ind.code, numero: full.replace(ind.code, '').trim() }
        return { indicatif: '+250', numero: full || '' }
      }

      const parsedPhone = parsePhone(ad.phone || '')
      const parsedWa = parsePhone(ad.whatsapp || '')
      const waIsSame = ad.whatsapp === ad.phone || !ad.whatsapp

      setForm({
        title: ad.title || '',
        description: ad.description || '',
        price: ad.price || '',
        category: ad.category || '',
        province: ad.province || '',
        phone: parsedPhone.numero,
        phone_indicatif: parsedPhone.indicatif,
        whatsapp: parsedWa.numero,
        whatsapp_indicatif: parsedWa.indicatif,
        whatsapp_same: waIsSame,
        hide_phone: ad.hide_phone || false,
      })
      setImages(ad.images || [])
      } catch (err) {
        console.error('modifier init error:', err)
      } finally {
        if (!shouldRedirect) setLoading(false)
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

  const uploadImageFile = async (file: File) => {
    setUploadingImg(true)
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { data, error } = await supabase.storage.from('annonces').upload(fileName, file)
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('annonces').getPublicUrl(fileName)
        const newUrl = urlData.publicUrl
        setImages(prev => [...prev, newUrl].slice(0, 5))
        return newUrl
      } else if (error) {
        console.error('Upload error:', JSON.stringify(error))
        setMsg('Erreur upload : ' + error.message)
      }
    } catch (err: any) {
      console.error('Upload catch:', err)
      setMsg('Erreur upload : ' + (err.message || 'Erreur inconnue'))
    } finally {
      setUploadingImg(false)
    }
    return null
  }

  const urlToFile = (url: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas error')); return }
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Blob error')); return }
          const filename = url.split('/').pop() || 'photo.jpg'
          resolve(new File([blob], filename, { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.95)
      }
      img.onerror = () => reject(new Error('Image load error'))
      img.src = url
    })
  }

  const handleRecropExisting = async (url: string) => {
    setRecropUrl(url)
    setConvertingRecrop(true)
    try {
      const file = await urlToFile(url)
      setRecropFile(file)
    } catch (e) {
      console.error('Recrop conversion error:', e)
      setMsg('Impossible de recadrer cette photo.')
      setRecropUrl(null)
    } finally {
      setConvertingRecrop(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    const remaining = 5 - images.length
    if (remaining <= 0) {
      setMsg('Maximum 5 photos')
      return
    }

    const toProcess = files.slice(0, remaining)
    if (files.length > remaining) setMsg('Maximum 5 photos. Les photos en plus ont ete ignorees.')
    else setMsg('')
    setPendingFiles(toProcess)
    setCropIndex(0)
    setCropFile(toProcess[0])
  }

  const handleCropConfirm = async (croppedFile: File) => {
    await uploadImageFile(croppedFile)

    const nextIndex = cropIndex + 1
    if (nextIndex < pendingFiles.length && images.length + nextIndex < 5) {
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

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (!form.title || !form.price || !form.category) {
      setMsg('\u274c Titre, prix et cat\u00e9gorie sont obligatoires')
      return
    }
    setSaving(true)
    setMsg('')

    try {
      const fullPhone = form.phone ? form.phone_indicatif + ' ' + form.phone : ''
      const fullWhatsapp = form.whatsapp_same
        ? fullPhone
        : (form.whatsapp ? form.whatsapp_indicatif + ' ' + form.whatsapp : '')

      const { error } = await supabase
        .from('ads')
        .update({
          title: form.title,
          description: form.description,
          price: parseInt(form.price),
          category: form.category,
          province: form.province,
          phone: fullPhone,
          whatsapp: fullWhatsapp,
          hide_phone: form.hide_phone,
          images: images,
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Save error:', error)
        setMsg('\u274c ' + error.message)
        return
      }

      setMsg('\u2705 Annonce mise \u00e0 jour !')
      setTimeout(() => window.location.href = '/profil', 1500)
    } catch (err: any) {
      console.error('Save catch:', err)
      setMsg('\u274c ' + (err.message || 'Erreur inconnue'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f7f5'}}>
      <p style={{fontFamily:'Syne,sans-serif', color:'#1a7a4a', fontWeight:700}}>⏳ Chargement...</p>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', background:'#f5f7f5'}}>
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspect={4 / 3}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
      {recropFile && recropUrl && (
        <ImageCropModal
          file={recropFile}
          aspect={4 / 3}
          onConfirm={async (croppedFile) => {
            try {
              const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${croppedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
              const { data, error } = await supabase.storage.from('annonces').upload(fileName, croppedFile)
              if (!error && data) {
                const { data: urlData } = supabase.storage.from('annonces').getPublicUrl(fileName)
                setImages(prev => prev.map(u => u === recropUrl ? urlData.publicUrl : u))
              } else if (error) {
                console.error('Upload error:', JSON.stringify(error))
                setMsg('Erreur recadrage : ' + error.message)
              }
            } catch (err: any) {
              console.error('Upload catch:', err)
              setMsg('Erreur recadrage : ' + (err.message || 'Erreur inconnue'))
            } finally {
              setRecropFile(null)
              setRecropUrl(null)
            }
          }}
          onCancel={() => { setRecropFile(null); setRecropUrl(null) }}
        />
      )}

      {/* HEADER */}
      <header style={{background:'white', borderBottom:'1px solid #e8ede9', position:'sticky', top:0, zIndex:100}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 5%', height:'58px', maxWidth:'800px', margin:'0 auto'}}>
          <a href="/profil" style={{display:'flex', alignItems:'center', gap:'8px', textDecoration:'none', color:'#111a14', fontFamily:'DM Sans,sans-serif', fontSize:'0.88rem', fontWeight:600}}>
            ← Retour
          </a>
          <a href="/" style={{display:'flex', alignItems:'center', gap:'8px', textDecoration:'none'}}>
            <div style={{width:'28px', height:'28px', background:'#f5a623', borderRadius:'7px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px'}}>🦁</div>
            <span style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem', color:'#111a14'}}>Soko<span style={{color:'#1a7a4a'}}>Deal</span></span>
          </a>
          <button onClick={handleSave} disabled={saving} style={{padding:'7px 18px', background: saving ? '#ccc' : '#1a7a4a', border:'none', borderRadius:'8px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.82rem', color:'white', cursor: saving ? 'not-allowed' : 'pointer'}}>
            {saving ? '⏳...' : '💾 Sauvegarder'}
          </button>
        </div>
      </header>

      <div style={{maxWidth:'800px', margin:'24px auto', padding:'0 5% 60px'}}>
        <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.4rem', color:'#111a14', marginBottom:'20px'}}>
          ✏️ Modifier l'annonce
        </h1>

        {msg && (
          <div style={{background: msg.includes('✅') ? '#e8f5ee' : '#fff1f0', color: msg.includes('✅') ? '#1a7a4a' : '#c0392b', padding:'12px 16px', borderRadius:'10px', fontSize:'0.88rem', marginBottom:'16px', border:'1px solid ' + (msg.includes('✅') ? '#b7dfca' : '#ffd6d6')}}>
            {msg}
          </div>
        )}

        {/* PHOTOS */}
        <div style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'14px'}}>
          <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'14px', color:'#111a14'}}>📷 Photos ({images.length}/5)</h2>
          <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
            {images.map((img, i) => (
              <div key={i} style={{position:'relative', width:'90px', height:'90px'}}>
                <img src={img} style={{width:'90px', height:'90px', objectFit:'cover', borderRadius:'10px', border: i === 0 ? '2px solid #1a7a4a' : '1px solid #e8ede9'}} />
                {i === 0 && (
                  <span style={{position:'absolute', bottom:'4px', left:'4px', background:'#1a7a4a', color:'white', fontSize:'0.55rem', fontWeight:700, padding:'2px 5px', borderRadius:'4px'}}>
                    Principale
                  </span>
                )}
                <button
                  onClick={() => handleRecropExisting(img)}
                  disabled={convertingRecrop}
                  style={{position:'absolute', top:'-6px', left:'-6px', background:'#f5a623', color:'#111a14', border:'none', borderRadius:'50%', width:'20px', height:'20px', cursor: convertingRecrop ? 'not-allowed' : 'pointer', fontSize:'0.7rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center'}}
                  title="Recadrer"
                >{convertingRecrop && recropUrl === img ? '\u23f3' : '\u2702'}</button>
                <button
                  onClick={() => removeImage(i)}
                  style={{position:'absolute', top:'-6px', right:'-6px', background:'#e63946', color:'white', border:'none', borderRadius:'50%', width:'20px', height:'20px', cursor:'pointer', fontSize:'0.7rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center'}}
                >{'\u00d7'}</button>
              </div>
            ))}
            {images.length < 5 && (
              <label style={{width:'90px', height:'90px', border:'2px dashed #e8ede9', borderRadius:'10px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'#fafaf9', gap:'4px'}}>
                <span style={{fontSize:'1.4rem'}}>+</span>
                <span style={{fontSize:'0.65rem', color:'#6b7c6e', fontWeight:600}}>{uploadingImg ? '⏳...' : 'Ajouter'}</span>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{display:'none'}} disabled={uploadingImg} />
              </label>
            )}
          </div>
        </div>

        {/* INFOS */}
        <div style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'14px'}}>
          <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'14px', color:'#111a14'}}>📝 Informations</h2>
          <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>

            <div>
              <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Titre *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', outline:'none', color:'#111a14', background:'#fafaf9'}} />
            </div>

            <div>
              <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4}
                style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', outline:'none', color:'#111a14', background:'#fafaf9', resize:'vertical'}} />
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
              <div>
                <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Prix (RWF) *</label>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                  style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', outline:'none', color:'#111a14', background:'#fafaf9'}} />
              </div>
              <div>
                <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Province</label>
                <select value={form.province} onChange={e => setForm({...form, province: e.target.value})}
                  style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', outline:'none', color:'#111a14', background:'#fafaf9'}}>
                  <option value="">Choisir...</option>
                  {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Catégorie *</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                style={{width:'100%', padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', outline:'none', color:'#111a14', background:'#fafaf9'}}>
                <option value="">Choisir...</option>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* CONTACT */}
        <div style={{background:'white', borderRadius:'14px', padding:'20px', border:'1px solid #e8ede9', marginBottom:'14px'}}>
          <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.95rem', marginBottom:'14px', color:'#111a14'}}>📞 Contact</h2>
          <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>

            {/* TELEPHONE */}
            <div>
              <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>📞 Téléphone</label>
              <div style={{display:'flex', gap:'8px'}}>
                <select value={form.phone_indicatif} onChange={e => setForm({...form, phone_indicatif: e.target.value})}
                  style={{padding:'10px 8px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'#fafaf9', color:'#111a14', cursor:'pointer', flexShrink:0}}>
                  {INDICATIFS.map(i => <option key={i.code} value={i.code}>{i.flag} {i.code}</option>)}
                </select>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="780 000 000"
                  disabled={form.hide_phone}
                  style={{flex:1, padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', outline:'none', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', color:'#111a14', background: form.hide_phone ? '#f5f7f5' : '#fafaf9'}} />
              </div>
            </div>

            {/* WHATSAPP SAME */}
            <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}>
              <input type="checkbox" checked={form.whatsapp_same} onChange={e => setForm({...form, whatsapp_same: e.target.checked})}
                style={{width:'15px', height:'15px', accentColor:'#1a7a4a', cursor:'pointer'}} />
              <span style={{fontSize:'0.82rem', color:'#6b7c6e', fontFamily:'DM Sans,sans-serif'}}>💬 Mon WhatsApp est le même que mon téléphone</span>
            </label>

            {/* WHATSAPP DIFFERENT */}
            {!form.whatsapp_same && (
              <div>
                <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>💬 WhatsApp</label>
                <div style={{display:'flex', gap:'8px'}}>
                  <select value={form.whatsapp_indicatif} onChange={e => setForm({...form, whatsapp_indicatif: e.target.value})}
                    style={{padding:'10px 8px', border:'1px solid #e8ede9', borderRadius:'8px', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', outline:'none', background:'#fafaf9', color:'#111a14', cursor:'pointer', flexShrink:0}}>
                    {INDICATIFS.map(i => <option key={i.code} value={i.code}>{i.flag} {i.code}</option>)}
                  </select>
                  <input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} placeholder="780 000 000"
                    style={{flex:1, padding:'10px 12px', border:'1px solid #e8ede9', borderRadius:'8px', outline:'none', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', color:'#111a14', background:'#fafaf9'}} />
                </div>
              </div>
            )}

            {/* CACHER NUMERO */}
            <label style={{display:'flex', alignItems:'flex-start', gap:'10px', cursor:'pointer', padding:'12px', background:'#f5f7f5', borderRadius:'8px', border:'1px solid #e8ede9'}}>
              <input type="checkbox" checked={form.hide_phone} onChange={e => setForm({...form, hide_phone: e.target.checked})}
                style={{width:'16px', height:'16px', accentColor:'#1a7a4a', cursor:'pointer', marginTop:'2px'}} />
              <div>
                <div style={{fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.85rem', color:'#111a14'}}>🔒 Cacher mon numéro de téléphone</div>
                <div style={{fontSize:'0.72rem', color:'#6b7c6e', marginTop:'2px'}}>Les acheteurs pourront me contacter uniquement via la messagerie SokoDeal</div>
              </div>
            </label>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} style={{width:'100%', padding:'14px', background: saving ? '#ccc' : '#1a7a4a', border:'none', borderRadius:'12px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1rem', color:'white', cursor: saving ? 'not-allowed' : 'pointer'}}>
          {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder les modifications'}
        </button>
      </div>
    </div>
  )
}
