import 'server-only'

export function cleanText(value, { min = 0, max }) {
  if (typeof value !== 'string') return null

  const cleaned = value.trim()
  if (cleaned.length < min || cleaned.length > max) return null

  return cleaned
}

export function cleanPositiveNumber(value, { min = 0, max }) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

export function cleanInteger(value, { min = 0, max }) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null
  return parsed
}

export function cleanEnum(value, allowedValues) {
  return typeof value === 'string' && allowedValues.includes(value) ? value : null
}

export function cleanAlbionId(value) {
  const cleaned = cleanText(value, { min: 8, max: 64 })
  return cleaned && /^[A-Za-z0-9_-]+$/.test(cleaned) ? cleaned : null
}

export function isSafeDiscordWebhook(value) {
  if (!value) return false

  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const allowedHost = hostname === 'discord.com'
      || hostname.endsWith('.discord.com')
      || hostname === 'discordapp.com'
      || hostname.endsWith('.discordapp.com')

    return url.protocol === 'https:'
      && allowedHost
      && url.pathname.startsWith('/api/webhooks/')
      && !url.username
      && !url.password
  } catch {
    return false
  }
}
