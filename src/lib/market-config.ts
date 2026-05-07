export const LAUNCH_CITIES = ['Kigali']

export const LAUNCH_MAIN_CATEGORIES = [
  { value: 'immo', label: 'Immo', navbar: true },
  { value: 'mode', label: 'Vêtements', navbar: true },
  { value: 'vehicule', label: 'Véhicules', navbar: true },
  { value: 'emploi-service', label: 'Emplois & Services', navbar: true },
  { value: 'animaux', label: 'Animaux', navbar: true },
  { value: 'fourniture', label: 'Fournitures', navbar: true },
  { value: 'tech', label: 'Tech', navbar: true },
  { value: 'divers', label: 'Divers', navbar: true },
] as const

export const LAUNCH_SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  immo: [
    { value: 'immo-vente', label: 'Vente immobilière' },
    { value: 'immo-location', label: 'Location immobilière' },
    { value: 'immo-terrain', label: 'Terrain' },
  ],
  vehicule: [
    { value: 'voiture', label: 'Voiture' },
    { value: 'moto', label: 'Moto' },
  ],
  'emploi-service': [
    { value: 'emploi', label: 'Emploi' },
    { value: 'services', label: 'Services' },
  ],
  fourniture: [
    { value: 'maison', label: 'Maison et mobilier' },
    { value: 'materiaux', label: 'Matériaux construction' },
  ],
  tech: [
    { value: 'electronique', label: 'Électronique' },
  ],
  divers: [
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'sante', label: 'Santé et beauté' },
    { value: 'sport', label: 'Sport et loisirs' },
    { value: 'education', label: 'Éducation' },
  ],
}

export const CATEGORY_GROUPS: Record<string, string[]> = {
  immo: ['immo-vente', 'immo-location', 'immo-terrain'],
  vehicule: ['vehicule', 'voiture', 'moto'],
  'emploi-service': ['emploi-service', 'emploi', 'services'],
  fourniture: ['fourniture', 'maison', 'materiaux'],
  tech: ['tech', 'electronique'],
  divers: ['divers', 'agriculture', 'sante', 'sport', 'education'],
}

export const matchesCategoryGroup = (selectedCategory: string, adCategory?: string | null) => {
  if (!selectedCategory || !adCategory) return true
  return (CATEGORY_GROUPS[selectedCategory] || [selectedCategory]).includes(adCategory)
}
