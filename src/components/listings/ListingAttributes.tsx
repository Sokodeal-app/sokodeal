import { formatPrice } from '@/lib/format'

type ListingAttributesProps = {
  ad: {
    category: string
    price: string | number | null
    province?: string | null
    district?: string | null
    created_at: string
    is_active?: boolean | null
    immo_type?: string | null
    surface?: string | number | null
    surface_terrain?: string | number | null
    chambres?: string | number | null
    salles_de_bain?: string | number | null
    etage?: string | number | null
    etat?: string | null
    meuble?: boolean | null
    charges_incluses?: boolean | null
  }
  categoryLabel: string
}

export default function ListingAttributes({ ad, categoryLabel }: ListingAttributesProps) {
  const details = [
    { label: 'Catégorie', value: categoryLabel, icon: '🏷️' },
    { label: 'Prix', value: formatPrice(ad.price), icon: '💰' },
    { label: 'Ville', value: ad.province || '-', icon: '🗺️' },
    { label: 'District', value: ad.district || '-', icon: '📍' },
    { label: 'Publié le', value: new Date(ad.created_at).toLocaleDateString('fr-FR'), icon: '📅' },
    { label: 'Statut', value: ad.is_active ? 'Active' : 'Inactive', icon: '🔘' },
    ...(ad.immo_type ? [{ label: 'Type', value: ad.immo_type, icon: '🏡' }] : []),
    ...(ad.surface ? [{ label: 'Surface habitable', value: ad.surface + ' m²', icon: '📐' }] : []),
    ...(ad.surface_terrain ? [{ label: 'Surface terrain', value: ad.surface_terrain + ' m²', icon: '🌿' }] : []),
    ...(ad.chambres ? [{ label: 'Chambres', value: ad.chambres, icon: '🛏️' }] : []),
    ...(ad.salles_de_bain ? [{ label: 'Salles de bain', value: ad.salles_de_bain, icon: '🚿' }] : []),
    ...(ad.etage ? [{ label: 'Étage', value: ad.etage, icon: '🏢' }] : []),
    ...(ad.etat ? [{ label: 'État', value: ad.etat === 'neuf' ? 'Neuf' : ad.etat === 'bon-etat' ? 'Bon état' : 'À rénover', icon: '✨' }] : []),
    ...(ad.meuble ? [{ label: 'Meublé', value: 'Oui', icon: '🛋️' }] : []),
    ...(ad.charges_incluses ? [{ label: 'Charges', value: 'Incluses', icon: '💡' }] : []),
  ]

  return (
    <div className="details-card" style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #E8E0D4' }}>
      <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '0.95rem', marginBottom: '14px', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Détails
      </h2>
      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {details.map((item, i) => {
          const valueText = String(item.value)
          const isLongDetail = valueText.length > 18 || item.label.length > 14
          return (
            <div key={i} className={`detail-item ${isLongDetail ? 'detail-item-long' : ''}`} style={{ background: '#FAF7EF', borderRadius: '9px', padding: '11px 13px', border: '1px solid #E8E0D4' }}>
              <div className="detail-label" style={{ fontSize: '0.7rem', color: '#6F6B63', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase' }}>
                {item.icon} {item.label}
              </div>
              <div className="detail-value" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
                {valueText}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
