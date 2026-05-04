'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

const PUBLISH_DRAFT_KEY = 'sokodeal:publish-draft'

export default function VerificationIdentitePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [nationalId, setNationalId] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docPreview, setDocPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      const { data: userData } = await supabase
        .from('users')
        .select('is_verified')
        .eq('id', user.id)
        .single()

      if (userData?.is_verified) {
        window.location.href = window.localStorage.getItem(PUBLISH_DRAFT_KEY) ? '/publier?verified=1' : '/profil'
        return
      }

      setUser(user)
      setLoading(false)
    }

    init()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setDocFile(file)
    const reader = new FileReader()
    reader.onload = () => setDocPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    setError('')
    if (!user) return setError('Vous devez etre connecte.')
    if (!nationalId.trim()) return setError('Le numero de carte est requis.')
    if (!docFile) return setError('Veuillez ajouter une photo de votre carte.')

    setSaving(true)
    try {
      const ext = docFile.name.split('.').pop() || 'jpg'
      const filePath = user.id + '/id-card.' + ext

      const { error: uploadError } = await supabase.storage
        .from('id-documents')
        .upload(filePath, docFile, { upsert: true })
      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('users')
        .update({
          national_id: nationalId.trim(),
          id_document_url: filePath,
          id_verification_status: 'verified',
          is_verified: true,
        })
        .eq('id', user.id)
      if (updateError) throw updateError

      window.location.href = window.localStorage.getItem(PUBLISH_DRAFT_KEY) ? '/publier?verified=1' : '/profil'
    } catch (err: any) {
      setError(err.message || 'Erreur pendant la verification. Reessayez.')
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{minHeight:'100vh', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <p style={{fontFamily:'Syne,sans-serif', color:'#1a7a4a', fontWeight:700}}>Chargement...</p>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'480px'}}>
        <div style={{textAlign:'center', marginBottom:'24px'}}>
          <a href="/" style={{display:'inline-flex', alignItems:'center', gap:'8px', textDecoration:'none'}}>
            <div style={{width:'36px', height:'36px', background:'#f5a623', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:800, color:'#111a14'}}>SD</div>
            <span style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.3rem', color:'#111a14'}}>Soko<span style={{color:'#1a7a4a'}}>Deal</span></span>
          </a>
        </div>

        <div style={{background:'white', borderRadius:'16px', padding:'28px', border:'1px solid #e8ede9', boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
          <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', marginBottom:'4px', color:'#111a14'}}>Verification d'identite</h1>
          <p style={{color:'#6b7c6e', fontSize:'0.86rem', lineHeight:1.6, marginBottom:'20px'}}>
            Pour publier une annonce, confirmez votre identite avec votre carte nationale.
          </p>

          <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'5px', textTransform:'uppercase'}}>Numero de carte nationale</label>
          <input
            type="text"
            placeholder="1 1990 7 0000000 1 00"
            value={nationalId}
            onChange={e => setNationalId(e.target.value)}
            style={{width:'100%', padding:'11px 14px', border:'1.5px solid #e0e0e0', borderRadius:'10px', fontFamily:'DM Sans,sans-serif', fontSize:'0.9rem', outline:'none', background:'#fafafa', color:'#222', boxSizing:'border-box', marginBottom:'14px'}}
          />

          <label style={{display:'block', fontSize:'0.72rem', fontWeight:600, color:'#6b7c6e', marginBottom:'8px', textTransform:'uppercase'}}>Photo de votre carte</label>
          <div onClick={() => fileInputRef.current?.click()}
            style={{border:'2px dashed ' + (docPreview ? '#1a7a4a' : '#e8ede9'), borderRadius:'12px', padding: docPreview ? '8px' : '28px', textAlign:'center', background:'#fafaf9', cursor:'pointer', marginBottom:'14px'}}>
            {docPreview ? (
              <div>
                <img src={docPreview} alt="Carte nationale" style={{maxWidth:'100%', maxHeight:'180px', objectFit:'contain', borderRadius:'8px', marginBottom:'6px'}} />
                <p style={{fontSize:'0.75rem', color:'#1a7a4a', fontWeight:600}}>Appuyer pour changer</p>
              </div>
            ) : (
              <>
                <p style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.9rem', color:'#111a14', marginBottom:'4px'}}>Ajouter une photo</p>
                <p style={{fontSize:'0.75rem', color:'#9ca3af'}}>JPG ou PNG</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{display:'none'}} />

          <div style={{background:'#f0f8f4', borderRadius:'10px', padding:'11px 14px', marginBottom:'16px'}}>
            <p style={{fontSize:'0.75rem', color:'#4a6b57'}}>Vos donnees sont stockees de maniere securisee et ne sont pas affichees publiquement.</p>
          </div>

          {error && (
            <div style={{background:'#fff1f0', border:'1px solid #ffd6d6', color:'#c0392b', padding:'10px 14px', borderRadius:'8px', fontSize:'0.82rem', marginBottom:'14px'}}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={saving || !nationalId.trim() || !docFile}
            style={{width:'100%', padding:'13px', background: saving || !nationalId.trim() || !docFile ? '#e8ede9' : '#1a7a4a', border:'none', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.95rem', color: saving || !nationalId.trim() || !docFile ? '#6b7c6e' : 'white', cursor: saving || !nationalId.trim() || !docFile ? 'not-allowed' : 'pointer'}}>
            {saving ? 'Verification...' : 'Valider mon identite'}
          </button>
        </div>
      </div>
    </div>
  )
}
