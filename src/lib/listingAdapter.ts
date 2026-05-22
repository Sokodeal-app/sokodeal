import { getCategoryLabel, normalizeCategoryKey } from './categories'
import { formatPrice, formatRelativeTime, formatZone } from './format'

export type ListingCardViewModel = {
  id: string
  title: string
  priceLabel: string
  rawPrice?: number | null
  imageUrl?: string | null
  images: string[]
  categoryKey?: string
  categoryLabel?: string
  zoneLabel: string
  locationLabel: string
  createdAtLabel: string
  status?: string
  isSold: boolean
  isBoosted: boolean
  isFavorite?: boolean
}

type ListingRecord = Record<string, unknown>

function isRecord(value: unknown): value is ListingRecord {
  return typeof value === 'object' && value !== null
}

function readValue(record: ListingRecord, keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key]
    }
  }

  return undefined
}

function readString(record: ListingRecord, keys: string[]) {
  const value = readValue(record, keys)
  if (value === undefined || value === null) return ''

  const text = String(value).trim()
  return text
}

function readNumber(record: ListingRecord, keys: string[]) {
  const value = readValue(record, keys)
  if (value === undefined || value === null || value === '') return null

  const number = Number(typeof value === 'string' ? value.replace(/\s/g, '').replace(',', '.') : value)
  return Number.isFinite(number) ? number : null
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value !== 'string') return false

  const text = value.trim().toLowerCase()
  return ['1', 'true', 'yes', 'oui', 'sold', 'vendu', 'boosted'].includes(text)
}

function readBoolean(record: ListingRecord, keys: string[]) {
  const value = readValue(record, keys)
  if (value === undefined || value === null) return false

  return toBoolean(value)
}

function normalizeImageCandidate(value: unknown) {
  if (typeof value !== 'string') return null

  const image = value.trim()
  if (!image) return null

  return image
}

function parseImages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(normalizeImageCandidate).filter((image): image is string => Boolean(image))
  }

  if (typeof value !== 'string') return []

  const text = value.trim()
  if (!text) return []

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeImageCandidate).filter((image): image is string => Boolean(image))
    }

    const image = normalizeImageCandidate(parsed)
    return image ? [image] : []
  } catch {
    const image = normalizeImageCandidate(text)
    return image ? [image] : []
  }
}

function readImages(record: ListingRecord) {
  const images = [
    ...parseImages(readValue(record, ['images', 'image_urls', 'imageUrls', 'photos', 'media'])),
    ...parseImages(readValue(record, ['image', 'image_url', 'imageUrl', 'thumbnail_url', 'thumbnailUrl'])),
  ]

  return Array.from(new Set(images))
}

function stableHash(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }

  return Math.abs(hash).toString(36)
}

function getStableFallbackId(record: ListingRecord, title: string) {
  const source = [
    title,
    readString(record, ['created_at', 'createdAt', 'published_at', 'publishedAt']),
    readString(record, ['category', 'categoryKey', 'category_key', 'slug']),
    readString(record, ['province', 'district', 'zone', 'city', 'ville']),
    String(readNumber(record, ['price', 'amount', 'rawPrice', 'price_rwf', 'priceRwf']) ?? ''),
  ].join('|')

  return `listing-${stableHash(source || 'listing')}`
}

export function adaptListingToCardViewModel(listing: unknown): ListingCardViewModel {
  const record = isRecord(listing) ? listing : {}
  const title = readString(record, ['title', 'name', 'headline']) || 'Annonce'
  const id = readString(record, ['id', 'uuid', 'listing_id', 'listingId', 'ad_id', 'adId']) || getStableFallbackId(record, title)
  const rawPrice = readNumber(record, ['price', 'amount', 'rawPrice', 'price_rwf', 'priceRwf'])
  const images = readImages(record)
  const categorySource = readString(record, ['categoryKey', 'category_key', 'category', 'slug', 'type', 'subcategory'])
  const categoryKey = normalizeCategoryKey(categorySource)
  const categoryLabel = getCategoryLabel(categoryKey)
  const city = readString(record, ['city', 'ville'])
  const district = readString(record, ['district'])
  const zone = readString(record, ['zone'])
  const province = readString(record, ['province'])
  const location = readString(record, ['location'])
  const locationLabel = formatZone(city || province, district || zone, location)
  const zoneLabel = formatZone(zone, district, city, province, location)
  const createdAt = readValue(record, ['created_at', 'createdAt', 'published_at', 'publishedAt'])
  const status = readString(record, ['status', 'state'])
  const normalizedStatus = status.trim().toLowerCase()
  const isSold = readBoolean(record, ['is_sold', 'isSold', 'sold']) || ['sold', 'vendu'].includes(normalizedStatus)
  const isBoosted = readBoolean(record, ['is_boosted', 'isBoosted', 'boosted'])
  const favoriteValue = readValue(record, ['isFavorite', 'is_favorite', 'favorite'])

  return {
    id,
    title,
    priceLabel: formatPrice(rawPrice),
    rawPrice,
    imageUrl: images[0] || null,
    images,
    categoryKey,
    categoryLabel,
    zoneLabel,
    locationLabel,
    createdAtLabel: formatRelativeTime(createdAt as string | number | Date | null | undefined),
    status: status || undefined,
    isSold,
    isBoosted,
    isFavorite: favoriteValue === undefined || favoriteValue === null ? undefined : toBoolean(favoriteValue),
  }
}
