export function formatPrice(value: number | string | null | undefined) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return 'Prix non disponible'
  }

  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(number) + ' RWF'
}
