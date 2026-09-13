function cleanText(value, { min = 0, max = 2000 } = {}) {
  if (typeof value !== 'string') return null
  const cleaned = value.trim()
  if (cleaned.length < min || cleaned.length > max) return null
  return cleaned
}

function cleanInteger(value, { min = 0, max = 999, fallback = null } = {}) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback
  return parsed
}

export const RECRUITMENT_PLATFORMS = {
  discord: {
    id: 'discord',
    label: 'Moderator Serwera Discord',
    shortLabel: 'Discord',
    color: 0x5865F2, // Discord blurple
    icon: 'MessageSquare',
    desc: 'Czuwanie nad porządkiem na czatach tekstowych i głosowych, pomoc nowym graczom, obsługa ticketów oraz zwalczanie spamu i scamu.',
    requiresFacebook: false,
    requiresDiscord: true,
  },
  facebook: {
    id: 'facebook',
    label: 'Moderator Grupy Facebook',
    shortLabel: 'Facebook',
    color: 0x1877F2, // Facebook blue
    icon: 'Users',
    desc: 'Weryfikacja i zatwierdzanie postów, moderacja komentarzy, eliminacja ofert RMT/handlu kontami oraz dbanie o aktywność grupy.',
    requiresFacebook: true,
    requiresDiscord: false,
  },
  both: {
    id: 'both',
    label: 'Moderator Obydwu Platform (Discord & Facebook)',
    shortLabel: 'Discord + Facebook',
    color: 0xC59B27, // Albion Gold
    icon: 'ShieldAlert',
    desc: 'Kompleksowa koordynacja moderacji na serwerze Discord oraz w grupie Facebook. Rola dla najbardziej zaangażowanych ochotników.',
    requiresFacebook: true,
    requiresDiscord: true,
  },
}

export const RECRUITMENT_STATUSES = {
  pending: { label: 'Oczekuje na weryfikację', badgeClass: 'badge-amber' },
  reviewed: { label: 'W trakcie analizy', badgeClass: 'badge-sky' },
  accepted: { label: 'Zaakceptowane', badgeClass: 'badge-emerald' },
  rejected: { label: 'Odrzucone', badgeClass: 'badge-rose' },
}

export function isFacebookUrl(value) {
  if (!value || typeof value !== 'string') return false
  const trimmed = value.trim()
  return (
    trimmed.startsWith('https://www.facebook.com/') ||
    trimmed.startsWith('https://facebook.com/') ||
    trimmed.startsWith('http://www.facebook.com/') ||
    trimmed.startsWith('http://facebook.com/') ||
    trimmed.startsWith('https://fb.com/') ||
    trimmed.startsWith('http://fb.com/') ||
    trimmed.startsWith('facebook.com/') ||
    trimmed.startsWith('fb.com/')
  )
}

export function validateRecruitmentPayload(data = {}) {
  const errors = []

  const platformId = cleanText(data.platform, { min: 1, max: 20 })
  const platform = RECRUITMENT_PLATFORMS[platformId]
  if (!platform) {
    errors.push('Wybierz prawidłową rolę (Discord, Facebook lub Obie Platformy).')
  }

  const applicantName = cleanText(data.applicantName, { min: 2, max: 60 })
  if (!applicantName) {
    errors.push('Podaj swoje imię lub nick (od 2 do 60 znaków).')
  }

  const age = cleanInteger(data.age, { min: 14, max: 99, fallback: null })
  if (data.age && age === null) {
    errors.push('Wiek musi być liczbą z zakresu 14-99 lat.')
  }

  const discordTag = cleanText(data.discordTag, { min: 2, max: 60 })
  if (platform?.requiresDiscord && !discordTag) {
    errors.push('Podaj swój identyfikator lub nick Discord.')
  }

  const facebookUrl = cleanText(data.facebookUrl, { min: 5, max: 250 })
  if (platform?.requiresFacebook) {
    if (!facebookUrl) {
      errors.push('Dla roli na Facebooku wymagany jest link do Twojego profilu.')
    } else if (!isFacebookUrl(facebookUrl)) {
      errors.push('Podaj poprawny link do profilu na Facebooku (np. https://facebook.com/twoj.profil).')
    }
  }

  const albionNick = cleanText(data.albionNick, { min: 0, max: 60 }) || ''
  const server = cleanText(data.server, { min: 0, max: 30 }) || 'Europa'

  const experience = cleanText(data.experience, { min: 10, max: 2000 })
  if (!experience) {
    errors.push('Opisz swoje doświadczenie w moderacji lub grze (minimum 10 znaków).')
  }

  const availability = cleanText(data.availability, { min: 5, max: 1000 })
  if (!availability) {
    errors.push('Podaj swoją szacowaną dyspozycyjność czasową (minimum 5 znaków).')
  }

  const motivation = cleanText(data.motivation, { min: 10, max: 2000 })
  if (!motivation) {
    errors.push('Napisz krótko, dlaczego chcesz dołączyć do ekipy (minimum 10 znaków).')
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? {
      platform: platformId,
      applicantName,
      age: age || null,
      discordTag: discordTag || '',
      facebookUrl: facebookUrl || '',
      albionNick,
      server,
      experience,
      availability,
      motivation,
    } : null,
  }
}

export function buildRecruitmentDiscordEmbed(application) {
  const platform = RECRUITMENT_PLATFORMS[application.platform] || RECRUITMENT_PLATFORMS.both
  const fields = [
    { name: '🛡️ Wybrana rola', value: platform.label, inline: false },
    { name: '👤 Imię / Kandydat', value: application.applicantName, inline: true },
    { name: '🎂 Wiek', value: application.age ? `${application.age} lat` : 'Nie podano', inline: true },
    { name: '⚔️ Postać w Albionie', value: application.albionNick ? `${application.albionNick} (${application.server || 'Europa'})` : 'Brak danych', inline: true },
    { name: '💬 Discord', value: application.discordTag || 'Brak', inline: true },
  ]

  if (application.facebookUrl) {
    fields.push({ name: '🌐 Profil Facebook', value: application.facebookUrl, inline: true })
  }

  fields.push(
    { name: '⏰ Dyspozycyjność', value: application.availability || 'Nie określono', inline: false },
    { name: '📜 Doświadczenie moderatorskie', value: (application.experience || 'Brak').slice(0, 1024), inline: false },
    { name: '🎯 Motywacja / Dlaczego ja', value: (application.motivation || 'Brak').slice(0, 1024), inline: false },
  )

  return {
    title: `⚔️ Nowe podanie do moderacji: ${platform.shortLabel} — ${application.applicantName}`,
    color: platform.color,
    fields,
    footer: {
      text: 'Albion Online Polska Portal • Nabór do Straży Społeczności',
    },
    timestamp: new Date().toISOString(),
  }
}
