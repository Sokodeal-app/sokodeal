type SafetyNoticeProps = {
  variant?: 'desktop' | 'mobile'
}

const tips = [
  'Ne payez jamais à l’avance sans voir l’article',
  'Rencontrez le vendeur dans un lieu public',
  'Vérifiez l’article avant tout paiement',
]

export default function SafetyNotice({ variant = 'desktop' }: SafetyNoticeProps) {
  const isMobile = variant === 'mobile'
  const headingStyle = isMobile
    ? {
        fontSize: '13px',
        fontWeight: 600,
        color: '#111827',
        marginBottom: '8px',
      }
    : {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 700,
        fontSize: '0.82rem',
        marginBottom: '8px',
        color: '#78350f',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.04em',
      }

  const tipStyle = isMobile
    ? {
        display: 'flex',
        gap: '6px',
        marginBottom: '5px',
        fontSize: '13px',
        color: '#6F6B63',
      }
    : {
        display: 'flex',
        gap: '6px',
        marginBottom: '5px',
        fontSize: '0.75rem',
        color: '#78350f',
      }

  const bulletStyle = {
    fontWeight: 700,
    flexShrink: 0,
  }

  return (
    <>
      <h3 style={headingStyle}>Conseils de sécurité</h3>
      {tips.map((tip, index) => (
        <div key={index} style={tipStyle}>
          <span style={{ ...bulletStyle, color: isMobile ? '#15803D' : undefined }}>✓</span>
          {tip}
        </div>
      ))}
    </>
  )
}
