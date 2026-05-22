// lib/categories.ts
// Fichier partagé: les anciens slugs restent disponibles, les nouveaux slugs DS v4 sont stables.

export const CATEGORY_SLUGS = {
  REAL_ESTATE: 'real_estate',
  VEHICLES: 'vehicles',
  ELECTRONICS: 'electronics',
  HOME: 'home',
  FASHION: 'fashion',
  SERVICES: 'services',
  MOTO: 'moto',
  OTHER: 'other',
} as const

export const CATEGORY_KEYS = {
  REAL_ESTATE: 'immobilier',
  VEHICLES: 'vehicules',
  ELECTRONICS: 'electronique',
  HOME: 'maison',
  FASHION: 'mode',
  SERVICES: 'services',
  MOTO: 'moto',
  OTHER: 'autre',
} as const

export type CategorySlug = (typeof CATEGORY_SLUGS)[keyof typeof CATEGORY_SLUGS]
export type CategoryKey = (typeof CATEGORY_KEYS)[keyof typeof CATEGORY_KEYS]

export type CategoryDefinition = {
  key: CategoryKey
  slug: CategoryKey
  label: string
  navbar?: boolean
  aliases?: string[]
}

export type CategoryOption = {
  value: string
  label: string
  navbar?: boolean
}

export const DS_CATEGORIES: CategoryOption[] = [
  { value: CATEGORY_SLUGS.REAL_ESTATE, label: 'Immobilier', navbar: true },
  { value: CATEGORY_SLUGS.VEHICLES, label: 'Véhicules', navbar: true },
  { value: CATEGORY_SLUGS.MOTO, label: 'Motos', navbar: true },
  { value: CATEGORY_SLUGS.ELECTRONICS, label: 'Électronique', navbar: true },
  { value: CATEGORY_SLUGS.HOME, label: 'Maison', navbar: true },
  { value: CATEGORY_SLUGS.FASHION, label: 'Mode', navbar: true },
  { value: CATEGORY_SLUGS.SERVICES, label: 'Services', navbar: true },
  { value: CATEGORY_SLUGS.OTHER, label: 'Autre', navbar: true },
]

export const CATEGORIES: CategoryDefinition[] = [
  {
    key: CATEGORY_KEYS.REAL_ESTATE,
    slug: CATEGORY_KEYS.REAL_ESTATE,
    label: 'Immobilier',
    navbar: true,
    aliases: ['immo', 'immo-vente', 'immo-location', 'immo-terrain', 'real_estate', 'real-estate'],
  },
  {
    key: CATEGORY_KEYS.VEHICLES,
    slug: CATEGORY_KEYS.VEHICLES,
    label: 'V\u00e9hicules',
    navbar: true,
    aliases: ['voiture', 'voitures', 'vehicle', 'vehicles', 'auto', 'autos'],
  },
  {
    key: CATEGORY_KEYS.ELECTRONICS,
    slug: CATEGORY_KEYS.ELECTRONICS,
    label: '\u00c9lectronique',
    navbar: true,
    aliases: ['electronics', 'tech', 'telephone', 'ordinateur'],
  },
  {
    key: CATEGORY_KEYS.HOME,
    slug: CATEGORY_KEYS.HOME,
    label: 'Maison',
    navbar: true,
    aliases: ['home', 'maison-jardin', 'jardin'],
  },
  {
    key: CATEGORY_KEYS.FASHION,
    slug: CATEGORY_KEYS.FASHION,
    label: 'Mode',
    navbar: true,
    aliases: ['fashion', 'beaute', 'mode-beaute'],
  },
  {
    key: CATEGORY_KEYS.MOTO,
    slug: CATEGORY_KEYS.MOTO,
    label: 'Motos',
    navbar: true,
    aliases: ['motos', 'scooter', 'scooters'],
  },
  {
    key: CATEGORY_KEYS.SERVICES,
    slug: CATEGORY_KEYS.SERVICES,
    label: 'Services',
    navbar: true,
    aliases: ['emploi', 'job', 'jobs', 'service'],
  },
  {
    key: CATEGORY_KEYS.OTHER,
    slug: CATEGORY_KEYS.OTHER,
    label: 'Autre',
    navbar: true,
    aliases: ['other', 'agriculture', 'materiaux', 'sante', 'sport', 'education', 'animaux'],
  },
]

export const LEGACY_CATEGORY_ALIASES: Record<string, CategorySlug> = {
  immo: CATEGORY_SLUGS.REAL_ESTATE,
  'immo-vente': CATEGORY_SLUGS.REAL_ESTATE,
  'immo-location': CATEGORY_SLUGS.REAL_ESTATE,
  'immo-terrain': CATEGORY_SLUGS.REAL_ESTATE,
  voiture: CATEGORY_SLUGS.VEHICLES,
  vehicles: CATEGORY_SLUGS.VEHICLES,
  moto: CATEGORY_SLUGS.MOTO,
  electronique: CATEGORY_SLUGS.ELECTRONICS,
  electronics: CATEGORY_SLUGS.ELECTRONICS,
  maison: CATEGORY_SLUGS.HOME,
  home: CATEGORY_SLUGS.HOME,
  mode: CATEGORY_SLUGS.FASHION,
  fashion: CATEGORY_SLUGS.FASHION,
  services: CATEGORY_SLUGS.SERVICES,
  emploi: CATEGORY_SLUGS.SERVICES,
  agriculture: CATEGORY_SLUGS.OTHER,
  materiaux: CATEGORY_SLUGS.OTHER,
  sante: CATEGORY_SLUGS.OTHER,
  sport: CATEGORY_SLUGS.OTHER,
  education: CATEGORY_SLUGS.OTHER,
  animaux: CATEGORY_SLUGS.OTHER,
  other: CATEGORY_SLUGS.OTHER,
  autre: CATEGORY_SLUGS.OTHER,
}

export function normalizeCategorySlug(value: string | null | undefined): CategorySlug {
  const key = value?.trim()
  if (!key) return CATEGORY_SLUGS.OTHER

  return LEGACY_CATEGORY_ALIASES[key] || CATEGORY_SLUGS.OTHER
}
// Fichier partagé — importer dans page.tsx et publier/page.tsx

function normalizeCategoryToken(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, '-')
}

const CATEGORY_KEY_ALIASES: Record<string, CategoryKey> = CATEGORIES.reduce(
  (aliases, category) => {
    aliases[category.key] = category.key
    aliases[category.slug] = category.key
    category.aliases?.forEach((alias) => {
      aliases[normalizeCategoryToken(alias)] = category.key
      aliases[alias] = category.key
    })
    return aliases
  },
  {} as Record<string, CategoryKey>,
)

export function normalizeCategoryKey(value: string | null | undefined): CategoryKey {
  const key = normalizeCategoryToken(value)
  if (!key) return CATEGORY_KEYS.OTHER

  return CATEGORY_KEY_ALIASES[key] || CATEGORY_KEYS.OTHER
}

export function getCategoryByKey(value: string | null | undefined): CategoryDefinition {
  const key = normalizeCategoryKey(value)
  return CATEGORIES.find((category) => category.key === key) || CATEGORIES[CATEGORIES.length - 1]
}

export function getCategoryBySlug(value: string | null | undefined): CategoryDefinition {
  return getCategoryByKey(value)
}

export function getCategoryLabel(value: string | null | undefined): string {
  return getCategoryByKey(value).label
}

export const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  voiture: [
    { value: '', label: 'Toutes les voitures' },
    { value: 'berline', label: 'Berline' },
    { value: 'suv', label: 'SUV / 4x4' },
    { value: 'pickup', label: 'Pick-up' },
    { value: 'minibus', label: 'Minibus / Van' },
    { value: 'camion', label: 'Camion' },
    { value: 'utilitaire', label: 'Utilitaire' },
    { value: 'autre', label: 'Autre' },
  ],
  moto: [
    { value: '', label: 'Toutes les motos' },
    { value: 'moto', label: 'Moto' },
    { value: 'scooter', label: 'Scooter' },
    { value: 'velo-electrique', label: 'Vélo électrique' },
    { value: 'tricycle', label: 'Tricycle' },
    { value: 'autre', label: 'Autre' },
  ],
  electronique: [
    { value: '', label: 'Tout l\'électronique' },
    { value: 'telephone', label: 'Téléphone' },
    { value: 'ordinateur', label: 'Ordinateur / Laptop' },
    { value: 'tablette', label: 'Tablette' },
    { value: 'tv', label: 'TV / Écran' },
    { value: 'photo', label: 'Appareil photo' },
    { value: 'accessoires', label: 'Accessoires' },
    { value: 'console', label: 'Console de jeux' },
    { value: 'autre', label: 'Autre' },
  ],
  mode: [
    { value: '', label: 'Toute la mode' },
    { value: 'homme', label: 'Vêtements homme' },
    { value: 'femme', label: 'Vêtements femme' },
    { value: 'enfant', label: 'Enfant' },
    { value: 'chaussures', label: 'Chaussures' },
    { value: 'sacs', label: 'Sacs' },
    { value: 'bijoux', label: 'Bijoux / Montres' },
    { value: 'autre', label: 'Autre' },
  ],
  maison: [
    { value: '', label: 'Tout maison & jardin' },
    { value: 'meubles', label: 'Meubles' },
    { value: 'electromenager', label: 'Électroménager' },
    { value: 'decoration', label: 'Décoration' },
    { value: 'jardinage', label: 'Jardinage' },
    { value: 'literie', label: 'Literie' },
    { value: 'cuisine', label: 'Cuisine / Vaisselle' },
    { value: 'autre', label: 'Autre' },
  ],
  animaux: [
    { value: '', label: 'Tous les animaux' },
    { value: 'chien', label: '🐕 Chien' },
    { value: 'chat', label: '🐈 Chat' },
    { value: 'oiseau', label: '🐦 Oiseau' },
    { value: 'poisson', label: '🐟 Poisson' },
    { value: 'lapin', label: '🐇 Lapin' },
    { value: 'reptile', label: '🦎 Reptile' },
    { value: 'vache', label: '🐄 Vache' },
    { value: 'chevre', label: '🐐 Chèvre' },
    { value: 'mouton', label: '🐑 Mouton' },
    { value: 'volaille', label: '🐓 Volaille / Poulet' },
    { value: 'cheval', label: '🐎 Cheval' },
    { value: 'cochon', label: '🐷 Cochon' },
    { value: 'autre', label: 'Autre' },
  ],
  agriculture: [
    { value: '', label: 'Toute l\'agriculture' },
    { value: 'semences', label: 'Semences / Plants' },
    { value: 'engrais', label: 'Engrais / Pesticides' },
    { value: 'outils', label: 'Outils agricoles' },
    { value: 'recolte', label: 'Récolte / Produits' },
    { value: 'betail', label: 'Bétail' },
    { value: 'irrigation', label: 'Irrigation' },
    { value: 'autre', label: 'Autre' },
  ],
  materiaux: [
    { value: '', label: 'Tous les matériaux' },
    { value: 'ciment', label: 'Ciment / Béton' },
    { value: 'fer', label: 'Fer / Acier' },
    { value: 'bois', label: 'Bois' },
    { value: 'peinture', label: 'Peinture' },
    { value: 'carrelage', label: 'Carrelage / Tuiles' },
    { value: 'plomberie', label: 'Plomberie' },
    { value: 'electricite', label: 'Électricité' },
    { value: 'autre', label: 'Autre' },
  ],
  sante: [
    { value: '', label: 'Tout santé & beauté' },
    { value: 'medicaments', label: 'Médicaments' },
    { value: 'cosmetiques', label: 'Cosmétiques' },
    { value: 'materiel-medical', label: 'Matériel médical' },
    { value: 'bien-etre', label: 'Bien-être' },
    { value: 'autre', label: 'Autre' },
  ],
  sport: [
    { value: '', label: 'Tout sport & loisirs' },
    { value: 'football', label: 'Football' },
    { value: 'fitness', label: 'Fitness / Musculation' },
    { value: 'velo', label: 'Vélo' },
    { value: 'natation', label: 'Natation' },
    { value: 'arts-martiaux', label: 'Arts martiaux' },
    { value: 'jeux', label: 'Jeux / Jouets' },
    { value: 'autre', label: 'Autre' },
  ],
  education: [
    { value: '', label: 'Tout éducation' },
    { value: 'livres', label: 'Livres / Manuels' },
    { value: 'cours', label: 'Cours particuliers' },
    { value: 'fournitures', label: 'Fournitures scolaires' },
    { value: 'formation', label: 'Formation / Certification' },
    { value: 'autre', label: 'Autre' },
  ],
  services: [
    { value: '', label: 'Tous les services' },
    { value: 'construction', label: 'Construction / BTP' },
    { value: 'menage', label: 'Ménage / Nettoyage' },
    { value: 'transport', label: 'Transport / Livraison' },
    { value: 'informatique', label: 'Informatique / Web' },
    { value: 'coiffure', label: 'Coiffure / Beauté' },
    { value: 'plomberie', label: 'Plomberie' },
    { value: 'electricite', label: 'Électricité' },
    { value: 'securite', label: 'Sécurité / Gardiennage' },
    { value: 'autre', label: 'Autre' },
  ],
}

export const MAIN_CATEGORIES = [
  { value: 'immo', label: '🏡 Immo', navbar: true },
  { value: 'voiture', label: '🚗 Autos', navbar: true },
  { value: 'moto', label: '🛵 Motos', navbar: true },
  { value: 'electronique', label: '📱 Tech', navbar: true },
  { value: 'mode', label: '👗 Mode', navbar: true },
  { value: 'agriculture', label: '🌾 Agri', navbar: true },
  { value: 'materiaux', label: '🧱 BTP', navbar: true },
  { value: 'sante', label: '💊 Santé', navbar: true },
  { value: 'sport', label: '⚽ Sport', navbar: true },
  { value: 'education', label: '📚 Éduc', navbar: true },
  { value: 'animaux', label: '🐄 Animaux', navbar: true },
  { value: 'services', label: '🏗️ Services', navbar: true },
]

// Pour le formulaire publier — catégories principales sans immo groupé
export const PUBLISH_CATEGORIES = [
  { value: 'immo-vente', label: '🏡 Immobilier Vente' },
  { value: 'immo-location', label: '🏢 Immobilier Location' },
  { value: 'immo-terrain', label: '🌿 Terrain' },
  { value: 'voiture', label: '🚗 Voitures' },
  { value: 'moto', label: '🛵 Motos' },
  { value: 'electronique', label: '📱 Électronique' },
  { value: 'mode', label: '👗 Mode et Beauté' },
  { value: 'maison', label: '🛋️ Maison et Jardin' },
  { value: 'emploi', label: '💼 Emploi' },
  { value: 'animaux', label: '🐄 Animaux' },
  { value: 'services', label: '🏗️ Services' },
  { value: 'agriculture', label: '🌾 Agriculture' },
  { value: 'materiaux', label: '🧱 Matériaux Construction' },
  { value: 'sante', label: '💊 Santé et Beauté' },
  { value: 'sport', label: '⚽ Sport et Loisirs' },
  { value: 'education', label: '📚 Éducation' },
]
