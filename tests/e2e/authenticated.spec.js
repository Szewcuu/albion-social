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

  test('panel administratora pokazuje czytelne role, monitoring i dziennik', async ({ page }) => {
    await page.route('**/api/admin/overview', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        role: 'admin',
        stats: { pendingReports: 0, allReports: 1, visibleComments: 2, builds: 3 },
        reports: [],
      }),
    }))
    await page.route('**/api/admin/reports**', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ reports: [], pagination: { hasMore: false, nextCursor: null } }),
    }))
    await page.route('**/api/admin/roles', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        currentRole: 'admin',
        users: [
          { id: '00000000-0000-4000-8000-000000000001', username: 'Strażnik', role: 'admin', isCurrentUser: true },
          { id: '00000000-0000-4000-8000-000000000002', username: 'Herold', role: 'moderator', isCurrentUser: false },
        ],
      }),
    }))
    await page.route('**/api/admin/audit', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        entries: [{
          id: '00000000-0000-4000-8000-000000000003',
          actorId: '00000000-0000-4000-8000-000000000001',
          actorName: 'Strażnik',
          actorRole: 'admin',
          action: 'role_change',
          entityType: 'profile_role',
          entityId: '00000000-0000-4000-8000-000000000002',
          reason: 'Awans po rekrutacji',
          createdAt: '2026-08-29T12:00:00.000Z',
        }],
      }),
    }))
    await page.route('**/api/admin/health', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        generatedAt: '2026-08-29T12:00:00.000Z',
        checks: [{ service: 'supabase', status: 'operational', latency_ms: 120, message: 'Baza odpowiada.', metadata: {}, checked_at: '2026-08-29T12:00:00.000Z' }],
        operations: {
          regions: [
            { key: 'europe', label: 'Europa', probes: 18, availability: 1, averageLatencyMs: 335, lookups: 7 },
            { key: 'america', label: 'Ameryka', probes: 18, availability: 0.28, averageLatencyMs: 5663, lookups: 2 },
            { key: 'asia', label: 'Azja', probes: 18, availability: 1, averageLatencyMs: 287, lookups: 0 },
          ],
          archiveReadiness: { ready: false, reason: 'Zbieranie próby: 1/30 dni.' },
        },
        events: [],
      }),
    }))

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Centrum moderacji' })).toBeVisible()

    await page.getByRole('tab', { name: 'Role' }).click()
    await expect(page.getByText('2 w personelu')).toBeVisible()
    await expect(page.getByText('To Twoje konto')).toBeVisible()
    await expect(page.getByText('00000000-0000-4000-8000-000000000001')).toHaveCount(0)
    const roleSelect = page.getByRole('combobox', { name: 'Rola Herold' })
    await expect(roleSelect).toHaveAttribute('aria-expanded', 'false')
    await roleSelect.focus()
    await roleSelect.press('ArrowDown')
    await expect(roleSelect).toHaveAttribute('aria-expanded', 'true')
    await roleSelect.press('Home')
    await roleSelect.press('End')
    await roleSelect.press('Enter')
    await expect(roleSelect).toContainText('Administrator')
    await roleSelect.press('Enter')
    await roleSelect.press('Home')
    await roleSelect.press('Enter')
    await expect(roleSelect).toContainText('Użytkownik')
    await page.getByPlaceholder('Nick użytkownika').fill('Nieistniejący')
    await expect(page.getByText('Nie znaleziono użytkownika')).toBeVisible()

    await page.getByRole('tab', { name: 'Dziennik' }).click()
    await expect(page.getByText('Rola użytkownika · 00000000')).toBeVisible()
    await expect(page.getByText('Strażnik · Administrator')).toBeVisible()

    await page.getByRole('tab', { name: 'Stan usług' }).click()
    await expect(page.getByText('Baza odpowiada.')).toBeVisible()
    await expect(page.getByText('Brak pomiarów')).toHaveCount(0)
    await expect(page.getByText('Gameinfo · ostatnie 30 dni')).toBeVisible()
    await expect(page.getByText('Zbieranie próby: 1/30 dni.')).toBeVisible()
  })

  test('otwiera czat społeczności', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Główna sala Tawerny' })).toBeVisible()
    await expect(page.getByLabel('Napisz wiadomość w tawernie')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(901)
  })

  test('obsługuje kronikę Tawerny jak rozmowę forumową', async ({ page }) => {
    const messages = Array.from({ length: 16 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      user_id: `forum-user-${index}`,
      username: index === 15 ? 'Rycerz' : `Gracz${index + 1}`,
      text: index === 15 ? 'Wiadomość do odpowiedzi' : `Wiadomość kroniki ${index + 1}`,
      channel: 'GLOBALNY',
      status: 'visible',
      reply_to: null,
      created_at: new Date(Date.UTC(2026, 7, 23, 12, index)).toISOString(),
    }))
    let sentPayload = null

    await page.route('**/api/chat**', async (route) => {
      const request = route.request()
      if (request.method() === 'POST') {
        sentPayload = request.postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: {
              ...messages[15],
              id: '00000000-0000-4000-8000-999999999999',
              text: sentPayload.text,
              reply_to: sentPayload.replyTo,
              created_at: '2026-08-23T13:00:00.000Z',
            },
            supportsReplies: true,
          }),
        })
        return
      }

      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ messages, hasOlder: false, cursor: null, supportsReplies: true }),
      })
    })

    await page.goto('/')
    await expect(page.getByText('Wiadomość do odpowiedzi', { exact: true })).toBeVisible()
    await expect(page.getByText('Szybkie Akcje Gracza')).toHaveCount(0)

    const posts = page.locator('.community-posts')
    await expect.poll(() => posts.evaluate((element) => (
      element.scrollTop + element.clientHeight >= element.scrollHeight - 2
    ))).toBe(true)
    await expect.poll(() => posts.evaluate((element) => element.clientHeight)).toBeGreaterThanOrEqual(180)

    const targetMessage = page.locator('.community-post').filter({ hasText: 'Wiadomość do odpowiedzi' })
    await targetMessage.getByRole('button', { name: 'Odpowiedz' }).click()
    await expect(page.getByText('Odpowiadasz użytkownikowi')).toBeVisible()

    const composer = page.getByLabel('Napisz wiadomość w tawernie')
    await composer.fill('@Rycerz Odpowiedź testowa')
    await composer.press('Enter')
    await expect(page.getByText('@Rycerz', { exact: true }).last()).toBeVisible()
    expect(sentPayload).toEqual({
      text: '@Rycerz Odpowiedź testowa',
      replyTo: messages[15].id,
    })
    await expect.poll(() => posts.evaluate((element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 2)).toBe(true)

    await composer.fill('Pierwsza linia')
    await composer.press('Shift+Enter')
    await composer.type('Druga linia')
    await expect(composer).toHaveValue('Pierwsza linia\nDruga linia')
  })

  test('układa centrum powiadomień bez kolizji na desktopie i telefonie', async ({ page }) => {
    const notifications = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Awaria integracji: albion_api o wyjątkowo długiej nazwie',
        message: 'Gameinfo API nie odpowiada dla regionu Ameryka. Spróbuj ponownie później.',
        type: 'system',
        link: '/killboard',
        is_read: false,
        created_at: '2026-08-23T06:41:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Nowa wiadomość handlowa',
        message: 'Gracz odpowiedział w sprawie oferty rynkowej.',
        type: 'market',
        link: '/wiadomosci',
        is_read: true,
        created_at: '2026-08-23T05:20:00.000Z',
      },
    ]

    await page.route('**/api/notifications', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ notifications, role: 'user' }) })
        return
      }
      await route.continue()
    })

    await page.goto('/')
    const trigger = page.getByRole('button', { name: /Powiadomienia/ })
    await expect(trigger).toHaveAttribute('aria-label', /nieprzeczytane: 1/)
    await trigger.click()

    const popover = page.getByRole('region', { name: 'Lista powiadomień' })
    const firstItem = popover.locator('.notification-item').first()
    await expect(firstItem).toBeVisible()
    const desktopLayout = await firstItem.evaluate((item) => {
      const icon = item.querySelector('.notification-item-icon').getBoundingClientRect()
      const content = item.querySelector('.notification-item-content').getBoundingClientRect()
      return { iconRight: icon.right, contentLeft: content.left }
    })
    expect(desktopLayout.iconRight).toBeLessThan(desktopLayout.contentLeft)

    await page.setViewportSize({ width: 390, height: 844 })
    const mobileBox = await popover.boundingBox()
    expect(mobileBox).not.toBeNull()
    expect(mobileBox.x).toBeGreaterThanOrEqual(0)
    expect(mobileBox.x + mobileBox.width).toBeLessThanOrEqual(390)
    expect(mobileBox.y + mobileBox.height).toBeLessThanOrEqual(844)

    await page.keyboard.press('Escape')
    await expect(popover).toBeHidden()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
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

  test('na telefonie pokazuje ekwipunek przed dodatkowymi sekcjami kreatora', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/buildy/create')

    const equipment = page.getByText('Ekwipunek — kliknij slot aby wybrać przedmiot').filter({ visible: true })
    const doctrine = page.getByRole('heading', { name: 'Doktryna i przeznaczenie' }).filter({ visible: true })
    await expect(equipment).toBeVisible()
    await expect(doctrine).toBeVisible()
    const [equipmentBox, doctrineBox] = await Promise.all([equipment.boundingBox(), doctrine.boundingBox()])
    expect(equipmentBox.y).toBeLessThan(doctrineBox.y)
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

      const readResponse = await request.get('/api/builds?category=all&limit=6', { headers })
      expect(readResponse.status()).toBe(200)
      expect(readResponse.headers()['cache-control']).toContain('no-store')
      const payload = await readResponse.json()
      const publishedBuild = payload.builds.find((row) => row.id === buildId)
      expect(publishedBuild).toBeTruthy()
      expect(publishedBuild.is_favorite).toBe(false)
      expect(payload.builds.length).toBeLessThanOrEqual(6)
      expect(typeof payload.hasMore).toBe('boolean')

      const favoriteResponse = await request.post(`/api/builds/${buildId}/social`, { headers })
      expect(favoriteResponse.status()).toBe(200)
      expect((await favoriteResponse.json()).favorite).toBe(true)

      const favoriteListResponse = await request.get('/api/builds?category=all&limit=6', { headers })
      const favoriteList = await favoriteListResponse.json()
      expect(favoriteList.builds.find((row) => row.id === buildId)?.is_favorite).toBe(true)

      const unfavoriteResponse = await request.post(`/api/builds/${buildId}/social`, { headers })
      expect(unfavoriteResponse.status()).toBe(200)
      expect((await unfavoriteResponse.json()).favorite).toBe(false)
    } finally {
      if (buildId) {
        const response = await request.delete('/api/builds', { headers, data: { id: buildId } })
        expect(response.status()).toBe(200)
      }
    }
  })

  test('pozwala oddać i zmienić cotygodniowy głos na build', async ({ page }) => {
    const buildId = '11111111-1111-4111-8111-111111111111'
    let selectedBuildId = null
    let weeklyVotes = 2

    await page.route('**/api/builds/weekly', async (route) => {
      const method = route.request().method()
      if (method === 'PUT') {
        const body = route.request().postDataJSON()
        selectedBuildId = body.buildId
        weeklyVotes = 3
      } else if (method === 'DELETE') {
        selectedBuildId = null
        weeklyVotes = 2
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          week: { weekStart: '2026-08-31', startsAt: '2026-08-31T00:00:00.000Z', endsAt: '2026-09-07T00:00:00.000Z' },
          candidates: [{
            id: buildId,
            created_at: '2026-09-01T12:00:00.000Z',
            user_id: '22222222-2222-4222-8222-222222222222',
            title: 'Łowca tygodnia',
            activity_type: 'pvp',
            description: 'Kandydat społeczności',
            status: 'visible',
            profiles: { username: 'Rycerz' },
            build_votes: [{ vote_type: 'up' }],
            build_data: { slots: {}, tags: { activities: ['PVP'] } },
            weekly_votes_count: weeklyVotes,
            likes_count: 1,
            item_names: {},
          }],
          leaderId: buildId,
          totalVotes: weeklyVotes,
          userVoteBuildId: selectedBuildId,
        }),
      })
    })
    await page.route('**/api/builds?**', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ builds: [], total: 0, hasMore: false, nextCursor: null, nextOffset: null }),
    }))

    await page.goto('/buildy')
    await expect(page.getByRole('heading', { name: 'Build tygodnia', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Oddaj głos' }).click()
    await expect(page.getByRole('button', { name: 'Twój głos' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('3 głosów')).toBeVisible()

    await page.getByRole('button', { name: 'Twój głos' }).click()
    await expect(page.getByRole('button', { name: 'Oddaj głos' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('planer pokazuje nazwy i role oraz odtwarza udostępniony skład', async ({ page }) => {
    const buildId = '11111111-1111-4111-8111-111111111111'
    await page.route('**/api/builds?**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          builds: [{
            id: buildId,
            title: 'Młot frontowy',
            description: 'Tank do inicjacji',
            profiles: { username: 'Kowal' },
            build_data: {
              tags: { locations: [], zones: [], sizes: [], roles: ['Tank'], activities: ['PvP'] },
            },
          }],
          total: 1,
          hasMore: false,
          nextCursor: null,
        }),
      })
    })

    await page.goto(`/buildy?squad=${buildId},,,,&name=Front%205v5`)
    await page.getByRole('button', { name: 'Planer Składu' }).click()

    await expect(page.getByPlaceholder('np. Nasza taktyka na ZvZ...')).toHaveValue('Front 5v5')
    await expect(page.getByText('Młot frontowy')).toBeVisible()
    await expect(page.getByText('Przywrócono udostępniony skład.')).toBeVisible()
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
    await expect(page.getByRole('heading', { name: 'Miecz Broadsword' })).toBeVisible()
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

  test('wyszukuje i sortuje cały katalog buildów oraz zachowuje filtry w URL', async ({ page }) => {
    const requests = []
    await page.route('**/api/builds?**', async (route) => {
      const url = new URL(route.request().url())
      requests.push({ search: url.searchParams.get('search'), sort: url.searchParams.get('sort'), category: url.searchParams.get('category'), limit: url.searchParams.get('limit') })
      const searching = url.searchParams.get('search') === 'Kaptur Łowcy'
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          builds: searching ? [{
            id: '11111111-1111-4111-8111-111111111111',
            created_at: '2026-09-01T12:00:00.000Z',
            user_id: '22222222-2222-4222-8222-222222222222',
            title: 'Łowca Mgły',
            description: 'Build testowy',
            activity_type: 'pvp',
            status: 'visible',
            profiles: { username: 'Rycerz' },
            build_votes: [{ id: '33333333-3333-4333-8333-333333333333', vote_type: 'up' }],
            build_data: { slots: {}, itemNames: { T5_HEAD_LEATHER_SET2: 'Kaptur Łowcy' }, tags: { activities: ['PVP'] } },
          }] : [],
          hasMore: false,
          nextCursor: null,
          nextOffset: null,
          total: searching ? 1 : 0,
        }),
      })
    })

    await page.goto('/buildy?q=Kaptur%20%C5%81owcy&sort=likes&category=pvp&view=list')

    await expect(page.getByPlaceholder('Szukaj po nazwie, przedmiocie, autorze lub tagu…').first()).toHaveValue('Kaptur Łowcy')
    await expect(page.getByRole('combobox', { name: 'Sortuj buildy' })).toContainText('Najwięcej polubień')
    await expect(page.getByRole('button', { name: 'PvP & ZvZ' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'Widok listy' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-view="list"]').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Łowca Mgły' })).toBeVisible()
    await expect.poll(() => requests.some((entry) => entry.search === 'Kaptur Łowcy' && entry.sort === 'likes' && entry.category === 'pvp' && entry.limit === '12')).toBe(true)

    await page.getByRole('button', { name: 'Ganking & Mists' }).click()
    await expect.poll(() => page.evaluate(() => Object.fromEntries(new URL(window.location.href).searchParams))).toMatchObject({ q: 'Kaptur Łowcy', sort: 'likes', category: 'ganking', view: 'list' })
    await page.reload()
    await expect(page.getByPlaceholder('Szukaj po nazwie, przedmiocie, autorze lub tagu…').first()).toHaveValue('Kaptur Łowcy')
    await expect(page.getByRole('button', { name: 'Ganking & Mists' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-view="list"]').first()).toBeVisible()

    await page.getByRole('button', { name: 'Widok kafelków' }).click()
    await expect(page.locator('[data-view="grid"]').first()).toBeVisible()
    await expect.poll(() => page.evaluate(() => new URL(window.location.href).searchParams.has('view'))).toBe(false)
  })

  test('pokazuje spójny błąd Kuźni i pozwala ponowić pobieranie', async ({ page }) => {
    let attempt = 0
    await page.route('**/api/builds?**', async (route) => {
      attempt += 1
      if (attempt === 1) {
        await route.fulfill({ status: 503, headers: { 'x-e2e-expected-error': 'true' }, contentType: 'application/json', body: JSON.stringify({ error: 'Próba E2E: usługa chwilowo niedostępna.' }) })
        return
      }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ builds: [], hasMore: false, nextCursor: null, nextOffset: null, total: 0 }) })
    })

    await page.goto('/buildy')
    await expect(page.getByRole('heading', { name: 'Zbrojownia jest chwilowo niedostępna' })).toBeVisible()
    await expect(page.getByText('Nie udało się wczytać Zbrojowni. Odśwież stronę lub spróbuj ponownie za chwilę.')).toBeVisible()
    await page.getByRole('button', { name: 'Spróbuj ponownie' }).click()
    await expect(page.getByRole('heading', { name: 'Zbrojownia jest pusta' })).toBeVisible()
    expect(attempt).toBeGreaterThanOrEqual(2)
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

  test('liczy rafinację z pełnej receptury i zachowuje mobilny układ', async ({ page }) => {
    await page.route('**/api/prices?**', async (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('mode') !== 'current') return route.continue()

      const prices = { T5_WOOD: 100, T4_PLANKS: 200, T5_PLANKS: 500 }
      const city = (url.searchParams.get('cities') || 'Fort Sterling').split(',')[0]
      const observedAt = new Date().toISOString()
      const data = (url.searchParams.get('items') || '').split(',').filter(Boolean).map((itemId) => ({
        item_id: itemId,
        city,
        quality: 1,
        sell_price_min: prices[itemId] || 0,
        sell_price_min_date: observedAt,
        buy_price_max: 0,
        buy_price_max_date: '0001-01-01T00:00:00',
      }))
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data, meta: { source: 'E2E' } }) })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/kalkulator-craftingu')

    await expect(page.getByRole('heading', { name: 'Kalkulator Rafinacji' })).toBeVisible()
    await expect(page.getByLabel('Cena Kłody T5.0')).toHaveValue('100')
    await expect(page.getByLabel('Cena Deski T4.0')).toHaveValue('200')
    await expect(page.getByLabel('Cena Deski T5.0')).toHaveValue('500')
    await expect(page.getByText(/Rzeczywiste składniki zwracane/)).toBeVisible()
    await expect(page.getByText(/13.300 Silver|13 300 Silver/).first()).toBeVisible()
    await expect(page.getByText('Kurs złota')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
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
    await page.getByRole('button', { name: 'Otwórz formularz wyprawy' }).click()
    await expect(page.getByLabel('Cel / Tytuł Wyprawy *')).toBeVisible()
    await expect(page.getByLabel('Min. IP *')).toBeVisible()
    await expect(page.getByLabel('Tank')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ogłoś Wyprawę' })).toBeVisible()

    await page.goto('/rynek')
    await page.getByRole('button', { name: 'Otwórz formularz oferty' }).click()
    await expect(page.getByText('Tytuł Oferty *')).toBeVisible()
    await expect(page.getByPlaceholder(/Sprzedam Mamuta Transportowego/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Przedmiot do wyceny/ })).toBeVisible()
    await page.getByRole('button', { name: 'Zamknij formularz oferty' }).click()
    await expect(page.getByPlaceholder(/Sprzedam Mamuta Transportowego/i)).toHaveCount(0)
  })

  test('pokazuje katalog gildii przed formularzem i otwiera manifest na żądanie', async ({ page }) => {
    await page.route('**/api/guilds', async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          guilds: [{
            id: 77,
            name: 'Strażnicy Avalonu',
            description: 'Polska gildia prowadząca wyprawy na wszystkich serwerach.',
            activity_type: 'PvE / HCE',
            main_city: 'Brecilien',
            server: 'Azja',
            discord_link: 'https://discord.gg/test',
            user_id: 'guild-leader',
            recruitment_open: true,
            recruitment_headline: 'Szukamy aktywnych graczy',
            profiles: { username: 'Dowodca#0' },
          }],
        }),
      })
    })
    await page.route('**/api/albion/guild?mode=search**', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            guilds: [
              { id: 'guild-one', name: 'Strażnicy Avalonu', allianceTag: 'AVA', killFame: null, region: 'asia' },
              { id: 'guild-two', name: 'Strażnicy Avalonu II', allianceTag: '', killFame: null, region: 'asia' },
            ],
          },
        }),
      })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/gildie')
    await expect(page.getByRole('heading', { name: 'Strażnicy Avalonu' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText('Webhook rekrutacji')).toHaveCount(0)

    await page.getByRole('button', { name: 'Dodaj swoją gildię' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Opublikuj manifest gildii' })).toBeVisible()
    await expect(page.getByPlaceholder('https://discord.com/api/webhooks/...')).toBeVisible()
    await page.getByText('Jak utworzyć webhook na Discordzie?').click()
    await expect(page.getByText(/Integracje.*Webhooki.*Nowy webhook/)).toBeVisible()
    await expect(page.getByText(/Kopiuj adres URL webhooka/)).toBeVisible()
    await page.getByRole('button', { name: 'Zamknij formularz' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('button', { name: 'Statystyki' }).click()
    await expect(page.getByText('Strażnicy Avalonu II')).toBeVisible()
    await expect(page.getByText('PvP Fame: 0')).toHaveCount(0)
    await page.getByRole('button', { name: 'Zamknij podgląd gildii' }).click()

    await page.getByPlaceholder('Nazwa gildii lub słowo z opisu…').fill('nieistniejąca')
    await expect(page.getByRole('heading', { name: 'Brak pasujących chorągwi' })).toBeVisible()
    await page.getByRole('button', { name: 'Pokaż wszystkie gildie' }).click()
    await expect(page.getByRole('heading', { name: 'Strażnicy Avalonu' })).toBeVisible()
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

  test('na desktopie nie montuje formularza wyprawy bez decyzji organizatora', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/wyprawy')

    const openForm = page.getByRole('button', { name: 'Otwórz formularz wyprawy' })
    await expect(openForm).toBeVisible()
    await expect(page.getByLabel('Cel / Tytuł Wyprawy *')).toHaveCount(0)
    await openForm.click()
    await expect(page.getByLabel('Termin (Twój czas) *')).toHaveAttribute('type', 'datetime-local')
  })

  test('na mobile pokazuje tablicę rynku przed formularzem sprzedaży', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/rynek')

    const openForm = page.getByRole('button', { name: 'Otwórz formularz oferty' })
    await expect(openForm).toBeVisible()
    await expect(page.getByPlaceholder(/Sprzedam Mamuta Transportowego/i)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Znajdź właściwy towar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aktywne oferty' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Moje ogłoszenia' }).click()
    await expect(page.getByRole('button', { name: 'Moje ogłoszenia' })).toHaveAttribute('aria-pressed', 'true')
    await openForm.click()
    await expect(page.getByPlaceholder(/Sprzedam Mamuta Transportowego/i)).toBeVisible()
  })

  test('publikuje, odnawia i usuwa ofertę przez chronione API rynku', async ({ page, request }) => {
    await page.goto('/')
    const accessToken = await getCookieAccessToken(page)
    expect(accessToken).toBeTruthy()
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    let offerId = null

    try {
      const offerTitle = `E2E oferta ${Date.now()}`
      const createResponse = await request.post('/api/market/offers', {
        headers,
        data: {
          title: offerTitle,
          item_name: 'T4_BAG',
          price: 12345,
          city: 'Caerleon',
          category: 'Ekwipunek',
          server: 'Wszystkie serwery',
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
      expect(typeof payload.total).toBe('number')
      expect(payload.scope).toBe('active')

      const ownResponse = await request.get('/api/market/offers?scope=mine', { headers })
      expect(ownResponse.status()).toBe(200)
      const ownPayload = await ownResponse.json()
      expect(ownPayload.scope).toBe('mine')
      expect(ownPayload.offers.some((offer) => offer.id === offerId)).toBe(true)

      const searchResponse = await request.get(`/api/market/offers?scope=mine&q=${encodeURIComponent(offerTitle)}`, { headers })
      expect(searchResponse.status()).toBe(200)
      const searchPayload = await searchResponse.json()
      expect(searchPayload.offers.map((offer) => offer.id)).toContain(offerId)

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
    expect(payload.expeditions.every((expedition) => !('discord_message_id' in expedition))).toBe(true)
    expect(payload.profile === null || typeof payload.profile === 'object').toBe(true)
  })

  test('otwiera tablicę rynku natychmiast dla bezpośredniego linku do oferty', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/rynek?offer=11111111-1111-4111-8111-111111111111')

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
    await page.getByRole('button', { name: 'Kurs złota' }).click()
    await expect(page.getByRole('tab', { name: 'Kurs złota' })).toHaveAttribute('aria-selected', 'true')

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
            kills: [
              {
                id: 'pricing-event', perspective: 'kill', timestamp: '2026-08-15T18:00:00Z', fame: 8748, killArea: 'OPEN_WORLD', participantCount: 1,
                killer: { id: 'pricing-player', name: 'PricingKnight', averageItemPower: 1450, equipment: emptyEquipment },
                victim: { id: 'victim', name: 'LostKnight', averageItemPower: 1300, equipment: { ...emptyEquipment, MainHand: { type: 'T6_MAIN_SWORD', count: 1, quality: 1 } } },
                lossValuation: { estimatedValue: 125000, pricedItems: 1, totalItems: 1, coveragePercent: 100, freshness: 'fresh', maxAgeHours: 2, fallbackItems: 0, items: [{ total: 125000, quote: { city: 'Martlock', source: 'sell' } }] },
              },
              {
                id: 'unknown-fame-event', perspective: 'kill', timestamp: '2026-08-15T17:00:00Z', fame: null, killArea: 'MISTS', participantCount: 1,
                killer: { id: 'pricing-player', name: 'PricingKnight', averageItemPower: 1450, equipment: emptyEquipment },
                victim: { id: 'unknown-victim', name: 'UnknownKnight', averageItemPower: 1200, equipment: emptyEquipment },
                lossValuation: { estimatedValue: 0, pricedItems: 0, totalItems: 0, coveragePercent: 0, freshness: 'missing', fallbackItems: 0, items: [] },
              },
            ],
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

    await expect(page.getByText('Wartość utraconego zestawu').first()).toBeVisible()
    await expect(page.getByText('125 000 Silver').first()).toBeVisible()
    await expect(page.getByText(/Świeże · 2 h/)).toBeVisible()
    await expect(page.getByText(/Straty przeciwników:\s*125\s*tys\.\s*Silver/)).toBeVisible()
    await expect(page.getByText(/Pokrycie 1\/1 slotów \(100%\)/)).toBeVisible()
    await expect(page.getByText('Brak danych')).toBeVisible()
    await expect(page.getByText('1 uczestnik').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Otwórz kronikę: UnknownKnight' })).toBeVisible()
    await expect(page.locator('img[src*="T6_MAIN_SWORD"][title^="Broń główna"]')).toBeVisible()
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
          data: { players: [
            { id: 'direct-player', name: 'DirectKnight', guildName: 'Codex', allianceName: '', killFame: 8748, region: 'asia' },
            { id: 'direct-player-eu', name: 'DirectKnightEU', guildName: '', allianceName: '', killFame: 1200, region: 'europe' },
          ] },
          meta: { source: 'E2E', region: 'asia', fetchedAt: '2026-08-21T20:00:00Z', cacheSeconds: 45, searchedAllRegions: true, warnings: [] },
        }),
      })
    })

    await page.goto('/killboard?nick=DirectKnight&region=asia')

    await expect(page.getByRole('heading', { name: 'Wybierz właściwego wojownika' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^DirectKnight Codex/ })).toBeVisible()
    await expect(page.getByText('Azja · ASIA')).toBeVisible()
    await expect(page.getByText('Europa · EU')).toBeVisible()
    await expect(page.getByText(/2 wyników • sprawdzone serwery/)).toBeVisible()
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
            details: {
              unavailableRegions: ['america'],
              archiveUrl: 'https://killboard-1.com/us/player/Localniaq',
            },
          },
        }),
      })
    })

    await page.goto('/killboard')
    await page.getByLabel('Nick gracza').fill('Localniaq')
    await page.getByRole('button', { name: 'Szukaj', exact: true }).click()

    await expect(page.getByText(/Gameinfo chwilowo nie odpowiada dla: Ameryka/)).toBeVisible()
    await expect(page.getByText(/Nie znaleziono gracza/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Spróbuj ponownie' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Sprawdź w KillBoard#1/ })).toHaveAttribute('href', 'https://killboard-1.com/us/player/Localniaq')
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
        body: JSON.stringify({ follows: [
          {
            entity_type: 'albion_player', entity_id: 'watched-player', label: 'WatchedKnight', region: 'america',
            last_checked_at: '2026-08-15T18:00:00Z', last_error: null,
            last_summary: { kills: 1, deaths: 1, killFame: 8748, deathFame: 5000 },
            created_at: '2026-08-15T17:00:00Z',
          },
          { entity_type: 'build', entity_id: '11111111-1111-4111-8111-111111111111', label: 'Młot frontowy' },
          { entity_type: 'guild', entity_id: '42', label: 'Strażnicy' },
          { entity_type: 'market', entity_id: '22222222-2222-4222-8222-222222222222', label: 'Mamut transportowy' },
          { entity_type: 'player', entity_id: '33333333-3333-4333-8333-333333333333', label: 'Dowódca' },
        ] }),
      })
    })
    await page.goto('/obserwowane')
    await expect(page.getByRole('heading', { name: 'Obserwowane' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Obserwowane postacie' })).toBeVisible()
    await expect(page.getByText('WatchedKnight')).toBeVisible()
    await expect(page.getByText('Postać Albionu · Ameryka')).toBeVisible()
    await expect(page.getByText('8,7 tys.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Buildy, gildie, oferty i profile' })).toBeVisible()
    await expect(page.getByText('Młot frontowy')).toBeVisible()
    await expect(page.getByText('Strażnicy')).toBeVisible()
    await expect(page.getByText('Mamut transportowy')).toBeVisible()
    await expect(page.getByText('Dowódca')).toBeVisible()
    await page.getByRole('button', { name: 'Sprawdź nowe walki' }).click()
    await expect(page.getByText(/Znaleziono 2 nowych walk/)).toBeVisible()
  })

  test('zapisuje i przywraca zsynchronizowany szkic podziału łupów', async ({ page }) => {
    await page.route('**/api/loot-split**', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ savedAt: '2026-08-29T12:00:00.000Z' }) })
        return
      }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ draft: null, reports: [] }) })
    })
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

  test('liczy poprawny raport łupów i blokuje niepełne działania', async ({ page }) => {
    await page.route('**/api/loot-split**', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ draft: null, reports: [] }) })
    })
    await page.goto('/loot-split')
    await expect(page.getByRole('button', { name: 'Udostępnij' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Eksport TXT' })).toBeDisabled()

    await page.getByLabel('Łączna wartość łupu').fill('1000000')
    await page.getByLabel('Podatek gildii (%)').fill('10')
    await page.getByText('Nicki graczy').locator('textarea').fill('Tank\nHeal\nDPS')

    await expect(page.getByText('300 000 silver').last()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Udostępnij' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Eksport TXT' })).toBeEnabled()
  })

  test('przywraca osobiste timery i utrzymuje oba moduły w szerokości telefonu', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('aopp-custom-timers-v2', JSON.stringify({
        version: 1,
        value: [{ id: 'timer-e2e', name: 'CTA E2E', date: '2099-08-29T18:00:00.000Z' }],
        updatedAt: '2026-08-29T12:00:00.000Z',
      }))
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/timery')
    await expect(page.getByText('CTA E2E')).toBeVisible()
    await expect(page.getByText(/Timer zapisuje się na koncie/)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

    await page.goto('/loot-split')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})
