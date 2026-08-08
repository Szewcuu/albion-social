import { NextResponse } from 'next/server'
import { getAlbionItemCatalog, ITEM_CATEGORIES } from '@/lib/server/albionItemCatalog'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { cleanEnum, cleanInteger } from '@/lib/server/validation'

function getClientKey(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'anonymous'
}

export async function GET(request) {
  const rateLimit = await checkRateLimit(`albion-items:${getClientKey(request)}`, { limit: 40, windowMs: 60_000 })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { message: 'Zbyt wiele zapytań do katalogu.', code: 'RATE_LIMITED' } },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    )
  }

  const { searchParams } = new URL(request.url)
  const search = (searchParams.get('search') || '').trim().toLocaleLowerCase('en').slice(0, 80)
  const requestedCategory = searchParams.get('category')
  const category = requestedCategory ? cleanEnum(requestedCategory, ITEM_CATEGORIES) : null
  const limit = cleanInteger(searchParams.get('limit') || 30, { min: 1, max: 50 })

  if (requestedCategory && !category) {
    return NextResponse.json({ error: { message: 'Nieobsługiwana kategoria.', code: 'INVALID_CATEGORY' } }, { status: 400 })
  }
  if (!limit) {
    return NextResponse.json({ error: { message: 'Nieprawidłowy limit.', code: 'INVALID_LIMIT' } }, { status: 400 })
  }

  const catalog = await getAlbionItemCatalog()
  const filtered = catalog.filter((item) => {
    if (category && item.category !== category) return false
    if (!search) return true
    return item.name.toLocaleLowerCase('en').includes(search) || item.id.toLocaleLowerCase('en').includes(search)
  })

  if (search) {
    const upperSearch = search.toUpperCase()
    const score = (item) => {
      const lowerName = item.name.toLocaleLowerCase('en')
      if (item.id === upperSearch) return 0
      if (item.id.endsWith(`_${upperSearch}`)) return 1
      if (lowerName === search) return 2
      if (lowerName.startsWith(search)) return 3
      if (item.id.includes(`_${upperSearch}_`)) return 4
      if (item.id.includes(upperSearch)) return 5
      return 6
    }
    filtered.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'en'))
  }

  const items = filtered.slice(0, limit)
  return NextResponse.json({
    items,
    count: items.length,
    meta: {
      totalMatches: filtered.length,
      catalogSize: catalog.length,
      category,
      query: search,
      source: catalog.length > 100 ? 'Albion Online Data Project item dump' : 'local-fallback',
      cacheSeconds: 86_400,
    },
  })
}
