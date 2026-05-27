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
      <Link href={profileHref} style={{ textDecoration: 'none' }}>
        <div
          className="desktop-seller-card"
          style={{
            background: 'white',
            borderRadius: '14px',
            padding: '16px 20px',
            border: '1px solid #E8E0D4',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'box-shadow 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#15803D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '1.2rem',
            color: 'white',
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              {sellerLabel}
              {seller.is_verified && <span style={{ fontSize: '0.75rem' }}>✅</span>}
            </div>
            {seller.username && (
              <div style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: 600 }}>@{seller.username}</div>
            )}
            <div style={{ fontSize: '0.72rem', color: '#6F6B63', marginTop: '2px' }}>
              Membre depuis {memberSince}
            </div>
          </div>
          <span style={{ color: '#15803D', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>→</span>
        </div>
      </Link>
    )
  }

  return (
    <Link href={profileHref} className="mobile-seller-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: '#FAF7EF',
        borderRadius: '20px',
        padding: '16px',
        border: '1px solid #E8E0D4',
        boxShadow: '0 4px 16px rgba(60,40,10,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        margin: '0',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#15803D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: 'white',
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{
                fontWeight: 700,
                fontSize: '15px',
                color: '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {sellerLabel}
              </span>
              {seller.is_verified && <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600, flexShrink: 0, background: '#E7F6EC', border: '1px solid #E8E0D4', borderRadius: '999px', padding: '2px 7px' }}>Vérifié</span>}
            </div>
            {seller.username && (
              <div style={{ fontSize: '13px', color: '#15803D', fontWeight: 600, marginBottom: '2px' }}>@{seller.username}</div>
            )}
            <div style={{ fontSize: '12px', color: '#6F6B63' }}>
              Membre depuis {memberSince}
              {seller.ads_count ? ` · ${seller.ads_count} annonces` : ''}
            </div>
          </div>
          <span style={{ color: '#15803D', fontSize: '18px', fontWeight: 600, flexShrink: 0 }}>→</span>
        </div>
        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          background: '#E7F6EC',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: '#15803D',
          fontWeight: 500
        }}>
          <span>⏱</span>
          <span>Répond généralement en moins d’1h</span>
        </div>
      </div>
    </Link>
  )
}
