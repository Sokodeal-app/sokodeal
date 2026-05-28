import Link from 'next/link'

type SellerRecord = {
  id: string
  username?: string | null
  full_name?: string | null
  is_verified?: boolean | null
  created_at: string
  ads_count?: number | null
}

type ListingSellerCardProps = {
  seller: SellerRecord
  variant: 'desktop' | 'mobile'
}

export default function ListingSellerCard({ seller, variant }: ListingSellerCardProps) {
  const sellerLabel = seller.full_name || `@${seller.username}`
  const initials = (seller.full_name || seller.username || 'V')[0].toUpperCase()
  const memberSince = new Date(seller.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const profileHref = `/u/${seller.username || seller.id}`

  if (variant === 'desktop') {
    return (
      <Link href={profileHref} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div
          className="desktop-seller-card"
          style={{
            background: 'var(--sd-surface)',
            borderRadius: '18px',
            padding: '18px 20px',
            border: '1px solid var(--sd-border)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            transition: 'box-shadow 180ms var(--sd-ease)',
            boxShadow: 'var(--sd-shadow-card)'
          }}
        >
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'var(--sd-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '1.25rem',
            color: 'white',
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: 'var(--sd-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflow: 'hidden'
            }}>
              <span style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{sellerLabel}</span>
              {seller.is_verified && <span style={{ fontSize: '0.75rem' }}>✅</span>}
            </div>
            {seller.username && (
              <div style={{ fontSize: '0.8rem', color: 'var(--sd-primary)', fontWeight: 600, marginTop: '3px' }}>@{seller.username}</div>
            )}
            <div style={{ fontSize: '0.78rem', color: 'var(--sd-muted)', marginTop: '4px' }}>
              Membre depuis {memberSince}
            </div>
          </div>
          <span style={{ color: 'var(--sd-primary)', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0 }}>→</span>
        </div>
      </Link>
    )
  }

  return (
    <Link href={profileHref} className="mobile-seller-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: 'var(--sd-surface)',
        borderRadius: '20px',
        padding: '18px',
        border: '1px solid var(--sd-border)',
        boxShadow: 'var(--sd-shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        margin: '0',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'var(--sd-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.2rem',
            color: 'white',
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--sd-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {sellerLabel}
              </span>
              {seller.is_verified && <span style={{ fontSize: '11px', color: 'var(--sd-primary)', fontWeight: 600, flexShrink: 0, background: 'var(--sd-primary-soft)', border: '1px solid var(--sd-border)', borderRadius: '999px', padding: '2px 8px' }}>Vérifié</span>}
            </div>
            {seller.username && (
              <div style={{ fontSize: '0.85rem', color: 'var(--sd-primary)', fontWeight: 600, marginBottom: '2px' }}>@{seller.username}</div>
            )}
            <div style={{ fontSize: '0.82rem', color: 'var(--sd-muted)' }}>
              Membre depuis {memberSince}
              {seller.ads_count ? ` · ${seller.ads_count} annonces` : ''}
            </div>
          </div>
          <span style={{ color: 'var(--sd-primary)', fontSize: '1rem', fontWeight: 600, flexShrink: 0 }}>→</span>
        </div>
        <div style={{
          marginTop: '14px',
          padding: '12px 14px',
          background: 'var(--sd-primary-soft)',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          color: 'var(--sd-primary)',
          fontWeight: 600
        }}>
          <span>⏱</span>
          <span>Répond généralement en moins d’1h</span>
        </div>
      </div>
    </Link>
  )
}
