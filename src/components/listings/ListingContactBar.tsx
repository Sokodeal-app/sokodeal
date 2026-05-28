import FavoriteButton from '@/components/FavoriteButton'

type ListingContactBarProps = {
  isOwnListing: boolean
  isListingContactable: boolean
  canUseWhatsApp: boolean
  canUsePhone: boolean
  user: { id: string } | null
  adId: string
  waHref: string
  phoneHref: string
  onMessageClick: () => void
  onLoginRequired: () => void
}

export default function ListingContactBar({
  isOwnListing,
  isListingContactable,
  canUseWhatsApp,
  canUsePhone,
  user,
  adId,
  waHref,
  phoneHref,
  onMessageClick,
  onLoginRequired,
}: ListingContactBarProps) {
  return (
    <>
      {!isOwnListing && !isListingContactable && (
        <p style={{ fontSize: '0.875rem', color: 'var(--sd-muted)', textAlign: 'center', padding: '12px 20px 0' }}>
          Cette annonce n’est plus disponible.
        </p>
      )}
      {isOwnListing && (
        <p style={{ fontSize: '0.875rem', color: 'var(--sd-muted)', textAlign: 'center', padding: '12px 20px 0' }}>
          Ceci est votre annonce.
        </p>
      )}
      <div
        className="mobile-action-bar"
        style={{
          gridTemplateColumns: canUseWhatsApp && canUsePhone ? 'auto 1fr 44px 44px' : (canUseWhatsApp || canUsePhone) ? 'auto 1fr 44px' : 'auto 1fr',
          borderTop: '1px solid var(--sd-border)',
          background: 'rgba(255,255,255,0.96)',
        }}
      >
        <div className="mobile-favorite-action" style={{
          height: '44px',
          borderRadius: '12px',
          border: '1px solid var(--sd-border)',
          background: 'var(--sd-surface)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '0 10px',
          color: 'var(--sd-text)'
        }}>
          <FavoriteButton adId={adId} size="sm" onLogin={onLoginRequired} />
          <span className="mobile-favorite-label">Favori</span>
        </div>
        {!isOwnListing && isListingContactable && (
          <button
            onClick={onMessageClick}
            className="mobile-action-primary"
            style={{
              background: 'var(--sd-primary)',
              color: 'white',
              borderRadius: '12px',
              height: '44px',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none'
            }}
          >
            💬 Message
          </button>
        )}
        {canUseWhatsApp && !isOwnListing && isListingContactable && (
          user ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                textDecoration: 'none'
              }}
              aria-label="WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.535 5.943L.057 23.93l6.184-1.622A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.889 9.889 0 01-5.031-1.378l-.360-.214-3.733.979.996-3.648-.235-.374A9.861 9.861 0 012.106 12C2.106 6.54 6.54 2.106 12 2.106S21.894 6.54 21.894 12 16.46 21.894 12 21.894z" />
              </svg>
            </a>
          ) : (
            <button
              type="button"
              onClick={onLoginRequired}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#25D366',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              aria-label="WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.535 5.943L.057 23.93l6.184-1.622A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.889 9.889 0 01-5.031-1.378l-.360-.214-3.733.979.996-3.648-.235-.374A9.861 9.861 0 012.106 12C2.106 6.54 6.54 2.106 12 2.106S21.894 6.54 21.894 12 16.46 21.894 12 21.894z" />
              </svg>
            </button>
          )
        )}
        {canUsePhone && !isOwnListing && isListingContactable && (
          user ? (
            <a
              href={phoneHref}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '1px solid var(--sd-border)',
                background: 'var(--sd-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                textDecoration: 'none',
                fontSize: '20px',
                color: 'var(--sd-text)'
              }}
              aria-label={'Téléphone'}
            >
              {'📞'}
            </a>
          ) : (
            <button
              type="button"
              onClick={onLoginRequired}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '1px solid var(--sd-border)',
                background: 'var(--sd-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
                fontSize: '20px',
                color: 'var(--sd-text)'
              }}
              aria-label={'Téléphone'}
            >
              {'📞'}
            </button>
          )
        )}
      </div>
    </>
  )
}
