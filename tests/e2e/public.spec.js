import { expect, test } from './browser-health.js'

test.describe('publiczna bramka portalu', () => {
  test('pokazuje wyłącznie ekran powitalny i logowanie', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /Wejdź przez Discord/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Regulamin', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Prywatność', exact: true })).toBeVisible()
  })

  test('udostępnia regulamin bez logowania', async ({ page }) => {
    await page.goto('/regulamin')

    await expect(page).toHaveURL(/\/regulamin$/)
    await expect(page.getByRole('heading', { name: /Wspólny portal wymaga/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Zaloguj przez Discord/i })).toBeVisible()
  })

  test('udostępnia politykę prywatności bez logowania', async ({ page }) => {
    await page.goto('/prywatnosc')

    await expect(page).toHaveURL(/\/prywatnosc$/)
    await expect(page.getByRole('heading', { name: /Twoje dane mają służyć Tobie/i })).toBeVisible()
  })

  test('indeksuje wyłącznie publiczne strony portalu', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text()
    const sitemap = await (await request.get('/sitemap.xml')).text()
    const protectedPage = await (await request.get('/killboard')).text()

    expect(robots).toContain('Sitemap: https://albion-social.vercel.app/sitemap.xml')
    expect(robots).toContain('Disallow: /killboard')
    expect(sitemap).toContain('<loc>https://albion-social.vercel.app/</loc>')
    expect(sitemap).toContain('<loc>https://albion-social.vercel.app/regulamin</loc>')
    expect(sitemap).toContain('<loc>https://albion-social.vercel.app/prywatnosc</loc>')
    expect(sitemap).not.toContain('/killboard')
    expect(protectedPage).toContain('<meta name="robots" content="noindex, nofollow"')
    expect(protectedPage).toContain('<link rel="canonical" href="https://albion-social.vercel.app/killboard"')
  })

  test('odrzuca anonimowe wywołania chronionych endpointów', async ({ request }) => {
    const healthRead = await request.get('/api/admin/health')
    const healthRun = await request.post('/api/admin/health')
    const moderationQueue = await request.get('/api/admin/content')
    const roleManagement = await request.get('/api/admin/roles')
    const eventCalendar = await request.get('/api/events')
    const followedEntities = await request.get('/api/follows')
    const priceAlerts = await request.get('/api/price-alerts')
    const portalOverview = await request.get('/api/portal-overview')
    const profileVerification = await request.post('/api/profile/verify', {
      data: { playerId: 'anonymous-test', region: 'europe' },
    })
    const profileUnlink = await request.delete('/api/profile/verify')
    const accountDelete = await request.delete('/api/profile/account', {
      data: { confirmation: 'USUŃ KONTO' },
    })

    expect(healthRead.status()).toBe(401)
    expect(healthRun.status()).toBe(401)
    expect(moderationQueue.status()).toBe(401)
    expect(roleManagement.status()).toBe(401)
    expect(eventCalendar.status()).toBe(401)
    expect(followedEntities.status()).toBe(401)
    expect(priceAlerts.status()).toBe(401)
    expect(portalOverview.status()).toBe(401)
    expect(profileVerification.status()).toBe(401)
    expect(profileUnlink.status()).toBe(401)
    expect(accountDelete.status()).toBe(401)
  })

  test('zwraca bezpieczny obraz zastępczy dla nieprawidłowego ID przedmiotu', async ({ request }) => {
    const response = await request.get('/api/item-image?id=TEST')

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/svg+xml')
    expect(response.headers()['x-item-image-fallback']).toBe('1')
  })

  test('udostępnia bezpieczny Service Worker bez cache prywatnych stron', async ({ request }) => {
    const response = await request.get('/sw.js')
    const source = await response.text()

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/javascript')
    expect(response.headers()['cache-control']).toContain('no-store')
    expect(source).toContain("event.request.mode === 'navigate'")
    expect(source).toContain("url.pathname.startsWith('/api/')")
    expect(source).not.toContain("caches.match('/')")
  })

  test('instaluje wyłącznie publiczny cache PWA', async ({ page }) => {
    await page.goto('/')

    const cacheState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      const cacheNames = await caches.keys()
      const cachedUrls = (await Promise.all(cacheNames.map(async (name) => {
        const cache = await caches.open(name)
        return (await cache.keys()).map((request) => new URL(request.url).pathname)
      }))).flat()

      return { scriptUrl: registration.active?.scriptURL || '', cacheNames, cachedUrls }
    })

    expect(cacheState.scriptUrl).toContain('/sw.js')
    expect(cacheState.cacheNames).toContain('albion-social-static-v2')
    expect(cacheState.cachedUrls).toContain('/offline.html')
    expect(cacheState.cachedUrls).not.toContain('/')
    expect(cacheState.cachedUrls.some((path) => path.startsWith('/api/'))).toBe(false)
    expect(cacheState.cachedUrls.some((path) => path.startsWith('/auth/'))).toBe(false)
  })

  for (const path of ['/buildy', '/gildie', '/kalendarz', '/killboard', '/loot-split', '/obserwowane', '/wiadomosci', '/wyprawy', '/admin']) {
    test(`blokuje gościom ${path}`, async ({ page }) => {
      await page.goto(path)

      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole('button', { name: /Wejdź przez Discord/i })).toBeVisible()
    })
  }
})
