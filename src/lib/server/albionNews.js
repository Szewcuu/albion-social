import 'server-only'

import Parser from 'rss-parser'

const parser = new Parser({ timeout: 7000 })
const FEEDS = [
  {
    kind: 'news',
    url: 'https://news.google.com/rss/search?q=site%3Aalbiononline.com%2Fnews+%22Albion+Online%22&hl=en-US&gl=US&ceid=US%3Aen',
  },
  {
    kind: 'patch',
    url: 'https://news.google.com/rss/search?q=site%3Aforum.albiononline.com+%22Patch+Notes%22+Albion&hl=en-US&gl=US&ceid=US%3Aen',
  },
]

function plainText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

function normalizeEntry(entry, defaultKind) {
  const title = plainText(entry.title).replace(/\s+-\s+Albion Online$/i, '').slice(0, 180)
  const link = safeExternalUrl(entry.link)
  if (!title || !link) return null
  const publishedAt = new Date(entry.isoDate || entry.pubDate || 0)
  const looksLikePatch = /patch|hotfix|balance|update notes|maintenance/i.test(title)
  return {
    id: entry.guid || link,
    title,
    link,
    category: defaultKind === 'patch' || looksLikePatch ? 'patch' : 'news',
    source: plainText(entry.creator || entry.source || 'Albion Online').slice(0, 80),
    summary: plainText(entry.contentSnippet || entry.content || 'Przeczytaj pełną wiadomość w źródle.').slice(0, 260),
    publishedAt: Number.isNaN(publishedAt.getTime()) ? null : publishedAt.toISOString(),
  }
}

async function loadFeed(feed) {
  const response = await fetch(feed.url, {
    headers: { 'User-Agent': 'Albion-Polska-Portal/1.0' },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(7000),
  })
  if (!response.ok) throw new Error(`Feed ${feed.kind}: HTTP ${response.status}`)
  const xml = await response.text()
  const parsed = await parser.parseString(xml)
  return (parsed.items || []).map((entry) => normalizeEntry(entry, feed.kind)).filter(Boolean)
}

export async function getAlbionNews() {
  const results = await Promise.allSettled(FEEDS.map(loadFeed))
  const unique = new Map()
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const item of result.value) {
      const key = item.title.toLocaleLowerCase('en')
      if (!unique.has(key)) unique.set(key, item)
    }
  }
  const items = [...unique.values()]
    .sort((left, right) => String(right.publishedAt || '').localeCompare(String(left.publishedAt || '')))
    .slice(0, 24)

  return {
    items,
    partial: results.some((result) => result.status === 'rejected'),
    fetchedAt: new Date().toISOString(),
  }
}
