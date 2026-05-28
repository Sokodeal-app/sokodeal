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
  const headingStyle = {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 700,
    fontSize: isMobile ? '0.95rem' : '0.92rem',
    marginBottom: '10px',
    color: 'var(--sd-text)',
    textTransform: 'none' as const,
    letterSpacing: '0.01em',
  }

  const tipStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    fontSize: isMobile ? '0.92rem' : '0.88rem',
    color: 'var(--sd-muted)',
    lineHeight: 1.6,
  }

  const bulletStyle = {
    fontWeight: 700,
    flexShrink: 0,
    color: 'var(--sd-primary)',
  }

  return (
    <>
      <h3 style={headingStyle}>Conseils de sécurité</h3>
      {tips.map((tip, index) => (
        <div key={index} style={tipStyle}>
          <span style={bulletStyle}>✓</span>
          <span>{tip}</span>
        </div>
      ))}
    </>
  )
}
