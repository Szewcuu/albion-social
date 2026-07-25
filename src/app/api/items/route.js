import { ALBION_ITEMS } from '@/lib/albionItems'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')?.toLowerCase() || ''

  // Jeśli określona kategoria
  if (category && ALBION_ITEMS[category]) {
    let items = ALBION_ITEMS[category]
    
    // Filtruj po search query
    if (search) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(search) || 
        item.id.toLowerCase().includes(search)
      )
    }
    
    return Response.json({ items, count: items.length })
  }

  // Jeśli search bez kategorii - szukaj we wszystkich
  if (search) {
    const allItems = []
    Object.entries(ALBION_ITEMS).forEach(([cat, items]) => {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(search) ||
        item.id.toLowerCase().includes(search)
      )
      allItems.push(...filtered.map(item => ({ ...item, category: cat })))
    })
    
    return Response.json({ items: allItems, count: allItems.length })
  }

  // Zwróć wszystkie kategorie z ich elementami
  return Response.json(ALBION_ITEMS)
}
