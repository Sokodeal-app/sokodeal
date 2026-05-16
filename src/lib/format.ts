export const DEFAULT_LOCALE = "fr-RW"
export const DEFAULT_CURRENCY = "RWF"

type DateInput = string | number | Date | null | undefined
type NumberInput = number | string | null | undefined

function toFiniteNumber(value: NumberInput) {
  if (value === null || value === undefined || value === "") return null

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function toValidDate(value: DateInput) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatPrice(
  value: NumberInput,
  currency = DEFAULT_CURRENCY,
  locale = DEFAULT_LOCALE,
) {
  const number = toFiniteNumber(value)

  if (number === null || number <= 0) {
    return "Prix à discuter"
  }

  const amount = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(number)

  return `${amount} ${currency}`
}

export function formatDate(
  dateValue: DateInput,
  locale = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
) {
  const date = toValidDate(dateValue)
  if (!date) return ""

  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function formatRelativeTime(dateValue: DateInput, locale = DEFAULT_LOCALE) {
  const date = toValidDate(dateValue)
  if (!date) return ""

  const now = new Date()
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const absSeconds = Math.abs(diffSeconds)

  const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ]

  let duration = diffSeconds
  let absDuration = absSeconds

  for (const division of divisions) {
    if (absDuration < division.amount) {
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
        Math.round(duration),
        division.unit,
      )
    }

    duration /= division.amount
    absDuration /= division.amount
  }

  return formatDate(date, locale)
}

export function formatCount(value: NumberInput, locale = DEFAULT_LOCALE) {
  const number = toFiniteNumber(value) ?? 0

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(number)
}

export function formatCompactNumber(value: NumberInput, locale = DEFAULT_LOCALE) {
  const number = toFiniteNumber(value) ?? 0

  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number)
}

export function formatPhone(value: string | number | null | undefined) {
  const raw = String(value ?? "").trim()
  if (!raw) return ""

  const hasPlus = raw.startsWith("+")
  const digits = raw.replace(/\D/g, "")
  if (!digits) return raw

  const normalized = `${hasPlus ? "+" : ""}${digits}`

  return normalized.replace(/(\+\d{3}|\d{3})(?=\d)/, "$1 ").replace(/(\d{3})(?=\d)/g, "$1 ")
}

export function formatFileSize(value: NumberInput, locale = DEFAULT_LOCALE) {
  const bytes = toFiniteNumber(value)
  if (bytes === null || bytes <= 0) return "0 B"

  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const size = bytes / 1024 ** index

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: index === 0 ? 0 : 1,
  }).format(size)} ${units[index]}`
}

export function truncateText(value: string | null | undefined, maxLength = 120) {
  const text = String(value ?? "").trim()
  if (text.length <= maxLength) return text
  if (maxLength <= 1) return "…"

  return `${text.slice(0, maxLength - 1).trimEnd()}…`
}

export function formatZone(
  city?: string | null,
  district?: string | null,
  province?: string | null,
) {
  return [city, district, province]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(" · ")
}
