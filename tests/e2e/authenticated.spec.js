import { expect, test } from './browser-health.js'

test.describe('kluczowe przepływy zalogowanego użytkownika', () => {
  test('odrzuca konto bez roli personelu z API moderacji i ról', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await page.evaluate(() => {
      const storageKey = Object.keys(window.localStorage)
        .find((key) => /^sb-.+-auth-token$/.test(key))
      if (!storageKey) return null

      try {
        return JSON.parse(window.localStorage.getItem(storageKey))?.access_token || null
      } catch {
        return null
      }
    })

    expect(accessToken).toBeTruthy()
    const headers = { Authorization: `Bearer ${accessToken}` }
    const moderationQueue = await request.get('/api/admin/content', { headers })
    const roleManagement = await request.get('/api/admin/roles', { headers })

    expect(moderationQueue.status()).toBe(403)
    expect(roleManagement.status()).toBe(403)
  })

  test('otwiera czat społeczności', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Tawerna społeczności' })).toBeVisible()
    await expect(page.getByLabel('Napisz wiadomość w tawernie')).toBeVisible()
  })

  test('otwiera formularz publikacji buildu', async ({ page }) => {
    await page.goto('/buildy/create')
    await expect(page.getByLabel('Nazwa buildu *')).toBeVisible()
    await expect(page.getByLabel('Specjalizacja (Mastery):')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Opublikuj build' })).toBeVisible()
  })

  test('zwraca zalogowanemu wątkowane komentarze buildu', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await page.evaluate(() => {
      const storageKey = Object.keys(window.localStorage)
        .find((key) => /^sb-.+-auth-token$/.test(key))
      if (!storageKey) return null
      return JSON.parse(window.localStorage.getItem(storageKey))?.access_token || null
    })
    expect(accessToken).toBeTruthy()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const buildsResponse = await request.get(`${supabaseUrl}/rest/v1/builds?select=id&status=eq.visible&order=created_at.desc&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    })
    expect(buildsResponse.status()).toBe(200)
    const [build] = await buildsResponse.json()
    expect(build?.id).toBeTruthy()

    const commentsResponse = await request.get(`/api/builds/${build.id}/comments`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(commentsResponse.status()).toBe(200)
    const payload = await commentsResponse.json()
    expect(Array.isArray(payload.comments)).toBe(true)
    expect(typeof payload.count).toBe('number')
  })

  test('otwiera formularze wyprawy i rynku', async ({ page }) => {
    await page.goto('/wyprawy')
    await expect(page.getByLabel('Cel / Tytuł Wyprawy *')).toBeVisible()
    await expect(page.getByLabel('Min. IP *')).toBeVisible()
    await expect(page.getByLabel('Tank')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ogłoś Wyprawę' })).toBeVisible()

    await page.goto('/rynek')
    await expect(page.getByText('Tytuł Oferty *')).toBeVisible()
    await expect(page.getByPlaceholder(/Sprzedam Mamuta Transportowego/i)).toBeVisible()
  })

  test('pokazuje regionalną wycenę utraconego zestawu w Killboardzie', async ({ page }) => {
    await page.route('**/api/albion/player?mode=search**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: { players: [{ id: 'pricing-player', name: 'PricingKnight', guildName: 'Codex', killFame: 123456, region: 'europe' }] },
          meta: { source: 'E2E', region: 'europe', fetchedAt: '2026-08-15T18:00:00Z', cacheSeconds: 45 },
        }),
      })
    })
    await page.route('**/api/albion/player?mode=overview**', async (route) => {
      const emptyEquipment = { MainHand: null, OffHand: null, Head: null, Armor: null, Shoes: null, Bag: null, Cape: null, Mount: null, Potion: null, Food: null }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            player: { id: 'pricing-player', name: 'PricingKnight', guildName: 'Codex', killFame: 123456, deathFame: 20000, averageItemPower: 1450, fame: {} },
            kills: [{
              id: 'pricing-event', perspective: 'kill', timestamp: '2026-08-15T18:00:00Z', fame: 8748, killArea: 'OPEN_WORLD', participantCount: 1,
              killer: { id: 'pricing-player', name: 'PricingKnight', averageItemPower: 1450, equipment: emptyEquipment },
              victim: { id: 'victim', name: 'LostKnight', averageItemPower: 1300, equipment: { ...emptyEquipment, MainHand: { type: 'T6_MAIN_SWORD', count: 1, quality: 1 } } },
              lossValuation: { estimatedValue: 125000, pricedItems: 1, totalItems: 1, coveragePercent: 100, freshness: 'fresh', maxAgeHours: 2, fallbackItems: 0, items: [{ total: 125000, quote: { city: 'Martlock', source: 'sell' } }] },
            }],
            deaths: [], guild: null, warnings: [], marketPricing: { available: true, source: 'Albion Online Data Project', region: 'europe' },
          },
          meta: { source: 'Albion Online Gameinfo', region: 'europe', fetchedAt: '2026-08-15T18:00:00Z', cacheSeconds: 90 },
        }),
      })
    })

    await page.goto('/killboard')
    await page.getByLabel('Nick gracza').fill('PricingKnight')
    await page.getByRole('button', { name: 'Szukaj', exact: true }).click()
    await page.getByRole('button', { name: /PricingKnight/ }).click()

    await expect(page.getByText('Wartość utraconego zestawu')).toBeVisible()
    await expect(page.getByText('125 000 Silver')).toBeVisible()
    await expect(page.getByText(/Świeże · 2 h/)).toBeVisible()
    await expect(page.getByText(/Straty przeciwników: 125 tys\. Silver/)).toBeVisible()
  })

  test('otwiera prywatną skrzynkę handlową i jej API', async ({ page, request }) => {
    await page.goto('/wiadomosci')
    await expect(page.getByRole('heading', { name: 'Skrzynka handlowa' })).toBeVisible()
    await expect(page.getByText(/Tylko uczestnicy rozmowy/)).toBeVisible()

    const accessToken = await page.evaluate(() => {
      const storageKey = Object.keys(window.localStorage)
        .find((key) => /^sb-.+-auth-token$/.test(key))
      return storageKey ? JSON.parse(window.localStorage.getItem(storageKey))?.access_token || null : null
    })
    expect(accessToken).toBeTruthy()

    const response = await request.get('/api/market/conversations', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(Array.isArray(payload.conversations)).toBe(true)
  })

  test('otwiera Wartownię obserwowanych elementów', async ({ page }) => {
    await page.goto('/obserwowane')
    await expect(page.getByRole('heading', { name: 'Obserwowane' })).toBeVisible()
    await expect(page.getByText(/Buildy, gildie, oferty i gracze/)).toBeVisible()
  })

  test('zapisuje i przywraca lokalny szkic podziału łupów', async ({ page }) => {
    await page.goto('/loot-split')
    await page.getByLabel('Nazwa rozliczenia').fill('E2E Ava Roads')
    await page.getByLabel('Łączna wartość łupu').fill('1000000')
    await page.getByText('Nicki graczy').locator('textarea').fill('Tank\nHealer\nDPS')
    await page.getByRole('button', { name: 'Zapisz szkic' }).click()

    await expect(page.getByText(/Szkic zapisano/)).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nazwa rozliczenia')).toHaveValue('E2E Ava Roads')
    await expect(page.getByLabel('Łączna wartość łupu')).toHaveValue('1000000')
  })
})
