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
