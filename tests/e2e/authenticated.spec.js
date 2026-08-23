import { expect, test } from './browser-health.js'
import { getCookieAccessToken } from './auth-helpers.js'
import { createEmptyBuild } from '../../src/lib/buildSlots.js'

test.describe('kluczowe przepływy zalogowanego użytkownika', () => {
  test('odrzuca konto bez roli personelu z API moderacji i ról', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await getCookieAccessToken(page)

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

  test('pobiera chronioną kronikę Tawerny przez lekkie API', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await getCookieAccessToken(page)
    expect(accessToken).toBeTruthy()

    const response = await request.get('/api/chat', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toContain('no-store')
    const payload = await response.json()
    expect(Array.isArray(payload.messages)).toBe(true)
    expect(typeof payload.hasOlder).toBe('boolean')
    expect(typeof payload.supportsReplies).toBe('boolean')
    expect(payload.cursor === null || typeof payload.cursor === 'object').toBe(true)
  })

  test('pobiera jedno zagregowane podsumowanie Tawerny', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await getCookieAccessToken(page)
    expect(accessToken).toBeTruthy()

    const response = await request.get('/api/portal-overview', { headers: { Authorization: `Bearer ${accessToken}` } })
    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.stats).toEqual(expect.objectContaining({
      verifiedPlayers: expect.any(Number),
      totalPvpFame: expect.any(Number),
      activeBuilds: expect.any(Number),
      activeMarketOffers: expect.any(Number),
      guildsCount: expect.any(Number),
    }))
  })

  test('otwiera formularz publikacji buildu', async ({ page }) => {
    await page.goto('/buildy/create')
    await expect(page.getByLabel('Nazwa buildu *')).toBeVisible()
    await expect(page.getByLabel('Specjalizacja (Mastery):')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Opublikuj build' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Alt 1:/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Otwórz warianty wyposażenia' }).click()
    await expect(page.getByRole('button', { name: /Alt 1:/ }).first()).toBeVisible()
  })

  test('publikuje build przez chronione API z właścicielem ustalanym na serwerze', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await getCookieAccessToken(page)
    expect(accessToken).toBeTruthy()

    const build = createEmptyBuild()
    build.title = `E2E build ${Date.now()}`
    build.budget = 'medium'
    build.tags = {
      locations: ['Mists'],
      zones: ['Strefa Czarna'],
      sizes: ['Solo'],
      roles: ['DPS'],
      activities: ['PvP'],
    }
    build.slots.main_hand.main = 'T4_MAIN_SWORD@1'
    build.user_id = '00000000-0000-0000-0000-000000000000'

    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    let buildId = null
    try {
      const response = await request.post('/api/builds', { headers, data: { build } })
      expect(response.status()).toBe(201)
      buildId = (await response.json()).buildId
      expect(buildId).toMatch(/^[0-9a-f-]{36}$/)
    } finally {
      if (buildId) {
        const response = await request.delete(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/builds?id=eq.${buildId}`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        })
        expect(response.status()).toBe(204)
      }
    }
  })

  test('pokazuje obserwacyjną tierlistę 1v1 bez danych demonstracyjnych', async ({ page }) => {
    await page.route('**/api/albion/meta', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 't8-main-sword',
            name: 'Miecz Broadsword',
            weaponId: 'T8_MAIN_SWORD',
            tier: 'A',
            winrate: 58.3,
            score: 54.5,
            popularity: 12,
            matches: 12,
            wins: 7,
            losses: 5,
            avgIp: 1412,
            confidence: 'średnia',
            role: '12 wystąpień · pewność średnia',
            playstyle: 'Wynik oparty na 12 wystąpieniach w publicznych zdarzeniach solo.',
            bestBuild: null,
            strongAgainst: ['Topór Bitewny'],
            weakAgainst: ['Łuk Wojenny'],
          }],
          meta: {
            source: 'Albion Online Gameinfo API',
            methodology: 'Ranking obserwacyjny z 30 pojedynków, ważony do bazowego wyniku 50%.',
            availableRegions: ['Europa', 'Ameryka'],
            unavailableRegions: ['Azja'],
            fetchedEvents: 120,
            validDuels: 30,
            failedRequests: 2,
            requestedPages: 6,
            isDemo: false,
          },
        }),
      })
    })

    await page.goto('/buildy')
    await page.getByRole('button', { name: 'Meta 1v1 & Tierlisty' }).click()

    await expect(page.getByText('Dane obserwacyjne')).toBeVisible()
    await expect(page.getByText('Miecz Broadsword')).toBeVisible()
    await expect(page.getByText('54.5% wynik ważony')).toBeVisible()
    await expect(page.getByText(/Ranking jest częściowy/)).toBeVisible()
    await expect(page.getByText(/Model demonstracyjny/)).toHaveCount(0)
  })

  test('wyszukuje polskie i angielskie nazwy w wersjonowanym katalogu przedmiotów', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await getCookieAccessToken(page)
    expect(accessToken).toBeTruthy()

    const headers = { Authorization: `Bearer ${accessToken}` }
    const polishResponse = await request.get('/api/items?search=Kaptur%20%C5%81owcy&category=heads&limit=10', { headers })
    const englishResponse = await request.get('/api/items?search=Hunter%20Hood&category=heads&limit=10', { headers })
    expect(polishResponse.status()).toBe(200)
    expect(englishResponse.status()).toBe(200)

    const polish = await polishResponse.json()
    const english = await englishResponse.json()
    expect(polish.items.some((item) => item.id === 'T5_HEAD_LEATHER_SET2')).toBe(true)
    expect(english.items.some((item) => item.id === 'T5_HEAD_LEATHER_SET2')).toBe(true)
    expect(polish.meta.catalogSize).toBeGreaterThan(3_000)
    expect(polish.meta.version).toMatch(/^[0-9a-f]{64}$/)
    expect(polish.meta.sourceCommit).toMatch(/^[0-9a-f]{40}$/)
    expect(polishResponse.headers()['x-item-catalog-version']).toBe(polish.meta.version.slice(0, 16))
  })

  test('zapisuje, odczytuje i usuwa serwerowy alert cenowy', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await getCookieAccessToken(page)
    expect(accessToken).toBeTruthy()
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    let alertId = null

    try {
      const saveResponse = await request.put('/api/price-alerts', {
        headers,
        data: {
          itemId: 'T4_BAG',
          itemName: 'Torba Adepta',
          region: 'europe',
          city: 'Caerleon',
          quality: 1,
          direction: 'below',
          targetPrice: 1,
        },
      })
      expect(saveResponse.status()).toBe(200)
      const saved = await saveResponse.json()
      alertId = saved.alert?.id
      expect(alertId).toMatch(/^[0-9a-f-]{36}$/)

      const readResponse = await request.get('/api/price-alerts?item=T4_BAG&region=europe&city=Caerleon&quality=1&days=30', { headers })
      expect(readResponse.status()).toBe(200)
      const payload = await readResponse.json()
      expect(payload.alerts.some((alert) => alert.id === alertId && Number(alert.target_price) === 1)).toBe(true)
      expect(Array.isArray(payload.history)).toBe(true)
    } finally {
      if (alertId) {
        const deleteResponse = await request.delete(`/api/price-alerts?id=${encodeURIComponent(alertId)}`, { headers })
        expect(deleteResponse.status()).toBe(200)
      }
    }
  })

  test('porównuje dwa buildy z regionalną wyceną rynku', async ({ page }) => {
    await page.route('**/api/prices?**', async (route) => {
      const url = new URL(route.request().url())
      const itemIds = (url.searchParams.get('items') || '').split(',').filter(Boolean)
      const cities = (url.searchParams.get('cities') || '').split(',').filter(Boolean)
      const qualities = (url.searchParams.get('qualities') || '1').split(',').map(Number)
      const observedAt = new Date().toISOString()
      const data = itemIds.flatMap((itemId) => cities.flatMap((city) => qualities.map((quality) => ({
        item_id: itemId,
        city,
        quality,
        sell_price_min: city === 'Martlock' ? 1_000 : 2_000,
        sell_price_min_date: observedAt,
        buy_price_max: 0,
        buy_price_max_date: '0001-01-01T00:00:00',
      }))))
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data, meta: { source: 'E2E' } }) })
    })

    await page.goto('/buildy')
    const openComparator = page.getByRole('button', { name: 'Rozpocznij porównanie' })
    await expect(openComparator).toBeVisible()
    await openComparator.click()

    await expect(page.getByRole('heading', { name: 'Różnice slot po slocie' })).toBeVisible()
    await expect(page.getByText(/Ceny pochodzą z Albion Online Data Project/)).toBeVisible()
    await expect(page.getByText('Świeże skany').first()).toBeVisible()
    await expect(page.getByText(/Silver/).first()).toBeVisible()
  })

  test('zwraca zalogowanemu wątkowane komentarze buildu', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await getCookieAccessToken(page)
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

  test('na mobile otwiera formularz wyprawy dopiero na żądanie', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/wyprawy')

    const openForm = page.getByRole('button', { name: 'Otwórz formularz wyprawy' })
    await expect(openForm).toBeVisible()
    await expect(page.getByLabel('Cel / Tytuł Wyprawy *')).toHaveCount(0)
    await openForm.click()
    await expect(page.getByLabel('Cel / Tytuł Wyprawy *')).toBeVisible()
  })

  test('publikuje, odnawia i usuwa ofertę przez chronione API rynku', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await getCookieAccessToken(page)
    expect(accessToken).toBeTruthy()
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    let offerId = null

    try {
      const createResponse = await request.post('/api/market/offers', {
        headers,
        data: {
          title: `E2E oferta ${Date.now()}`,
          item_name: 'T4_BAG',
          price: 12345,
          city: 'Caerleon',
          category: 'Ekwipunek',
          server: 'Europa',
        },
      })
      expect(createResponse.status()).toBe(201)
      offerId = (await createResponse.json()).offerId
      expect(offerId).toMatch(/^[0-9a-f-]{36}$/)

      const readResponse = await request.get('/api/market/offers', { headers })
      expect(readResponse.status()).toBe(200)
      expect(readResponse.headers()['cache-control']).toContain('no-store')
      const payload = await readResponse.json()
      expect(Array.isArray(payload.offers)).toBe(true)
      expect(typeof payload.hasMore).toBe('boolean')

      const renewResponse = await request.patch('/api/market/offers', {
        headers,
        data: { action: 'renew', id: offerId },
      })
      expect(renewResponse.status()).toBe(200)
    } finally {
      if (offerId) {
        const deleteResponse = await request.delete('/api/market/offers', { headers, data: { id: offerId } })
        expect(deleteResponse.status()).toBe(200)
      }
    }
  })

  test('pobiera wyprawy i profil przez chronione API', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await getCookieAccessToken(page)
    expect(accessToken).toBeTruthy()

    const response = await request.get('/api/expeditions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(Array.isArray(payload.expeditions)).toBe(true)
    expect(payload.profile === null || typeof payload.profile === 'object').toBe(true)
  })

  test('otwiera tablicę rynku natychmiast dla bezpośredniego linku do oferty', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/rynek?offer=e2e-market-offer')

    await expect(page.getByPlaceholder('Szukaj przedmiotów na rynku...')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Znajdź właściwy towar' })).toBeVisible()
  })

  test('wyłącza przelicznik zamiast pokazywać zastępczy kurs złota', async ({ page }) => {
    await page.route('**/api/prices?mode=gold**', async (route) => {
      await route.fulfill({
        status: 503,
        headers: { 'x-e2e-expected-error': 'true' },
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'UPSTREAM_EMPTY', message: 'Brak prawidłowych notowań złota.' } }),
      })
    })

    await page.goto('/rynek')
    const goldTab = page.getByRole('tab', { name: 'Kurs złota' })
    await goldTab.scrollIntoViewIfNeeded()
    await goldTab.click()

    await expect(page.getByText(/Kalkulator został wyłączony, aby nie pokazywać zmyślonej ceny/)).toBeVisible()
    await expect(page.getByLabel('Ilość złota do przeliczenia')).toBeDisabled()
    await expect(page.getByText('Brak kursu').first()).toBeVisible()
  })

  test('pokazuje regionalną wycenę utraconego zestawu w Killboardzie', async ({ page }) => {
    let persistedFollows = []
    await page.route('**/api/follows', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ follows: persistedFollows }) })
        return
      }
      const body = route.request().postDataJSON()
      expect(body).toMatchObject({ type: 'albion_player', id: 'pricing-player', region: 'europe', following: true })
      persistedFollows = [{ entity_type: 'albion_player', entity_id: 'pricing-player', label: 'PricingKnight', region: 'europe' }]
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ following: true, label: 'PricingKnight' }) })
    })
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
    await expect(page.getByText('125 000 Silver').first()).toBeVisible()
    await expect(page.getByText(/Świeże · 2 h/)).toBeVisible()
    await expect(page.getByText(/Straty przeciwników:\s*125\s*tys\.\s*Silver/)).toBeVisible()
    await expect(page.getByText(/Pokrycie 1\/1 slotów \(100%\)/)).toBeVisible()
    await page.getByText('Skład wyceny (1/1)').click()
    await expect(page.getByText(/Martlock · oferta sprzedaży/)).toBeVisible()

    const followPlayer = page.getByRole('button', { name: 'Obserwuj: PricingKnight' })
    await expect(followPlayer).toBeEnabled()
    await followPlayer.click()
    await expect(page.getByRole('button', { name: 'Obserwujesz: PricingKnight' })).toHaveAttribute('aria-pressed', 'true')

    await page.reload()
    await page.getByLabel('Nick gracza').fill('PricingKnight')
    await page.getByRole('button', { name: 'Szukaj', exact: true }).click()
    await page.getByRole('button', { name: /PricingKnight/ }).click()
    await expect(page.getByRole('button', { name: 'Obserwujesz: PricingKnight' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('otwiera wyniki Killboardu z bezpośredniego linku do nicku', async ({ page }) => {
    await page.route('**/api/albion/player?mode=search**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: { players: [{ id: 'direct-player', name: 'DirectKnight', guildName: 'Codex', allianceName: '', killFame: 8748, region: 'asia' }] },
          meta: { source: 'E2E', region: 'asia', fetchedAt: '2026-08-21T20:00:00Z', cacheSeconds: 45 },
        }),
      })
    })

    await page.goto('/killboard?nick=DirectKnight&region=asia')

    await expect(page.getByRole('heading', { name: 'Wybierz właściwego wojownika' })).toBeVisible()
    await expect(page.getByRole('button', { name: /DirectKnight/ })).toBeVisible()
    await expect(page.getByText('Azja').last()).toBeVisible()
  })

  test('nie zgłasza braku gracza, gdy wybrany region Gameinfo jest niedostępny', async ({ page }) => {
    await page.route('**/api/albion/player?mode=search**', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        headers: { 'Retry-After': '60', 'x-e2e-expected-error': 'true' },
        body: JSON.stringify({
          error: {
            code: 'REGION_UNAVAILABLE',
            message: 'Nie można potwierdzić, czy gracz „Localniaq” istnieje. Gameinfo chwilowo nie odpowiada dla: Ameryka. Spróbuj ponownie później.',
            details: { unavailableRegions: ['america'] },
          },
        }),
      })
    })

    await page.goto('/killboard')
    await page.getByLabel('Nick gracza').fill('Localniaq')
    await page.getByRole('button', { name: 'Szukaj', exact: true }).click()

    await expect(page.getByText(/Gameinfo chwilowo nie odpowiada dla: Ameryka/)).toBeVisible()
    await expect(page.getByText(/Nie znaleziono gracza/)).toHaveCount(0)
  })

  test('otwiera prywatną skrzynkę handlową i jej API', async ({ page, request }) => {
    await page.goto('/wiadomosci')
    await expect(page.getByRole('heading', { name: 'Skrzynka handlowa' })).toBeVisible()
    await expect(page.getByText(/Tylko uczestnicy rozmowy/)).toBeVisible()

    const accessToken = await getCookieAccessToken(page)
    expect(accessToken).toBeTruthy()

    const response = await request.get('/api/market/conversations', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(Array.isArray(payload.conversations)).toBe(true)
  })

  test('otwiera Wartownię obserwowanych elementów', async ({ page }) => {
    await page.route('**/api/follows', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, result: { newEvents: 2, checked: 1, failed: 0 } }) })
        return
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ follows: [{
          entity_type: 'albion_player', entity_id: 'watched-player', label: 'WatchedKnight', region: 'america',
          last_checked_at: '2026-08-15T18:00:00Z', last_error: null,
          last_summary: { kills: 1, deaths: 1, killFame: 8748, deathFame: 5000 },
          created_at: '2026-08-15T17:00:00Z',
        }] }),
      })
    })
    await page.goto('/obserwowane')
    await expect(page.getByRole('heading', { name: 'Obserwowane' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Obserwowane postacie' })).toBeVisible()
    await expect(page.getByText('WatchedKnight')).toBeVisible()
    await expect(page.getByText('8,7 tys.')).toBeVisible()
    await page.getByRole('button', { name: 'Sprawdź nowe walki' }).click()
    await expect(page.getByText(/Znaleziono 2 nowych walk/)).toBeVisible()
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
