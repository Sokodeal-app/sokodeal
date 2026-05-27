'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type ReportButtonProps = {
  adId: string
  userId?: string
}

export default function ReportButton({ adId, userId }: ReportButtonProps) {
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
    <div style={{ background: '#e8f5ee', borderRadius: '12px', padding: '12px', border: '1px solid #b7dfca', marginBottom: '12px', textAlign: 'center', fontSize: '0.82rem', color: '#15803D', fontWeight: 600 }}>
      Signalement envoye. Merci !
    </div>
  )

  return (
    <div style={{ marginBottom: '12px' }}>
      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #E8E0D4', borderRadius: '9px', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: '0.82rem', color: '#6F6B63', cursor: 'pointer' }}>
          Signaler cette annonce
        </button>
      ) : (
        <div style={{ background: '#fff1f0', borderRadius: '12px', padding: '14px', border: '1px solid #ffd6d6' }}>
          <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#c0392b', marginBottom: '10px' }}>Signaler cette annonce</p>
          <select value={reason} onChange={e => setReason(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #ffd6d6', borderRadius: '8px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', outline: 'none', color: '#111827', background: 'white', marginBottom: '10px' }}>
            <option value="">Choisir une raison...</option>
            <option value="arnaque">Arnaque / Fraude</option>
            <option value="contenu-inapproprie">Contenu inapproprie</option>
            <option value="faux-produit">Faux produit</option>
            <option value="prix-abusif">Prix abusif</option>
            <option value="doublon">Annonce en doublon</option>
            <option value="autre">Autre</option>
          </select>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleReport} disabled={sending || !reason} style={{ flex: 1, padding: '9px', background: !reason ? '#ccc' : '#c0392b', border: 'none', borderRadius: '8px', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: 'white', cursor: !reason ? 'not-allowed' : 'pointer' }}>
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid #E8E0D4', borderRadius: '8px', fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: '0.82rem', color: '#6F6B63', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
